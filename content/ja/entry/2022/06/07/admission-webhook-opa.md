+++
categories = ["Kubernetes"]
date = "2022-06-07T21:34:44+09:00"
description = "「Admission Webhookを作って遊んで、その仕組みを理解する」のシリーズで、Admission Webhookの仕組みをわかった上でGatekeeperの動きを見ていきます。"
draft = false
image = ""
tags = ["Tech"]
title = "Admission Webhookを作って遊んで、その仕組みを理解しよう（Gatekeeper編）"
author = "mosuke5"
archive = ["2022"]
+++

こんにちは、もーすけです。  
以前に投稿した「Admission Webhookを作って遊んで、その仕組みを理解しよう（説明編&動作編）」の続編です。
CKSの勉強をしていて、関連あるトピックがでてきたので紹介します。

Gatekeeperというツールについてなのですが、本ブログでは<u>Gatekeeperの細かな使い方を説明するものではありません</u>。前回までにやってきた「Admission Webhookを作って遊んで、その仕組みを理解する」の延長上で、Gatekeeperの動きを見ていくものです。
この仕組みがわかっていると、Gatekeeperの構成ややろうとしていることがすっと頭に入りそうだったので、この続編を書くことにしました。

{{< admission-webhook-series >}}
<!--more-->

## 解説動画
<iframe width="560" height="315" src="https://www.youtube.com/embed/ILMLiDluSGE" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

## Gatekeeperとは
正直に、OPA,Gatekeeperについてはよくカンファレンスやミートアップ等でも話は聞いていて、なんとなくの概要はしっていました。しかし、あらためてAdmission Webhookの仕組みを理解すると、Gatekeeperのやっていることがクリアに理解できました。

GatekeeperのベースになっているのはOpen Policy Agent（略称OPA,「おーぱ」と発音するらしい）です。
OPA自体は、Kubernetesのためのツールということではなく、汎用的なポリシーエンジンです。ポリシー言語であるRegoで、任意のポリシーを作成し、APIを経由してリクエストの妥当性を検査するものです。

![opa](https://d33wubrfki0l68.cloudfront.net/b394f524e15a67457b85fdfeed02ff3f2764eb9e/6ac2b/docs/latest/images/opa-service.svg)  
※画像は`https://www.openpolicyagent.org/docs/latest/#overview`より引用

Gatekeeperは、OPAをベースとして、KubernetesのAdmission Webhookの仕組みの中でポリシーエンジンを実現したものです。
前回までのブログで利用してきた図を改変してGatekeeperに当てはめると以下のような感じです。

![gatekeeper](/image/gatekeeper-overview.png)

## インストールして構成確認
ここではさくっとドキュメント通りにインストールします。

```text
$ kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.8/deploy/gatekeeper.yaml
namespace/gatekeeper-system unchanged
resourcequota/gatekeeper-critical-pods configured
customresourcedefinition.apiextensions.k8s.io/assign.mutations.gatekeeper.sh configured
customresourcedefinition.apiextensions.k8s.io/assignmetadata.mutations.gatekeeper.sh configured
customresourcedefinition.apiextensions.k8s.io/configs.config.gatekeeper.sh configured
customresourcedefinition.apiextensions.k8s.io/constraintpodstatuses.status.gatekeeper.sh configured
customresourcedefinition.apiextensions.k8s.io/constrainttemplatepodstatuses.status.gatekeeper.sh configured
customresourcedefinition.apiextensions.k8s.io/constrainttemplates.templates.gatekeeper.sh configured
customresourcedefinition.apiextensions.k8s.io/modifyset.mutations.gatekeeper.sh configured
customresourcedefinition.apiextensions.k8s.io/mutatorpodstatuses.status.gatekeeper.sh configured
customresourcedefinition.apiextensions.k8s.io/providers.externaldata.gatekeeper.sh configured
serviceaccount/gatekeeper-admin unchanged
Warning: policy/v1beta1 PodSecurityPolicy is deprecated in v1.21+, unavailable in v1.25+
podsecuritypolicy.policy/gatekeeper-admin unchanged
role.rbac.authorization.k8s.io/gatekeeper-manager-role configured
clusterrole.rbac.authorization.k8s.io/gatekeeper-manager-role configured
rolebinding.rbac.authorization.k8s.io/gatekeeper-manager-rolebinding unchanged
clusterrolebinding.rbac.authorization.k8s.io/gatekeeper-manager-rolebinding unchanged
secret/gatekeeper-webhook-server-cert unchanged
service/gatekeeper-webhook-service unchanged
deployment.apps/gatekeeper-audit configured
deployment.apps/gatekeeper-controller-manager configured
Warning: policy/v1beta1 PodDisruptionBudget is deprecated in v1.21+, unavailable in v1.25+; use policy/v1 PodDisruptionBudget
poddisruptionbudget.policy/gatekeeper-controller-manager unchanged
mutatingwebhookconfiguration.admissionregistration.k8s.io/gatekeeper-mutating-webhook-configuration configured
validatingwebhookconfiguration.admissionregistration.k8s.io/gatekeeper-validating-webhook-configuration configured
```

### Validating Webhook Configuration
前回までのブログおよび動画を見てくださった方なら、いくつか気になるポイントがあるでしょう。
まずは、Validating Webhook Configurationをみてみます。
もうこのConfigurationの設定の意味は簡単にわかるかもしれません。

```text
$ kubectl get validatingwebhookconfiguration.admissionregistration.k8s.io/gatekeeper-validating-webhook-configuration -o yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"admissionregistration.k8s.io/v1","kind":"ValidatingWebhookConfiguration","metadata":{"annotations":{},"labels":{"gatekeeper.sh/system":"yes"},"name":"gatekeeper-validating-webhook-configuration"},"webhooks":[{"admissionReviewVersions":["v1","v1beta1"],"clientConfig":{"service":{"name":"gatekeeper-webhook-service","namespace":"gatekeeper-system","path":"/v1/admit"}},"failurePolicy":"Ignore","matchPolicy":"Exact","name":"validation.gatekeeper.sh","namespaceSelector":{"matchExpressions":[{"key":"admission.gatekeeper.sh/ignore","operator":"DoesNotExist"}]},"rules":[{"apiGroups":["*"],"apiVersions":["*"],"operations":["CREATE","UPDATE"],"resources":["*"]}],"sideEffects":"None","timeoutSeconds":3},{"admissionReviewVersions":["v1","v1beta1"],"clientConfig":{"service":{"name":"gatekeeper-webhook-service","namespace":"gatekeeper-system","path":"/v1/admitlabel"}},"failurePolicy":"Fail","matchPolicy":"Exact","name":"check-ignore-label.gatekeeper.sh","rules":[{"apiGroups":[""],"apiVersions":["*"],"operations":["CREATE","UPDATE"],"resources":["namespaces"]}],"sideEffects":"None","timeoutSeconds":3}]}
  creationTimestamp: "2022-06-06T11:53:53Z"
  generation: 2
  labels:
    gatekeeper.sh/system: "yes"
  name: gatekeeper-validating-webhook-configuration
  resourceVersion: "181540173"
  uid: c672e177-b021-4f41-a9d6-eb22aec12ebf
webhooks:
- admissionReviewVersions:
  - v1
  - v1beta1
  clientConfig:
    caBundle: xxxxxxxxxxxxxx
    service:
      name: gatekeeper-webhook-service
      namespace: gatekeeper-system
      path: /v1/admit
      port: 443
  failurePolicy: Ignore
  matchPolicy: Exact
  name: validation.gatekeeper.sh
  namespaceSelector:
    matchExpressions:
    - key: admission.gatekeeper.sh/ignore
      operator: DoesNotExist
  objectSelector: {}
  rules:
  - apiGroups:
    - '*'
    apiVersions:
    - '*'
    operations:
    - CREATE
    - UPDATE
    resources:
    - '*'
    scope: '*'
  sideEffects: None
  timeoutSeconds: 3
- admissionReviewVersions:
  - v1
  - v1beta1
  clientConfig:
    caBundle: xxxxxxxxxxxxxxxxxx
    service:
      name: gatekeeper-webhook-service
      namespace: gatekeeper-system
      path: /v1/admitlabel
      port: 443
  failurePolicy: Fail
  matchPolicy: Exact
  name: check-ignore-label.gatekeeper.sh
  namespaceSelector: {}
  objectSelector: {}
  rules:
  - apiGroups:
    - ""
    apiVersions:
    - '*'
    operations:
    - CREATE
    - UPDATE
    resources:
    - namespaces
    scope: '*'
  sideEffects: None
  timeoutSeconds: 3
```

まず、気になったのは通信先です。  
通信先は、Serviceを参照していて `gatekeeper-webhook-service` というService宛であることがわかります。
こちらは調べると `gatekeeper-controller-manage` のPod向けであることがわかります。

そして、Validationする対象ですが、`CREATE` と `UPDATE` されるすべてのリソースであるのは面白いです。
つまり、Kubernetes内でおこるすべての `CREATE` と `UPDATE` イベントに対して、いちどGatekeeperが検査するということですね。

### 証明書
Webhook serverは、`gatekeeper-controller-manage` Podが担っていることはわかりました。
証明書管理はどうしているのでしょうか？
前回は、opensslを使ってお手製で作りました。
調べると、OpenPolicyAgentのチーム内で証明書を管理するコントローラを作っていることがわかりました。
`gatekeeper-controller-manage`に組み込んでいて、証明書の生成と期限切れの証明書のローテーションを行っていることがわかりました。

<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://github.com/open-policy-agent/cert-controller" target="_blank">
      <img class="belg-site-image" src="https://opengraph.githubassets.com/a2172e569abb4de46fc5f87854721b2e8d1350b886916d999df44a129947a28b/open-policy-agent/cert-controller" />
    </a>
  </div>
  <div class="belg-right col-md-10">
  <div class="belg-title">
      <a href="https://github.com/open-policy-agent/cert-controller" target="_blank">GitHub - open-policy-agent/cert-controller</a>
    </div>
    <div class="belg-description">Contribute to open-policy-agent/cert-controller development by creating an account on GitHub.</div>
    <div class="belg-site">
      <img src="https://github.githubassets.com/favicons/favicon.svg" class="belg-site-icon">
      <span class="belg-site-name">GitHub</span>
    </div>
  </div>
</div>

実際に中身をのぞいてみましょう。  
10年期限であり、`DNS:gatekeeper-webhook-service.gatekeeper-system.svc`のSANが設定されています。

```text
$ kubectl get secret gatekeeper-webhook-server-cert -o jsonpath="{.data.tls\.crt}" | base64 -d | openssl x509 -noout -text
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number: 1 (0x1)
        Signature Algorithm: sha256WithRSAEncryption
        Issuer: O = gatekeeper, CN = gatekeeper-ca
        Validity
            Not Before: Jun  6 10:55:33 2022 GMT
            Not After : Jun  3 11:55:33 2032 GMT
        Subject: CN = gatekeeper-webhook-service.gatekeeper-system.svc
        Subject Public Key Info:
            Public Key Algorithm: rsaEncryption
                RSA Public-Key: (2048 bit)
                Modulus:
                  xxxxxx
                Exponent: 65537 (0x10001)
        X509v3 extensions:
            X509v3 Key Usage: critical
                Digital Signature, Key Encipherment
            X509v3 Extended Key Usage:
                TLS Web Server Authentication
            X509v3 Basic Constraints: critical
                CA:FALSE
            X509v3 Authority Key Identifier:
                keyid:xxxx

            X509v3 Subject Alternative Name:
                DNS:gatekeeper-webhook-service.gatekeeper-system.svc
    Signature Algorithm: sha256WithRSAEncryption
         xxxxxx
```

## rootで動くPodを禁止する
前回にGoで作った以下のAdmission Webhookは、かんたんに実装できるんでしょうか？

> Podの `.spec.SecurityContext.RunAsUser`がrootの場合、あるいは明示的に指定されていないときにPodの作成を禁止する。ただし、特定のNamespace("admin-*")内では許可する。というValidatingAdmissionWebhookを作ってみたいと思います。  
> ※ `.spec.containers[].SecurityContext.RunAsUser` が記載があった場合はどうするんだ？というツッコミを自分でいれたいところではありますが、ブログ用のサンプルなので許してください。気が向いたら修正するかもしれません。

便利なことに、すでに便利なライブラリを用意してくれています。  
基本的なことでやりたいであろうことはかなり揃っているんじゃないかと思います。
今回もすでにライブラリとしてあったので、次のものを使ってさくっと作ってしまいます。

<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://github.com/open-policy-agent/gatekeeper-library/tree/5ba4b4dad404c60655524cfc25adc2477c153c56/library/pod-security-policy/users" target="_blank">
      <img class="belg-site-image" src="https://repository-images.githubusercontent.com/191437603/f134af34-0986-4d94-add3-6fecc0b4f192" />
    </a>
  </div>
  <div class="belg-right col-md-10">
  <div class="belg-title">
      <a href="https://github.com/open-policy-agent/gatekeeper-library/tree/5ba4b4dad404c60655524cfc25adc2477c153c56/library/pod-security-policy/users" target="_blank">gatekeeper-library/library/pod-security-policy/users at 5ba4b4dad404c60655524cfc25adc2477c153c56 · open-policy-agent/gatekeeper-library</a>
    </div>
    <div class="belg-description">The OPA Gatekeeper policy library. Contribute to open-policy-agent/gatekeeper-library development by creating an account on GitHub.</div>
    <div class="belg-site">
      <img src="https://github.githubassets.com/favicons/favicon.svg" class="belg-site-icon">
      <span class="belg-site-name">GitHub</span>
    </div>
  </div>
</div>

```text
$ kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper-library/5ba4b4dad404c60655524cfc25adc2477c153c56/library/pod-security-policy/users/template.yaml
constrainttemplate.templates.gatekeeper.sh/k8spspallowedusers created
```

`ConstraintTemplate`を作成すると、GatekeeperはCRDを作成します。  
`Constraint`を作成できるようになり、Constraintに対応したPolicyがConstraintTemplateに記載しています。

```text
$ kubectl get crd | grep constraints.gatekeeper
k8spspallowedusers.constraints.gatekeeper.sh                      2022-06-07T09:39:20Z
```

特定のNamespaceのみを、検査の対象から除外するには、ValidatingWebhookConfigurationのNamespaceSelectorでも実現できるということは前回にお知らせしました。しかし、正規表現等でNamespaceを表現することはできず、必要なNamespace名をすべてベタ書きせざるをえませんでした。
そこで、Webhook server側でNamespaceの判定を行っていました。
Gatekeeperでは非常に便利なことに、`Config`リソースで除外するNamespace/Processを指定できました。なんとも便利です。

```yaml
## config.yaml
apiVersion: config.gatekeeper.sh/v1alpha1
kind: Config
metadata:
  name: config
  namespace: "gatekeeper-system"
spec:
  match:
    - excludedNamespaces: ["default", "gatekeeper-system", "admin-*"]
      processes: ["*"]
```

```yaml
## constraint.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sPSPAllowedUsers
metadata:
  name: psp-pods-allowed-user-ranges
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    runAsUser:
      rule: MustRunAsNonRoot
```

```text
$ kubectl apply -f config.yaml
$ kubectl apply -f constraint.yaml
```

あとは検証するのみです。  
`admin-foo`と`user-bar`に対してrunAsUser未指定（root）でPodを作成して確認します。

```text
$ kubectl run -n user-bar nginx --image=nginxinc/nginx-unprivileged:latest
Error from server (Forbidden): admission webhook "validation.gatekeeper.sh" denied the request: [psp-pods-allowed-user-ranges] Container nginx is attempting to run without a required securityContext/runAsNonRoot or securityContext/runAsUser != 0

$ kubectl run -n admin-foo nginx --image=nginxinc/nginx-unprivileged:latest
pod/nginx created
```

## さいごに
前回までは、Goを使ってスクラッチでAdmission Webhookを作ってきました。
スクラッチで作ることで、Admission Webhookの仕組みをよりよく理解できたことは事実ですが、やはり現実の運用を作っていく上では、GatekeeperのようなOSSを使っていくことは非常に有益です。
そして、いちどスクラッチで作ったことで、Gatekeeperの仕組みややろうとしていることがすっと頭に入ってきました。

おそらく「Admission Webhookを作って遊んで、その仕組みを理解しよう」関連の投稿は、これで一旦終了になると思いますが非常におもしろい学びでした。やってよかったです。