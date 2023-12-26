+++
categories = ["Kubernetes"]
date = "2021-06-12T18:24:10+09:00"
description = "Argo CDのResource Hooksについて解説します。単純なデプロイではなく、任意の処理をデプロイの前後に挟み込む非常に重要な機能です。Argo CDの実戦投入前に検証しておくべき項目のひとつでしょう。"
draft = false
image = ""
tags = ["Tech"]
title = "Argo CD、Resource Hooksを使ってデプロイを高度化する"
author = "mosuke5"
archive = ["2021"]
+++

{{< argocd-series >}}

こんにちは、もーすけです。  
Argo CD学習シリーズをやっていきます。
今回は、Argo CDのResource Hooksという仕組みについて解説します。
前回にやったArgo CDのSyncと密接に関連するトピックです。
運用レベルでArgo CDを使っていく場合、避けて通れない内容になってきます。
Argo CDを使った本格運用に向けて学んでいきましょう。
<!--more-->

## Sync以外の処理をどこで行うのか？
第3回「[Argo CD、Syncの実行方法やタイミングについての検討](/entry/2021/05/06/argocd-sync-action/)」にて、Argo CDとCIツールの連携について述べました。
状況によっては、CIツールからArgo CDのSyncを実行させることが選択できることを紹介しました。
CIツールから実行することで、Sync以外の処理をCIツール側から操作できるなどのメリットがありますが、Argo CDでもResource Hooksを利用することで、Syncの前後に任意の処理を挟むことができます。

![argocd-sync-from-ci](/image/argocd-sync-from-ci.png)

Syncの前後ではさみたい処理にどのようなものがあるでしょうか？  
代表的なものとして以下のようなことが考えられます。

1. データベースのスキーマ変更処理をSync前に実行したい
1. Sync後に結合テストを実施したい
1. Syncの失敗を通知して受け取りたい
1. デプロイの順番を制御したい（単純なrollingupdate以上のことを実装したい）

## Resource Hooksをどうやって使うの？
さて、このResource Hooksですがどのように使うのか説明します。
利用方法は簡単で、Argo CDでSyncするアプリケーションのマニフェスト内に特定のAnnotationsを記述したリソースを含めておくだけです。Resource Hooks用にリポジトリを用意したりすることはなく、あなたのアプリケーションのマニフェストレポジトリ内に、マニフェストを用意するのみです。

主な設定は、処理のタイミング（`argocd.argoproj.io/hook`）と、処理に利用したリソースをどのタイミングで削除するか（`argocd.argoproj.io/hook-delete-policy`）だけです。
それぞれの設定を見ていきましょう。

### 処理のタイミング
処理のタイミングの設定は、Annotationに`argocd.argoproj.io/hook`をつけることで可能です。
対象のリソース（たとえばSyncの前後で実行したいJob）に対して、以下のhookタイミングを設定できます。
多く用いられるのは、`PreSync`, `PostSync`, `SyncFail`かと思います。

{{< table class="table" >}}
|Hook  |説明  |
|---|---|
|`PreSync`  | アプリケーションマニフェストの適用前（Sync前）に実行する。DBのスキーマ変更などにい用いることが多い。|
|`Sync`     | すべての`PreSync` hookが完了し成功した後に実行。マニフェストの適用と同タイミング。|
|`Skip`     | マニフェストの適用をスキップする。|
|`PostSync` | `Sync` hookが完了し成功したあとに実行（すべてのリソースが`Healthy`ステータスになったとき実行される）。結合テストなどの処理はこちらを利用する。|
|`SyncFail` | `Sync` hookが失敗したときに実行。デプロイの失敗通知などに利用できる。|
{{</ table >}}

参考として、ジョブをSync前に実行したい場合は、Jobリソースを用意して、JobのAnnotationsに`argocd.argoproj.io/hook: PreSync`を付与するとなります。

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: presync-job
  annotations:
    # ↓これを付与
    argocd.argoproj.io/hook: PreSync
spec:
  template:
    spec:
      containers:
      - name: presync
        image: fedora:33
        command:
          - "/bin/bash"
        args:
          - "-c"
          - "date && echo 'presync'"
      restartPolicy: Never
  backoffLimit: 2
```

### リソースの削除タイミング
Resource Hooksで利用したリソースの削除のタイミングは、Annotationに`argocd.argoproj.io/hook-delete-policy`をつけることで設定可能です。
もし、なにも設定しなかった場合、以下のように実行したJobがPodとして残りますが（`presync-job-gj4bd`が処理に利用したJobのPod）、任意のタイミングで削除できるというわけです。

```text
$ oc get pod
NAME                                READY   STATUS      RESTARTS   AGE
nginx-deployment-64b6fc996b-94ttg   1/1     Running     0          4m33s
presync-job-gj4bd                   0/1     Completed   0          86s
```

{{< table class="table" >}}
|Hook  |説明  |
|---|---|
|`HookSucceeded`  | Hook処理が成功したあとにリソースは削除されます。たとえば、Sync前にデータベースのスキーマ変更の処理を行った場合、そのスキーマ変更を行うJobが成功した時点で削除します。|
|`HookFailed`  | Hook処理が失敗したあとにリソースは削除されます。|
|`BeforeHookCreation`  | 既存に存在するリソースをHook処理実行前に削除します。これがデフォルト設定です。次回の処理までは残っているということです。|
{{</ table >}}


## Job以外にも使える
ドキュメントを読むと、Jobの設定ばかりですが、Job以外にも利用できます。
多くの場合、Sync前後の「処理」が主なユースケースのため、処理を実行するJobがサンプルとなっています。しかしJob以外にもこの機能を使えることは実は重要です。

たとえば、**Syncする前に特定のリソースを作っておきたい**というニーズです。
Sync前に、アプリケーションが利用するSecretやConfigMapをデプロイしておきたいといったものです。この場合であれば、SecretやConfigMapのリソースに対して、上で紹介したAnnotationsをつければよいということです。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pre-cm
  annotations:
    argocd.argoproj.io/hook: PreSync
#...
```

## まとめ
今回は、Argo CDのResource Hooksという機能についてみてきました。
Argo CDを実戦投入する上では欠かせない機能と考えています。おそらく多くのアプリケーションでは、本番環境では「ただデプロイすればいい」ということは少なく、なんらかの処理やテスト、通知が必要になるはずです。それらを実現するためのArgo CDの機能がResource Hooksでした。
任意の処理やテストを、CIツールなどArgo CDの外からも実施が可能ですが、デプロイをシンプルにするためにはCIツールのパイプラインは少ないほうがいいでしょう。
すべてをArgo CDにやらせるべきか？は、処理の性質次第かなと思いますが、有力な候補としてあがってくることまちがいなしです。

{{< argocd-series >}}