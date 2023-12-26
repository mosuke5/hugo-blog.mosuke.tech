+++
categories = ["Kubernetes"]
date = "2022-05-31T10:24:15+09:00"
description = "なんとなくあいまいに理解していなかった、「マルチAZ環境に構築したKubernetesで、PVをマウントしたPodがどのノードにスケジュールされるのか？」について軽く調べてみました。"
draft = false
image = ""
tags = ["Tech"]
title = "マルチAZ環境に構築したKubernetesで、PVをマウントしたPodがどのノードにスケジュールされるのか？"
author = "mosuke5"
archive = ["2022"]
+++

こんにちは、もーすけです。  
なんとなくあいまいに理解していなかった、「マルチAZ環境に構築したKubernetesで、PVをマウントしたPodがどのノードにスケジュールされるのか？」について軽く調べてみました。ほぼ自分のメモなので、間違っているところもあるかもしれません。
<!--more-->

## 前提
本ブログは、AWS環境にマルチAZで構成した（東京リージョンで、a/c/dゾーンを利用）、Kubernetes 1.23を前提とします。
ブロックストレージにはEBSを、ファイルストレージにはEFSを使うこととします。EBSの作成には、EBS CSI driverを利用、EFSのマウントにはAmazon EFS Driverを使うこととします。

また、AWSを普段使っている人にとってはあたりまえのことだと思いますが、AWSで利用できるブロックストレージのEBSは、{{< external_link title="AZをまたいでEC2インスタンスにアタッチすることはできない" url="https://docs.aws.amazon.com/ja_jp/AWSEC2/latest/UserGuide/ebs-volumes.html" >}}、ということを前提に話をすすめます。

![cluster-overview](/image/multi-az-pv-cluster-overview.png)


## 雰囲気
EBSボリュームは、AZをまたいでEC2インスタンスにアタッチできないため、Podのスケジューリングもいい感じにEBSボリュームがアタッチ可能なノードを選んでくれそうですよね。  
経験則的にはそうだったのですが、ほんとうにそうなのか？どうしてそうなのか？（いままでちゃんと確認してなかったので）確認しようと思ったところです。

![expectation](/image/multi-az-pv-expectation.png)


## ポイント

### 1. Nodeにzoneとregionのラベルが付与される
Kubernetesにジョインしているノードに、リージョンやゾーン情報がラベルとして付与されることが大事です。結局、PVがどのリージョン/ゾーンにあって、Podをどこに配置するか決定しなければならないからです。  

`cloud-controller-manager` は、ノードにリージョンやゾーン情報が付与しますし、CSI Driverもノードに対してラベルを付与することがあります。`topology.ebs.csi.aws.com/zone` は、CSI Driverが付与したものです。

`failure-domain.beta.kubernetes.io/region` と `failure-domain.beta.kubernetes.io/zone`は、Kubernetes 1.17以降でDeprecatedになっているので注意です({{< external_link title="公式ドキュメント" url="https://kubernetes.io/docs/reference/labels-annotations-taints/#failure-domainbetakubernetesioregion" >}})。

```text
$ kubectl get node worker1 -o yaml | grep -e "zone" -e "region"
    failure-domain.beta.kubernetes.io/region: ap-northeast-1
    failure-domain.beta.kubernetes.io/zone: ap-northeast-1a
    topology.ebs.csi.aws.com/zone: ap-northeast-1a
    topology.kubernetes.io/region: ap-northeast-1
    topology.kubernetes.io/zone: ap-northeast-1a
```

### 2. ボリュームがどのゾーンで作成されるか
つぎのStorageClassとPVCのマニフェストを使ってPVCを作成します。PVが作成されるとともに、EBS CSI driverによって、ボリューム実体であるEBSが作成されます。
どのゾーンにEBSが作成されるかは重要なポイントだと思います。ここでは検証でわかりやすくするために、`volumeBindingMode: Immediate` としました。

```yaml
kind: StorageClass
apiVersion: storage.k8s.io/v1
metadata:
  name: gp2-csi-immediate
provisioner: ebs.csi.aws.com
parameters:
  encrypted: 'true'
  type: gp2
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: Immediate
```

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
spec:
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  resources:
    requests:
      storage: 10Gi
  storageClassName: "gp2-csi-immediate"
```

EBSが作成されるAZの指定は、StorageClassに設定できる {{< external_link title="allowedTopologies" url="https://kubernetes.io/docs/concepts/storage/storage-classes/#allowed-topologies" >}} によってフィルタも可能です。

もし指定がなければ、EBS CSI driverの場合はAZをランダムで選択します。
{{< external_link title="AWSのAPIレベルではEBSの作成にAZ指定は必須" url="https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateVolume.html" >}}ですが、EBS CSI driver側でランダムに決定する実装が入っていました ({{< external_link title="randomAvailabilityZone()" url="https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/release-1.6/pkg/cloud/cloud.go#L1161-L1176" >}})。

作成されたPVには、`nodeAffinity`が記述され、EBSが作成されたゾーンのノードにPodをスケジューリングするようになっていました。

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  annotations:
    pv.kubernetes.io/provisioned-by: ebs.csi.aws.com
    ...
spec:
  ...
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: topology.ebs.csi.aws.com/zone
          operator: In
          values:
          - ap-northeast-1a
  persistentVolumeReclaimPolicy: Delete
  storageClassName: gp2-csi-immediate
  volumeMode: Filesystem
```

### 3. Schedulerは、Podに紐づくボリューム設定を考慮する
Default Schedulerは、Podの配置先ノードを決定する際に、Podに紐づくボリュームの情報も考慮にいれます。
アプローチはいくつかあるのですが、2.ででてきた `nodeAffinity` は一番わかりやすいですね。
Scheduler Pluginの{{< external_link title="VolumeBinding" url="https://kubernetes.io/ja/docs/reference/scheduling/config/#scheduling-plugins" >}}にて、ノードが要求したボリュームをもっているか確認します。ここで、PV側のnodeAffinityをみるようです。

ほかにも、Scheduler PluginのVolumeZoneは、要求されたボリュームがゾーン要件を満たしているかどうかを確認します。
実装的にも、`failure-domain.beta.kubernetes.io/region`, `failure-domain.beta.kubernetes.io/zone`, `topology.ebs.csi.aws.com/zone`, `topology.kubernetes.io/region`, `topology.kubernetes.io/zone`のラベルが、ノードとPV側でマッチするかをみているようでした。

<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://github.com/kubernetes/kubernetes" target="_blank">
      <img class="belg-site-image" src="https://opengraph.githubassets.com/39aeaad64334b2850d0bcefa1b1af25a7f193fce20968aad346936b91e394fd7/kubernetes/kubernetes" />
    </a>
  </div>
  <div class="belg-right col-md-10">
  <div class="belg-title">
      <a href="https://github.com/kubernetes/kubernetes" target="_blank">kubernetes/volume_zone.go at release-1.23 · kubernetes/kubernetes</a>
    </div>
    <div class="belg-description">Production-Grade Container Scheduling and Management - kubernetes/volume_zone.go at release-1.23 · kubernetes/kubernetes</div>
    <div class="belg-site">
      <img src="https://github.githubassets.com/favicons/favicon.svg" class="belg-site-icon">
      <span class="belg-site-name">GitHub</span>
    </div>
  </div>
</div>


## EFSの場合
ちなみに、RWXでゾーンをまたいでマウントできるEFSの場合は、とくに `nodeAffinity` も対象のラベルが付与されていませんでした。なので、Podは別ゾーンのノードに配置されることもありえますね。
使ったのは、{{< external_link title="Amazon EFS CSI" url="https://github.com/kubernetes-sigs/aws-efs-csi-driver" >}} です。

以下は、Amazon EFS Driverによって作成したPV情報です。

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  annotations:
    pv.kubernetes.io/provisioned-by: efs.csi.aws.com
  creationTimestamp: "2022-05-31T02:02:01Z"
  finalizers:
  - kubernetes.io/pv-protection
  name: pvc-84622e94-b10c-485f-8397-38a88ad1cb77
  resourceVersion: "372677"
  uid: ecd31ae1-e97e-4150-b06b-61b106977cd4
spec:
  accessModes:
  - ReadWriteMany
  capacity:
    storage: 5Gi
  claimRef:
    apiVersion: v1
    kind: PersistentVolumeClaim
    name: my-efs
    namespace: default
    resourceVersion: "372666"
    uid: 84622e94-b10c-485f-8397-38a88ad1cb77
  csi:
    driver: efs.csi.aws.com
    volumeAttributes:
      storage.kubernetes.io/csiProvisionerIdentity: 1653960834425-8081-efs.csi.aws.com
    volumeHandle: fs-0a51f26d89a5046ce::fsap-0ddc3edcf81a2dc97
  persistentVolumeReclaimPolicy: Delete
  storageClassName: efs-sc
  volumeMode: Filesystem
status:
  phase: Bound
```

## マルチAZ環境での利用
耐障害性の観点で、マルチAZ環境でKubernetesクラスタを構築することは、当然役に立つものではありますが、ステートを持つアプリケーションにおいてはしっかりこの点も考えておかなければならないです。コンテナだからという問題ではないですが。
ノード障害を考えても、各AZに2台以上のWorkerノードを準備しておくべき場面もでてきますね。