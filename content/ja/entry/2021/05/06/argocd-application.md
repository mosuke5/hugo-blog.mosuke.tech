+++
categories = ["Kubernetes"]
date = "2021-05-06T09:46:40+09:00"
description = "Argo CDにKustomizeアプリケーションを登録して複数環境へデプロイする方法を確認します。なぜHelmやKustomizeなどが必要なのかといった基本的な部分から解説します。"
draft = false
image = ""
tags = ["Tech"]
title = "第2回: Argo CD、Kustomizeを使った複数環境へのデプロイ"
author = "mosuke5"
archive = ["2021"]
+++

{{< argocd-series >}}

こんにちは、もーすけです。
Argo CD学習シリーズの続きを行っていきたいと思います。
前回はチュートリアル的に動かしてみるところまで行いましたが、もう少し細かなアプリケーションの設定を見ていきます。
<!--more-->

## Argo CDがサポートするアプリケーション
Argo CDでは、アプリケーションの作成が必要でした。
アプリケーションには、監視するGitレポジトリやどのクラスタへデプロイするかなどの設定が記述できます。
さて、Gitレポジトリを監視したとして、Argo CDはどのようにそのレポジトリの内容をデプロイするのでしょうか？
一定の規則を持たないことには、デプロイできませんよね？

Argo CDでは、現在以下の形式をサポートしています。
重要なことは、最終的に「Kubernetesマニフェストの形になる」ということです。

- Kustomize applications
  - テンプレートエンジン（テンプレートエンジンというよりは、オーバライド型のマニフェスト生成ツールといったほうが正しい？）の一角のKustomizeを使ってデプロイできる形式ならデプロイ可能。
  - Kustomizeはいまとなっては、`kubectl`にも統合されており、`kubectl apply -k xxxxx`で使える程度に一般的。
- Helm charts
  - テンプレートエンジンとしての色がつよいツールで、代表格的存在。
  - Argo CDに利用するValues File（パラメータファイル）を指定することで、商用・テスト・開発などの環境を分けられる。
- Ksonnet applications
  - Kubernetesマニフェストを生成するフレームワークだったが、今はプロジェクトが終了。利用は非推奨。
  - いままでKsonnetを使っていなかった人は無視してOK
- directory of YAML/JSON/Jsonnet manifests, including Jsonnet.
  - プレーンなYAML/JSON形式のマニフェストを配置しておいてもOK。まあプレーンなんで。
  - Jsonnetは、JSONを生成するためのデータテンプレートツール。最終的にJSON形式のマニフェストを作る。
- Any custom config management tool configured as a config management plugin
  - 上記以外でも、任意のツールを用いてマニフェストを生成できればプラグイン機能で対応可能。
  - シェルスクリプトでも、独自のツールでも最終的にマニフェストができあがれば利用できる。
  - OpenShiftを利用の人でOpenShift Templateを使いたい場合はこれ。

## そもそもKustomizeやHelmが必要な理由
説明不要の方も多くいるかと思いますが、簡単に書いておきます。  
Kubernetesを使ってアプリケーションを運用しているならば、ほぼほぼ商用環境のほかにもテスト環境や開発環境などいくつかの環境があるかと思います。Kubernetesクラスタレベルで別れていることもあれば、Namespaceだけ異なる場合もあるでしょう。
いずれにせよ、複数の環境でアプリケーションを動かす必要があります。

Kubernetes上で動かすアプリケーションはマニフェストで表現をしてデプロイするわけですが、**環境ごとに違うパラメータ**ってありますよね？あるはずです。
Podにつけたい名前が違う、Podの利用するリソース量が違う、接続先のDBのアドレスが違うなどなど、あげたらきりがありません。

では、環境ごとに異なるマニフェストファイルを用意すればいいのでしょうか？  
それは、プログラミングをするときに共通処理を関数にして使い回さないのと同じようなものです。
そのため、共通部分を持ちつつ、異なるパラメータだけ変更するすべがどうしても必要で、それがKustomizeだったりHelmだったりというわけです。詳しくは、CI/CDの勘所のブログを参照ください。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2020/03/04/kubernetes-ci-cd/" data-iframely-url="//cdn.iframe.ly/AWtNlfG"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

## Kustomizeを用いた環境ごとのデプロイ
まずは、Kustomizeを使った環境ごとに異なるマニフェストを作るとはどういうことなのか復習しておきましょう。
練習台にとても簡単なサンプルを使います。この[サンプルコード](https://github.com/mosuke5/kustomize-examples)は、Nginxをデプロイする簡単なものですが、`development`と`production`でパラメータや設定を変えたいと思っているというシナリオです。
`base/`が共通部で、`overlays/development`と`overlays/production`が異なる部分です。

```
$ git clone https://github.com/mosuke5/kustomize-examples
$ cd kustomize-examples/overlay-example
$ tree
.
├── base
│   ├── kustomization.yml
│   ├── nginx-deployment.yml
│   └── nginx-service.yml
└── overlays
    ├── development
    │   └── kustomization.yml
    └── production
        ├── change-nginx-service-to-loadbalancer.yml
        └── kustomization.yml

4 directories, 6 files
```
`development`と`production`の違いは、次の2つです。

1. デプロイするnamespaceを分けたい
1. `production`では、ServiceのTypeをLoadBalancerにしたい

```
$ kubectl apply -k overlays/development --dry-run=client -o yaml > dev
$ kubectl apply -k overlays/production --dry-run=client -o yaml > prod
$ diff dev prod
8c8
<         {"apiVersion":"v1","kind":"Service","metadata":{"annotations":{},"name":"nginx-service","namespace":"development"},"spec":{"ports":[{"name":"http-port","port":80,"protocol":"TCP","targetPort":80}],"selector":{"app":"nginx"},"type":"ClusterIP"}}
---
>         {"apiVersion":"v1","kind":"Service","metadata":{"annotations":{},"name":"nginx-service","namespace":"production"},"spec":{"ports":[{"name":"http-port","port":80,"protocol":"TCP","targetPort":80}],"selector":{"app":"nginx"},"type":"LoadBalancer"}}
10c10
<     namespace: development
---
>     namespace: production
19c19
<     type: ClusterIP
---
>     type: LoadBalancer
25c25
<         {"apiVersion":"apps/v1","kind":"Deployment","metadata":{"annotations":{},"name":"nginx-deployment","namespace":"development"},"spec":{"replicas":1,"selector":{"matchLabels":{"app":"nginx"}},"template":{"metadata":{"labels":{"app":"nginx"}},"spec":{"containers":[{"image":"nginx:1.17.0","name":"nginx","ports":[{"containerPort":80}]}]}}}}
---
>         {"apiVersion":"apps/v1","kind":"Deployment","metadata":{"annotations":{},"name":"nginx-deployment","namespace":"production"},"spec":{"replicas":1,"selector":{"matchLabels":{"app":"nginx"}},"template":{"metadata":{"labels":{"app":"nginx"}},"spec":{"containers":[{"image":"nginx:1.17.0","name":"nginx","ports":[{"containerPort":80}]}]}}}}
27c27
<     namespace: development
---
>     namespace: production
```

vimdiffは差分がわかりやすいですね。

![kustomize-result-diff](/image/kustomize-result-diff.png)

## Kustomizeアプリケーションの登録
Kustomizeの仕組みがわかったところで、Argo CDにKustomizeアプリケーションを登録してみましょう。
Argo CD内では、開発(development)と商用(production)のふたつのアプリケーションを作成します。
異なるパラメータは以下3つです。

- `.metadata.name`
- `.spec.destination.namespace`
- `.spec.source.path`

```yaml
## development.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: hello-development
  namespace: my-argocd-operator
spec:
  destination:
    namespace: development
    server: https://kubernetes.default.svc
  project: default
  source:
    path: overlay-example/overlays/development
    repoURL: https://github.com/mosuke5/kustomize-examples
    targetRevision: HEAD
  syncPolicy: {}
```

```yaml
## production.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: hello-production
  namespace: my-argocd-operator
spec:
  destination:
    namespace: development
    server: https://kubernetes.default.svc
  project: default
  source:
    path: overlay-example/overlays/production
    repoURL: https://github.com/mosuke5/kustomize-examples
    targetRevision: HEAD
  syncPolicy: {}
```

上のマニフェストをapplyして、Argo CDでSyncしたあとに状況を確認してみます。

```
$ kubectl get all -n development
NAME                                    READY   STATUS    RESTARTS   AGE
pod/nginx-deployment-7465f86b8f-w8fbl   1/1     Running   0          4m28s

NAME                    TYPE        CLUSTER-IP    EXTERNAL-IP   PORT(S)   AGE
service/nginx-service   ClusterIP   10.7.244.44   <none>        80/TCP    4m31s

NAME                               READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/nginx-deployment   1/1     1            1           4m32s

NAME                                          DESIRED   CURRENT   READY   AGE
replicaset.apps/nginx-deployment-7465f86b8f   1         1         1       4m33s

----

$ kubectl get all -n production
NAME                                    READY   STATUS    RESTARTS   AGE
pod/nginx-deployment-599969c8d9-pkvtl   1/1     Running   0          2m13s

NAME                    TYPE           CLUSTER-IP    EXTERNAL-IP    PORT(S)        AGE
service/nginx-service   LoadBalancer   10.7.245.56   34.84.191.23   80:30826/TCP   2m16s

NAME                               READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/nginx-deployment   1/1     1            1           2m17s

NAME                                          DESIRED   CURRENT   READY   AGE
replicaset.apps/nginx-deployment-599969c8d9   1         1         1       2m18s
```

このようにして同じGitレポジトリでありながら、複数の環境に対してArgo CDを使ってデプロイできるようになるということです。Kustomizeなどのテンプレートエンジンの必要性も理解できましたでしょうか？
理解を深めたい場合は、次のブログも参考にしてください。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2019/06/21/kustomize/" data-iframely-url="//cdn.iframe.ly/4yC552R"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

### 追加可能なパラメータ
Gitレポジトリ側で準備したオーバレイを使って環境ごとに設定を変える事ができますが、それ以外にArgo CD側でいくつかのパラメータは追加可能です。
ドキュメント通りですが、以下の5つの項目はArgo CDのアプリケーション設定で追加できるわけです。

- namePrefix
- nameSuffix
- images
- commonLabels
- commonAnnotations

ためしに、イメージの差し替えをやってみます。
`production.yaml`を次のように変更します。

```yaml
## production.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: hello-production
  namespace: my-argocd-operator
spec:
  destination:
    namespace: production
    server: https://kubernetes.default.svc
  project: default
  source:
    path: overlay-example/overlays/production
    repoURL: https://github.com/mosuke5/kustomize-examples
    targetRevision: HEAD
    # ↓追加
    kustomize:
      images:
        - "nginx:1.20.0"
  syncPolicy: {}
```

マニフェストを変更後、applyしてSyncすると、Deploymentのイメージが差し替わっていますね。

```
$ kubectl get deploy nginx-deployment -n production -o yaml | grep "image: nginx:1.20.0"
      - image: nginx:1.20.0
```

アプリケーションの更新後に、Gitレポジトリに最新のタグを記述して保存する方法もよいですが、場合によってはイメージタグはArgo CD側で管理するのもひとつの手法として考えられると思います。
**Gitレポジトリを信頼できる唯一の情報源とするというコンセプトでいうとイメージタグもGitに保存したいところですが、スコープは柔軟に判断してよいと思います。**

## さいごに
今回は、KustomizeアプリケーションをArgo CDに登録して、複数環境へのデプロイする方法についてみてみました。
Kustomizeを使って複数環境へデプロイできる状態でしたら、なにも難しいことはなさそうですね。
Argo CD側で管理するスコープはチーム内で話し合ってきめてください。

Helmの場合も、もちろんパラメータは違えど、ほぼ同じような要領で利用できますので、みなさんの環境にあわせて挑戦してみてください。

{{< argocd-series >}}