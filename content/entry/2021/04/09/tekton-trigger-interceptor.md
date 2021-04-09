+++
categories = ["Kubernetes"]
date = "2021-04-08T21:47:39+09:00"
description = "Tekton Triggersのinterceptor機能を利用してみます。GitレポジトリからWebhook対応や認証の対応について説明します。"
draft = true
image = ""
tags = ["Tech"]
title = "Tekton、interceptorを使ってイベントトリガーを進化させる"
author = "mosuke5"
archive = ["2021"]
+++

{{< tekton-series >}}

こんにちは、もーすけです。  
本日もTekton学習シリーズをやっていきます。今回も前回の内容の続きになるので、はじめてTekton Triggersをさわるよという方は第10回の記事をやっておくとよいです。

前回、クラスタの外部からcurlを用いてHTTPリクエストを発行して、そのイベントをトリガーにパイプラインを実行しました。実運用では、GitレポジトリからのWebhookでパイプラインを動かしたいですよね？  
しかし、前回のままでは認証も実装しておらず、そのまま外部公開してしまうのは危険な状態です。というわけで、interceptorという機能を使って、認証や特定のイベントのみにパイプラインを実行する方法などをみていきます。
<!--more-->

## interceptorとは
interceptorの英単語の意味から確認しておきましょう。「横取りする人」「さえぎる人」といったような意味になります。
このTekton Triggersにおいてなにを「さえぎる」のでしょうか。図にしてみました。
前回利用した図にinterceptorを追加しました。

![tekton-triggers-interceptor](/image/tekton-triggers-interceptor.png)

EventListener Podは、Webhookイベントを受け取るとパラメータとTriggerTemplateを使ってPipelineRunを作ります。
PipelineRunを作る前に、別の処理を挟む（さえぎる）ことができるということです。
interceptorには、現時点で以下が用意されています。

- Webhook Interceptors
  - 任意のInteriortorサービスを用意して、そのサービスに処理を任せる。拡張性は高そう。
- GitHub Interceptors
  - GitHubからのWebhookを処理できる。
- GitLab Interceptors
  - GitlabからのWebhookを処理できる。
- Bitbucket Interceptors
  - BitbucketからのWebhookを処理できる。
- CEL Interceptors
  - CEL expression language を用いて、任意のフィルターやデータの整形などを設定できる。

interceptorに何をさせたいかによるかと思いますが、Github/Gitlab InterceptorsとCEL Interceptorsがあれば、多くのニーズを満たせるのではないかと個人的に考えています。
本ブログでは、GitHub interceptorを利用して、認証やイベントのフィルタリングを行ってみます。

## 実装
本ブログで実現することを以下の図に示しました。  
GitHub interceptorを用いて、特定の認証キーを持たないリクエストをはじくこと、そしてpushイベント以外のリクエストをはじくこと、この2つを実現していきたいと思います。

![github-interceptor](/image/tekton-triggers-github-interceptor.png)

### 認証キーの作成
`aiueokakikukeko`という認証キーをKubernetes内にSecretとして作成します。
キーの値は任意に変更してください。
GitHub interceptorにこのキーをもたせます。後ほど、この認証キーはGitHubのWebhookの設定にもいれるので覚えておきましょう。

```
$ kubectl create secret generic github-webhook --from-literal=secretkey=aiueokakikukeko
secret/github-webhook created
```

### EventListener PodのRBACを見直し
EventListener PodのService Accountの権限が重要であることは前回にお伝えしました。EventListener Podが、TriggerTemplateやTrigger Bindings、ConfigMapなどのKubernetesリソースを操作するからです。前回の設定では、Secretsの参照を入れていませんでしたが、GitHub interceptorがSecrets（上で作成した認証キー）の参照を行うため、RBACの見直しが必要です。  
最低条件としては、Secretsの参照権限を付けてください。

そのほか、`clustertriggerbindings`の参照権限もつけました。実装する上で必要ではないのですが、ログを見る際にエラーがでてきになるためです。
以下が、該当のエラーメッセージです。
```
E0408 13:58:27.831618       1 reflector.go:127] k8s.io/client-go@v0.19.7/tools/cache/reflector.go:156: Failed to watch *v1alpha1.ClusterTriggerBinding: failed to list *v1alpha1.ClusterTriggerBinding: clustertriggerbindings.triggers.tekton.dev is forbidden: User "system:serviceaccount:goldstine-lab:trigger-sa" cannot list resource "clustertriggerbindings" in API group "triggers.tekton.dev" at the cluster scope
```

最終的に利用した設定は下記のとおりです。

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
  - secrets   ## 追加！
  verbs:
  - get
  - list
  - watch
---
## 追加：今回はなくても問題ないが、エラーがでると気になるので権限付与
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: tekton-clustertriggerbindings-view
rules:
- apiGroups:
  - triggers.tekton.dev
  resources:
  - clustertriggerbindings
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
---
## 追加
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: triggers-clusterrole-binding
subjects:
  - kind: ServiceAccount
    name: trigger-sa
    namespace: goldstine-lab
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: tekton-clustertriggerbindings-view
```

### interceptorの追加
EventListenerにinterceptorを追加します。
EventListenerを次のように変更しました。

```yaml
apiVersion: triggers.tekton.dev/v1alpha1
kind: EventListener
metadata:
  name: build-deploy-pipeline-listener
spec:
  serviceAccountName: trigger-sa
  triggers:
    - name: github-trigger
      bindings:
        - ref: build-deploy-pipeline-binding
      template:
        ref: build-deploy-pipeline-template
      # 追加
      interceptors:
        - github:
            # 認証に利用するキー。KubernetesのSecretsを参照する
            secretRef:
              secretName: github-webhook
              secretKey: secretkey
            # 許可するイベント
            eventTypes:
              - push
```

### IngressでEventListener Podを外部公開
前回までは、EventListener Podは、port-forwardを用いてローカルの端末から接続しました。
今回は、GitHubからWebhookのイベントを受け取る必要があるため、EventListener Podの外部公開が必要です。
Ingressを用いて公開します。皆さんの環境に合わせて公開方法は選択してください。

```yaml
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: ingress-resource
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
spec:
  rules:
    - http:
        paths:
          - path: /
            backend:
              serviceName: el-build-deploy-pipeline-listener
              servicePort: 8080
```

### 設定の反映
上で修正した内容をKubernetesに反映させます。

```
$ kubectl apply -f trigger-sa.yaml
serviceaccount/trigger-sa unchanged
role.rbac.authorization.k8s.io/trigger-role configured
clusterrole.rbac.authorization.k8s.io/tekton-clustertriggerbindings-view created
rolebinding.rbac.authorization.k8s.io/triggers-role-binding unchanged
clusterrolebinding.rbac.authorization.k8s.io/triggers-clusterrole-binding created

$ kubectl apply -f my-trigger.yaml
triggertemplate.triggers.tekton.dev/build-deploy-pipeline-template unchanged
triggerbinding.triggers.tekton.dev/build-deploy-pipeline-binding unchanged
eventlistener.triggers.tekton.dev/build-deploy-pipeline-listener configured
ingress.extensions/ingress-resource configured
```

### GitHubへのWebhook設定
ここまでの演習でずっと、[nckier/myapp](https://github.com/ncskier/myapp) を利用させていただきました。
今回は独自設定が必要なのでForkします。わたしの場合なら、[mosuke5/myapp](https://github.com/mosuke5/myapp) ですね。
Webhookの設定画面で、以下の通り設定します。

- Payload URL
  - EventListener Podへ到達できるIPあるいはホスト名。自分の場合、IngressのグローバルIP。
- Content type
  - `application/json`に変更してください。
  - `"msg":"Invalid event body format format: invalid character 'p' looking for beginning of value"`のようなエラーが、EventListener Podからでていてうまくいかない場合は見直してください。
- Secret
  - 前に作成した認証キーのSecretの値です。

![github-webhook](/image/tekton-triggers-github-webhook.png)

設定を反映すると、GitHubは確認のためにWebhookをping eventとして発行します。
EventListenerの設定でEventTypeになにも指定しない場合、これだけでパイプラインが動きます。（うまくいっていれば）
ですが、今回は、pushイベントのみ許可するようにしているため、EventListener Podのログ(`event type ping is not allowed`)をみると以下のように弾いていることを確認できます。
一発ではうまく行かないこともあるので、ぜひ、いろいろ試してみてください。

```
{"level":"info","ts":"2021-04-08T14:15:28.695Z","logger":"eventlistener","caller":"sink/sink.go:213","msg":"interceptor stopped trigger processing: rpc error: code = FailedPrecondition desc = event type ping is not allowed","knative.dev/controller":"eventlistener","/triggers-eventid":"032d3da8-7a76-489c-99ff-316fb9b35ccc","/trigger":"github-trigger"}
```

### GitHubの内容を更新
あとは、いろいろ試すのみです。GitHubレポジトリ内のファイルを修正などしてみてください。
修正のイベントをトリガーにしてパイプラインの実行が確認できるはずです。
デバッグとしては、EventListener Podのログを見ることが非常に有益です。

### curlで実行してみる
ローカルの端末から認証キーを持たずにHTTPのリクエストを送ってみます。

```
$ curl -XPOST -H 'Content-Type: application/json' \
http://34.84.159.22 \
-d '{"head_commit":{"id": "master"},"repository":{"url": "https://github.com/ncskier/myapp"}}'
{"eventListener":"build-deploy-pipeline-listener","namespace":"goldstine-lab","eventID":"fd6b7fa8-2b1d-4e66-8319-9a1fe3caa6af"}
```

リクエストは受け付けてくれたみたいですが、EventListener Podの方で、`no X-Hub-Signature header set` ということでしっかり弾いてくれています。

```
{"level":"info","ts":"2021-04-09T02:06:45.789Z","logger":"eventlistener","caller":"sink/sink.go:213","msg":"interceptor stopped trigger processing: rpc error: code = FailedPrecondition desc = no X-Hub-Signature header set","knative.dev/controller":"eventlistener","/triggers-eventid":"fd6b7fa8-2b1d-4e66-8319-9a1fe3caa6af","/trigger":"github-trigger"}
```

## さいごに
Tekton Triggersのinterceptorの機能について確認してきました。
これで、Tekton Triggersの認証やGitレポジトリからの利用などもできるようになりました。かなり実運用をみすえた機能確認ができてきました。
まだまだTektonは、発展中のプロダクトで今後も大きく変わるかもしれませんが、この先が楽しみですね。

{{< tekton-series >}}