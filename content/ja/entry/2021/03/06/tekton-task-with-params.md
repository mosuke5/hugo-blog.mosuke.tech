+++
categories = ["Kubernetes"]
date = "2021-03-06T22:43:43+09:00"
description = "Tekton学習シリーズで、Taskにパラメータを指定する方法について紹介します。文字列、配列の指定方法などを確認します。"
draft = false
image = ""
tags = ["Tech"]
title = "Tekton、Tasksにパラメータを設定する"
author = "mosuke5"
archive = ["2021"]
+++

{{< tekton-series >}}

こんにちは、もーすけです。  
今回はTektonのTaskにパラメータを引き渡す方法についてみていきます。
前回までは、Taskにべた書きしたコマンドを実行しましたが、パラメータ指定し変数化する方法を確認します。
<!--more-->

## Tektonにでてくる基本概念
まず、Tektonででてくる基本的かつ重要な概念についてあらためて整理しておきます。
前回と同様のものを掲載していますが、基礎概念の回ではのせておこうと思います。
本日もTaskとTaskRunについて扱います。

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

## Taskにパラメータを設定する
Taskにパラメータを設定するには、まずTaskになんのパラメータが必要かを記述する必要があります。
以下は例ですが、`my-name`というパラメータを必要とします。型はStringとしていますが、のちほどでArrayの指定も見ていきます。
デフォルト値は、`mosuke5`で設定しています。
また変数展開は、`$(params.param-name)`で可能です。  
詳細は公式ドキュメント"[Specifying Parameters](https://tekton.dev/docs/pipelines/tasks/#specifying-parameters)"を確認しましょう。

```yaml
# hello-my-name-task.yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: hello-my-name-task
spec:
  params:
    - name: my-name
      type: string
      description: My name which steps use
      default: mosuke5
  steps:
    - name: output-hell-my-name
      image: ubuntu
      command: ["echo"]
      args: ["hello $(params.my-name)"]
```

TaskRunで、実際にTaskを実行するときのパラメータを指定できます。
`my-name`のデフォルト値は`mosuke5`ですが、パラメータ指定をわかりやすくするために、`momosuke5`で上書きします。

```yaml
# hello-my-neme-task-run.yaml
apiVersion: tekton.dev/v1beta1
kind: TaskRun
metadata:
  name: hello-my-name-task-run
spec:
  params:
    - name: my-name
      value: momosuke5
  taskRef:
    name: hello-my-name-task
```

```
$ kubectl apply -f hello-my-name-task.yaml
task.tekton.dev/hello-my-name-task created

$ kubectl apply -f hello-my-name-task-run.yaml
taskrun.tekton.dev/hello-my-name-task-run created

$ kubectl get pod
kc get pod
NAME                                             READY   STATUS      RESTARTS   AGE
hello-my-name-task-run-pod-lgfbg                 0/1     Completed   0          2m52s

$ kubectl logs hello-my-name-task-run-pod-lgfbg
hello momosuke5
```

ちなみに、実行されたPodのマニフェストを確認すると、Pod作成時点では変数は展開されており、以下のように`args`内で`hello momosuke5`となっています。
Tektonが、Podを作成するときにパラメータは処理されています。

```
$ kubectl get pod hello-my-name-task-run-pod-lgfbg -o yaml | less
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
    - echo
    - --
    - hello momosuke5
```

## array型のパラメータ
パラメータにはarray（配列）も扱えるということでやっていきます。
`my-friends`というパラメータが必要であることをTaskに記述します。
詳細は公式ドキュメント"[Substituting Array parameters
](https://tekton.dev/docs/pipelines/tasks/#substituting-array-parameters)"を確認しましょう。

```yaml
# hello-my-friends-task.yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: hello-my-friends-task
spec:
  params:
    - name: my-friends
      type: array
  steps:
    - name: output-hell-my-friends
      image: ubuntu
      command: ["echo"]
      args: ["hello", "$(params.my-friends[*])"]
```

TaskRunで、配列で`my-friends`の値を渡します。

```yaml
# hello-my-friends-task-run.yaml
apiVersion: tekton.dev/v1beta1
kind: TaskRun
metadata:
  name: hello-my-friends-task-run
spec:
  params:
    - name: my-friends
      value:
        - renge
        - hikage
        - komari
        - natsumi
  taskRef:
    name: hello-my-friends-task
```

実行結果は以下のとおり、予想通りです。

```
$ kubectl apply -f hello-my-friends-task.yaml
task.tekton.dev/hello-my-friends-task created

$ kubectl apply -f hello-my-friends-task-run.yaml
taskrun.tekton.dev/hello-my-friends-task-run created

$ kubectl logs hello-my-friends-task-run-pod-ps744
hello renge hikage komari natsumi
```

## さいごに
今回は、Taskに対するパラメータの設定方法についか確認しました。
Tektonの学習状況についてどんどん更新していきますので次回もよろしくお願いいたします。

{{< tekton-series >}}