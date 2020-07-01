+++
categories = ["Kubernetes"]
date = "2020-07-01T23:00:53+09:00"
description = "Sock Shopを使ったマイクロサービス体験ハンズオンにサービスメッシュを追加しました。サービスメッシュがどのような価値を生むのか自分の身体で体験するのにご活用ください。"
draft = false
image = ""
tags = ["Tech"]
title = "Sock Shopを使ったサービスメッシュ体験のハンズオン"
author = "mosuke5"
archive = ["2020"]
+++

おひさしぶりです。もーすけです。  
あっという間に６月が終わってしまい、６月はブログが書けませんでしたが、ブログで書きたいなと思うネタはいくつかありますので、時間のすきをみつけて書いていきたいと思います。

以前に、Sock Shopを使ったマイクロサービスのハンズオン体験についてのブログを書きました。
このネタに、Istioを使ったサービスメッシュを適応するハンズオンを追加したのでお知らせします。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2020/01/22/sockshop/" data-iframely-url="//cdn.iframe.ly/YDI2rVR"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

<!--more-->

## サービスメッシュとはなにか
ここ最近、サービスメッシュを実際に手を動かしたりして学んでみて、サービスメッシュは「アプリケーションのすべてのトラフィックをSoftware Definedに制御できる仕組み」と理解しました。
マイクロサービス化によって発生しうる、多くのネットワークに関する問題を、Kubernetesリソースとして管理しソフトウェア制御ができるようにすることで解決していくものです。
このブログでは、サービスメッシュとはなにかを語るものではないですが、おそらくこのハンズオンを体験していただくと、その意味というのが理解できてくると感じています。  

## どのように体験できるか
Istioのサンプルアプリケーションとして、よくbookinfoが利用されます。
bookinfoは軽量なアプリケーションでよいのですが、「マイクロサービスを学ぶ」という文脈ではシンプルすぎて物足りなさを感じます。その点、Sock Shopはデータストアもあり、非同期通信もありとマイクロサービスを学ぶにはうってつけです。もちろん、サンプルアプリケーションでありアプリケーション自身の作りはあまりよくないところもあるのですが。

そんなSock Shopを利用することで、よりリアルなマイクロサービスにおける課題をサービスメッシュでどう解決できるのか？という視点で学ぶことができます。
今回はOpenShift Service Meshを使っているので、そのままKubenetesの環境で動作させることはできないのですが、OpenShiftでサービスメッシュにトライしようとしている人の糧になればと思います。（あるいは、直接体験はできないかもしれないですが、他のKubenetesでサービスメッシュをトライしようとしている人の参考になればと思います。）

ハンズオンのテキストはこちらから参照できます。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://github.com/mosuke5/microservices-demo-openshift/blob/master/servicemesh/workshop-servicemesh.md" data-iframely-url="//cdn.iframe.ly/pEhhuZs"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

### OpenShift Service Mesh
そもそもOpenShift Service Meshとは、Red Hatが提供しているサービスメッシュのサービスで、OpenShiftの一部として利用できるものです。実態は、Istio+α のサービスです。  
Istio+α と書いたのは、OpenShift Service Meshは実際<a href="https://maistra.io/">maistra</a>とよばれるOSSをベースに作られているからです。このmaistraは、Istioをアップストリームとしながら足りない機能を付け加えたOSSです。マルチテナント機能が追加されたりしています。

### マルチテナント対応
OpenShift Service Meshでは、Istioコントロールプレーンがメッシュを適応するNamespaceを管理することができます。
特定のNamespaceのみサービスメッシュを適応することや、同じクラスタ上にまったく別のサービスメッシュ設定をつくるなどが容易にできます。
インストールとともにマルチテナント性を学んでいきます。

![multitenancy](/image/istio-multitenancy.png)

### Envoyプロキシの導入
サービスメッシュを実現するにあたっては、Envoy Proxyを導入しないことにははじまりません。Envoy Proxyがすべての通信をコントロールすることによって、サービスメッシュは成り立っています。
では、どのようにEnvoy Proxyを導入することができるのでしょうか。
非常に簡単です。PodのAnnotationsに`sidecar.istio.io/inject: true`を記述してあげることでPodが生成されるタイミングで動的にサイドカーコンテナとしてEnvoy Proxyが配置されます。

なぜこんなことができるのか？と気になった方は、KubernetesのAPIリクエストの仕組みを学ぶと理解することができます。[Admission Controller](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/)とよばれる仕組みを利用してEnvoy Proxyをいれています。

![kubernetes-api-flow](/image/kubernetes-api-flow.png)

### Ingress経路の変更
OpenShift Service MeshのMemberRollに追加すると（サービスメッシュを適応すると）いままで、Route（Ingress）経由で通信できたいたアプリケーションに接続できなくなります。
理由は、Service Meshでは「すべてのトラフィックをコントールしたい」という思想からIngressのトラフィックもEnvoy Proxyを通す必要が出てくるためです。
クラスタ外からアクセスが必要なものは設定で対応する必要があります。

![istio-traffic-control](/image/istio-traffic-control.png)

その他、複数バージョンのサービスをリリースした際のトラフィック分散などを体験できるようにしています。

### サーキットブレーカー対応
こちらは、[まえのハンズオン](https://github.com/mosuke5/microservices-demo-openshift/blob/master/workshop-solutions.md)をやっていただいたほうが実感がわきますが、サービスメッシュ導入前にとあるサービスを落とした場合、30秒ほどタイムアウトで待っていました。
サービスメッシュを入れることで、サーキットブレーカーやより早いタイムアウトの設定が可能になり、アプリケーション層でハンドリングすることなく実装ができます。

### KialiやPrometheusを使った可視化
その他、サービスメッシュによって各サービス間のトラフィックの流れが可視化されます。kialiと呼ばれるサービスメッシュの可視化専用OSSがあり、そちらを利用したモニタリングなどについても触れていきます。

![kiali](/image/kiali.gif)

## さいごに
このハンズオンでは本当に基礎的なことの一部しか体験するものではないですが、サービスメッシュの価値やサービスメッシュが実現したいことというのはよく分かると思います。  
しかし、やはりそれなりの学習コストがかかることや、複数のサービスをまたいだプロダクト全体に影響を及ぼす技術でもあり、それを本当に導入して使うかどうかという点は難しい課題と感じています。
マイクロサービスにしてもKubernetesにしてもなんでも同じなのですが、サービスメッシュによって得たい効果はなんなのか？それはこの方法がベストなのか？この問いかけは忘れずに常に行わなければならないと思います。