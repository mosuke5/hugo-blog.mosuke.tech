+++
categories = ["Kubernetes", "コンテナ"]
date = "2019-06-21T10:57:12+09:00"
description = "Kubernetesのマニフェストファイルを自動生成できるツールであるKustomizeを紹介します。使おうと思った動機や使う上での注意点など書きました。"
draft = false
image = ""
tags = ["Tech"]
title = "Kustomizeで環境ごとに異なるマニフェストを作る"
author = "mosuke5"
archive = ["2019"]
+++

ブログの更新頻度が落ちていますが、サボっているわけではないです。。
はい。mosuke5です。

やはりKubernetesマニフェストのテンプレートエンジンは必要だ、と気づいてしまったので、マニフェストを生成できるツールを探していました。
そこで、Kustomizeを試しみたのでアウトプットとして残しておきます。使ってみた上でハマったポイントや注意すべき点なども含めて書きたいと思います。
<!--more-->

## モチベーション
kubernetes初心者として、マニフェストもかけてきたし、`kubectl apply -f xxxx`ですぐにデプロイできるし、最高だなって思ってました。
しかし、いざ、開発環境と本番環境の2つのNamespaceで利用したくなったり、運用のことを考えるといろいろと不都合が発生してきました。

1. 開発環境と本番環境でパラメータが変えたいことがある
1. 本番環境だけ入れたいリソースがある（例えばLoadBalancerは本番だけほしいなど）
1. イメージをLatestで使いたくない。タグ指定したいが、都度手動で変更したくない
1. configMapやsecretの変更したときのアプリ側の再起動どうしよう、など

こうなってきたときに、「あっ。やっぱりマニフェストのテンプレートエンジンが必要だ。。」と強く感じました。
マニフェストの生成にはいくつか方法があるようなのですが、kubernetes v1.14からkubectlに統合された[Kustomize](https://github.com/kubernetes-sigs/kustomize)が便利そうだったので、そちらでまずは使い勝手を試してみようと思い立ったわけです。

KubernetesにおけるCI/CD重要なポイントを下記にまとめました。その1つとしてKustomize（マニフェストのテンプレート化）の重要性を書いています。参考にどうぞ。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2020/03/04/kubernetes-ci-cd/" data-iframely-url="//cdn.iframe.ly/AWtNlfG"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

## Kustomizeとは
名前から少し推察できるかもしれませんが、CustomizeのCをKubernetesのKにもじったのが、Kustomizeであり、configuration(manifest) managementのツールです。([公式Github](https://github.com/kubernetes-sigs/kustomize))

基本的な構成としては`kustomization.yml` + `resources(manifest files)`になります。
`kustomization.yml`にはどのマニフェストファイルを対象にするか、そしてそれらに対してどのような変更や修正、変数を割り当てるかを記述するかたちです。最終的なアウトプットとしては、変更・修正が施されたマニフェストファイルの中身がアウトプットされます。
公式ドキュメントにも書いてありますがマニフェストに対するsedみたいな一面があります。

## ドキュメント
Kustomizeを実際に触っていく上でハマったポイントもあったのでご紹介します。  
Kustomizeはkubernetes v1.14からkubectlに組み込まれることになりました。実際に、`kubectl -h`でヘルプを見てみてもわかります。

```
Advanced Commands:
  kustomize      Build a kustomization target from a directory or a remote url.
```

kubectlに統合されているのはバージョンが最新のものではありません。また、Kustomizeも進化が早いので機能差分がでてくることもめずらくありません。

自分も使っていく中で何度か下記のようなエラーメッセージに出くわしました。下記の例だと、`envs`というフィールドがありませんというエラーです。公式ドキュメントを見て記述していたのですが、kubectlに見込まれているバージョンではそのフィールドがなかったということです。

```
$ kubectl kustomize .
Error: couldn't make target for ../../base: json: unknown field "envs"
```

そのため、ドキュメントをみる場合は使っている方法に合わせて使い分けるといいです。

- [kubectlに組み込まれたKustomizeを使う場合](https://kubectl.docs.kubernetes.io/pages/reference/kustomize.html)
- [Kustomize本家を利用する場合](https://github.com/kubernetes-sigs/kustomize/tree/master/docs)


## とにもかくにも使ってみる
### Hello World
Kustomizeはサンプルもいくつか用意してくれているので始めるのは簡単です。Hello World的には[こちら](https://github.com/kubernetes-sigs/kustomize/tree/master/examples/helloWorld)が良いと思います。

`kustomization.yml`が下記の通り書いてありますが、resourcesに記載の３ファイルを対象に共通のlabelを付与するという意味になります。

```
commonLabels:
  app: hello

resources:
- deployment.yaml
- service.yaml
- configMap.yaml
```

### configMapGenerator
上のHello Worldの例ではマニフェストに`configMap.yaml`が含まれていましたが、configMapを生成するには、もうひとつ`configMapGenerator`という機能を使うこともできます。([公式ドキュメント](https://github.com/kubernetes-sigs/kustomize/blob/master/docs/fields.md#configmapgenerator))

こちらの機能を使うと、configMapを作成時に名前にハッシュ値が付きます。そして、configMapに変更があった場合に、そのハッシュ値も変更され別のconfigMapとして保存されます。また、そのconfigMapを参照しているDeploymentなどのconfigMapの名前も変更してくれます。
それによって、configMapを変更時にアプリ側のPodsの再作成もされます。運用面を考えると非常に便利な機能です。

以下に自分のいいたいことが全て書かれていたので、詳細についてはこちら参照してみてください。  
[kustomizeでconfigMapを取り扱うときの注意](https://qiita.com/Sho2010@github/items/548582996d5ebfc63b1d)

### overlay
自分がKustomizeを触ろうとした主なモチベーションの部分である、環境ごとにパラメータを変えたい、一部のリソースを変えたいというニーズにはoverlayという機能で対応することができます。  
overlayは名前の通り「覆う」的な意味なので、Baseのマニュフェストを用意して、環境ごとにパッチ当てするマニフェストを用意する、という形になります。

今回こんなサンプルを作りました。([コードはこちら](https://github.com/mosuke5/kustomize-examples/tree/master/overlay-example))

- Nginxをデプロイする
- 開発環境用はnamespaceをdevelopmentに、本番環境用はnamespaceをproductionにする
- 本番環境用のNginxのServiceはType=LoadBalancerにする

ファイル構造はこのような形です。
```
.
├── base
│   ├── kustomization.yml
│   ├── nginx-deployment.yml
│   └── nginx-service.yml
└── overlays
    ├── development
    │   └── kustomization.yml
    └── production
        ├── change-nginx-service-to-loadbalancer.yml
        └── kustomization.yml
```

baseには共通のマニフェストです。出力すると下記のとおりです。
見ておいてほしいのは`nginx-servce`のTypeです。baseマニフェストでは`ClusterIP`を指定しています。

```yaml
$ kubectl kustomize base
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  ports:
  - name: http-port
    port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: nginx
  type: ClusterIP    # baseではClusterIPを指定
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx:1.17.0
        name: nginx
        ports:
        - containerPort: 80
```

しかし、本番環境ではNamespaceを指定して、Typeを`LoadBalancer`で公開したかったとします。
以下は本番環境用にパッチ当てするためのkustomization.ymlなのですが、baseのマニフェストを指定し、namespaceとパッチを当てるマニフェストを指定しました。

```yaml
$ cat overlays/production/kustomization.yml
bases:
- ../../base
namespace: "production"
patchesStrategicMerge:
- change-nginx-service-to-loadbalancer.yml   # serviceのtypeを変えるパッチを当てる

$ cat overlays/production/change-nginx-service-to-loadbalancer.yml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  type: LoadBalancer   # typeをLoadBalancerへ
  ports:
    - name: "http-port"
      protocol: "TCP"
      port: 80
      targetPort: 80
```

このようにして、本番環境用のパッチを当てて出力すると、typeがLoadBalancerに変わっていることがわかります。これで、1つのマニフェストを使って環境ごとにパラメータや一部のリソースを変更してデプロイできそうです。

```yaml
$ kubectl kustomize overlays/production
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
  namespace: production
spec:
  ports:
  - name: http-port
    port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: nginx
  type: LoadBalancer   # typleがLoadBalancerに変更されている
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx:1.17.0
        name: nginx
        ports:
        - containerPort: 80
```

## まとめ
Kubernetesの初歩の勉強をしているうちはあまり必要性を感じないのですが、それなりに「運用」をみすえると、マニフェストを自動で生成する必要性がでてきます。
その１つの方法としてKustomizeというツールを触りました。kubectlにも統合されているので比較的簡単にはじめることができますし、自分がやりたいと思っていたことは問題なく実現できることがわかりました。

今後使っていくなかで、また知見がたまればおしらせします。