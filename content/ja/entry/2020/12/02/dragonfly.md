+++
categories = ["Alibaba Cloud", "Kubernetes"]
date = "2020-12-02T00:00:00+09:00"
description = "超大規模環境でのコンテナイメージの配布に役立つといわれている、P2Pでのファイル配布ソフトウェアのDragonflyをさわってみました。Alibaba Cloudとの関係性などがみえてきます。"
draft = false
image = ""
tags = ["Tech"]
title = "P2Pでコンテナイメージを配信できるDragonflyとAlibaba Cloudのなぞ"
author = "mosuke5"
archive = ["2020"]
+++

こんにちは、もーすけです。  
ここ最近、ワケアッて少しAlibaba Cloud関連のKubernetesについて調べています。
ちなみにこちらの記事は[Alibaba Cloud Adovent Calender 2020](https://qiita.com/advent-calendar/2020/alibabacloud)の2日目の投稿です。

Alibaba Cloudの中の人をやめて、もう1年半以上たちますが、まだこうやって調べるとは思わなかったです。いまになっていろいろAlibaba Cloudが取り組んでいるコンテナ関連のことがよく理解できるようになってきました（笑）
本日はアリババ/Alibaba Cloudが開発するP2Pのファイル配信ソフトウェアのDragonflyについて少し書いてみたいと思います。（まだ調べ中のところもあるので許してください）

## Dragonflyとは
Dragonflyは、アリババおよびAlibaba Cloudがメインとなって開発している、オープンソースのP2Pファイル配信の仕組みです。  
よくコンテナイメージの配信のためのソフトウェアといわれることもありますが、実態はコンテナイメージだけでなく、どんなファイルにも活用できるものです。
コンテナ時代より前からアリババが研究していた効率的なアプリケーションの配布、キャッシュの配布、ログの配布、画像の配布がもとになっています。
現代のクラウドネイティブの環境になってコンテナイメージの配布にも活用されてきているということです。
その目標は、クラウドネイティブのシナリオにおけるすべての配布問題に取り組むことです。現在、Dragonflyは以下の点に焦点を当てています。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://github.com/dragonflyoss/Dragonfly" data-iframely-url="//cdn.iframe.ly/VOFvh8T"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>
<!--more-->

## なぜ開発されたか
なぜアリババはDragonflyを作ったかという理由は、アリババのビジネスにあります。
とくに11月11日のネットショップの大規模セール（通称：ダブルイレブンとか独身の日とかと呼ばれるもの）期間中のアプリケーションの更新やファイルのやりとりを高速にすすめる必要があったといいます。
当初はファイルサーバを構築していましたが、ファイルサーバをスケールすればするほどバックエンドのストレージがボトルネックとなり、単一の一箇所から配信することに無理があると考えたとのことです。
そういった背景からP2P形式のファイル配布の仕組みが必要になったということです。
Dragonflyはすでにアリババ内部では、月間平均20億回の配信を突破し、3.4PBのデータを配信しているらしいです（2018年情報のためいまはもっとだと思います）。

ダブルイレブンの裏側のテクノロジーシリーズのブログでも紹介されているので英語ですが見てみてください。  
<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://www.alibabacloud.com/blog/behind-alibabas-double-11-mysterious-dragonfly-technology-%25C2%25AEc-pb-grade-large-file-distribution-system_594074" data-iframely-url="//cdn.iframe.ly/ox1iIKX?iframe=card-small"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

## アーキテクチャ
Dragonfly自身は、下の図にあるようにCluster Managerと書かれているSupernodeと、dfget proxyと書かれているdfclientの2つの要素で構成されます。
Kubernetes環境だと、dfclientはDaemonSetとして各ノードに配置されます。Kubeletがイメージをプルする先として考えると納得がいく構成です。

![architecture](/image/dragonfly-architecture-overview.png)

## 実践 on Kubernetes
というわけで、さっそくKubernetesクラスタにインストールして使ってみたいと思います。  
KubernetesクラスタへのインストールはHelmが利用できます。ほとんどドキュメントがなくて困りますが[こちらのレポジトリ](https://github.com/dragonflyoss/helm-chart)からHelm Chartをダウンロードできます。

```text
$ git clone https://github.com/dragonflyoss/helm-chart
$ cd helm-chart
$ helm install dragonfly .
$ helm ls
NAME     	NAMESPACE	REVISION	UPDATED                             	STATUS  	CHART          	APP VERSION
dragonfly	dragonfly	1       	2020-11-30 23:15:29.031824 +0900 JST	deployed	dragonfly-0.4.3	0.4.3
```

Kubernetesクラスタ内で以下のように起動していれば問題ないです。

```text
$ kubectl get pod,daemonset,deployment,service
NAME                                      READY   STATUS    RESTARTS   AGE
pod/dragonfly-dfclient-2rpc4              1/1     Running   0          15h
pod/dragonfly-dfclient-cwfdk              1/1     Running   0          15h
pod/dragonfly-dfclient-jqb8s              1/1     Running   0          15h
pod/dragonfly-dfclient-l8z4f              1/1     Running   0          15h
pod/dragonfly-dfclient-lmjbv              1/1     Running   0          15h
pod/dragonfly-supernode-6bc9859db-hfm5v   1/1     Running   0          6m2s

NAME                                DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
daemonset.apps/dragonfly-dfclient   5         5         5       5            5           <none>          16h

NAME                                  READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/dragonfly-supernode   1/1     1            1           16h

NAME                          TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)             AGE
service/dragonfly-supernode   ClusterIP   172.30.112.149   <none>        8002/TCP,8001/TCP   16h
```

`dragonfly-dfclient` はDaemonSetとして起動します。各ノードでイメージのプルを行う際に差し込めるように、HostNetworkを用いてHostのポートでサービスをListenします。
HostNetworkが許可されたServiceAccountを用いて起動する必要があります。  
また、Kubernetesの各ノードでKubeletがイメージをぷるするときに `localhost:65001` 経由でイメージを取得できるようにする必要があります。

```text
$ kubectl get daemonset dragonfly-dfclient -o yaml
...
    spec:
      containers:
      - env:
        - name: HOSTNAME
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: spec.nodeName
        image: dragonflyoss/dfclient:1.0.0
        imagePullPolicy: IfNotPresent
        name: dfclient
        ports:
        - containerPort: 65001
          hostPort: 65001
          name: http
          protocol: TCP
```

```text
worker $ cat /etc/containers/registries.conf
unqualified-search-registries = ["registry.access.redhat.com", "docker.io"]

[[registry]]
  prefix = ""
  location = "docker.io/library/ruby"
  mirror-by-digest-only = true

  [[registry.mirror]]
    location = "localhost:65001/library/ruby"
```

ではとあるWorkerノードにアクセスし、`crictl`でイメージをプルします。
KubernetesのランタイムにDockerを利用している人はDockerで代用してください。
スピードが上がっていることはわかりましたが、おそらく規模が大きくならないと恩恵は受けなさそう。

```text
worker # time crictl pull ruby@sha256:ba90dbc14a0407
Image is up to date for docker.io/library/ruby@sha256:ba90dbc14a04073f6aa75951ce9c6bcf7715372d7b2e1d69e48593496951fd14

real	0m41.458s
user	0m28.158s
sys	0m5.830s

sh-4.4# crictl rmi ruby:buster
Deleted: docker.io/library/ruby:buster

worker # time crictl pull ruby@sha256:ba90dbc14a0407
Image is up to date for docker.io/library/ruby@sha256:ba90dbc14a04073f6aa75951ce9c6bcf7715372d7b2e1d69e48593496951fd14

real	0m35.761s
user	0m28.453s
sys	0m5.823s

```

ダウンロード後に、supernode側のキャッシュを見てみます。
Rubyのイメージのレイヤーごとにキャッシュされていることが確認できました。
おそらくコンテナイメージの場合はレイヤーごとに分散配信できるように実装されています。

```text
df-supernode $ ls -l /home/admin/supernode/repo/download
total 0
drwxr-xr-x    2 root     root           231 Dec  1 08:54 1c1
drwxr-xr-x    2 root     root           231 Dec  1 08:53 38c
drwxr-xr-x    2 root     root           231 Dec  1 08:54 3fd
drwxr-xr-x    2 root     root           231 Dec  1 08:54 692
drwxr-xr-x    2 root     root           231 Dec  1 08:54 885
drwxr-xr-x    2 root     root           231 Dec  1 08:54 c60
drwxr-xr-x    2 root     root           231 Dec  1 08:54 dad
drwxr-xr-x    2 root     root           231 Dec  1 08:54 de2
drwxr-xr-x    2 root     root           231 Dec  1 08:54 e9f

df-supernode $ ls -l e9f
total 9772
-rw-r--r--    1 root     root       9996248 Dec  1 08:54 e9fd2813be89296fc43839140fe0d0b305c3dda9c07ddd6bb883b4d1a50f72bc
-rw-r--r--    1 root     root           196 Dec  1 09:20 e9fd2813be89296fc43839140fe0d0b305c3dda9c07ddd6bb883b4d1a50f72bc.md5
-rw-r--r--    1 root     root           480 Dec  1 09:20 e9fd2813be89296fc43839140fe0d0b305c3dda9c07ddd6bb883b4d1a50f72bc.meta

df-supernode $ cat e9f/e9fd2813be89296fc43839140fe0d0b305c3dda9c07ddd6bb883b4d1a50f72bc.meta
{
	"taskID": "e9fd2813be89296fc43839140fe0d0b305c3dda9c07ddd6bb883b4d1a50f72bc",
	"url": "https://index.docker.io/v2/library/ruby/blobs/sha256:5f37a0a41b6b03489dd7de0aa2a79e369fd8b219bbc36b52f3f9790dc128e74b",
	"pieceSize": 4194304,
	"httpFileLen": 9996233,
	"bizId": "",
	"accessTime": 1606814440859,
	"interval": 967525,
	"fileLength": 9996248,
	"md5": "",
	"realMd5": "fba85c3ebf25dda4426e1d9ae038d386",
	"lastModified": 1605660582000,
	"eTag": "\"fba85c3ebf25dda4426e1d9ae038d386\"",
	"finish": true,
	"success": true
}
```

## Alibaba Cloud Container RegistryとDragonfly
Alibaba CloudにはContainer Registryのサービスがあります。
最近、本サービスにも[Enterprise Edition](https://www.alibabacloud.com/help/doc-detail/111958.htm)が追加されました。その機能のひとつにP2Pによる高速化があります（[公式ドキュメント: P2P acceleration](https://www.alibabacloud.com/help/doc-detail/120603.htm)）。
これは、まさにDragonflyを使った実装となります。

以下の画像はKubeConの資料から拝借したものですが、下記のような仕組みになっています。  
Enterprise EditionのContainer Registryを購入すると、セットアップスクリプトがでてきます。こちらのスクリプトを実行すると、DaemonSetとして、各ノードにdf-daemonがデプロイされます。
そして、Container Registry自身が、マネージドのSupernodeの役割として動きます。与えられたP2P配信用のURLでコンテナイメージをプルすることができるようになります。

![dragonfly-on-alibaba-cloud](/image/dragonfly-on-alibaba-cloud.png)

## Reference
参考になったリンクを張っておきます。

1. https://www.alibabacloud.com/help/doc-detail/120603.htm
1. https://www.youtube.com/watch?v=tTNW4lq5mes
1. https://www.alibabacloud.com/blog/behind-alibabas-double-11-mysterious-dragonfly-technology-%C2%AEc-pb-grade-large-file-distribution-system_594074
1. https://kccnceu19.sched.com/event/MPha
1. https://www.alibabacloud.com/help/doc-detail/111958.htm