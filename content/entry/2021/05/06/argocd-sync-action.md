+++
categories = ["Kubernetes"]
date = "2021-05-06T13:11:40+09:00"
description = "Argo CDのSyncの実行方法やそのタイミングについて検討します。CIツールからの実装が便利なケースもあるので考え方をまとめました。"
draft = false
image = ""
tags = ["Tech"]
title = "第3回: Argo CD、Syncの実行方法やタイミングについての検討"
author = "mosuke5"
archive = ["2021"]
+++

{{< argocd-series >}}

こんにちは、もーすけです。  
Argo CD学習シリーズどんどんやっていきます。
今回は、Argo CDがアプリケーションをSync（同期）するタイミングに関する検討です。
軽めの話題ですが、実運用を検討する上で重要になるのでしっかりおさえておきましょう。
<!--more-->

## 手動Syncか自動Syncか
前回まで、とくにSyncの設定については触れてこず、手動で「Sync」ボタンをおすことで処理を行ってきました。
Argo CDでは、Syncを手動で行うか自動で行うかを選択することが可能です。

以下は、Argo CDのWebコンソールでのアプリケーション作成画面です。
`SYNC POLICY`にて、`Manual`か`Automatic`を選択できます。

![argocd-sync-option](/image/argocd-sync-option.png)

マニフェストで書く場合は、`.spec.syncPolicy.automated`を記述すればOKです。
自動Syncの中でもさらなるオプションがあるので、`.spec.syncPolicy.automated = {}`で自動Syncは有効化されます。

```yaml
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
  syncPolicy:
    # 自動Syncにする場合
    automated: {}
```

## Syncタイミングのコントロール
自動Syncの場合、Argo CDは「3分毎」にポーリングしてSyncします（[公式ドキュメント](https://argoproj.github.io/argo-cd/user-guide/ci_automation/#synchronize-the-app-optional)）。
Gitレポジトリを修正してから3分以内で、Kubernetesクラスタへデプロイされるということです。

この3分が要件的に遅い場合や、自らの任意のタイミングで実行したい場合は、次の大きく2つの方法で対応できます。

1. Webhookを用いて、Gitレポジトリの変更をトリガーに実行する
1. Gitレポジトリの変更に対して、CIパイプラインを実行させ、CIパイプライン内からSync処理を実行する

![argocd-sync-from-ci](/image/argocd-sync-from-ci.png)

それぞれの特徴を考えてみましょう。  
まずは、1.のWebhookで直接Argo CDのSync処理をトリガーさせる場合です。
なんといっても、余計なCIパイプラインを作る必要がなくなるのでシンプルに構成がまとまるでしょう。
一方で、Sync以外の処理をさせたい場合の考え方がことなってきます。Argo CDには、[Sync Phases and Waves](https://argoproj.github.io/argo-cd/user-guide/sync-waves/)という機能があって、Syncの前後で任意の処理を挟んだり、Syncの順番をある程度コントロールできます。
つまり、WebhookでArgo CDに通知してしまった以上、**それ以降の処理はArgo CD側で頑張る**ことが必要です。

もし、2.のCIパイプラインを用いた場合は、もっと柔軟にSync前後の処理を行うことができると考えます。
結合テストだったり、負荷テスト、任意の業務処理それらを**Argo CDと切り離して実装できる**ので効率がいいと思います。

とはいえ、CD専用のツールを導入したのにCIツールからのトリガーが必要というのもどうなんだろう？と思うところもあるかなと思います。これについては、業務用件次第ですが、どのツールになんの責任をもたせるか？という検討が重要かと思います。

## Argo CD APIの実行
CIパイプラインからArgo CDのSyncを実行する場合、どのように実行するのよいでしょうか？
おそらく一番簡単な方法がArgo CDのCLIを使うことでしょう。Syncはもちろん、Syncが終わるまで待つWait機能も持つため、CIツールには比較的組み込みやすいでしょう。
もちろん、APIを直接実行する方法もありますが、ドキュメントもほぼなく自分でSwagger documentを読むことになります。CIツールからの利用という観点なら、CLIで十分でしょう。

## さいごに
今回は、Argo CDのSyncに関して、実行方法や運用上で考えなければならないことについてまとめました。 引き続き、まだまだArgo CD学習シリーズをやっていきますので、みなさんも頑張りましょう。 

{{< argocd-series >}}