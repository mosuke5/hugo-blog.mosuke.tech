+++
categories = ["kubernetes", "virtual-kubelet"]
date = "2019-02-03T15:49:10+09:00"
description = ""
draft = true
image = ""
tags = ["Tech"]
title = "virtual-kubeletは何か。Alibaba Cloud上で実際に動かして検証する"
author = "mosuke5"
archive = ["2019"]
+++

はい、@mosuke5です。  
ここ最近、会社でも少しずつKubernetesに関するはなしなどもでてきており、自分の興味ある分野だったこともあり本腰いれて遊んでおります。
そのなかで、Alibaba CloudもProviderを出しているという、[virtual-kubelet](https://github.com/virtual-kubelet/virtual-kubelet)について気になったので、実際に動かして概念の整理と使いどころについて考えてみました。

例ではAlibaba CloudのKubernetesとECIを使っていますが、基本的な考え方は同じですので、virtual-kubeletについて勉強したい人はぜひ読んでみてください。
<!--more-->

## 各クラウドプロバイダーのサービスと分類
まずvirtual-kubeletの話をする前に、最近のクラウドプロバイダーのコンテナ関連サービスの動向の話をします。
コンテナ、およびkubertenesが流行り始め、クラウドプロバイダー各社が様々なタイプのサービスを提供している現状です。

|プロバイダー|非マネージド|マネージド|ノードレス|
|---|---|---|---|
|Alibaba Cloud|Container Service for Kubernetes|Container Service for Kubernetes(Managed mode)/Swarm|Elastic Container Service(ECI)|
|AWS|-|Amazon ECS, Amazon EKS|Fargate|
|Azure|Azure Container Service(終了予定)|Azure Kubernetes Service(AKS)|Azure Container Instance(ACI)|
|GCP|-|Google Kubernetes Engine(GKE)|-|

- 非マネージド: マスターノード及びワーカーノードすべてが仮想サーバとしてデプロイされる形式のこと。
- マネージド: マスターノードがマネージドサービスとなっており、ユーザが管理する必要がない形式のこと。
- ノードレス: ユーザがクラスタを意識する必要がなく、コンテナイメージの指定で実行できる形式のこと。

コンテナが普及し始め、まだオーケストレーションツールとしてのデファクトスタンダードが決まっていなかったころ、Azure Container Serviceは非マネージド型でオーケストレーションツールをユーザが選択できるものとして提供していました。一方で、AWSはAmazon ECSはAWS独自の仕様としてマネージド型でコンテナサービスを打ち出していました。
時代はKubernetesをデファクトスタンダードになっていき、各社は単純に仮想サーバ上でSwarmやKubernetesをインストールするだけでなく、Kubernetesのマネージドサービスとして出すようになりました。
それに伴い、AzureはAzure Container Serviceの終了を発表し、AKSへの移行をアナウンスしているのも象徴的です。

一方、Kubernetesのマネージドサービスとはいえ、ワーカーノードは仮想マシンで実装されることが多く運用が面倒な面もたくさんあります。
仮想マシンを管理しなくてよいタイプのコンテナサービスもFargateをはじめ各社リリースするようになりました。
それぞれのメリットデメリットがあるため、Kubernetesの拡張としてノードレスのコンテナサービスを利用できるようにしているのが、virtual-kubeletです。

あとは、見る限りエッジコンピューティングも生まれた背景と関連すると見受けられます。
エッジコンピューティングでの実行アプリケーションとして、Kubernetesの拡張としてデプロイできないか、というのも大きく関係していそうです。

## kubeletとは
virtual-kubeletの話の前にもう一つ。
virtual-kubeletのkubeletってなんなのか、みていきます。  
kubeletはkubernetesを構成するコンポーネントの１つです。
公式ドキュメントに下記のように書いてあります。

> An agent that runs on each node in the cluster. It makes sure that containers are running in a pod.
>
> The kubelet takes a set of PodSpecs that are provided through various mechanisms and ensures that the containers described in those PodSpecs are running and healthy. The kubelet doesn’t manage containers which were not created by Kubernetes.

適当に和訳すると、

> クラスター内の各ノードで実行されるエージェント。ポッド内でコンテナを実行させるようにする役割を持ちます。
>
> kubeletは様々な方式を通して提供されるPodSpecsを持ち、それらのPodSpecsに記載されたコンテナを実行し正常な状態であるようにするものです。kubeletはKubernetes以外によって作られたコンテナの管理は行いません。

つまり、kubeletは、Kubernetesクラスターのワーカーノード内で動作しているエージェントで、"実際のコンテナの起動などを担うコンポーネント"である、ということです。

## virtual-kubeletとは
それではいよいよvirtual-kubeletとは何かについて触れていきます。
まずは、[公式ドキュメント](https://github.com/virtual-kubelet/virtual-kubelet)から見ていきましょう。

> Virtual Kubelet is an open source Kubernetes kubelet implementation that masquerades as a kubelet for the purposes of connecting Kubernetes to other APIs. This allows the nodes to be backed by other services like ACI, AWS Fargate, Hyper.sh, IoT Edge etc. The primary scenario for VK is enabling the extension of the Kubernetes API into serverless container platforms like ACI, Fargate, and Hyper.sh, though we are open to others.

こちらも適当に訳すと。。

> Virtual KubeletはオープンソースのKubernetes kubelet実装の１つで、他のAPIと接続することを目的にしたKubeletである。これは、ノードがACI, AWS Fargate, Hyper.sh, IoT Edgeなどのほかのサービスに支えられることを実現します。VKの主なシナリオはKubernetes APIをACI, Fargate, and Hyper.shなどのサーバレスコンテナプラットフォームへの拡張を可能にすることです。

公式ドキュメントにある図を参考に、より具体的にvirtual-kubeletの概念を図で表してみました。
virtual-kubeletを動作させると、仮想のWorkerノードを登録します。
Kubernetesからvirtual-kubeletのノードにPodの配置を行うと、virtual-kubeletのプロセスは、プロセス起動時に指定した拡張リソース（右上のAliaba ECIやFargate）へPodを配置します。
つまり、普段はKubernetesの通常のクラスターを扱いながら、特定のワークロードだけKuernetesの拡張として、ノードレスのサービス側で実行することができるということです。

![virtual-kubelet-overview](/image/virtual-kubelet-overview.png)

## ECIとは
実際にvirtual-kubeletが拡張先として利用するノードレスのコンテナサービスとはどんなサービスなのか見てみましょう。
ここではAlibaba Cloudの新サービスである[Elastic Container Instance](https://www.alibabacloud.com/products/elastic-container-instance)(略称ECI)をターゲットにして説明します。

ECIは非常にシンプルなサービスです。
CLIから実行できるAPIリストをみても、現在６つだけです。

```
$ aliyun eci help
Available Api List:
  CreateContainerGroup
  DeleteContainerGroup
  DescribeContainerGroupPrice
  DescribeContainerGroups
  DescribeContainerLog
  ExecContainerCommand
```

ECIは基本的にContainerGroupを作成・削除、コマンド実行、そのほかログや状態閲覧しかできません。
ContainerGroupと呼ばれているものが、Kubernetesでいう[Podと似た概念](https://www.alibabacloud.com/help/doc-detail/91315.htm)で、ネットワークやストレージなどのリソースを共有する複数のコンテナの集合体のことです。

設定できる項目は主に下記の通りで、KubernetesのPodsとおおよそ同じですが、VPCやSecutiryGroupはクラウド特有の設定になります。  
ECIは、実際のコンテナを実行するためのノードを持たなくても、実行イメージを指定さえすれば実行できるというのが最大の特徴です。

- コンテナを配置する場所: リージョンやゾーン、VPCなど
- グローバルIPを付与するかどうか
- セキュリティグループ
- ボリューム
    - NFS Volume, Config File Volume, Empty Dir Volume
- Container Groupの設定
    - DockerイメージやCPU、メモリーなどリソースの設定

## virtual-kubeletをインストール
では、実際にvirtual-kubeletを動作させてみます。
[公式ドキュメント](https://github.com/virtual-kubelet/virtual-kubelet/blob/master/providers/alibabacloud/README.md)に起動方法がかいてあるのですが、少し説明不十分なところがあるので補っていきます。

まず、初心者の自分が勘違いしていたのは、このレポジトリをビルドしてできるバイナリーは、常駐プロセスになっており、手元のローカルで動かしてもいいのですが、Kubernetesクラスター上で動かすほうが合理的です。
virtual-kubeletをKubernetes上で動かすためのサンプルのYAMLは中国語ですが[こちら](https://help.aliyun.com/document_detail/97527.html)にありました。
自分は最終的に以下で動かしました。

```yaml
# virtual-kubelet.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: alicloud-virtual-kubelet
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRoleBinding
metadata:
  name: alicloud-virtual-kubelet
  namespace: default
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: alicloud-virtual-kubelet
    namespace: default
---
apiVersion: apps/v1beta2
kind: Deployment
metadata:
  name: alicloud-virtual-kubelet
  namespace: default
  labels:
    app: alicloud-virtual-kubelet
spec:
  replicas: 1
  selector:
    matchLabels:
      app: alicloud-virtual-kubelet
  template:
    metadata:
      labels:
        app: alicloud-virtual-kubelet
    spec:
      serviceAccount: alicloud-virtual-kubelet
      containers:
      - name: alicloud-virtual-kubelet
        image: registry.cn-hangzhou.aliyuncs.com/ask/virtual-nodes-eci:v1.0.0.1-aliyun
        imagePullPolicy: Always
        args: ["--provider", "alibabacloud"]
        env:
        - name: KUBELET_PORT
          value: "10250"
        - name: VKUBELET_POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        - name: VKUBELET_TAINT_KEY
          value: "alibabacloud.com/eci"
        - name: VKUBELET_TAINT_EFFECT
          value: "NoSchedule"
        - name: ECI_REGION
          value: "us-west-1"
        - name: ECI_VSWITCH
          value: "YOUR VSWITCH ID"
        - name: ECI_SECURITY_GROUP
          value: "YOUR SECURITY GROUP ID"
        - name: ECI_ACCESS_KEY
          value: "YOUR ACCESS KEY"
        - name: ECI_SECRET_KEY
          value: "YOUR SECRET KEY"
```

上のマニュフェストを実行後、ノードとPodを確認すると動いていることが確認できるはずです。
ノードでは実在はしないが仮想ノードとして"virtual-kubelet"というのが追加されています。
このノードを登録し、司令塔をだすのがpodで表示される"alicloud-virtual-kubelet-xxxxx"になります。

```
$ kubectl apply -f virtual-kubelet.yaml
$ kubectl get node
NAME                                    STATUS    ROLES     AGE       VERSION
ap-northeast-1.i-6we4hocj9kh3qr082fxq   Ready     <none>    12d       v1.11.5
ap-northeast-1.i-6we4hocj9kh3qr082fxr   Ready     <none>    12d       v1.11.5
ap-northeast-1.i-6we9xja5r3v6bx6ialw6   Ready     master    62d       v1.11.5
ap-northeast-1.i-6wef05frowkd82mmlq01   Ready     master    62d       v1.11.5
ap-northeast-1.i-6wef05frowkd82mmlq02   Ready     master    62d       v1.11.5
virtual-kubelet                         Ready     agent     4d        v1.11.2

$ kubectl get pods
NAME                                        READY     STATUS           RESTARTS   AGE
alicloud-virtual-kubelet-55d7c8b89d-khjsh   1/1       Running          0          3d
```

## virtual-kubeletでECIを操作する
それでは、次にさっそく、KubernetesからこのECIに対してPodを配置してみたいと思います。
virtual-kubeletのノードに対してnginxを実行させる簡単なマニュフェストを用意して実行します。  
nodeSelectorでvirtual-kubeletのノードを指定し、そこに配置するようにマニュフェストを書きます。

```yaml
# vk_pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: mypod
spec:
  containers:
  - image: nginx:latest
    imagePullPolicy: Always
    name: nginx
  nodeSelector:
    kubernetes.io/role: agent
    beta.kubernetes.io/os: linux
    type: virtual-kubelet
  tolerations:
  - key: alibabacloud.com/eci
    operator: "Exists"
    effect: NoSchedule
```

```
$ kubectl apply -f vk_pod.yaml
$ kubectl get pods
NAME                                        READY     STATUS           RESTARTS   AGE
alicloud-virtual-kubelet-55d7c8b89d-khjsh   1/1       Running          0          3d
mypod                                       1/1       Running          0          3d
```

実際にECI側のコンソールを見てみるとちゃんとコンテナが起動していました。  
![virtual-kubelet-ec-console](/image/virtual-kubelet-eci-console.png)

### ECIのネットワーク
virtual-kubeletのプロセスを起動させるときに、もしKubernetesクラスターと同じネットワークを指定すれば、KubernetesのPodとECIで動作するコンテナは同一のネットワークにすることができます。。
これは幾分か使い勝手がいいと思います。例えばバッチ処理のようなものをECIで実行したとしても、データベースなどにアクセスしやすいですね。利用しているKubernetesクラスターと拡張先が同じネットワークだとできることがいろいろと広がると考えています。

![virtual-kubelet-eci](/image/virtual-kubelet-eci.png)

## さいごに
長くなりましたが、virtual-kubeletの概要と実際にAlibaba Cloudで動作させてみた例でした。
本ブログではAlibaba Cloudを例にしましたが、基本概念は他の場合でもほぼ同じでしょう。理解を深めるのに利用してもらえればと思います。