+++
categories = ["Kubernetes"]
date = "2021-03-22T21:38:02+09:00"
description = "Tekton学習シリーズの第9回は、ついにコンテナイメージのビルドからデプロイまで実施します。TektonからKubernetesリソースを扱う方法を学んでいきます。"
draft = false
image = ""
tags = ["Tech"]
title = "Tekton、アプリケーションをKubernetesクラスタへデプロイする"
author = "mosuke5"
archive = ["2021"]
+++

{{< tekton-series >}}

こんにちは、もーすけです。本日もTekton学習シリーズやっていきます。  
第9回目は、ついにアプリケーションをKubernetesクラスタにデプロイします。
今回は第8回の続きになりますので、まだ第8回を実施していない人は先にみておいてください。
前回は、GitHubのレポジトリからソースコードをダウンロードしてきて、コンテナイメージをビルドし、イメージレジストリに格納するところまでやりました。
今回は、そのビルドしたイメージをKubernetesクラスタにデプロイします。
<!--more-->

## kubernetes-actions taskのインストール
前回は、`git-clone`と`buildah`のTaskをカタログからインストールしました。
今回はさらに、`kubernetes-actions`というTaskをインストールします（Tekton Hub: [kubernetes-actions](https://hub.tekton.dev/tekton/task/kubernetes-actions)）。目的は、`kubectl apply -f manifests`を実行するためです。

```text
$ kubectl apply -f catalog/task/kubernetes-actions/0.1/kubernetes-actions.yaml
task.tekton.dev/kubernetes-actions created

$ kubectl get task kubernetes-actions
NAME                 AGE
kubernetes-actions   10s
```

## kubernetes-actionsの使い方
かんたんに使い方と注意事項を説明しておきます。
`kubectl` がインストールされたイメージを用いて任意の処理を実行できます。
最低限の設定としては以下のサンプルのとおりです。

```yaml
    - name: deploy-application
      taskRef:
        name: kubernetes-actions
      params:
        - name: image   # 利用するイメージ
          value: bitnami/kubectl:1.20
        - name: script  # 実行したい処理
          value: |
            kubectl apply -f xxxx.yaml
      workspaces:
        - name: manifest-dir  # マニフェストが保存されたworkspace
          workspace: shared-workspace
        - name: kubeconfig-dir  # kubeconfigが保存されたworkspace。不要の場合はemptyDirでいける
          workspace: kubeconfig-dir
```

注意点として、利用するイメージがあります。このカタログに記載されているデフォルトのイメージ `gcr.io/cloud-builders/kubectl@sha256:8ab94be8b2b4f3d117f02d868b39540fddd225447abf4014f7ba4765cb39f753` はコメントにも書かれているのですが、非常にイメージサイズが大きいです（`image is huge`というコメントがTaskにかかれている）。はっきりいって利用を推奨しません。
このTaskは基本的にkubectlがインストールされていれば、ほかのイメージでも代用可能なので、[bitnami/kubectl:1.20](https://hub.docker.com/layers/bitnami/kubectl/1.20/images/sha256-8dcf02cf4f9c8f8004c911c29731a2f0992aec8f9e2d5608452ab006f1db1c32?context=explore)を利用しました。パラメータで利用できるイメージを指定できます。

`kubeconfig-dir`ですが、利用したいコンフィグがある場合はマウントして利用できます。
しかし、TektonではTask自体がPodとして動いており、自身のKubernetesクラスタへの操作であれば、ServiceAccountのTokenを使うことが一番簡単です。
そのため、とくに外部のコンフィグを利用しない場合は、`kubeconfig-dir`はemptyDirを指定しておけば大丈夫です。後ほどで実践例を見ます。

## ServiceAccountへの権限付与
ひとつ前のセクションで`kubeconfig-dir`について解説しました。
TektonのTaskからKubernetesを操作するには、ServiceAccountに利用したい権限を付与する必要があります。
ServiceAccountは、前回同様の`my-kekton-pipeline`を利用しますが、`Role`と`RoleBinding`を追加しました。
今回はシンプルにDeploymentとPodのみ操作できる権限を付けました。

```yaml
# my-tekton-pipeline-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-tekton-pipeline
secrets:
  - name: dockerhub-cred
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: my-tekton-pipeline-role
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: my-tekton-pipeline-rolebinding
subjects:
- kind: ServiceAccount
  name: my-tekton-pipeline
  apiGroup: ""
roleRef:
  kind: Role
  name: my-tekton-pipeline-role
  apiGroup: rbac.authorization.k8s.io
```

```text
$ kubectl apply -f my-tekton-pipeline-sa.yaml
serviceaccount/my-tekton-pipeline configured
role.rbac.authorization.k8s.io/my-tekton-pipeline-role created
rolebinding.rbac.authorization.k8s.io/my-tekton-pipeline-rolebinding created
```

この権限付与がないと以下のようなエラーになります。

```text
Error from server (Forbidden): error when retrieving current configuration of:
Resource: "apps/v1, Resource=deployments", GroupVersionKind: "apps/v1, Kind=Deployment"
Name: "myapp", Namespace: "goldstine-lab"
from server for: "/tmp/new-deployment.yaml": deployments.apps "myapp" is forbidden: User "system:serviceaccount:goldstine-lab:my-tekton-pipeline" cannot get resource "deployments" in API group "apps" in the namespace "goldstine-lab"
```

## パイプラインの作成
では、パイプラインを作ります。7割は前回と同様です。Pipelineの名前は一応変えておきました。
サンプルのPipelineマニフェストは以下のとおりです。

```yaml
# build-deploy-pipeline.yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: build-deploy-pipeline
spec:
  workspaces: 
    - name: shared-workspace
    - name: kubeconfig-dir
  params:
    - name: git-url
      type: string
    - name: git-revision
      type: string
      default: "master"
    - name: image
      type: string
  tasks:
    - name: fetch-repository
      taskRef:
        name: git-clone
      workspaces:
        - name: output
          workspace: shared-workspace
      params:
        - name: url
          value: $(params.git-url)
        - name: deleteExisting
          value: "true"
        - name: revision
          value: $(params.git-revision)
    - name: build-push-image
      taskRef:
        name: buildah
      params:
        - name: IMAGE
          value: $(params.image)
        - name: DOCKERFILE
          value: "Dockerfile"
        - name: CONTEXT
          value: "$(workspaces.source.path)"
      workspaces:
        - name: source
          workspace: shared-workspace
      runAfter:
        - fetch-repository
    - name: deploy-application
      taskRef:
        name: kubernetes-actions
      params:
        - name: image
          value: bitnami/kubectl:1.20
        - name: script
          value: |
            IMAGE=$(echo "$(params.image)" | sed -e 's/\//\\\//g')
            cat ./config/deployment.yaml | sed -e "s/myapp:latest/$IMAGE/g" -e "s/Never/IfNotPresent/g" > /tmp/new-deployment.yaml
            cat /tmp/new-deployment.yaml
            echo "-----------"
            kubectl apply -f /tmp/new-deployment.yaml
            echo "-----------"
            kubectl get deploy
            kubectl get pods 
      workspaces:
        - name: manifest-dir
          workspace: shared-workspace
        - name: kubeconfig-dir
          workspace: kubeconfig-dir
      runAfter:
        - build-push-image
```

説明が必要なポイントとしては、`kubernetes-actions`の`script`部分でしょうか。
`sed`などを実行していますが、なにをしているかというと、今回利用したレポジトリの中にマニフェストファイルが含まれているのですが、HelmやKustomizeではなくプレーンなマニフェストです。そのため、コンテナイメージが固定です。それを`sed`で書き換えていますということです。あとは、`apply`後に確認用でPodやDeploymentを確認しているということです。

```yaml
        - name: script
          value: |
            IMAGE=$(echo "$(params.image)" | sed -e 's/\//\\\//g')
            cat ./config/deployment.yaml | sed -e "s/myapp:latest/$IMAGE/g" -e "s/Never/IfNotPresent/g" > /tmp/new-deployment.yaml
            cat /tmp/new-deployment.yaml
            echo "-----------"
            kubectl apply -f /tmp/new-deployment.yaml
            echo "-----------"
            kubectl get deploy
            kubectl get pods 
```

## パイプラインの実行
最後に実行します。ここはいつもどおり`PipelineRun`を作成して実行するのみです。

```yaml
# build-deploy-pipeline-run.yaml
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  name: build-deploy-pipeline-run
spec:
  pipelineRef:
    name: build-deploy-pipeline
  params: 
    - name: git-url
      value: https://github.com/ncskier/myapp
    - name: image
      value: mosuke5/tekton-practice:from-pipeline
  serviceAccountName: my-tekton-pipeline
  workspaces: 
    - name: shared-workspace
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 1Gi
    - name: kubeconfig-dir
      emptyDir: {}
```

```text
$ kubectl apply -f build-deploy-pipeline.yaml
pipeline.tekton.dev/build-deploy-pipeline created

$ kubectl apply -f build-deploy-pipeline-run.yaml
pipelinerun.tekton.dev/build-deploy-pipeline-run created

$ kubectl get pod
kc get pod -w
NAME                                                           READY   STATUS      RESTARTS   AGE
build-deploy-pipeline-run-build-push-image-ddzpc-pod-zg2lv     0/3     Completed   0          89s
build-deploy-pipeline-run-deploy-application-m6rhm-pod-2fqjb   0/1     Completed   0          34s
build-deploy-pipeline-run-fetch-repository-zljww-pod-tpfds     0/1     Completed   0          117s
myapp-656b6c9b99-hv58j                                         1/1     Running     0          24s
```

ダッシュボードからの見え方。

![dashboard](/image/tekton-dashboard-build-deploy-pipeline.png)

## さいごに
第9回では、ついにイメージのビルドからデプロイまで実施しました。
できるひとは、レポジトリを独自のものに変更するなどして遊んでみてください。
次回からは、TektonのEventに着目していく予定です。

{{< tekton-series >}}