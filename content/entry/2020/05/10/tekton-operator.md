+++
categories = ["Kubernetes", "DevOps"]
date = "2020-05-10T15:15:21+09:00"
description = "Tekton Operatorを用いて、Tektonのインストールをしていきます。OperatorとTekton本体、パイプラインタスクの関係性などを整理しながら説明します。最後に簡単なタスク実行も行っていきます。"
draft = false
image = ""
tags = ["Tech"]
title = "TektonのOperatorによるインストールとHello World"
author = "mosuke5"
archive = ["2020"]
+++

<a href="https://twitter.com/mosuke5" target="_blank">もーすけ</a>です。
GWはみなさんいかがお過ごしでしたか？  
外に出れないGWという一生でもそんなことが2度あるかわかりませんが非常に大変な日々を過ごされたのではないかと思います。自分は、GWを使ってKubernetes Operatorの開発などに挑戦してみていました。
このあたりの話は別で書きたいと思いますが、Kubernetesのよさについてさらに理解を深めた気がします。

さて、今日はCloud NativeなCI/CDツールと言われているTektonについて。  
何回かに分けて書こうと思いますが、Operatorによるインストール編です（随時更新します）。

Tekton学習シリーズ
- 第1回: [TektonのOperatorによるインストールとHello World](/entry/2020/05/10/tekton-operator/)
- 第2回: [Tekton、TaskのStepの実行順序について確認する](/entry/2021/03/06/tekton-multi-steps-task/)
- 第3回: [Tekton、Taskにパラメータを引き渡す](/entry/2021/03/06/tekton-task-with-params/)
- 第4回: [Tekton、TaskでPipelineResouceを利用したときの挙動を確認する](/entry/2021/03/07/tekton-task-with-pipelineresource/)
- 第5回: [Tekton、TaskをまとめてPipelineとして実行する](/entry/2021/03/07/tekton-pipeline/)
- 第6回: [Tekton、PipelineでWorkspaceを利用してTask間でデータを連携する](/entry/2021/03/17/tekton-pipeline-with-workspace/)

<!--more-->

## Tekton
みなさんは現在どんなCIツールを利用していますでしょうか？  
<a href="https://tekton.dev/" target="_blank">Tekton</a>はKubernetes時代にKubernetes-nativeなCI/CDツールとして生まれました。
CI/CDのプロセスの中で行う、ビルドやテスト、デプロイなどの処理をKubernetesのリソースとして実現するためのツールです。どういうことかというと、パイプラインやそのタスクの定義をみなさんがよく書いているKubernetesマニフェストとして管理できるということです。

Kubernetes-nativeなCI/CDツールの対義としてトラディショナルCI/CDツールという表現をされることがあります。  
例えば、Jenkinsもその1つです。（断っておくと、トラディショナルCI/CDツールが悪いという意味ではありません）
JenkinsもいまKubernetes時代のためにうまれかわり、Jenkins Xなどのツールを出していますが、従来のJenkinsは中央集権的な管理であり、それゆえにプラグイン管理などが複雑化するなどの問題もありました。
CIツールそのものの管理の複雑さを排除し、サーバレスでKubernetesのリソースとして実行できるプラットフォームとしてTektonは位置づけられています。

## Tekton Operator
Tektonの入門記事やインストールについての記事はいくつかでていますが、やはり自分でTektonを運用しようと思ったときはOperatorを使ってインストール・管理したいです。
Operatorについて知らない方に簡単にお伝えすると、別名カスタムコントローラとも呼ばれており、Tektonのインストール自体を、Kubernetesのリソースとして定義できるようにするものです。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://github.com/tektoncd/operator" data-iframely-url="//cdn.iframe.ly/IKARWIp"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

Tekton OperatorとTekton本体、およびパイプラインタスクの実態の関係性は下記のようになっています。  
これからインストールしようとしているのは左のOperatorです。OperatorはTekton本体を管理・インストールします。
Tekton本体が、パイプラインの実態であるTaskなどを作成し管理します。

![tekton-operator-overview](/image/tekton-operator-overview.png)

## Operatorを使ってインストール
解説のコメントを入れながらインストールをしていきます。

### CRDの作成
まずは、Githubレポジトリのクローンと、Tekton本体を管理するためのCRDsのデプロイを行っていきます。

```
$ git clone https://github.com/tektoncd/operator
$ cd operator

// tekton operatorが動作するためのNamespaceの作成
$ kubectl create ns tekton-operator

// tekton自身を管理するためのCRDの作成
$ kubectl apply -f deploy/crds/operator_v1alpha1_config_crd.yaml
$ kubectl apply -f deploy/crds/operator_v1alpha1_addon_crd.yaml

// 作成したCRDの確認
$ kc get crds | grep tekton
addons.operator.tekton.dev                  2020-05-08T14:51:21Z
config.operator.tekton.dev                  2020-05-08T14:51:10Z
```

### コントローライメージの作成
さっそくTekton Operatorの本体である、コントローラをデプロイしたいのですが、コントローラのコンテナイメージを公式では提供していません。
そのため、このレポジトリから自分で作成する必要があります。  
TektonのOperatorは<a href="https://github.com/operator-framework/operator-sdk" target="_blank">operator-sdk</a>と呼ばれるOperator開発のためのフレームワークで作成されていて、簡単にコンテナイメージをビルドできます。
最終的に、ビルドしたイメージをDocker hub等で公開し、ダウンロードできるようにしておきましょう。

```
// Go moduleの有効化。Go開発でのパッケージ管理に使うものです
$ export GO111MODULE=on

// イメージビルド
$ operator-sdk build mosuke5/openshift-pipelines-operator:abdc4db

// dockerコマンドでイメージを確認
% docker images
REPOSITORY                              TAG       IMAGE ID        CREATED             SIZE
mosuke5/openshift-pipelines-operator    abdc4db   1a6d27db0ade    About an hour ago   126MB

// docker hubへアップロード
$ docker push mosuke5/openshift-pipelines-operator:abdc4db
The push refers to repository [docker.io/mosuke5/openshift-pipelines-operator]
8735a82318c0: Pushed
e43bb6002dda: Pushed
7e2ff418c30b: Pushed
d72d78bdfb8f: Pushed
ae08c0ad8885: Layer already exists
c94db2932445: Layer already exists
abdc4db: digest: sha256:683976ac37b1b83e031b8eb73327dd7fa233fbf1e2cca0199ab49744970f8010 size: 1572
```

dockerhubへのアップロードが終われば以下のように公開されているはずです。  
https://hub.docker.com/repository/docker/mosuke5/openshift-pipelines-operator

### コントローラのデプロイ
いよいよ、Operatorの本体であるコントローラをデプロイします。  
レポジトリの中にOperatorのコントローラをデプロイするためのマニフェストファイルが用意されていますが、`image`部分を上で作成したイメージに差し替える必要がありますので注意してください。

```
// imageを上で作成したものに変更する
$ vim deploy/operator.yaml
      containers:
        - name: tekton-operator
          # ↓ここを確認
          image: mosuke5/openshift-pipelines-operator:abdc4db

// tekton operatorのデプロイ
// tekton operatorが利用するService Accountやroleもデプロイされます
$ kubectl -n tekton-operator apply -f deploy/
deployment.apps/tekton-operator created
clusterrole.rbac.authorization.k8s.io/tekton-operator created
clusterrolebinding.rbac.authorization.k8s.io/tekton-operator created
serviceaccount/tekton-operator created

// OperatorのコントローラPodが起動していることを確認
$ kubectl get pod -n tekton-operator
NAME                               READY   STATUS    RESTARTS   AGE
tekton-operator-56f7c4fbc9-rxj7l   1/1     Running   0          6h42m

// Namespaceを確認するとtekton-pipelinesが作成されている
$ kubectl get ns | grep tekton
tekton-operator        Active   12m
tekton-pipelines       Active   16s

// tekton-pipelines内には、Tektonの本体が起動しているのが確認できる
$ kubectl get pod -n tekton-pipelines
NAME                                          READY   STATUS    RESTARTS   AGE
tekton-pipelines-controller-5d76dbf8b-dl6ns   1/1     Running   0          39s
tekton-pipelines-webhook-c6c57f76-kt67d       1/1     Running   0          38s

// CRDsを確認する
$ kubectl get crds | grep tekton
addons.operator.tekton.dev                  2020-05-08T14:51:21Z
clustertasks.tekton.dev                     2020-05-10T15:56:00Z
conditions.tekton.dev                       2020-05-10T15:56:00Z
config.operator.tekton.dev                  2020-05-08T14:51:10Z
pipelineresources.tekton.dev                2020-05-10T15:56:02Z
pipelineruns.tekton.dev                     2020-05-10T15:56:01Z
pipelines.tekton.dev                        2020-05-10T15:56:01Z
taskruns.tekton.dev                         2020-05-10T15:56:02Z
tasks.tekton.dev                            2020-05-10T15:56:02Z
```

### 自動で生成されるリソース
Tekton Operatorをデプロイしただけにも関わらず、Tekton本体や`tasks`や`pipelines`などのCRDsもたくさんインストールされています。
これは、Tekton Operatorが作成したリソースになります。
Tekton Operatorのデプロイ時にService AccountやRoleも同時にデプロイしました。Tekton Operatorは、他のリソースを作成できる権限をもっています。

また、Operatorを使ったことある方ならば違和感に少しお気づきかなと思いますが、Operator本体をインストールするための`config.operator.tekton.dev`のリソースを特になにも書いてませんがTekton本体がインストールされました。
これはTekton Operatorの仕様で、デフォルトでは自動でTektonの本体をデプロイするようになっています。
自動デプロイが嫌な方はOperatorのデプロイ時に、`deploy/operator.yaml`内に`--no-auto-install=true`のオプションを有効にしておく必要があります。

## Hello world
Tekton本体も起動したので、Hello World的に少しだけ動かしてみます。  
動かし方については、別記事で紹介していきたいと思います。

### マニフェスト
Tektonはパイプラインやそのタスク自身もKubernetesのリソースとして扱えることが１つの特徴です。  
まずは、マニフェストベースで実行してみます。

```
// タスク定義を作成する
// Ubuntuイメージで`hello world`と出力するだけの簡単なタスク
$ vim hello-world-task.yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: hello-world-task
spec:
  steps:
    - name: output-helloworld
      image: ubuntu
      command: ["echo"]
      args: ["hello world"]

$ kubectl apply -f hellow-world-task.yaml
task.tekton.dev/hello-world-task created

$ kubectl get task
NAME               AGE
hello-world-task   3s
```

上で作成した`hello-world-task`はタスクの定義だけであり、これだけでは実行されることはありません。  
`TaskRun`リソースを用いて実際にタスクを実行できます。

```
// TaskRunの定義を作成
$ vim hello-world-task-run.yaml
apiVersion: tekton.dev/v1beta1
kind: TaskRun
metadata:
  name: hello-world-task-run
spec:
  taskRef:
    name: hello-world-task

// TaskRunのデプロイ
$ kubectl apply -f hellow-world-task-run.yaml
taskrun.tekton.dev/hello-world-task-run created

// Podを確認するとなにやら動いているのが確認できる
$ kubectl get pod
NAME                             READY   STATUS            RESTARTS   AGE
hello-world-task-run-pod-mjnmv   0/1     PodInitializing   0          10s

$ kubectl get pod
NAME                             READY   STATUS    RESTARTS   AGE
hello-world-task-run-pod-mjnmv   1/1     Running   0          12s

// Podのログを確認してみる
$ kubectl logs -f hello-world-task-run-pod-mjnmv
hello world
```

### 注意事項
Tektonは、まだまだ進化が激しいプロダクトで、APIversionの更新もありました。  
マニフェストを書く場合は、`apiVersion`に注意してください。古いブログだと、`apiVersion: tekton.dev/v1alpha1` を利用していることが多いですが、現在は `apiVersion: tekton.dev/v1beta1` が最新で、記述も大きく異なるものがあります。  
公式ドキュメントを頼りにするのがいいでしょう。

### Tekton CLI
TektonはCLIも用意しており、CLI操作もいくぶんかできます。
CLIのインストールはこちらを確認しましょう。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://tekton.dev/docs/cli/" data-iframely-url="//cdn.iframe.ly/oNbQMrC"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

インストールすると`tkn`コマンドが利用できるようになります。
`tkn`コマンドは、`kubectl`と同じ認証情報を用いるので、`kubectl`が打てている環境ならばおそらくそのまま実行できるのではないかと思います。

```
// タスクの一覧をみる。上で作成したタスクが確認できる
$ tkn task list
NAME               DESCRIPTION   AGE
hello-world-task                 2 minutes ago

// 上で実行したログの結果をCLI経由で確認
$ tkn task logs
[output-helloworld] hello world
```

CLI経由で今度はタスクを実行してみましょう。

```
// Taskの実行
$ tkn task start hello-world-task
Taskrun started: hello-world-task-run-w82p6

// Taskの実行ログ確認
$ tkn taskrun logs hello-world-task-run-w82p6 -f -n tekton-test
[output-helloworld] hello world

// TaskRunの確認
$ tkn taskrun list
NAME                         STARTED          DURATION     STATUS
hello-world-task-run-w82p6   42 seconds ago   4 seconds    Succeeded
hello-world-task-run         2 minutes ago    14 seconds   Succeeded
```

上ではCLIでの実行やログの確認を行いましたが、当然ながら動きはマニフェストで行ったときと同じです。
試しに`kubectl`でPodやTaskRunなどを覗いてみましょう。
Kubernetesのリソースとして作成され、実行されていることが確認できるはずです。

```
$ kubectl get pod
NAME                                   READY   STATUS      RESTARTS   AGE
hello-world-task-run-pod-mjnmv         0/1     Completed   0          93s
hello-world-task-run-w82p6-pod-8rjsf   0/1     Completed   0          6s

$ kubectl get taskrun
NAME                         SUCCEEDED   REASON      STARTTIME   COMPLETIONTIME
hello-world-task-run         True        Succeeded   2m30s       2m16s
hello-world-task-run-w82p6   True        Succeeded   62s         58s
```

## まとめ
Kubernetes-nativeなCI/CDツールのTektonのOperatorによるインストールとHello Worldを見てきました。  
Tektonの実践的な情報はあまり本記事には出せなかったので、続記事を出し次第、本記事にリンクを貼っていきたいと思います。もうしばらくお待ちいただければと思います。

Tekton学習シリーズ
- 第1回: [TektonのOperatorによるインストールとHello World](/entry/2020/05/10/tekton-operator/)
- 第2回: [Tekton、TaskのStepの実行順序について確認する](/entry/2021/03/06/tekton-multi-steps-task/)
- 第3回: [Tekton、Taskにパラメータを引き渡す](/entry/2021/03/06/tekton-task-with-params/)
- 第4回: [Tekton、TaskでPipelineResouceを利用したときの挙動を確認する](/entry/2021/03/07/tekton-task-with-pipelineresource/)
- 第5回: [Tekton、TaskをまとめてPipelineとして実行する](/entry/2021/03/07/tekton-pipeline/)
- 第6回: [Tekton、PipelineでWorkspaceを利用してTask間でデータを連携する](/entry/2021/03/17/tekton-pipeline-with-workspace/)