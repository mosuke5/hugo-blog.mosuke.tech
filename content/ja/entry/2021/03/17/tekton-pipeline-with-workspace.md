+++
categories = ["Kubernetes"]
date = "2021-03-17T17:17:12+09:00"
description = "Tekton学習シリーズ第6回でWorkspaceを確認します。Task間のデータ連携する方法を練習します。"
draft = false
image = ""
tags = ["Tech"]
title = "Tekton、PipelineでWorkspaceを利用してTask間でデータを連携する"
author = "mosuke5"
archive = ["2021"]
+++

{{< tekton-series >}}

こんにちは、もーすけです。  
本日もTekton学習シリーズやっていきましょう。第6回はPipelineでWorkspaceを利用してTask間でデータを連携する方法についてです。
あるTaskで作ったデータを別のTaskで利用することはパイプラインを作っていく上で非常に重要です。
<!--more-->

## Task間のデータ連携
そもそもTask間でデータを連携するとはどういうことか考えてみましょう。  
このTekton学習シリーズを読んでいただいている人はわかるかと思いますが、Tektonにおいて各Taskはそれぞれの独立したPodとして動きます。つまりTaskが異なれば、Podも異なるということです。
Kubernetesでアプリケーションの設計を行ったことのある人ならいつもどおりのことではありますが、Pod間でデータを連携するには、DBやオブジェクトストレージなどの外部ストレージに保存するか、NFSなどRWXなストレージをPod間にマウントするなどの方法があります。
Tetonパイプラインにおいても同じようにTask間でデータを連携するにはストレージ戦略を考えていく必要があるということです。  
ちなみに、Task内のStepは同一Podのため、`emptyDir`を用いてデータを連携することは容易です。

## Workspaceを用いたPipelineの練習
それでは、TektonのWorkspaceを用いて、Task間でデータを連携する方法を確認して見ていきましょう。
本環境はGCP上で動かしており、PersistentVolumeをDynamic Provisioningとして払い出せる環境になっていることを先に断っておきます。  
イメージは以下のようなパイプラインです。

```
(Pipeline start) - (task A) - (task B)
                         \     /
                          \   /
                   (Persistent Volume)
```

まず以下2つのTaskを利用します。  
`workspace-test-task-curl`は、パラメータで指定したURLに対してcurlでアクセスして、その結果をworkspace内に保存するものです。
`workspace-test-task-output`は、`workspace-test-task-curl`が保存した結果をアウトプットするというものです。とくに実用性があるパイプラインではないですが、練習台として捉えてください。
（実用的なパイプラインは、この学習シリーズの後半で行っていくようです。）

```yaml
# workspace-test-task.yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: workspace-test-task-curl
spec:
  params:
    - name: url
      type: string
  workspaces:
    - name: my-workspace
  steps:
    - name: curl
      image: fedora:latest
      command:
        - curl
      args:
        - "-I"
        - "$(params.url)"
        - "-o"
        - "$(workspaces.my-workspace.path)/output.txt"
---
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: workspace-test-task-output
spec:
  workspaces:
    - name: my-workspace
  steps:
    - name: output
      image: fedora
      command:
        - cat
      args:
        - "$(workspaces.my-workspace.path)/output.txt"
```

続いてPipelineをみていきます。
必要なパラメータやWorkspaceの設定を行います。あとは、今回のTaskは直列の関係性にあるので`runAfter`を活用します。

```yaml
# workspace-test-pipeline.yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: workspace-test-pipeline
spec:
  params:
    - name: url
      type: string
  workspaces:
    - name: pipeline-workspace
  tasks:
    - name: curl-site
      taskRef:
        name: workspace-test-task-curl
      params:
        - name: url
          value: "$(params.url)"
      workspaces:
        - name: my-workspace
          workspace: pipeline-workspace
    - name: data-output
      taskRef:
        name: workspace-test-task-output
      workspaces:
        - name: my-workspace
          workspace: pipeline-workspace
      runAfter:
        - curl-site
```

では、実行していきましょう。  
PipelineRunは下記のとおりです。今までととなるのは、`workspaces`の設定です。PVCを発行してPVを準備します。

```yaml
# workspace-test-pipeline-run.yaml
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  name: workspace-test-pipeline-run
spec:
  pipelineRef:
    name: workspace-test-pipeline
  params:
    - name: url
      value: "https://blog.mosuke.tech"
  workspaces:
    - name: pipeline-workspace
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 1Gi
```

各リソースをデプロイして、パイプラインを実行します。  
実行後Podの状態を確認すると、サイトへのcurlをするTaskが動き、その後にその結果を出力するPodが起動しています。
PVの状態も一緒に見てみましょう。`workspace-test-pipeline-run-curl-site-2x8tt-pod-rvz9t`と`workspace-test-pipeline-run-data-output-57xb6-pod-f8srp`の両方ともにPVCがマウントされています。また、PVCが作成され、自動的にPVも作成されています。

```
$ kubectl apply -f workspace-test-task.yaml
task.tekton.dev/workspace-test-task-curl created
task.tekton.dev/workspace-test-task-output created

$ kubectl apply -f workspace-test-pipeline.yaml
pipeline.tekton.dev/workspace-test-pipeline created

$ kubectl apply -f workspace-test-pipeline-run.yaml
pipelinerun.tekton.dev/workspace-test-pipeline-run created

$ kubectl get pod
workspace-test-pipeline-run-curl-site-2x8tt-pod-rvz9t     0/1     PodInitializing     0          15s
workspace-test-pipeline-run-curl-site-2x8tt-pod-rvz9t     1/1     Running             0          16s
workspace-test-pipeline-run-curl-site-2x8tt-pod-rvz9t     1/1     Running             0          16s
workspace-test-pipeline-run-curl-site-2x8tt-pod-rvz9t     0/1     Completed           0          18s
workspace-test-pipeline-run-data-output-57xb6-pod-f8srp   0/1     Pending             0          0s
workspace-test-pipeline-run-data-output-57xb6-pod-f8srp   0/1     Pending             0          0s
workspace-test-pipeline-run-data-output-57xb6-pod-f8srp   0/1     Init:0/1            0          0s
workspace-test-pipeline-run-data-output-57xb6-pod-f8srp   0/1     PodInitializing     0          3s
workspace-test-pipeline-run-data-output-57xb6-pod-f8srp   1/1     Running             0          4s
workspace-test-pipeline-run-data-output-57xb6-pod-f8srp   1/1     Running             0          4s
workspace-test-pipeline-run-data-output-57xb6-pod-f8srp   0/1     Completed           0          5s

$ kubectl get pvc
NAME             STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
pvc-8673f66e55   Bound    pvc-ad8e8a76-0048-4ebf-b80d-9f5e011173eb   1Gi        RWO            standard       59s

$ kubectl get pv
NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                                      STORAGECLASS   REASON   AGE
pvc-ad8e8a76-0048-4ebf-b80d-9f5e011173eb   1Gi        RWO            Delete           Bound    goldstine-lab/pvc-8673f66e55               standard                67s

$ kubectl get pod workspace-test-pipeline-run-data-output-57xb6-pod-f8srp -o yaml | less
...
    volumeMounts:
    - mountPath: /workspace/my-workspace
      name: ws-kt8k4
...
  volumes:
  - name: ws-kt8k4
    persistentVolumeClaim:
      claimName: pvc-8673f66e55
```

PVCの中身をみると`ownerReferences`に`PipelineRun`が紐付いており、`PipelineRun`を削除すれば同時にPVCも削除され、PVも削除されるという動きをします。

```
$ kubectl get pvc pvc-8673f66e55 -o yaml | less
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  ...
  ownerReferences:
  - apiVersion: tekton.dev/v1beta1
    blockOwnerDeletion: true
    controller: true
    kind: PipelineRun
    name: workspace-test-pipeline-run
    uid: 11acadb7-7fda-47e2-a47b-59c58892dd3f
```

## さいごに
はい、本日はworkspaceを使ったTask間のデータ連携をみてきました。
そろそろ、実践的なパイプライン構成などをやっていこうと思います。
ぜひ他のTekton学習シリーズも参照ください。

{{< tekton-series >}}