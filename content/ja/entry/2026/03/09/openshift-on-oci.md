+++
categories = ["", ""]
date = "2026-03-09T10:01:05+09:00"
description = ""
draft = true
image = ""
tags = ["Tech"]
title = ""
author = "mosuke5"
archive = ["2026"]
+++

OpenShift on OCIをやってみたので備忘録。
あまり実績をインターネットに公開している人が少いので助けになればと。

長らくOpenShiftに携わっているが、マネージドサービス以外の初期構築をするのはだいぶ久々。数年ぶり。
Assisted Installerも実は初めて。。。OCIも初めて。。。
ですが、一応もろもろで1日くらいでできた。

## 環境
OCI（個人アカウント）
OpenShift 4.21
Assisted Installerを使用

## AWS との差分
・ADとFD
・

## 構築
### ドキュメント
ドキュメントはこれを見ながら行った。
まず、4.19までは「Installing on OCI」となっているが、4.20からは「Installing on Oracle Distributed Cloud」になっているので注意。まずどこにドキュメントがあるかわからん。
https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html/installing_on_oracle_distributed_cloud/installing-oci-assisted-installer


Oracle側のこれも見る。
https://docs.oracle.com/en-us/iaas/Content/openshift-on-oci/overview.htm


### 1.1. Supported Oracle Distributed Cloud infrastructures
Oracle Distributed Cloud というのは、通常のパブリックなクラウドとGovermentクラウドなど特殊なものと統合した総称をいいのでしょうか。Oracleに精通していないのでわかりませんでしたが、いまのところそういう解釈でいます。

### 1.2. About the Assisted Installer and Oracle Distributed Cloud integration
ワークフローが記載されている。これはとても重要。
Red Hat側で行う作業とOracle側で行う作業の境界が示されているので要確認すること。

図を貼る。

### 1.3. Preparing the Oracle Distributed Cloud environment
作業する前の事前準備。
OCIを触ったことがない人だといくつかわからないことがある。
まずは、compartment。一言で言えば「クラウド上のリソースを整理・隔離するための論理的なフォルダ」のこと。同一アカウント内に、プロジェクト別、環境別（開発・検証・本番）、部署別などでリソースを分けて管理でるようになる。
AWSには似たような概念はないかな。Azureではリソースグループが近いだろうか。

create-cluster-vX.X.X.zipをGithubからダウンロードしろと書いてある。中身はTerraformなどのスクリプトが入っている。
なぜこれが必要か、はじめはわからない。
端的に言うと、OCIではリソース管理サービス（CloudFormation的なサービス）がTerraformベースで実装されている。OpenShiftを構築するのに必要なインフラリソースを構築するTerraformをダウンロードしろということである。

### 1.4. Using the Assisted Installer to generate a discovery ISO image
ここはRed Hat側での作業。Assisted Installerで使うISOイメージを作成する。
迷うことはそんなにない。ドキュメント通りやれば平気。
ポイントはいか2つ

・Cluster name：メモして覚えておく。後ほどの作業で必要
・Base domain：今回は mosuke5.com を使い、OCIのDNS管理ツールで利用できるよにネームサーバーを変更しておいた。OCIで管理するとTerraformの中でドメインのレコード登録までしてくれるが、別で管理していても大丈夫。

### 1.5. Provisioning OCI infrastructure for your cluster
このあたりからOCIの作業になりわからないところも増えてくる。
まずは、1.4 でダウンロードしたISOイメージをオブジェクトストレージにアップロードする。理由は、Terraformで作成したインスタンスがイメージを参照できるようにするため。

Public公開はできないので、Pre-Authenticated Request (PAR)を使って外部から取得できるようにする。
これは、名前のとおりであるが、期間限定でURLを知っている人だけがダウンロードできるようにする設定。AWSのS3でいう 「署名付きURL (Presigned URL)」に該当する。

ついにTerraform stackを apply するタイミングなのだが、少なくとも26年3月9日時点では、OpenShift側のドキュメントが古いようす。Terraform stackをオブジェクトストレージにアップロードするように書いてあるが必要はない。
Oracle側のドキュメントを見ることを推奨する。
「開発者サービス」、「Red Hat OpenShift」を選択すれば、はじめから最新版のStackが利用できるようになっている。
もし、古いバージョンのStackを使いたい場合、Resouce Managementのサービスにいって新規にStackを作れば、任意のファイルをアップロードできるようになっている。

![](/image/openshift-on-oci-docs-bug.png)


### 1.6. Completing the remaining Assisted Installer steps
ここから、またRed Hat側の作業にもどる。
そんなにはまるところはない。
インストールには1時間くらいかかる。気長に待ちます。

## 確認観点
Kubeadmin アカウントが払い出されているので、それでログイン。
まずはバージョン確認

### バージョン
```shell
$ oc version          
Client Version: 4.20.1
Kustomize Version: v5.6.0
Server Version: 4.21.3
Kubernetes Version: v1.34.2
```

### Cluster Operator
Cluster Operator が正常に動いていることを確認。
特別、OCI固有のOperatorが動いている気配はない。

```shell
$ oc get co
NAME                                       VERSION   AVAILABLE   PROGRESSING   DEGRADED   SINCE   MESSAGE
authentication                             4.21.3    True        False         False      4m3s    
baremetal                                  4.21.3    True        False         False      30m     
cloud-controller-manager                   4.21.3    True        False         False      33m     
cloud-credential                           4.21.3    True        False         False      34m     
cluster-autoscaler                         4.21.3    True        False         False      30m     
config-operator                            4.21.3    True        False         False      31m     
console                                    4.21.3    True        False         False      10m     
control-plane-machine-set                  4.21.3    True        False         False      30m     
csi-snapshot-controller                    4.21.3    True        False         False      20m     
dns                                        4.21.3    True        False         False      30m     
etcd                                       4.21.3    True        False         False      29m     
image-registry                             4.21.3    True        False         False      20m     
ingress                                    4.21.3    True        False         False      19m     
insights                                   4.21.3    True        False         False      31m     
kube-apiserver                             4.21.3    True        False         False      25m     
kube-controller-manager                    4.21.3    True        False         False      26m     
kube-scheduler                             4.21.3    True        False         False      28m     
kube-storage-version-migrator              4.21.3    True        False         False      20m     
machine-api                                4.21.3    True        False         False      30m     
machine-approver                           4.21.3    True        False         False      31m     
machine-config                             4.21.3    True        False         False      30m     
marketplace                                4.21.3    True        False         False      30m     
monitoring                                 4.21.3    True        False         False      8m35s   
network                                    4.21.3    True        False         False      31m     
node-tuning                                4.21.3    True        False         False      13m     
olm                                        4.21.3    True        False         False      20m     
openshift-apiserver                        4.21.3    True        False         False      20m     
openshift-controller-manager               4.21.3    True        False         False      20m     
openshift-samples                          4.21.3    True        False         False      20m     
operator-lifecycle-manager                 4.21.3    True        False         False      30m     
operator-lifecycle-manager-catalog         4.21.3    True        False         False      30m     
operator-lifecycle-manager-packageserver   4.21.3    True        False         False      20m     
service-ca                                 4.21.3    True        False         False      31m     
storage                                    4.21.3    True        False         False      31m
```

### NodeとMachine管理
ノードはMachineSetで管理はされていない。
このドキュメントに記載されている通り、ノードを追加するときには、初期構築と同じようにサーバをISOからブートして、OpenShift側でCSRを承認する必要がある。オンプレのときと同じ手順である。
https://docs.oracle.com/ja-jp/iaas/Content/openshift-on-oci/adding-nodes.htm

```shell
$ oc get node
NAME                                                             STATUS   ROLES                  AGE   VERSION
02-00-17-01-2a-05                                                Ready    worker                 22m   v1.34.2
02-00-17-0a-60-90                                                Ready    worker                 22m   v1.34.2
mosuke5-oci-cluster-cp-1.privateocp.openshiftvcn.oraclevcn.com   Ready    control-plane,master   28m   v1.34.2
mosuke5-oci-cluster-cp-2.privateocp.openshiftvcn.oraclevcn.com   Ready    control-plane,master   10m   v1.34.2
mosuke5-oci-cluster-cp-3.privateocp.openshiftvcn.oraclevcn.com   Ready    control-plane,master   28m   v1.34.2

$ oc get machineset -A
No resources found
```

実際に払い出された仮想マシンを見てみる。
Availability domainとFault domainに着目する。マシンはきちんとFD1-3で分散されている。
ノードを追加するときにもFault domain を気にしながらスケールする。

![](/image/openshift-on-oci-servers.png)


### ストレージ

```shell
$ oc get sc
NAME               PROVISIONER                       RECLAIMPOLICY   VOLUMEBINDINGMODE      ALLOWVOLUMEEXPANSION   AGE
oci-bv (default)   blockvolume.csi.oraclecloud.com   Delete          WaitForFirstConsumer   true                   31m
oci-bv-encrypted   blockvolume.csi.oraclecloud.com   Delete          WaitForFirstConsumer   true                   31m

$ oc get sc oci-bv -o yaml
allowVolumeExpansion: true
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
  creationTimestamp: "2026-03-06T21:22:18Z"
  name: oci-bv
  resourceVersion: "742"
  uid: f459381c-0f24-45ba-a5f2-29bf6cbecb43
provisioner: blockvolume.csi.oraclecloud.com
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```


```shell
$ oc get pod
NAME                  READY   STATUS      RESTARTS   AGE
postgresql-1-deploy   0/1     Completed   0          2m27s
postgresql-1-vbmqv    1/1     Running     0          2m24s

$ oc get pvc
NAME         STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   VOLUMEATTRIBUTESCLASS   AGE
postgresql   Bound    csi-d45e4d9e-96b5-462f-a2be-f8407e4bfbcf   50Gi       RWO            oci-bv         <unset>                 2m32s

$ oc get pv
NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM             STORAGECLASS   VOLUMEATTRIBUTESCLASS   REASON   AGE
csi-d45e4d9e-96b5-462f-a2be-f8407e4bfbcf   50Gi       RWO            Delete           Bound    test/postgresql   oci-bv         <unset>                          2m22s
```

![](/image/openshift-on-oci-blockstorage.png)

VPUが10で作成されている。
VPUは、OCIの概念で、ボリューム・パフォーマンス・ユニットの略。ディスクの性能を表す単位。
AWSのEBSとかだと、ボリュームのサイズによって性能値が変わることが多いが、サイズとは別に性能の調整ができる。

VPUの変更はSCの設定で
https://docs.oracle.com/ja-jp/iaas/Content/ContEng/Tasks/contengcreatingpersistentvolumeclaim_topic-Provisioning_PVCs_on_BV.htm#contengcreatingpersistentvolumeclaim_topic_Provisioning_PVCs_on_BV_PV_Volume_performance_Lower-Balanced-Higher

### ネットワーク
まずは、Ingressがどうやって公開されているか確認する。

```shell
$ oc get pod -n openshift-ingress
NAME                              READY   STATUS    RESTARTS      AGE
router-default-58fff575d8-ndd4m   1/1     Running   2 (17m ago)   26m
router-default-58fff575d8-pk5db   1/1     Running   2 (17m ago)   26m

$ oc get service -n openshift-ingress 
NAME                      TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)                   AGE
router-internal-default   ClusterIP   172.30.147.218   <none>        80/TCP,443/TCP,1936/TCP   26m

$ oc get ingresscontrollers.operator.openshift.io default -n openshift-ingress-operator -o yaml | grep endpointPublishingStrategy -A 6
  endpointPublishingStrategy:
    hostNetwork:
      httpPort: 80
      httpsPort: 443
      protocol: TCP
      statsPort: 1936
    type: HostNetwork
```

![](/image/openshift-on-oci-lbs.png)

https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html/installing_on_oracle_distributed_cloud/installing-oci-assisted-installer#installing-troubleshooting-load-balancer_installing-oci-assisted-installer

![](/image/openshift-on-oci-dns-records.png)

### イメージレジストリとオブジェクトストレージ連携
初期段階ではイメージレジストリが有効になっていないので、オブジェクトストレージをバックエンドにして設定してみます。
そもそも、OpenShiftのイメージレジストリのバックエンドにOCIのオブジェクトストレージはありません。
しかし、OCIのオブジェクトストレージはS3互換APIを持っているため、S3として設定していきます。

https://docs.oracle.com/ja-jp/iaas/Content/Object/Tasks/s3compatibleapi_topic-Amazon_S3_Compatibility_API_Support.htm

イメージレジストリ用のオブジェクトストレージを払い出したあと、エンドポイントを作成する必要があります。
https://docs.oracle.com/ja-jp/iaas/Content/Object/Tasks/private-endpoints.htm


![](/image/openshift-on-oci-s3-endpoint.png)


このドキュメントがイメージレジストリの設定方法を説明しています。S3のパートを確認します。
ドキュメントのサンプルコードで足りない箇所は、`regionEndpoint`です。
ここに、上で払い出したS3互換エンドポイントを記載します。

https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html/registry/setting-up-and-configuring-the-registry#configuring-registry-storage-aws-user-infrastructure

以下が実際に設定した内容です。

```shell
$ oc get configs.imageregistry.operator.openshift.io/cluster -o yaml
apiVersion: imageregistry.operator.openshift.io/v1
kind: Config
metadata:
  name: cluster
  ...
spec:
  httpSecret: c728254edbaad696ca446564bab29920280c97891f11846061ba20034223bfbd8e639929506595f55490f413d4a59918f948c83ab9ea64527c63ff5e335f666c
  logLevel: Normal
  managementState: Managed
  observedConfig: null
  operatorLogLevel: Normal
  proxy: {}
  replicas: 1
  requests:
    read:
      maxWaitInQueue: 0s
    write:
      maxWaitInQueue: 0s
  rolloutStrategy: RollingUpdate
  storage:
    managementState: Unmanaged
    s3:
      bucket: mosuke5-oci-cluster-image-registry
      region: ap-tokyo-1
      regionEndpoint: https://openshift-registry-nrqieepzoal0.private.compat.objectstorage.ap-tokyo-1.oci.customer-oci.com
      trustedCA:
        name: ""
      virtualHostedStyle: false
  unsupportedConfigOverrides: null
status:
  ...
  storage:
    managementState: Unmanaged
    s3:
      bucket: mosuke5-oci-cluster-image-registry
      region: ap-tokyo-1
      regionEndpoint: https://openshift-registry-nrqieepzoal0.private.compat.objectstorage.ap-tokyo-1.oci.customer-oci.com
      trustedCA:
        name: ""
      virtualHostedStyle: false
  storageManaged: false
```

レジストリ設定後、BuildConfigを実行し、実際にイメージのオブジェクトが作成されていることを確認しました。

![](/image/openshift-on-oci-registry-objects.png)


## クリーンアップ
作った環境は最後に削除します。
基本的には、Resouce ManagerのStackを削除（Destroy）すればいいです。
が、Terraformが作っていないリソース、たとえばオブジェクトストレージのエンドポイントやDynamic Provisioningで払い出したブロックストレージは手動で削除する必要があります。削除しないとTerraformの削除が通らないので注意が必要です。