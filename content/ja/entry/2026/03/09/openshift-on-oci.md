+++
categories = ["OpenShift", "Oracle Cloud Infrastructure"]
date = "2026-03-09T10:01:05+09:00"
description = "Oracle Cloud Infrastructure (OCI) 上にAssisted Installerを利用してOpenShiftをインストールする手順やハマりどころを解説します。Terraformを使ったインフラ構築から各種設定まで。"
draft = false
image = "/image/openshift-on-oci-header.png"
tags = ["Tech"]
title = "OCI (Oracle Cloud Infrastructure) 上にOpenShift 4.21 を構築してみた備忘録"
author = "mosuke5"
archive = ["2026"]
+++

こんにちは、もーすけです。

今回は、OCI（Oracle Cloud Infrastructure）上にOpenShiftを構築してみたので、その備忘録として記事を書きました。
あまりインターネット上に実績を公開している人が少ないようなので、これから構築に挑戦する方の助けになれば嬉しいです。

私自身、長らくOpenShiftに携わっていますが、マネージドサービス以外の初期構築（自作）をするのは数年ぶりでした。
そして実は、Assisted Installerを使うのも初めてですし、OCIを触るのも初めてでした。。。
初めて尽くしでしたが、いろいろと調べながら1日くらいで構築することができました！

<!--more-->

## 環境
- **クラウドアカウント**: OCI（個人アカウント）
  - 無料枠だと様々な制限があって完結しないためご注意ください。
- **OpenShiftバージョン**: 4.21
- **インストール方法**: Assisted Installerを使用

## 構築の流れとポイント

### ドキュメントについて
基本的には以下の公式ドキュメントを見ながら進めました。
注意点として、OpenShift 4.19まではドキュメントのタイトルが「Installing on OCI」だったのですが、4.20からは「Installing on Oracle Distributed Cloud」に変更されています。最初はどこにドキュメントがあるのか迷ってしまいました。  
{{< external_link url="https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html/installing_on_oracle_distributed_cloud/installing-oci-assisted-installer" title="Installing a cluster on Oracle Distributed Cloud by using the Assisted Installer" >}}


また、Oracle側が提供しているドキュメントも併せて確認することをおすすめします。  
{{< external_link url="https://docs.oracle.com/en-us/iaas/Content/openshift-on-oci/overview.htm" title="Red Hat OpenShift on Oracle Cloud Infrastructure" >}}

ここから先は、ドキュメントの各セクションごとにポイントを記載していきますね。

### 1.1. Supported Oracle Distributed Cloud infrastructures
「Oracle Distributed Cloud」という名前ですが、これは通常のパブリックなクラウドとGovernmentクラウドなどの特殊なものを統合した総称なのでしょうか？Oracleにあまり精通していないため正確なところはわかりませんでしたが、今のところそのような解釈をしています。

### 1.2. About the Assisted Installer and Oracle Distributed Cloud integration
ワークフローが記載されている非常に重要な部分です。  
Red Hat側で行う作業と、Oracle側で行う作業の境界が明確に示されているので、作業前に必ず確認しておきましょう。

![](/image/openshift-on-oci-workflow.png)

### 1.3. Preparing the Oracle Distributed Cloud environment
こちらは作業を始める前の事前準備になります。
OCIを初めて触る人にとっては、いくつか見慣れない概念が出てきます。

まずは「コンパートメント（Compartment）」です。一言で言えば「クラウド上のリソースを整理・隔離するための論理的なフォルダ」のことです。同一アカウント内で、プロジェクト別や環境別（開発・検証・本番）、部署別などにリソースを分けて管理できるようになります。AWSにはあまり似たような概念がないかもしれませんが、Azureの「リソースグループ」に近いかもしれませんね。

ドキュメントを読むと `create-cluster-vX.X.X.zip` をGitHubからダウンロードするように書かれていますが、中身はTerraformなどのスクリプトが入っています。
「なぜこれが必要なの？」と最初は戸惑いましたが、端的に言うと、OCIではリソース管理サービス（CloudFormation的なサービス）がTerraformベースで実装されているためです。つまり、OpenShiftを構築するのに必要なインフラリソースを作るためのTerraformスクリプトをダウンロードせよ、ということなんですね。

### 1.4. Using the Assisted Installer to generate a discovery ISO image
ここからはRed Hat側での作業になり、Assisted Installerで使うISOイメージを作成していきます。
ここはドキュメント通りに進めればそれほど迷うことはありません。ポイントは以下の2点です。

- **Cluster name**: この後の作業で必要になるのでメモしておきます。
- **Base domain**: 今回は `mosuke5.com` を使い、OCIのDNS管理ツールで利用できるようにネームサーバーを変更しておきました。OCIで管理すると、なんとTerraformの中でドメインのレコード登録まで自動でやってくれます。もちろん、別のDNSサービスで管理していても大丈夫です。

### 1.5 の前） リソース属性タグ
残念ながらRed Hat側のドキュメントに記載がないのですが、Terraform stackをApplyする前に **リソース属性タグ（Resource attribution tags）** を設定しておく必要があります。次のドキュメントを見て確実に対応しておきましょう。
エラーログを取り忘れてしまったのですが、これを設定しないとTerraformのApplyが失敗してしまいます。


{{< external_link url="https://docs.oracle.com/ja-jp/iaas/Content/openshift-on-oci/install-prereq.htm#resource_attribution_tags" title="リソース属性タグ" >}}

### 1.5. Provisioning OCI infrastructure for your cluster
このあたりから再びOCIの作業になり、見慣れない設定も増えてきます。

まずは、1.4でダウンロードしたISOイメージをオブジェクトストレージにアップロードします。これは、Terraformで作成したインスタンスがこのイメージを読み込めるようにするためです。

バケットをPublic公開することはできないので、**Pre-Authenticated Request (PAR)** を使って外部から取得できるように設定します。名前の通りですが、期間限定でURLを知っている人だけがダウンロードできるようにする仕組みですね。AWSのS3でいう「署名付きURL (Presigned URL)」に該当するものです。

そして、いよいよTerraform stackを `apply` するタイミングです。  
しかし、いろいろと戸惑います。

ひとつめは、「どこからTerraform stackをApplyするのか？」です。結論としては、OCIの**Resource Manager**のサービスから行います。OCIのコンソールで「開発者サービス」→「Red Hat OpenShift」と選択すれば、そこから実行できます。

そしてもうひとつ、少なくとも2026年3月9日時点では、OpenShift側のドキュメントが少し古いようです。  
ドキュメントには「Terraform stackをオブジェクトストレージにアップロードする」と書かれていますが、その必要はありませんでした。Oracle側のドキュメントを参照することを強く推奨します。

OCIのコンソールで「開発者サービス」→「Red Hat OpenShift」と選択すれば、初めから最新版のStackが利用できるようになっています。
もし古いバージョンのStackを使いたい場合は、Resource Managementのサービスに行って新規にStackを作れば、任意のファイルをアップロードすることが可能です。

![Stackのドキュメントのバグ？](/image/openshift-on-oci-docs-bug.png)

### 1.5 の補足）クラスタの詳細設定
実際の企業のユースケースだと、OpenShiftをプライベートクラスタにしたい、既存のVCN（AWSでいうところのVPC）上に作りたいといったことが起きるでしょう。
こういったクラスタの設定は、1.5でできます。Terraformに渡すパラメータで調整が可能です。

また、OpenShiftのノードに利用できるインスタンスシェイプ（AWSでいうインスタンスタイプ）のサポート状況は以下に記載があります。現時点では、そんなに多くのシェイプには対応していないですが、OCIの場合はシェイプと実際のCPUやメモリの搭載量は関係ありません。自分で調整可能なので、少なく見えるだけとも言えるかも。

{{< external_link url="https://docs.oracle.com/en-us/iaas/Content/openshift-on-oci/overview.htm#supported-shapes" title="Supported Shapes" >}}

### 1.6. Completing the remaining Assisted Installer steps
ここから、またRed Hat側の作業に戻ります。  
特にハマるポイントはありません。インストール自体には1時間くらいかかるので、気長に待ちましょう。

![](/image/openshift-on-oci-installation-progress.png)

## 確認観点

無事にインストールが完了すると、`kubeadmin` アカウントが払い出されるので、それでログインして各項目の確認をしていきます。

### バージョン情報
まずはバージョンの確認です。  
期待通り、しっかりと4.21がインストールされています。

```shell
$ oc version          
Client Version: 4.20.1
Kustomize Version: v5.6.0
Server Version: 4.21.3
Kubernetes Version: v1.34.2
```

### Cluster Operator
Cluster Operatorが正常に動いているか確認します。
特別、OCI固有のOperatorが動いているような気配はありませんでした。

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
ノードはMachineSetで管理されているわけではありませんでした。
以下のドキュメントに記載されている通り、ノードを追加する際には、初期構築と同じようにサーバーをISOからブートして、OpenShift側でCSRを承認する必要があります。オンプレミス環境に構築する時と同じ手順ですね。

{{< external_link url="https://docs.oracle.com/ja-jp/iaas/Content/openshift-on-oci/adding-nodes.htm" title="Adding Nodes to a Red Hat OpenShift Cluster" >}}

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

実際にOCI側で払い出された仮想マシンも確認してみます。
Availability domainとFault domainに着目すると、マシンがきちんとFD1-3に分散されて配置されていることがわかります。ノードを追加する際も、このFault domainを意識しながらスケールさせる必要がありますね。

![OCIのサーバ一覧](/image/openshift-on-oci-servers.png)

### ストレージ
ストレージについての確認です。デフォルトで `oci-bv` (Block Volume) が設定されています。

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

実際にPostgreSQLのPodを立ててPVCを要求してみたところ、正常にBoundされました。

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

OCIのコンソールからも作成されたブロックボリュームが確認できます。

![オブジェクトストレージ](/image/openshift-on-oci-blockstorage.png)

ここで面白いのが、**VPU (Volume Performance Units)** が「10」で作成されている点です。
VPUはディスクの性能を表すOCI独自の単位です。AWSのEBSなどではボリュームのサイズによって性能値（IOPSなど）が変わることが多いですが、OCIではサイズとは独立して性能の調整ができるようになっています。
VPUを変更したい場合は、StorageClassの設定で変更できるようです。

{{< external_link url="https://docs.oracle.com/ja-jp/iaas/Content/ContEng/Tasks/contengcreatingpersistentvolumeclaim_topic-Provisioning_PVCs_on_BV.htm#contengcreatingpersistentvolumeclaim_topic_Provisioning_PVCs_on_BV_PV_Volume_performance_Lower-Balanced-Higher" title="ブロック・ボリュームにPVCをプロビジョニングする場合" >}}

### ネットワーク（Ingress）
Ingressがどのように公開されているかも確認しておきます。

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

LoadBalancerサービスではなく、`HostNetwork` タイプで公開されていました。
ルーター（Ingress Controller）のPodが動作しているワーカーノードのポートを直接公開し、OCIのロードバランサーがそのワーカーノードにトラフィックを振り分ける構成になっているようです。

![Load Balancer](/image/openshift-on-oci-lbs.png)

上の画像でLBのステータスが赤くなってUnhealthy状態ですが、こちらについては公式ドキュメントに言及があります。  
{{< external_link url="https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html/installing_on_oracle_distributed_cloud/installing-oci-assisted-installer#installing-troubleshooting-load-balancer_installing-oci-assisted-installer" title="1.9.1. The Ingress Load Balancer in Oracle Distributed Cloud is not at a healthy status" >}}

### DNS
DNSレコードの設定もこのようになっていました。ここらへんはいつもどおりですね。

![DNS Records](/image/openshift-on-oci-dns-records.png)

### イメージレジストリとオブジェクトストレージの連携
初期段階ではイメージレジストリが有効になっていないため、OCIのオブジェクトストレージをバックエンドにして設定してみます。

そもそも、OpenShiftのイメージレジストリのバックエンドとして「OCIオブジェクトストレージ」という選択肢はネイティブには存在しません。しかし、OCIのオブジェクトストレージは**S3互換API**を備えているため、AWS S3として設定していけばOKです。

{{< external_link url="https://docs.oracle.com/ja-jp/iaas/Content/Object/Tasks/s3compatibleapi_topic-Amazon_S3_Compatibility_API_Support.htm" title="オブジェクト・ストレージのAmazon S3 Compatibility APIのサポート" >}}

まずはイメージレジストリ用のオブジェクトストレージを払い出し、次にプライベートエンドポイントを作成します。

{{< external_link url="https://docs.oracle.com/ja-jp/iaas/Content/Object/Tasks/private-endpoints.htm" title="オブジェクト・ストレージのプライベート・エンドポイント" >}}

払い出したエンドポイント。  
![S3 Endpoint](/image/openshift-on-oci-s3-endpoint.png)

以下のドキュメントの「S3」のパートを参考に設定を進めます。  
{{< external_link url="https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html/registry/setting-up-and-configuring-the-registry#configuring-registry-storage-aws-user-infrastructure" title="Configuring the registry for Amazon S3" >}}

ドキュメントのサンプルコードにはない項目として、`regionEndpoint` を指定する必要があります。ここに先ほど払い出したS3互換エンドポイントのURLを記載します。

```shell
$ oc get configs.imageregistry.operator.openshift.io/cluster -o yaml
apiVersion: imageregistry.operator.openshift.io/v1
kind: Config
metadata:
  name: cluster
  # ...
spec:
  # ...
  storage:
    managementState: Unmanaged
    s3:
      bucket: mosuke5-oci-cluster-image-registry
      region: ap-tokyo-1
      regionEndpoint: https://openshift-registry-nrqieepzoal0.private.compat.objectstorage.ap-tokyo-1.oci.customer-oci.com
      virtualHostedStyle: false
      trustedCA:
        name: ""
```

レジストリの設定後、`BuildConfig`を実行し、実際にイメージがオブジェクトストレージにプッシュされていることを確認できました。

![Registry Objects](/image/openshift-on-oci-registry-objects.png)

## 課題
今回時間の都合で、確認したかったけれどできていない点がひとつあります。  
それは、OpenShift Loggingを使用する際のLokiのバックエンドとして、レジストリと同じようにオブジェクトストレージを使えるかどうかです。構造上は問題ないと思っていますが、本格的に利用する場合は事前にチェックしておきましょう。

## 費用
どれだけOpenShiftを起動していたかに依存しますが、今回の確認をするためにかかった費用は**841円**でした。

![Costs](/image/openshift-on-oci-costs.png)

## まとめとクリーンアップの注意点
検証が終わったら環境を削除します。
基本的には、Resource ManagerのStackを削除（Destroy）すればインフラリソースは消えてくれます。

ただし、**Terraform管理外のリソースは手動で削除する必要がある**ので注意してください。
例えば、上記で手動作成したオブジェクトストレージのエンドポイントや、OpenShift上からDynamic Provisioningで払い出したブロックストレージ（PVC）などです。これらを先に削除しておかないと、TerraformのDestroyが失敗してしまいます。

OCI上でのOpenShift構築、初めてのことだらけでしたが意外とすんなりいきました。
OCI独自の実装も少なく、今までOpenShiftを構築・運用してきた人なら、すぐに理解できる構成になっていると思います。
ぜひ皆さんも試してみてください。それでは！