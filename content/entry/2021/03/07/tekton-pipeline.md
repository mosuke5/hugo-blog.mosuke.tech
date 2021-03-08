+++
categories = ["Kubernetes"]
date = "2021-03-07T23:13:07+09:00"
description = "Tekton学習シリーズ第5回は、いよいよTaskをまとめてPipelineという形で実行する方法について解説します。"
draft = false
image = ""
tags = ["Tech"]
title = "Tekton、TaskをまとめてPipelineとして実行する"
author = "mosuke5"
archive = ["2021"]
+++

Tekton学習シリーズ
- 第1回: [TektonのOperatorによるインストールとHello World](/entry/2020/05/10/tekton-operator/)
- 第2回: [Tekton、TaskのStepの実行順序について確認する](/entry/2021/03/06/tekton-multi-steps-task/)
- 第3回: [Tekton、Taskにパラメータを引き渡す](/entry/2021/03/06/tekton-task-with-params/)
- 第4回: [Tekton、TaskでPipelineResouceを利用したときの挙動を確認する](/entry/2021/03/07/tekton-task-with-pipelineresource/)
- 第5回: [Tekton、TaskをまとめてPipelineとして実行する](/entry/2021/03/07/tekton-pipeline/)

はい、もーすけです。  
Tekton学習シリーズ第5回をやっていきます。
本日はいよいよTaskをまとめPipelineをやっていきます。Taskの仕様を理解できていればおそらくそこまで難しくないと思います。

## Tektonにでてくる基本概念
まず、Tektonででてくる基本的かつ重要な概念についてあらためて整理しておきます。
前回と同様のものを掲載していますが、基礎概念の回ではのせておこうと思います。
本日は、PipelineとPipelineRunについておもに扱います。

{{< table class="table" >}}
|エンティティ  |説明  |
|---|---|---|
|Task  |Tektonで表現できる最小の実行単位。ひとつ以上のStepから成り立つ。  |
|TaskRun  |定義したTaskを実行するために利用。実行する際はTaskにわたす、入力や出力、パラメータなどを指定できる。単体で利用することも、Pipelineを実行したときに呼び出されて利用もされる。  |
|Pipeline  |定義したTaskの集合体。  |
|PipelineRun  |定義したPipelineを実行するために利用。パイプラインを実行するために、入力や出力、パラメータを指定できる。  |
|PipelineResource  |Task内のStepで利用する入力や出力の場所を定義する。PipelineRunやTaskRunを作成する際に指定される。  |
{{</ table >}}

## Pipeline Hello World
Tekton学習シリーズの第2,3回で利用したTaskを活用して、こんどはPipelineを作っていきます。
Pipelineは、Taskの集合体であり、Tektonのなかでは一番大きい単位の実行リソースとなります。いままで見てきたTaskをラッピングして実行するため、Taskをきちんと理解していればそれほど難しいものではないと思います。

改めて、以下のTaskを使います。  
本シリーズの第2回 [Tekton、TaskのStepの実行順序について確認する](/entry/2021/03/06/tekton-multi-steps-task/) を実施した方は、`multi-steps-task`の3番目のStepをsleepに書き換えてしまったのでもとに戻しておいてください。

```yaml
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
---
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
---
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: multi-steps-task
spec:
  steps:
    - name: first-output
      image: ubuntu
      command: ["echo"]
      args: ["hello first step"]
    - name: second-output
      image: ubuntu
      command: ["echo"]
      args: ["hello second step"]
    - name: third-output
      image: ubuntu
      command: ["echo"]
      args: ["hello third step"]
```

続いて、初登場のPipelineですが下記のとおりです。
上で定義した3つのTaskをまとめてパイプラインとしています。

```yaml
# my-first-pipeline.yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: my-first-pipeline
spec:
  params:
    - name: my-name
      type: string
    - name: my-friends
      type: array
  tasks:
    - name: hello-my-name
      taskRef:
        name: hello-my-name-task
      params:
        - name: my-name
          value: "$(params.my-name)"
    - name: hello-my-friends
      taskRef:
        name: hello-my-friends-task
      params:
        - name: my-friends
          value: ["$(params.my-friends[*])"]
    - name: multi-steps
      taskRef:
        name: multi-steps-task
```

では実行してみます。  
最後の`kubectl get pod -w`のところで注目してほしい点があります。
それは、上のパイプラインでは、Taskはすべて並列で実行されているということです。
次のセクションで順序制御については触れますが、なにも設定しない限りデフォルトでは並列実行となります。

イメージで言うとこんなかんじです。

```
                  (hello-my-name-task)
                / 
(Pipeline start) -(hello-my-friends-task) 
                \
                  (multi-steps-task)
```

```
$ kubectl apply -f my-first-pipeline.yaml
pipeline.tekton.dev/my-first-pipeline created

% kubectl apply -f my-first-pipeline-run.yaml
pipelinerun.tekton.dev/my-first-pipeline-run created

$ kubectl get pod -w
my-first-pipeline-run-hello-my-friends-9jf49-pod-wh2dg   0/1     Init:0/1    0          3s
my-first-pipeline-run-hello-my-name-qlmfz-pod-hf25l      0/1     Init:0/1    0          3s
my-first-pipeline-run-multi-steps-swftw-pod-4b2hq        0/3     Init:0/1    0          3s
my-first-pipeline-run-hello-my-name-qlmfz-pod-hf25l      0/1     PodInitializing   0          7s
my-first-pipeline-run-hello-my-friends-9jf49-pod-wh2dg   0/1     PodInitializing   0          7s
my-first-pipeline-run-multi-steps-swftw-pod-4b2hq        0/3     PodInitializing   0          8s
my-first-pipeline-run-hello-my-name-qlmfz-pod-hf25l      1/1     Running           0          11s
my-first-pipeline-run-hello-my-name-qlmfz-pod-hf25l      1/1     Running           0          11s
my-first-pipeline-run-hello-my-friends-9jf49-pod-wh2dg   1/1     Running           0          12s
my-first-pipeline-run-hello-my-friends-9jf49-pod-wh2dg   1/1     Running           0          12s
my-first-pipeline-run-hello-my-name-qlmfz-pod-hf25l      0/1     Completed         0          12s
my-first-pipeline-run-hello-my-friends-9jf49-pod-wh2dg   0/1     Completed         0          13s
my-first-pipeline-run-multi-steps-swftw-pod-4b2hq        3/3     Running           0          15s
my-first-pipeline-run-multi-steps-swftw-pod-4b2hq        3/3     Running           0          15s
my-first-pipeline-run-multi-steps-swftw-pod-4b2hq        2/3     Running           0          17s
my-first-pipeline-run-multi-steps-swftw-pod-4b2hq        1/3     Running           0          18s
my-first-pipeline-run-multi-steps-swftw-pod-4b2hq        0/3     Completed         0          19s
```

## 実行するTaskの順番を指定する
なんとなくPipelineについてわかってきましたよね？  
上で、Taskはすべて並列に動くという話をしましたが、ここで順序制御をしてみましょう。
`hello-my-friends`は`hello-my-name`の終わったあとに実行する、ということとします。  
イメージはこんな感じです。

```
                  (hello-my-name-task) - (hello-my-friends-task)
                / 
(Pipeline start)  
                \
                  (multi-steps-task)
```

次のようにPipelineを書き換えてみましょう。

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: my-second-pipeline
spec:
  params:
    - name: my-name
      type: string
    - name: my-friends
      type: array
  tasks:
    - name: hello-my-name
      taskRef:
        name: hello-my-name-task
      params:
        - name: my-name
          value: "$(params.my-name)"
    - name: hello-my-friends
      taskRef:
        name: hello-my-friends-task
      params:
        - name: my-friends
          value: ["$(params.my-friends[*])"]
      # my-first-pipelineから追加
      runAfter:
        - hello-my-name
    - name: multi-steps
      taskRef:
        name: multi-steps-task
```

`kubectl get pod -w`の出力結果をよく見てみましょう。  
はじめにPodができたのは、`hello-my-name`と`multi-steps`のふたつです。
`hello-my-name`が`Completed`になった後 `hello-my-friends`のPodが起動しているのがわかります。

```
$ kc apply -f my-second-pipeline.yaml
pipeline.tekton.dev/my-second-pipeline created

$ kc apply -f my-second-pipeline-run.yaml
pipelinerun.tekton.dev/my-second-pipeline-run created

$ kubectl get pod -w
my-second-pipeline-run-hello-my-name-g77b9-pod-lktbh     0/1     Init:0/1    0          2s
my-second-pipeline-run-multi-steps-vpwf4-pod-9xgw7       0/3     Init:0/1    0          2s
my-second-pipeline-run-multi-steps-vpwf4-pod-9xgw7       0/3     PodInitializing   0          2s
my-second-pipeline-run-hello-my-name-g77b9-pod-lktbh     0/1     PodInitializing   0          2s
my-second-pipeline-run-hello-my-name-g77b9-pod-lktbh     1/1     Running           0          4s
my-second-pipeline-run-hello-my-name-g77b9-pod-lktbh     1/1     Running           0          4s
my-second-pipeline-run-hello-my-name-g77b9-pod-lktbh     0/1     Completed         0          5s
my-second-pipeline-run-hello-my-friends-tfp44-pod-m5xjr   0/1     Pending           0          1s
my-second-pipeline-run-hello-my-friends-tfp44-pod-m5xjr   0/1     Pending           0          1s
my-second-pipeline-run-hello-my-friends-tfp44-pod-m5xjr   0/1     Init:0/1          0          1s
my-second-pipeline-run-hello-my-friends-tfp44-pod-m5xjr   0/1     PodInitializing   0          2s
my-second-pipeline-run-multi-steps-vpwf4-pod-9xgw7        3/3     Running           0          7s
my-second-pipeline-run-multi-steps-vpwf4-pod-9xgw7        3/3     Running           0          7s
my-second-pipeline-run-hello-my-friends-tfp44-pod-m5xjr   1/1     Running           0          3s
my-second-pipeline-run-hello-my-friends-tfp44-pod-m5xjr   1/1     Running           0          3s
my-second-pipeline-run-multi-steps-vpwf4-pod-9xgw7        1/3     Running           0          9s
my-second-pipeline-run-multi-steps-vpwf4-pod-9xgw7        0/3     Completed         0          10s
my-second-pipeline-run-hello-my-friends-tfp44-pod-m5xjr   0/1     Completed         0          5s
```

## Conditionsを使ったGuard Taskの実行
`runAfter`と似た概念にGuard Taskがあります。
こちらは、[ドキュメント](https://tekton.dev/docs/pipelines/pipelines/#guard-task-execution-using-conditions)にもあるとおりですが、Guard Taskが失敗した場合後続のタスクは実行されません。
しかし、それ以外の並列で動いているタスクには影響を与えないという特徴があります。
パイプラインの特性に合わせて組み合わせて使ってみてください。  
本シリーズでも機会があれば別途取り上げたいと思います。

## さいごに
今回は、簡単ではありますがTaskをまとめてPipelineとして実行しました。  
Pipelineも前回の第4回で行ったPipelineResourceをもちろん組み合わせて利用できます。
次回は、出力結果の扱いやPipelineのより実践的な使い方などを見ていこうと思います。

Tekton学習シリーズ
- 第1回: [TektonのOperatorによるインストールとHello World](/entry/2020/05/10/tekton-operator/)
- 第2回: [Tekton、TaskのStepの実行順序について確認する](/entry/2021/03/06/tekton-multi-steps-task/)
- 第3回: [Tekton、Taskにパラメータを引き渡す](/entry/2021/03/06/tekton-task-with-params/)
- 第4回: [Tekton、TaskでPipelineResouceを利用したときの挙動を確認する](/entry/2021/03/07/tekton-task-with-pipelineresource/)
- 第5回: [Tekton、TaskをまとめてPipelineとして実行する](/entry/2021/03/07/tekton-pipeline/)