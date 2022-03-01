+++
categories = ["DevOps", "Kubernetes"]
date = "2022-03-01T18:37:40+09:00"
description = ""
draft = true
image = ""
tags = ["Tech"]
title = "Tekton、ボリュームを使ってビルド・ライブラリダウンロードの高速化を図る"
author = "mosuke5"
archive = ["2022"]
+++

{{< tekton-series >}}

こんにちは、もーすけです。  
最近Tektonをより実践に向けて検証することが多くなってきました。
今回は、ビルドの高速化に役立つキャッシュの方法について紹介します。
<!--more-->

## やりたいこと、課題感
Tektonに限った話ではないですが、一般的にCIツールでアプリケーションの依存ライブラリをダウンロードするのに非常に時間がかかります（たとえば、mavenやpip、Gemといったパッケージのダウンロード）。
ローカル端末などストレージを持つ場合は、一度ダウンロードしたライブラリをキャッシュするため2回目以降は速度が速くなります。しかし、最近のCI環境はコンテナで構成されていることもあり、実行都度新しい環境のためライブラリをすべてダウンロードし直すことがあります。
Webhook経由で自動的に実行されるとはいえ、ビルド時間が長くなることは生産性を落とすことになるので、速くしたいものです。

本記事は、まだ情報の少ないTektonで実現する方法などについて記載します。

## 実現方法
実現したいことを図に表してみました。  
1回目のパイプラインでは、必要なライブラリをすべてダウンロードしますが、ダウンロードした結果を永続ストレージに保存します。
2回目のパイプラインでは、1回目で保存した永続ストレージを用いて、差分のみをダウンロードします。同じライブラリを用いるのであれば、ダウンロードは発生しないのでビルドやテストの時間を短縮することが可能になります。

![overview](/image/tekton-lib-cache-overview.png)

## mavenを使った例
例として、mavenを使ったJavaアプリケーションを取り上げます。
TektonHubに {{< external_link url="https://hub.tekton.dev/tekton/task/maven" title="mavenタスク" >}} があるのでこちらベースに使っていくことにします。
ブログ執筆時点では、このmavenタスク v0.2 では .m2のローカルレポジトリをWorkspaceで指定することができないので、改良していきます。

追加するところは、Workspaceと最終的なmvn実行部分です。

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: maven
  labels:
    app.kubernetes.io/version: "0.2"
  annotations:
    tekton.dev/pipelines.minVersion: "0.12.1"
    tekton.dev/categories: Build Tools
    tekton.dev/tags: build-tool
    tekton.dev/platforms: "linux/amd64,linux/s390x,linux/ppc64le"
spec:
  description: >-
    This Task can be used to run a Maven build.

  workspaces:
    - name: source
      description: The workspace consisting of maven project.
    - name: maven-settings
      description: >-
        The workspace consisting of the custom maven settings
        provided by the user.
    ## ★追加したWorkspace
    - name: maven-repo
      description: The workspace for m2 local repo
  params:
    ## 省略
  steps:
    ## 省略

    - name: mvn-goals
      image: $(params.MAVEN_IMAGE)
      workingDir: $(workspaces.source.path)/$(params.CONTEXT_DIR)
      command: ["/usr/bin/mvn"]
      args:
        - -s
        - $(workspaces.maven-settings.path)/settings.xml
        - "$(params.GOALS)"
        - -Dmaven.repo.local=$(workspaces.maven-repo.path)   ## 追加したオプション
```

## 実行時にボリュームをマウントする
Taskの実行時に、Workspaceとしてボリュームを引き渡してあげればよいわけです。
注意事項としては、AWS EBSのようなブロックストレージ（RWOなストレージ）の場合、ひとつのPodでしかマウントできません。並列でパイプラインを回すことができないので注意しましょう。
複数のパイプラインを実行した場合は、対象のボリュームが開放されるまでWaitするので、おかしな挙動をするわけではないので安心して使うことはできますが、ただただ待ちが発生してしまいます。

もし、並列でパイプラインを実行する場合は、EFSなどRWXなストレージを検討する必要がでてきます。