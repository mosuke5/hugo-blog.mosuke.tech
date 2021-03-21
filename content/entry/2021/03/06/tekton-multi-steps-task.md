+++
categories = ["Kubernetes"]
date = "2021-03-06T16:34:41+09:00"
description = "TektonのTaskは複数のStepからなりたちます。複数Stepにした際の実行順序やその実現方法などについて確認しました。"
draft = false
image = ""
tags = ["Tech"]
title = "Tekton、TaskのStepの実行順序について確認する"
author = "mosuke5"
archive = ["2021"]
+++

{{< tekton-series >}}

前回、TektonのOperatorを使ったインストールについて解説しました。
今回は、もうすこしTaskの動きを確認してみます。具体的には、Task内のStepの役割や、複数のStepがある場合の実行順序の制御方法などについて確認してみます。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2020/05/10/tekton-operator/" data-iframely-url="//cdn.iframe.ly/aQ48OK3"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

<!--more-->

## Tektonにでてくる基本概念
まず、Tektonででてくる基本的かつ重要な概念についてあらためて整理しようと思います。
こちらを念頭にいれて、本日はTaskとTaskRunについて扱います。

{{< table class="table" >}}
|エンティティ  |説明  |
|---|---|---|
|Task  |Tektonで表現できる最小の実行単位。ひとつ以上のStepから成り立つ。  |
|TaskRun  |定義したTaskを実行するために利用。実行する際はTaskにわたす、入力や出力、パラメータなどを指定できる。単体で利用することも、Pipelineを実行したときに呼び出されて利用もされる。  |
|Pipeline  |定義したTaskの集合体。  |
|PipelineRun  |定義したPipelineを実行するために利用。パイプラインを実行するために、入力や出力、パラメータを指定できる。  |
|PipelineResource  |Task内のStepで利用する入力や出力の場所を定義する。PipelineRunやTaskRunを作成する際に指定される。  |
{{</ table >}}

## 複数StepをもつTaskの実行
前回のブログでは、ひとつのStepのみをもつTaskを実行しました。複数のStepをもつ場合どうなるか確認してみます。ちなみに、Task内のStepは特定の順序で実行可能です。  
次のTaskとTaskRunで試してみます。

```yaml
# multi-steps-task.yaml
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

```yaml
# multi-steps-task-run.yaml
apiVersion: tekton.dev/v1beta1
kind: TaskRun
metadata:
  name: multi-steps-task-run
spec:
  taskRef:
    name: multi-steps-task
```

```
$ kubectl apply -f multi-steps-task.yaml
task.tekton.dev/multi-steps-task created

$ kubectl apply -f multi-steps-task-run.yaml
taskrun.tekton.dev/multi-steps-task-run created

## Pod内のコンテナ数に注目。3Stepあるので3つのコンテナで起動。
$ kubectl get pod -w
NAME                             READY   STATUS     RESTARTS   AGE
multi-steps-task-run-pod-92s4v   0/3     Init:0/1   0          3s
multi-steps-task-run-pod-92s4v   0/3     PodInitializing   0          6s
multi-steps-task-run-pod-92s4v   3/3     Running           0          12s
multi-steps-task-run-pod-92s4v   3/3     Running           0          12s
multi-steps-task-run-pod-92s4v   2/3     Running           0          13s
multi-steps-task-run-pod-92s4v   1/3     Running           0          14s
multi-steps-task-run-pod-92s4v   0/3     Completed         0          15s
```

## Stepの実行順序の確認
どのように順番制御をしているのか気になったので確認してみます。TaskRunで作成されたTask Podの中身をのぞいてみます。そうすると、Pod内のコンテナが、前のコンテナの修了を待っていることがわかります。`-wait_file /tekton/tools/0` が`/tekton/tools/0`が作成されるのをまち、`-post_file /tekton/tools/1`はStepの処理終了後に`/tekton/tools/1`のファイルを作成するということを意味します。

```
## 2番目のStepのコンテナは、/tekton/tools/0ができるまでまっている（前のStepが終わるのを待つ）
$ kubectl get pod multi-steps-task-run-pod-92s4v -o yaml | less
...
  - args:
    - -wait_file
    - /tekton/tools/0
    - -post_file
    - /tekton/tools/1
    - -termination_path
    - /tekton/termination
    - -entrypoint
    - echo
    - --
    - hello second step
    command:
    - /tekton/tools/entrypoint
    env:
    - name: HOME
      value: /tekton/home
    image: ubuntu
    imagePullPolicy: Always
    name: step-second-output
...
```

この `/tekton/tools/0`の実態を確認するべく、Taskを以下のように変更しました。
3番目のStepをSleepに変更して、Task実行中とすることでその間にコンテナ内部を確認してみます。

```
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
      command: ["sleep"]
      args: ["600"]
```

では、もう一度multi-steps-task-runを実行します。同じ名前のTaskRunは作れないため、TaskRunの名前を変更してapplyするか、tknコマンド・ダッシュボードから実行してください。
実行中のTask Podに対して`kubectl exec`でコンテナ内を確認します。`/tekton/tools/0`, `tekton/tools/1`という空ファイルが作成されています。

```
$ kubectl get pod
NAME                                           READY   STATUS      RESTARTS   AGE
multi-steps-task-run-1615020642552-pod-rldm6   1/3     Running     0          10s
multi-steps-task-run-pod-92s4v                 0/3     Completed   0          21m

## コンテナ内の/tekton/tools内を確認
$ kubectl exec -it multi-steps-task-run-1615020642552-pod-rldm6 -c step-third-output -- ls -l /tekton/tools
total 39452
-rw-r--r-- 1 root  root         0 Mar  6 08:50 0
-rw-r--r-- 1 root  root         0 Mar  6 08:50 1
-r-xr-xr-x 1 65532 65532 40397757 Mar  6 08:50 entrypoint
```

ちなみに、TaskないのStepはEmptyDirを用いて`/tekton/tools`を共有しています。
これによってStepの終了を別のコンテナに通知している形となります。

```
$ kubectl get pod multi-steps-task-run-1615020642552-pod-rldm6 -o yaml | less
spec:
  containers:
...
    volumeMounts:
    - mountPath: /tekton/tools
      name: tekton-internal-tools
...
  volumes:
  - emptyDir: {}
    name: tekton-internal-workspace
  - emptyDir: {}
    name: tekton-internal-home
  - emptyDir: {}
    name: tekton-internal-results
  - emptyDir: {}
    name: tekton-internal-tools
```

## さいごに
前回から間が空いてしまいましたが、Tektonについて学んだこと、確認したことを継続してポストしますので次回もお楽しみにしてください。

{{< tekton-series >}}