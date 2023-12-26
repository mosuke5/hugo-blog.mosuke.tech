+++
categories = ["Kubernetes"]
date = "2021-04-06T17:20:40+09:00"
description = "Tektonパイプラインを外部イベントのトリガーを用いて実行する方法とその概念を説明していきます。"
draft = false
image = ""
tags = ["Tech"]
title = "Tekton、トリガーを使って外部イベントでパイプラインを実行する"
author = "mosuke5"
archive = ["2021"]
+++

{{< tekton-series >}}

こんにちは、もーすけです。  
今回も、Tekton学習シリーズをやっていきます。Tekton Triggersを用いて、WebhookイベントからTektonパイプラインを実行する方法をみていきます。
利用するパイプラインは前回の第9回のものを利用しますので、まだやってない人は第9回を事前に済ませておきましょう。
<!--more-->

## Tekton Triggersのインストール
ここまでの学習シリーズで扱ってきたTektonは、[Tekton Pipelines](https://github.com/tektoncd/pipeline)というソフトウェアです。
本日利用するのは、[Tekton Triggers](https://github.com/tektoncd/triggers)です。別のソフトウェアになっており、Tekton Pipelinesと連携して利用できます。
さっそくインストールします。
インストール方法は、[公式ドキュメント](https://tekton.dev/docs/triggers/install/)どおりに行います。
今回使用したバージョンは、Tekton Triggers v0.12.1　となります。

```text
$ kubectl apply --filename https://storage.googleapis.com/tekton-releases/triggers/latest/release.yaml
podsecuritypolicy.policy/tekton-triggers created
clusterrole.rbac.authorization.k8s.io/tekton-triggers-admin created
clusterrole.rbac.authorization.k8s.io/tekton-triggers-core-interceptors created
role.rbac.authorization.k8s.io/tekton-triggers-admin created
role.rbac.authorization.k8s.io/tekton-triggers-admin-webhook created
role.rbac.authorization.k8s.io/tekton-triggers-core-interceptors created
serviceaccount/tekton-triggers-controller created
serviceaccount/tekton-triggers-webhook created
serviceaccount/tekton-triggers-core-interceptors created
clusterrolebinding.rbac.authorization.k8s.io/tekton-triggers-controller-admin created
clusterrolebinding.rbac.authorization.k8s.io/tekton-triggers-webhook-admin created
clusterrolebinding.rbac.authorization.k8s.io/tekton-triggers-core-interceptors created
rolebinding.rbac.authorization.k8s.io/tekton-triggers-controller-admin created
rolebinding.rbac.authorization.k8s.io/tekton-triggers-webhook-admin created
rolebinding.rbac.authorization.k8s.io/tekton-triggers-core-interceptors created
customresourcedefinition.apiextensions.k8s.io/clustertriggerbindings.triggers.tekton.dev created
customresourcedefinition.apiextensions.k8s.io/eventlisteners.triggers.tekton.dev created
customresourcedefinition.apiextensions.k8s.io/triggers.triggers.tekton.dev created
customresourcedefinition.apiextensions.k8s.io/triggerbindings.triggers.tekton.dev created
customresourcedefinition.apiextensions.k8s.io/triggertemplates.triggers.tekton.dev created
secret/triggers-webhook-certs created
validatingwebhookconfiguration.admissionregistration.k8s.io/validation.webhook.triggers.tekton.dev created
mutatingwebhookconfiguration.admissionregistration.k8s.io/webhook.triggers.tekton.dev created
validatingwebhookconfiguration.admissionregistration.k8s.io/config.webhook.triggers.tekton.dev created
clusterrole.rbac.authorization.k8s.io/tekton-triggers-aggregate-edit created
clusterrole.rbac.authorization.k8s.io/tekton-triggers-aggregate-view created
configmap/config-logging-triggers created
configmap/config-observability-triggers created
service/tekton-triggers-controller created
deployment.apps/tekton-triggers-controller created
deployment.apps/tekton-triggers-core-interceptors created
service/tekton-triggers-core-interceptors created
service/tekton-triggers-webhook created
deployment.apps/tekton-triggers-webhook created

// 3つのPodが起動していれば成功です
$ kubectl get pod -n tekton-pipelines
NAME                                                 READY   STATUS    RESTARTS   AGE
tekton-dashboard-67d68f7957-7wj5f                    1/1     Running   0          39d
tekton-pipelines-controller-5f8fd85647-67qbp         1/1     Running   0          39d
tekton-pipelines-webhook-5fbb76fb4c-g529l            1/1     Running   0          39d
tekton-triggers-controller-5699bd7994-k5s44          1/1     Running   0          22s
tekton-triggers-core-interceptors-7d5fd5f9c8-vfx4x   1/1     Running   0          22s
tekton-triggers-webhook-67d8df9f67-km8rm             1/1     Running   0          20s

// あたらしくCRDが追加されたことを確認
$ kubectl get crds | grep tekton | grep trigger
clustertriggerbindings.triggers.tekton.dev       2021-03-24T08:13:28Z
eventlisteners.triggers.tekton.dev               2021-03-24T08:13:28Z
triggerbindings.triggers.tekton.dev              2021-03-24T08:13:28Z
triggers.triggers.tekton.dev                     2021-03-24T08:13:28Z
triggertemplates.triggers.tekton.dev             2021-03-24T08:13:28Z
```

## 実現すること
この回で実現することは、クラスタ外部からのcurlによるHTTPリクエストをトリガーにパイプラインを実行することです。
実運用では、curlの代わりにGitレポジトリからのWebhookなどが該当するでしょう。ここでは簡易的にcurlで行いますが原理的にはまったく同じです。
実装へ入る前に、Tekton Triggersで今回使う新しいリソースと概要を図で説明したいと思います。

{{< table class="table" >}}
|エンティティ  |説明  |
|---|---|---|
|Trigger Templates  | PipelineRunを生成するためのテンプレート。パラメータが設定でき、パラメータを引き渡してPipelineRunを生成できる。|
|Trigger Bindings  | Eventと紐づく。Event Listenersが受け取ったデータをTrigger Templatesに引き渡すパラメータへの変換（紐付け）を担当。|
|Event Listeners  | httpリクエストを受け付ける。実態はListener Podを生成して待ち受ける。リクエストを受け付けるとTrigger Bindings, Trigger Templatesの設定をみてPipelineRunを生成してパイプラインを実行する。|
{{</ table >}}

これから行うことを絵に表すと次のとおりです。

![tekton-triggers-overview](/image/tekton-triggers-overview.png)

ポイントをいくつかしぼって解説します。

1. EventListenersリソースを生成すると、httpを受け付けるEventListener PodとそのServiceが生成される
1. 端末やGitレポジトリなどから上記で生成されたEventListener Podへhttpリクエストを送れればよい。生成されるのはServiceなので、外部からアクセスする場合はIngressなどで外部公開する必要がある。
1. EventListener Podはhttpリクエストを受け付けると、Trigger Templates, Trigger Bindingsの設定にしたがってPipelineRunを生成しパイプラインを実行する。PipelineRunが生成された以降は前回までの学習で行ったとおり、PipelineRunがPipelineを生成し、PipelineがTaskRunをTaskRunがTaskを生成する流れとなる。
1. EventListener Podは、Trigger TemplatesやTrigger Bindingsの参照、PipelineRunの生成などいくつかのKubernetes内の操作が必要なため、Kubernetes APIを扱うための権限が必要。EventListener Podに利用するService Accountの指定が可能なため、事前にService Accountとそれに対する適切なRBAC権限付与が必要。

## 実装
それでは実際に実装していきましょう。  
まずは下準備として、EventListener Podが利用するService Accountの作成と適切なRole付与を行います。
以下が利用したマニフェストです。
それほど難しくないですね？こちらが難しい人はぜひ、KubernetesのService AccountとRole, RoleBindingを復習しましょう。

```yaml
# trigger-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: trigger-sa
---
kind: Role
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: trigger-role
rules:
- apiGroups:
  - triggers.tekton.dev
  resources:
  - eventlisteners
  - triggers
  - triggerbindings
  - triggertemplates
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - tekton.dev
  resources:
  - pipelineruns
  - pipelineresources
  verbs:
  - create
- apiGroups:
  - ""
  resources:
  - configmaps
  verbs:
  - get
  - list
  - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: triggers-role-binding
subjects:
  - kind: ServiceAccount
    name: trigger-sa
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: trigger-role
```

続いて、今回の主題の部分に行きます。
作成するのは3つで、`TriggerTemplate`, `TriggerBinding`, `EventListener`の3つです。
慣れるまで、関係性や設定項目が煩わしいです。上で紹介した概要図と照らし合わせながらゆっくり理解していきましょう。
いくつかコメントアウトで補足解説を入れました。

```yaml
# my-trigger.yaml
apiVersion: triggers.tekton.dev/v1alpha1
kind: TriggerTemplate
metadata:
  name: build-deploy-pipeline-template
spec:
  # Trigger Bindingが変換してくれたパラメータを利用可能
  # PipelineRunに引き渡すパラメータを指定
  params:
    - name: gitrevision
      description: The git revision
      default: master
    - name: gitrepositoryurl
      description: The git repository url
  resourcetemplates:
    # 見覚えのあるPipelineRunの定義
    - apiVersion: tekton.dev/v1beta1
      kind: PipelineRun
      metadata:
        # PipelineRunの名前を自動生成するために`build-deploy-pipeline-run-`をランダムのIDにしてくれる
        generateName: build-deploy-pipeline-run-
      spec:
        pipelineRef:
          name: build-deploy-pipeline
        params: 
          # `tt` = `trigger template`の略
          - name: git-url
            value: $(tt.params.gitrepositoryurl)
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
---
apiVersion: triggers.tekton.dev/v1alpha1
kind: TriggerBinding
metadata:
  name: build-deploy-pipeline-binding
spec:
  params:
    # httpリクエストのパラメータをTekton内部の変数に変換
    - name: gitrevision
      value: $(body.head_commit.id)
    - name: gitrepositoryurl
      value: $(body.repository.url)
---
apiVersion: triggers.tekton.dev/v1alpha1
kind: EventListener
metadata:
  name: build-deploy-pipeline-listener
spec:
  serviceAccountName: trigger-sa  # EventListener Podが利用するService Account
  triggers:
    - bindings:
        - ref: build-deploy-pipeline-binding
      template:
        ref: build-deploy-pipeline-template
```

マニフェストをapplyし、EventListener Podを確認しておきます。

```text
$ kubectl apply -f trigger-sa.yaml
serviceaccount/trigger-sa created
role.rbac.authorization.k8s.io/trigger-role created
rolebinding.rbac.authorization.k8s.io/triggers-role-binding created

$ kubectl apply -f my-trigger.yaml
triggertemplate.triggers.tekton.dev/build-deploy-pipeline-template created
triggerbinding.triggers.tekton.dev/build-deploy-pipeline-binding created
eventlistener.triggers.tekton.dev/build-deploy-pipeline-listener created

$ kubectl get pod
NAME                                                  READY   STATUS     RESTARTS   AGE
el-build-deploy-pipeline-listener-7687c5bd88-p4qk5    1/1     Running    4          14h

$ kubectl get service
NAME                                TYPE        CLUSTER-IP    EXTERNAL-IP   PORT(S)    AGE
el-build-deploy-pipeline-listener   ClusterIP   10.7.250.67   <none>        8080/TCP   14h
```

実運用では、Webhookでやるところですが今回はcurlで行います。
EventListener Podへのネットワークは外部公開していないので、port-fowardを活用します。
Trigger Bindingsは、curlの`-d`で送信しているJSONデータをTektonのパラメータに変換しているというわけです。
Webhookを利用する場合はどのようなデータでWebhookを飛ばしているか確認できれば設定が容易です。

```text
$ kubectl port-forward service/el-build-deploy-pipeline-listener 8080:8080
Forwarding from 127.0.0.1:8080 -> 8000
Forwarding from [::1]:8080 -> 8000

// 別ターミナルへ切り替え

$ curl -X POST -H 'Content-Type: application/json' \
http://localhost:8080 \
-d '{"head_commit":{"id": "master"},"repository":{"url": "https://github.com/ncskier/myapp"}}'

{"eventListener":"build-deploy-pipeline-listener","namespace":"goldstine-lab","eventID":"0815c36d-2cd0-4a76-9ee2-cd6a93b98c1d"}
```

podを確認すればパイプライン実行されたことがわかるのではないかとおもいます。

```text
$ kubectl get pod -w
build-deploy-pipeline-run-7hn8p-fetch-repository-szbzr-po-kn8bt   0/1     Init:1/2    0          14s
build-deploy-pipeline-run-7hn8p-fetch-repository-szbzr-po-kn8bt   0/1     PodInitializing   0          15s
build-deploy-pipeline-run-7hn8p-fetch-repository-szbzr-po-kn8bt   1/1     Running           0          16s
build-deploy-pipeline-run-7hn8p-fetch-repository-szbzr-po-kn8bt   1/1     Running           0          16s
build-deploy-pipeline-run-7hn8p-fetch-repository-szbzr-po-kn8bt   0/1     Completed         0          18s
...
```

## さいごに
本日は、Tekton Triggersをインストールし、curlを使って外部イベントをトリガーにしたパイプライン実行を見てきました。
ここまでできれば、実運用で使う多くの機能を試せたことになると思います。もちろん細かい部分はまだ残っていますが、大きな概念としては網羅できたはずです。
これから、Tektonの実運用を検討する人はぜひいろいろと試行錯誤してみてください。

{{< tekton-series >}}