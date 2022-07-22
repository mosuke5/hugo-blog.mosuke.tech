+++
categories = ["Kubernetes"]
date = "2022-05-29T16:48:03+09:00"
description = "KubernetesのAdmission PluginのひとつにImagePolicyWebhookがあります。これって必要なんでしょうか？自分の意見を書き残しておきます。"
draft = false
image = ""
tags = ["Tech"]
title = "ImagePolicyWebhookって必要なの？"
author = "mosuke5"
archive = ["2022"]
+++

こんにちは、もーすけです。  
最近はCKS(Certified Kubernetes Security)を取ろうかと勉強をはじめているのですが、ImagePolicyWebhookについて出てきたので調べてみました。
前回にブログを書いた　"Admission Webhook" と似たような仕組みなのですが、調べた結果の意見を雑に書き残しておきます。

おそらくより実践的で使えるのは Validating/Mulating Admission Webhookの方なので、気になる方は下記のブログも参考にしてください。
{{< admission-webhook-series >}}
<!--more-->

## ImagePolicyWebookとは？

### Admission Controlとそのプラグイン
この項目は復習です。詳しくは前ブログの「<a href="https://blog.mosuke.tech/entry/2022/05/15/admission-webhook-1/" target="_blank">Admission Webhookを作って遊んで、その仕組みを理解しよう（説明編） · Goldstine研究所</a>」を読んでください。

Kubernetes API Serverが、APIリクエストを発行するまでには次の3フェーズで実行されます。

![kuberbetes-api-flow](/image/kubernetes-api-flow.png)

Admission controllerは、プラグイン形式になっていて、いくつかのプラグインがKubernetesにデフォルトで用意されています。
そのプラグインの中のひとつに、「{{< external_link title="ImagePolicyWebhook" url="https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/#imagepolicywebhook" >}}」があります。

Admission controllerのプラグインは、Kubernetes API Serverが起動するときのオプションとして指定できます。デフォルトでは、有効化されていないので、kube-apiserverの起動オプションに任意で指定するる必要があります。

### 用途について
このプラグインは、Kubernetesクラスタ内で起動するコンテナイメージの検査に特化したものです。  
特定のイメージレジストリからのイメージを使用させたいや、既知の脆弱性を含まないことを確認されたイメージだけを使用させたいといったものです。

### 利用するには？
大枠の仕組み自体は、Validation/Mutating Admission Webhookと同様です。
Pod作成時に、設定した外部サーバに対して、Webhookをkube-apiserverからリクエストします。リクエスト情報に、利用するイメージのパス等が記載されます。
外部サーバで、対象のイメージが利用可能か判断してレスポンスを返すという流れになります。

![overview](/image/imagepolicywebhook-overview.png)

## これ必要？
このブログで書きたかったのはこの部分だけなのですが、調べてみてこの「ImagePolicyWebhook」って必要なのか？と自分では疑問に思いました。もし違う意見あったら、Twitterとかでこっそり教えてほしいですｗ

個人的には、より柔軟性の高いValidating/Mutating Admission Webhookで賄えばいいかなあ？と思っています。Validating/Mutating Admission Webhookがデフォルトで有効になっていて、ImagePolicyWebhookはデフォルトで無効になっているので、もしかしたらKubernetes開発者の中でも、そのように考えているのかもしれません。が、そうと確信する情報もみつけられなかったので、実際はわかりません。

ImagePolicyWebhookのリクエスト情報には、イメージ情報しか含まれず、名前の通りイメージについての検査に特化しています。Validating Admission Webhookでは、Podのイメージ以外の情報も使って判断もできるので、代用は効くはずです。ImagePolicyWebhookでも、ユーザ側でWebhookサーバを用意しなければいけない点も同じです。

また、設定についても、ImagePolicyWebhookの設定をいじろうとおもうと、kube-apiserver自身を直接いじる必要がでてきます。運用面でみてもあまりメリットないなあ？と思いました。

とはいえ、CKSで問題としても出題されるので、どんなもんかは知っておかないと思うので、軽く見ておくといいかなとは思います。
