+++
categories = ["", ""]
date = "2021-05-07T15:40:04+09:00"
description = ""
draft = true
image = ""
tags = ["Tech"]
title = "TektonからArgo CDの同期をトリガーする。それぞれの使い分けの検討"
author = "mosuke5"
archive = ["2021"]
+++

{{< tekton-series >}}

こんにちは、もーすけです。  
今回は、クラウドネイティブな環境でのCI/CDツールとして有名なTektonとArgo CD、これらの組み合わせした場合のパイプラインフローを検討してみます。どのように使い分けていくことができるのか考えていきたいと思います。
本記事はTekton学習シリーズとして行ったわけではないですが、関連トピックとして番外編扱いにしておきます。
<!--more-->

## 問題の背景
Tektonは、Kubernetes時代にKubernetes-nativeなCI/CDツールとして生まれたものです（復習ですね）。
Tektonではパイプラインを作成することができ、そのパイプライン内でアプリケーションをビルドしたり、イメージをビルドしたり、アプリケーションをデプロイできます。

Argo CDは、GitOpsという考えに基づいたツールで、CD（継続的デリバリー）専用ツールとして開発されました。Argo CDの概要について知りたい方は「[Argo CD、Operatorでのインストールと主要コンポーネントの解説](/entry/2021/04/13/argocd/)」をあわせてご覧ください。

ということは、TektonでもArgo CDでもアプリケーションのデプロイが可能というわけですが、さてどのように使い分けていったらいいのでしょうか？デプロイをArgo CDで実装する場合、それだけで十分なのでしょうか？というのが問題の焦点です。

## Argo CDのSyncのタイミング
別記事（[Argo CD、Syncの実行方法やタイミングについての検討](/entry/2021/05/06/argocd-sync-action/)）でも書いたのですが、Argo CDのデフォルトでは3分に一度Gitレポジトリへポーリングします。その頻度が要件に合わない場合や、デプロイ後に任意の処理を実行したい場合（結合テストしたい、負荷テストしたいなど）は、Argo CD単体では要件にあいません。
そこで、CIツールと組み合わせで使っていくことが求められます。

![argocd-sync-from-ci](/image/argocd-sync-from-ci.png)

## Tektonと組み合わせたGitOps
では、GitOpsの環境でどのようにTektonと組み合わせすることができるか考えてみましょう。
わかりやすく図にしてみました。
Tektonが利用される部分は全体感では2箇所です。

ひとつめは、アプリケーションのソースコードに変更があった場合に、その変更を取り込んだコンテナイメージを作るところまでです。  
ふたつめは、マニフェストレポジトリが変更された場合にArgo CDのSyncを実行し、それが終わったあとに、結合テストなどの任意の処理を行うところです。本ブログはこのふたつめの検証を行ったものです。

![tekton-argocd](/image/tekton-trigger-argocd-sync.png)

## argocd-task-sync-and-wait
TektonからArgo CDのSyncを実行するには、[argocd-task-sync-and-wait](https://hub.tekton.dev/tekton/task/argocd-task-sync-and-wait)というタスクがTektonHubにあるので便利そうです。実装は非常に簡単なので、自作しちゃってもいいと思いますがせっかくなので利用しましょう。
本ブログ執筆時点では、version 0.1のタスクが最新のためそれを前提に記述します。

このタスクを使ううえで大事なことはそれほど多くありません。
ひとつひとつ見ていきましょう。

1. 処理フロー
    - 処理フローは "login -> sync -> wait" の3ステップです。
    - waitまで行ってくれるので、まさに本ブログで書いていることを想定してくれています。
1. 認証情報
    - Argo CDのサーバと認証する必要がありますが、指定の名前でconfigMapとSecretを作成するだけで大丈夫です。
    - `argocd-env-configmap`と`argocd-env-secret`です。使い方はしっかり、ドキュメントに書いてあるので読んでおきましょう。
1. パラメータ
    - パラメータは `application-name`, `revision`, `flags`, `argocd-version`が指定できます。
    - 注意が必要なポイントは`argocd-version`でしょうか。デフォルト値が`v1.0.2`と古いので仕様が期待と異なることがあります。利用のバージョンと揃えましょう。

```
$ kubectl apply -f https://raw.githubusercontent.com/tektoncd/catalog/main/task/argocd-task-sync-and-wait/0.1/argocd-task-sync-and-wait.yaml
task.tekton.dev/argocd-task-sync-and-wait created

$ kubectl get task
NAME                        AGE
argocd-task-sync-and-wait   6s
```

## パイプライン構築
次のパイプラインで動作を確認しました。  
デプロイ後の処理については任意に差し替えてください。
このパイプラインを実行したあとに、Argo CDのSyncのステータスを確認してみるといいでしょう。

```yaml
## deploy-pipeline.yaml
---
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: deploy-with-argocd
spec:
  params:
    - name: argocd-version
      type: string
      default: v2.0.0
  tasks:
    - name: exec-argocd-sync
      taskRef:
        name: argocd-task-sync-and-wait
      params:
        - name: application-name
          value: test
        - name: argocd-version
          value: $(params.argocd-version)
    # デプロイ後の処理を記述しよう
    #- name: your-task
    #  taskRef:
    #    name: integration-test
    #  runAfter:
    #    - exec-argocd-sync
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-env-configmap
data:
  ARGOCD_SERVER: argocd-server-address  # みなさんのArgo CDに変更してね
---
apiVersion: v1
kind: Secret
metadata:
  name: argocd-env-secret
data:
  ARGOCD_USERNAME: xxxxxx  # base64でエンコードした値ですよ
  ARGOCD_PASSWORD: xxxxxx  # base64でエンコードした値ですよ
```

パイプラインの実行結果とArgo CDのSyncステータスの確認。
TektonパイプラインからArgo CDのSyncがしっかり実行されていることを確認しました。

![tekton-argo-pipline](/image/tekton-argo-pipeline.png)

![tekton-argo-sync-status](/image/tekton-argo-sync-status.png)

## Gitレポジトリの更新から実行したい
Gitレポジトリの更新からパイプラインを実行したい人は、別ブログでInterceptorの使い方をまとめているので、こちらを参照しましょう。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2021/04/09/tekton-trigger-interceptor/" data-iframely-url="//cdn.iframe.ly/zlWpI8z"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

## さいごに
TektonとArgo CDの使い分けについてイメージ湧いてきましたでしょうか？  
実際やってみるとすごくシンプルですね。実践フェーズで書くことがありませんでした（笑）
大事なことは、それぞれのツールの特徴を活かして、どのように組み合わせるかです。とはいえ試してみないとよくわからないと思うので、一度はチャレンジして確認してみるといいでしょう。