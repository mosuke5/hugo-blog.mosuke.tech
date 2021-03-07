+++
categories = ["", ""]
date = "2021-03-07T14:13:07+09:00"
description = ""
draft = true
image = ""
tags = ["Tech"]
title = ""
author = "mosuke5"
archive = ["2021"]
+++

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
重要なのは並列で動いているということ。

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