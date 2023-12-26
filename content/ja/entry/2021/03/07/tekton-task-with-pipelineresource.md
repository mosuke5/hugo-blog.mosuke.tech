+++
categories = ["Kubernetes"]
date = "2021-03-07T15:27:50+09:00"
description = "Tekton学習シリーズの第4回では、CIパイプラインに欠かせないGitレポジトリを扱う方法を確認します。PipelineResourceのGitタイプを指定したときの挙動などについて学習します。"
draft = false
image = ""
tags = ["Tech"]
title = "Tekton、TaskでPipelineResouceを利用したときの挙動を確認する"
author = "mosuke5"
archive = ["2021"]
+++

{{< tekton-series >}}

こんにちは、もーすけです。  
本日もTekton学習シリーズやっていきます。第4回は、TaskにPipelineResourceを追加してみます。
CIパイプライン内でGitレポジトリのソースコードを扱うことは一般的です。その方法や、設定するとなにが起きるのか見ていきましょう。
<!--more-->

## Tektonにでてくる基本概念
はじめに、Tektonででてくる基本的かつ重要な概念についてあらためて整理しておきます。
前回と同様のものを掲載していますが、基礎概念の回では毎度のせておこうと思います。
本日は、PipelineResouceがおもなターゲットになります。

{{< table class="table" >}}
|エンティティ  |説明  |
|---|---|---|
|Task  |Tektonで表現できる最小の実行単位。ひとつ以上のStepから成り立つ。Taskが必要とするパラメータなどを定義できる。  |
|TaskRun  |定義したTaskを実行するために利用。Taskの実行に必要な、入力や出力・パラメータなどを指定する。TaskRun単体として利用することもできるが、Pipelineを実行したときにTaskRunが作成される。  |
|Pipeline  |パイプライン。定義したTaskの集合体。パイプラインを実行するのに必要なパラメータなども定義できる。  |
|PipelineRun  |定義したPipelineを実行するために利用。パイプラインを実行するために、入力や出力、パラメータを指定する。  |
|PipelineResource  |Task内のStepで利用する入力や出力の場所を定義する。PipelineRunやTaskRunを作成する際に指定される。  |
|ClusterTask  |Taskは、特定のNamespace内に作成されるが、ClusterTaskはすべてのNamespaceで共有されるTask。汎用的なTaskを管理するのに向いている。（詳細は[第8回](/entry/2021/03/21/tekton-cluster-task-tektonhub/)を参照。）|
{{</ table >}}

Task, TaskRun, Pipeline, PipelineRunの関係性については、以下のとおりです。

![tekton-crds-relation](/image/tekton-crds-relation.png)

## PipelineResourceのGitタイプを利用する
CIパイプライン内では、GitHubやGitlabといったGitレポジトリ内のソースコードを扱うことは一般的です。
TaskのStepにて、独自に`git clone`を実施する処理を用意してもいいのですが、PipelineResourceが活用できます。
PipelineResourceは、Task内のStepで利用する入力や出力の場所を定義するもので、PipelineRunやTaskRunを作成する際に指定できます。
代表的なものに、GitやImage（コンテナイメージレジストリ）などがあります。
今回は、GitタイプのPipelineResourceを利用するとどのような挙動するのか確認してみます。

用意したマニフェストは以下の通りです。
Taskは、内部の挙動を確認するため、わざと`sleep 3600`するwait stepを置きました。

```yaml
# my-git-resource.yaml
apiVersion: tekton.dev/v1alpha1
kind: PipelineResource
metadata:
  name: my-git-resource
spec:
  type: git
  params:
    - name: url
      value: https://github.com/mosuke5/hugo-blog.mosuke.tech
    - name: revision
      value: master
```

```yaml
# my-task-with-pipelineresource.yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: my-task-with-pipelineresource
spec:
  resources:
    inputs:
      - name: src
        type: git
  steps:
    - name: wait
      image: ubuntu
      command: ["sleep"]
      args: ["3600"]
```

```yaml
# my-task-with-pipelineresource-run.yaml
apiVersion: tekton.dev/v1beta1
kind: TaskRun
metadata:
  name: my-task-with-pipelineresource-run
spec:
  resources:
    inputs:
      - name: src
        resourceRef:
          name: my-git-resource
  taskRef:
    name: my-task-with-pipelineresource
```

準備ができたら、実行して中身を確認します。

```text
$ kubectl apply -f my-git-resource.yaml
pipelineresource.tekton.dev/my-git-resource created

$ kubectl apply -f my-task-with-pipelineresource.yaml
task.tekton.dev/my-task-with-pipelineresource created

$ kubectl apply -f my-task-with-pipelineresource-run.yaml
taskrun.tekton.dev/my-task-with-pipelineresource-run created

$ kubectl get pod -w
NAME                                                READY   STATUS            RESTARTS   AGE
my-task-with-pipelineresource-run-pod-jfkrl         0/2     PodInitializing   0          2s
my-task-with-pipelineresource-run-pod-jfkrl         2/2     Running           0          9s
my-task-with-pipelineresource-run-pod-jfkrl         2/2     Running           0          9s
```

ひとつ気になる点があります。今回の`my-task-with-pipelineresource`では、Stepはひとつしか書いていませんが、コンテナ数ふたつになっています。というわけで、Podの定義を確認してみましょう。
確認するとわかるのですが、Task内に書いたStepの他に、`name: step-git-source-src-shnpk`というコンテナが追加されています。
こちらは、Tektonが追加したコンテナで、PipelineResourceで指定したリソースをGitレポジトリからダウンロードしてくる処理（`/workspace/src`にダウンロード）を行っています。
Step間は、EmptyDirで共有されているので、後続の処理で同じソースコードを活用していくことができます。

```text
$ kubectl get pod my-task-with-pipelineresource-run-pod-jfkrl -o yaml | less
...
spec:
  containers:
  - args:
    - -wait_file
    - /tekton/downward/ready
    - -wait_file_content
    - -post_file
    - /tekton/tools/0
    - -termination_path
    - /tekton/termination
    - -entrypoint
    - /ko-app/git-init
    - --
    - -url
    - https://github.com/mosuke5/hugo-blog.mosuke.tech
    - -path
    - /workspace/src
    - -revision
    - master
    command:
    - /tekton/tools/entrypoint
    ...
    image: gcr.io/tekton-releases/github.com/tektoncd/pipeline/cmd/git-init@sha256:c6cb2257d718bbd6281f0d028c801c26333221a2c38ce85ae8e23b24bf20e781
    imagePullPolicy: IfNotPresent
    name: step-git-source-src-shnpk
...
```

コンテナ内部を軽く確認してみましょう。  
PipelineResourceで指定したGitレポジトリ（今回の場合は本ブログのGitレポジトリ）がダウンロードされていることが確認できます。

```text
% kc exec -it my-task-with-pipelineresource-run-pod-jfkrl -c step-wait -- /bin/bash
root@my-task-with-pipelineresource-run-pod-jfkrl:/workspace# ls -l
total 4
drwxr-xr-x 8 root root 4096 Mar  7 06:47 src
root@my-task-with-pipelineresource-run-pod-jfkrl:/workspace# ls -l src/
total 32
-rw-r--r-- 1 root root 1060 Mar  7 06:47 README.md
drwxr-xr-x 2 root root 4096 Mar  7 06:47 archetypes
-rw-r--r-- 1 root root 1319 Mar  7 06:47 config.toml
drwxr-xr-x 3 root root 4096 Mar  7 06:47 content
drwxr-xr-x 2 root root 4096 Mar  7 06:47 scripts
drwxr-xr-x 3 root root 4096 Mar  7 06:47 static
drwxr-xr-x 2 root root 4096 Mar  7 06:47 themes
-rw-r--r-- 1 root root 2758 Mar  7 06:47 wercker.yml
```

## さいごに
本日は簡単なネタでしたが、CIパイプラインでは欠かせないGitレポジトリを扱う方法についてみていきました。
これから、いよいよPipelineやPipelineRunに移っていく予定です。

{{< tekton-series >}}