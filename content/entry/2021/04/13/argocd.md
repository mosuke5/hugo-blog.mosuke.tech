+++
categories = ["Kubernetes"]
date = "2021-04-13T10:21:39+09:00"
description = "Argo CD学習シリーズをはじめます。第1回は、インストールと主要コンポーネントの解説やその仕組などについてみていきます。"
draft = true
image = ""
tags = ["Tech"]
title = "Argo CD、Operatorでのインストールと主要コンポーネントの解説（学習シリーズ）"
author = "mosuke5"
archive = ["2021"]
+++

{{< argocd-series >}}

こんにちは、もーすけです。  
前回の「Tekton学習シリーズ」に続きArgo CD学習シリーズをやっていきます。
わたしは、Argo CDを何年か前に検証で確認はしていたのですが、だいぶ忘れてしまったい、改めてまとめなおしたいと思っています。
初回は、インストールと概念編です。
<!--more-->

## GitOpsという考え方
Argo CDのはなしをする前に、GitOpsという考え方について理解しておく必要があります。
GitOpsとは、**Kubernetesクラスタの管理やアプリケーションデプロイの手法のひとつで、Gitレポジトリを唯一信頼できる情報源（Single source of truth）と考え、クラスタ上の状態とGitレポジトリ上の差分を埋めるやりかた**と認識すると良さそうです。

Kubernetesのコントローラの発想と非常に近しいかなと思います。
Kubernetesでは、API Serverの管理する期待する状態（マニフェスト）と、クラスタ上の実際の状態との差分をReconciliation loopが解消する、というのが大きなコンセプトです。そう考えると、Gitレポジトリを期待する状態とし、クラスタ上の実態との差分をGitOpsツール（Reconciliation loop）が解消すると置き換えて読むこともできますよね。

![gitops](/image/gitops-overview.png)

また、Kubernetesにおいてこの考え方が重要な理由は、ソースコードとそれが動く状態としたコンテナイメージ、そしてオーケストレーションとしてKubernetesマニフェストこれらの関係性にあると考えます。
コンテナイメージは、ソースコードとDockerfileから作ることができます。Kubernetesのマニフェストは、コンテナイメージとその他の設定記述で表すことができます。つまり、アプリケーション成果物としてのコンテナイメージと、それをどうコンフィギュレーションして動かすか（オーケストレーションするか）は切り離して考えることができるということです。

そして、Argo CDというツールはまさにGitOpsのためのツールであり、GitレポジトリのKubernetesマニフェストを監視し、定期的に（あるいは任意のタイミングで）クラスタに反映することをします。Kubernetesのコントローラみたいなもんですね。

## Argo CDのインストール
では、インストールします。
最新版のArgo CDを利用したい場合は、公式ドキュメントの"[Getting Started](https://argo-cd.readthedocs.io/en/stable/#getting-started)"でマニフェストをapplyしてください。非常に簡単です。

今回は、Argo CD Operatorを用いてインストールします。
理由としては、可能な限りツール類はOperatorで管理したほうがやっぱり楽かな？と試行錯誤している状態のため検証です。
みなさんは好きな方法でインストールしてください。
以下は、Argo CD Operatorに関する関連リンクです。

- [Argo CD Operatorの公式ドキュメント](https://argocd-operator.readthedocs.io/en/latest/)
- [Argo CD Operator GitHub](https://github.com/argoproj-labs/argocd-operator/)
- [OperatorHub Argo CD](https://operatorhub.io/operator/argocd-operator)

Argo CDを以下のマニフェストで起動しました。Web UIをIngress経由で公開したかったためIngressの設定を追加しています。

```yaml
# argocd.yaml
---
apiVersion: argoproj.io/v1alpha1
kind: ArgoCD
metadata:
  name: my-argocd
spec:
  # 今回はIngress経由でArgo CDを外部から接続したいので以下設定を追加しているがなくてもよい
  server:
    host: argocd.mosuke.tech
    ingress:
      enabled: true
    insecure: true
```

上記のマニフェストを適応して、作成されたリソースを確認します。

```
$ kubectl apply -f argocd.yaml
argocd.argoproj.io/my-argocd created

$ kubectl get pod,sa,configmap,secret,service,ingress -n my-argocd-operator
NAME                                                    READY   STATUS    RESTARTS   AGE
pod/argocd-operator-cdb84b944-vxwln                     1/1     Running   0          24h
pod/my-argocd-application-controller-69dd7dcb84-ppfr7   1/1     Running   0          21h
pod/my-argocd-dex-server-5bfb9ccf95-sv4tr               1/1     Running   0          21h
pod/my-argocd-redis-55cc975d48-8vxsx                    1/1     Running   0          21h
pod/my-argocd-repo-server-65f45dd8c4-g88xv              1/1     Running   0          21h
pod/my-argocd-server-868d56f649-sgkqt                   1/1     Running   0          21h

NAME                                           SECRETS   AGE
serviceaccount/argocd-application-controller   1         24h
serviceaccount/argocd-dex-server               1         24h
serviceaccount/argocd-operator                 1         24h
serviceaccount/argocd-redis-ha                 1         24h
serviceaccount/argocd-server                   1         24h
serviceaccount/default                         1         24h

NAME                                  DATA   AGE
configmap/argocd-cm                   15     21h
configmap/argocd-operator-lock        0      24h
configmap/argocd-rbac-cm              3      21h
configmap/argocd-ssh-known-hosts-cm   1      21h
configmap/argocd-tls-certs-cm         0      21h
configmap/kube-root-ca.crt            1      24h
configmap/my-argocd-ca                1      21h

NAME                                               TYPE                                  DATA   AGE
secret/argocd-application-controller-token-t5scx   kubernetes.io/service-account-token   3      24h
secret/argocd-dex-server-token-z9rtk               kubernetes.io/service-account-token   3      24h
secret/argocd-operator-token-zmbdx                 kubernetes.io/service-account-token   3      24h
secret/argocd-redis-ha-token-fgzw8                 kubernetes.io/service-account-token   3      24h
secret/argocd-secret                               Opaque                                5      21h
secret/argocd-server-token-xrcpc                   kubernetes.io/service-account-token   3      24h
secret/default-token-7vtbf                         kubernetes.io/service-account-token   3      24h
secret/my-argocd-ca                                kubernetes.io/tls                     3      21h
secret/my-argocd-cluster                           Opaque                                1      21h
secret/my-argocd-tls                               kubernetes.io/tls                     2      21h

NAME                               TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)             AGE
service/argocd-operator-metrics    ClusterIP   10.7.255.82    <none>        8383/TCP,8686/TCP   24h
service/my-argocd-dex-server       ClusterIP   10.7.251.243   <none>        5556/TCP,5557/TCP   21h
service/my-argocd-metrics          ClusterIP   10.7.241.124   <none>        8082/TCP            21h
service/my-argocd-redis            ClusterIP   10.7.252.82    <none>        6379/TCP            21h
service/my-argocd-repo-server      ClusterIP   10.7.242.29    <none>        8081/TCP,8084/TCP   21h
service/my-argocd-server           ClusterIP   10.7.242.255   <none>        80/TCP,443/TCP      21h
service/my-argocd-server-metrics   ClusterIP   10.7.255.83    <none>        8083/TCP            21h

NAME                                  CLASS    HOSTS                ADDRESS        PORTS     AGE
ingress.extensions/my-argocd-server   <none>   argocd.mosuke.tech   34.84.159.22   80, 443   21h
```

## Argo CDの主要コンポーネント
Argo CDをインストールすると、以下の6種類のPodが起動していました。
それぞれどんな役割をになっているか説明します。

{{< table class="table" >}}
|コンポーネント  |説明  |
|---|---|---|
|argocd-operator  |OperatorHubからインストールした場合のみ作成されます。Argo CD自身を構築するためのリソースを管理するカスタムコントローラ。|
|application-controller  |Argo CDに登録するアプリケーションを管理するコントローラ。Gitレポジトリ内のあるべき状態とクラスタ上のアプリケーションの状態を定期的に確認し差分を埋める役割。Argo CDのコアと理解しても良い存在。|
|dex-server  |[dex](https://github.com/dexidp/dex)は、OpenID Connectのプロバイダを提供するソフトウェアのこと。Argo CDでの認証部分の役割をになう。|
|redis  |データのキャッシュとして利用。データはロストしても問題なし。|
|repo-server  |Gitレポジトリのキャッシュを管理する役割。こちらもデータを失っても問題ない。|
|server  |Web UIやCLIなどから利用するgRPC/REST APIを提供するAPI Server。|
{{</ table >}}

## Web UIへの接続
管理者の初期パスワードは、Secret内に保存されているのでとりだしましょう。

```
$ kubectl -n my-argocd-operator get secret my-argocd-cluster -o jsonpath='{.data.admin\.password}' | base64 -d
<your-admin-password>
```

Ingress経由でアクセスすると以下のような画面にたどりつけます。  
もし、Ingress等で公開しない人は、port-forwardを利用してください。うえの例でいうと`service/my-argocd-server`にアクセスできればWeb UIにたどり着けます。
`kubectl port-foward service/my-argocd-server 8080:80` と実行すればローカルPCの8080ポートから接続できます。

![argocd-login](/image/argocd-login.png)

## アプリケーションの登録
Argo CDで[サンプルのレポジトリ](https://github.com/argoproj/argocd-example-apps)も用意されているので、それを活用してアプリケーションをデプロイしてみます。やり方自体は、公式ドキュメントの "[Getting Started](https://argo-cd.readthedocs.io/en/stable/getting_started/)"とおりなのでそちらを参照いただくとして、それぞれの設定項目などを解説します。

- GENERAL
  - Application Name
    - 任意の名前です。`hello-world`とします
  - Project
    - Argo CD内のプロジェクトです。はじめは `default` しかないはずなのでこちらを選択します。
  - SYNC POLICY
    - `Manual`か`Automatic`を選択できます。
    - 「SYNC」とは、Gitレポジトリのマニフェストの内容をクラスタに反映する動作のことを指します。
    - `Automatic` を選択すると180秒に一度SYNCを行います。
  - SYNC OPTIONS
    - `USE A SCHEMA TO VALIDATE RESOURCE MANIFESTS` は[こちらを参照](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/)
- SOURCE
  - Repository URL
    - 名前の通り、マニフェストファイルがおいてあるレポジトリを指定する
    - プライベートのレポジトリを利用する場合は、別でレポジトリ登録が必要（[ドキュメント](https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/)）
  - Revision
    - 利用するGitレポジトリのリビジョン。ブランチなどを指定可能。
    - 本番環境、テスト環境など分けるときなどに有効
  - Path
    - 利用するマニフェストへのパス
- DESTINATION
  - Cluster URL
    - どこのKubernetesクラスタへデプロイするの設定。
    - Argo CDが起動していない外部のクラスタも指定可能。
    - 内部クラスタを指定する場合は、`NAME=in-cluster`とするといい
    - クラスタ設定は別に可能
  - Namepace
    - デプロイしたいNamespace
- Directory, Helm, Kustomize...
  - 最後の項目はデプロイするマニフェストに何を利用しているかによって変わる。
  - プレーンのマニフェストも利用できるが、テンプレートエンジンであるHelmやKustomizeを使ったマニフェストもデプロイ可能

こちらのアプリケーションの登録をすると、そのデータはKubernetesのリソースとして登録されています。
つまり、Argo CD自身は、**永続的なボリュームをもっておらず、永続ボリュームとしてKubernetesのetcdを使っている**ということです。まさに、Kubernetes Nativeなアプリケーションを代表していますね。

```
$ kubectl get application -n my-argocd-operator
NAME          AGE
hello-world   44s

$ kubectl get application -n my-argocd-operator hello-world -o yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  creationTimestamp: "2021-04-14T09:05:14Z"
  generation: 2
  managedFields:
  - apiVersion: argoproj.io/v1alpha1
    fieldsType: FieldsV1
    fieldsV1:
      f:spec:
...
```

## さいごに
うまくArgo CDを使って、アプリケーションをデプロイできましたでしょうか。
触ってみるとわかるかもしれませんが、意外とシンプルなソフトウェアですよね。Gitレポジトリの状態をKubernetesのコントローラ的に監視をして反映するということです。
Argo CDがうまく組み込まれた環境では、「デプロイ作業」というのをそれほど気にしなくていいとも言えますね。もちろん、デプロイ後のテストをどうするの？とかいろいろ疑問が湧いてくると思いますが、そのあたりは、また別の回で解説していきたいと思います。

{{< argocd-series >}}