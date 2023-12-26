+++
categories = ["Kubernetes"]
date = "2021-03-21T17:24:57+09:00"
description = "Tekton学習シリーズ第8回では、ClusterTaskとTekton Hubについて理解します。汎用的なTaskはチームを超えて共有して使っていくことができます。"
draft = false
image = ""
tags = ["Tech"]
title = "Tekton、ClusterTaskとTekton Hubを理解する"
author = "mosuke5"
archive = ["2021"]
+++


{{< tekton-series >}}

こんにちは、もーすけです。  
Tekton学習シリーズ、どんどん進めていきましょう。第8回は、ClusterTaskとTekton Hubについてです。
今までの内容より軽い内容になっています。これまで学習を進めてきた方ならすぐに理解できるはずです。
<!--more-->

## ClusterTask とは？
ここまでの学習でTaskを扱ってきました。Taskは、Tektonで表現できる最小の実行単位で、ひとつ以上のStepから成り立つものでした。
TaskのスコープはNamespaceです。異なるNamespaceからは参照することができないものでした。
一方で、ClusterTaskは、名前の通りKubernetesクラスタ全体がスコープとなるものです。
ClusterTaskに登録したTaskは、全Namespaceから参照して利用することができます。

使いみちとしては、カタログにあるような汎用的に利用できるTaskはClusterTaskとして登録してしまって、
アプリケーションごと、チームごとにTaskを登録する必要なく利用できるようにすることですかね。

ClusterTaskとTaskは、マニフェストの書き方自体は一緒なので、API名だけ変えて登録することが可能です。
もう少し具体的に言うと、第7回でカタログからgit-cloneのTaskを使いましたが、このTaskは別のNamespaceでも利用し得るのでClusterTaskに切り替えて登録が可能ということです。実際にやってみましょう。

カタログではTaskとして登録されています。
しかし、ClusterTaskに書き換えてすぐに利用できるということです。

```text
$ git clone https://github.com/tektoncd/catalog
$ cd catalog/task/git-clone/0.2/
$ ls -l 
total 24
-rw-r--r--  1 shinyamori  staff  3078  3  8 18:49 README.md
-rw-r--r--  1 shinyamori  staff  4654  3  8 18:49 git-clone.yaml
drwxr-xr-x  5 shinyamori  staff   160  3  8 18:49 samples
drwxr-xr-x  3 shinyamori  staff    96  3  8 18:49 tests

$ cat git-clone.yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: git-clone
  labels:
    app.kubernetes.io/version: "0.2"
  annotations:
    tekton.dev/pipelines.minVersion: "0.12.1"
    tekton.dev/tags: git
    tekton.dev/displayName: "git clone"
spec:
  ...
```

`kind: Task`から`kind: ClusterTask`に切り替えて、クラスタに登録します。

```text
$ vim git-clone.yaml
apiVersion: tekton.dev/v1beta1
#kind: Task
kind: ClusterTask  # <-ClusterTaskに変更した
metadata:
  name: git-clone
  labels:
    app.kubernetes.io/version: "0.2"
  annotations:
    tekton.dev/pipelines.minVersion: "0.12.1"
    tekton.dev/tags: git
    tekton.dev/displayName: "git clone"
spec:
  ...

$ kubectl apply -f git-clone.yaml
clustertask.tekton.dev/git-clone created

$ kubectl get clustertask
NAME        AGE
git-clone   4s
```

利用するときには、`spec.tasks[].taskRef.kind = ClusterTask`とする必要があります。

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: build-image-pipeline
spec:
  # 中略
  tasks:
    - name: fetch-repository
      taskRef:
        name: git-clone
        kind: ClusterTask  #<-この指定が必要
  # ...
```

## Tekton Hub とは？
カタログの延長ではあるのですが、カタログに記載のTaskを[Tekton Hub](https://hub.tekton.dev/)というサイトから検索したりレートをつけたりできます。
皆さんの利用したTaskが、すでにTekton Hubにないかぜひ確認してみましょう。今後Taskが増えていくことに期待です。

![tekton-hub](/image/tekton-hub.png)

![tekton-hub-buildah](/image/tekton-hub-buildah.png)

### 個人的に気になるTask
最後にまだ全部は試せていないのですが、個人的に気になるTaskを軽く紹介します。

1. [helm-upgrade-from-source](https://hub.tekton.dev/tekton/task/helm-upgrade-from-source)
    - Kubernetes上のアプリケーションのデプロイを考えると間違いなく使われるであろう
1. [terraform cli](https://hub.tekton.dev/tekton/task/terraform-cli)
    - AWSやGCPなどマルチクラウドを操作するTerraformのTask。Kubernetesとクラウド、SaaSなどまとめたオーケストレーションを可能にするので良さそう
1. [send-to-channel-slack](https://hub.tekton.dev/tekton/task/send-to-channel-slack)
    - 説明不要。使うよね
1. [skopeo copy](https://hub.tekton.dev/tekton/task/skopeo-copy)
    - コンテナイメージを別レジストリへコピーするのに利用するSkopeoのTask。実運用を見据えると結構使いそう
1. [kubeval](https://hub.tekton.dev/tekton/task/kubeval)
    - Kubernetesマニフェストのバリデーションツール。マニフェストのCIの観点では利用する頻度も多くなりそう。

## さいごに
第8回は軽いトピックでした。次回からはより実践的な内容をやっていきましょう。

{{< tekton-series >}}