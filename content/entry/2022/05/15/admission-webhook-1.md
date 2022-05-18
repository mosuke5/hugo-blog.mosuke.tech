+++
categories = ["Kubernetes"]
date = "2022-05-15T18:38:40+09:00"
description = "Kubernetesの運用には欠かせなくなってくる拡張。そのひとつであるAdmission Webhookを作って遊んでみるというものです。本記事は説明編で、動作編にも続きます。"
draft = false
image = ""
tags = ["Tech"]
title = "Admission Webhookを作って遊んで、その仕組みを理解しよう（説明編）"
author = "mosuke5"
archive = ["2022"]
+++

こんにちは、もーすけです。  
今回はKubernetesの拡張する仕組みのひとつであるAdmission Webhookをスクラッチで作ることで、その仕組や作り方を理解しようというものです。自分自身はじめて試みて詰まったところなど多数あったので、その整理も兼ねて書きます。
いままで、ドキュメントや文献を読んで、Admission webhookというものの存在やなんとなくの仕組みは理解しているつもりでした。一方で、実際に作ってみると見えていなかった要素もわかってきました。

Kubernetesを運用すると、業務に合わせた機能拡張はほぼ必須と言っても過言ではなく、一度自分の手で作っていくことはとても有益と思います。

後編はこちら。
<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://blog.mosuke.tech/entry/2022/05/15/admission-webhook-2/" target="_blank">
      <img class="belg-site-image" src="https://blog.mosuke.tech/image/logo.png" />
    </a>
  </div>
  <div class="belg-right col-md-10">
  <div class="belg-title">
      <a href="https://blog.mosuke.tech/entry/2022/05/15/admission-webhook-2/" target="_blank">Admission Webhookを作って遊んで、その仕組みを理解しよう（動作編） · Goldstine研究所</a>
    </div>
    <div class="belg-description">Kubernetesの運用には欠かせなくなってくる拡張。そのひとつであるAdmission Webhookを作って遊んでみるというものです。本記事は実際に作って動かす動作編です。</div>
    <div class="belg-site">
      <img src="https://blog.mosuke.tech/image/favicon.ico" class="belg-site-icon">
      <span class="belg-site-name">Goldstine研究所</span>
    </div>
  </div>
</div>
<!--more-->

## Admission Controlとそのプラグイン
Kubernetes API Serverが、APIリクエストを発行するまでには次の3フェーズで実行されます。
こういった図は、いたるところで語られているので見たこともある人も多いでしょう。

![kuberbetes-api-flow](/image/kubernetes-api-flow.png)

図の「Admission control」に「Admission controllerによるリクエストの改変など」と書いてありますが、この部分をもう少し深ぼって理解します。
Admission controllerは、プラグイン形式になっていて、次のような機能がKubernetesに備え付けで用意されています。
以下は独断と偏見でいくつかをピックアップしたものです。プラグインのリストは {{< external_link url="https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/#what-does-each-admission-controller-do" title="こちらのドキュメント" >}} を確認するといいです。

- AlwaysPullImages
  - すべての新しく作られるPodのImagePullPolicyをAlwaysに変更するもの
- LimitRanger
  - Namespaceに設定されるLimitRangeに対して、リクエストが適切かどうかを検証する。もしResourceが未設定の場合はデフォルト値を設定するときにも使われる。
- ServiceAccount
  - ServiceAccountが明示的に指定されていないPodに対して、default ServiceAccountを紐付ける。
- **MutatingAdmissionWebhook**
  - 独自のリソース変更を実装するためのWebhookを呼び出す。
- **ValidatingAdmissionWebhook**
  - 独自のリソース検証を実装するためのWebhookを呼び出す。

これらのAdmission controllerのプラグインは、Kubernetes API Serverが起動するときのオプションとして指定できる。
ServiceAccountプラグインはデフォルトで有効にされており、いままでKubernetesを使ってきた人は動きとして体感したことがあるはずです。毎回明示的にServiceAccount名を指定してなくても動作していたのはこのプラグインのおかげです。

これから説明する「MutatingAdmissionWebhook」「ValidatingAdmissionWebhook」もデフォルトでは有効になっているものです。念の為、お使いのKubernetesクラスタの有効化状況を調べておくといいでしょう。

## 拡張プラグインであるAdmissionWebhook
Admission controllerのプラグインでもって、APIリクエストの処理をある程度コントールできます。
上で紹介したプラグインに「MutatingAdmissionWebhook」と「ValidatingAdmissionWebhook」の2つがあり、これらは他プラグインとは異なる特徴を持ちます。これら2つ以外は、それ自身で完結する機能を提供していました。
一方で、この「MutatingAdmissionWebhook」と「ValidatingAdmissionWebhook」は、ユーザ側で拡張できるようにするためのプラグインであるのです。これらが単独でユーザ似メリットのある機能は提供しませんが、独自で用意するWebhookサーバと連携することで、独自の機能を提供できるわけです。

AdmissionWebhookには「Mutating」と「Validating」の2つがあり、はじめてだととくにMutatingのほうが聞き馴染みがないかもしれません。Validatingは、Webアプリケーションの開発等を行っていても、フォーム入力のバリデーションチェックなどを行うのでそれなりに馴染みがあると思います。
それぞれの言葉の違いを確認しておくといいです。

- Mutating
  - 英語) mutateは動詞で「変化する、突然変異する、母音変異する」
  - Kubernetesの中では、リクエストされたAPIのなんらかの値を書き換える、値を追加するものを指しています。
- Validating
  - 英語) validateは動詞で「〜を法律的に有効にする、確証する、確認する」
  - リクエストされたAPIの正しさを検証すると理解しておくといいでしょう。値は変えずに妥当性を判断するのみです。


それぞれのAdmissionWebhookは、役割も異なりますが実行されるタイミングも異なります。
以下の図は「{{< external_link url="https://kubernetes.io/blog/2019/03/21/a-guide-to-kubernetes-admission-controllers/" title="A Guide to Kubernetes Admission Controllers" >}}」から拝借したもので、Admission Controlのフェーズを図示したもの（一部書き加えたいことがあったので足しました）です。

![admission-controller-phases](/image/admission-controller-phases.png)

理解しておくと良いポイントとしては、MutatingAdmisssionのほうが先に行われること。
MutatingAdmisssionWebhookは、Serialで処理されること（並列ではなく順次処理）。一方でValidatingAdmissionWebhookはParallelで処理されること（並列で処理され、どれかひとつでも許可しなければリクエストは失敗）。

## AdmissionWebhookを自作するには？
### 全体像
Admission webhookを自作して動かすために必要なものの全体像を絵に書いてみました。  
上で説明したとおり、Kubernetes API ServerがAPIリクエストを発行するまでのプロセスの中でWebhook serverに対して問い合わせを行います。リクエストとレスポンスの形式は決められており、それに応答できるWebhook serverを用意することが大前提となります。
また、API ServerとWebhook serverの間はHTTPSで通信するためTLS対応もする必要があります。  

ちなみにWebhook Serverは、Kubernetesクラスタの外部でも構わいません。しかし多くの場合はKubernetesクラスタ内部に作ることが多いとは思います。

![admission-webhook-overview](/image/admission-webhook-overview.png)


### リクエストとレスポンス
Webhook Serverを作るにあたって、重要となるインプットとアウトプット（リクエストとレスポンス）の形式を確認しておきましょう。
リクエストとレスポンスの形式については {{< external_link title="公式ドキュメント" url="https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#request" >}}　に記載があります。

以下は、実際の生データで、mosuke5というユーザで `kubectl run debug -it --image registry.gitlab.com/mosuke5/debug-container:latest -- /bin/bash` を実行したときにWebhook Serverに飛んできたリクエストボディの中身です。

```json
{
	"kind": "AdmissionReview",
	"apiVersion": "admission.k8s.io/v1",
	"request": {
		"uid": "2e556680-fe1b-412d-9660-4e0574adcf47",
		"kind": {
			"group": "",
			"version": "v1",
			"kind": "Pod"
		},
		"resource": {
			"group": "",
			"version": "v1",
			"resource": "pods"
		},
		"requestKind": {
			"group": "",
			"version": "v1",
			"kind": "Pod"
		},
		"requestResource": {
			"group": "",
			"version": "v1",
			"resource": "pods"
		},
		"name": "debug",
		"namespace": "webhook-tutorial-system",
		"operation": "CREATE",
		"userInfo": {
			"username": "mosuke5",
			"uid": "048b269f-e08b-48ff-bb0e-815c16f16af9",
			"groups": [
				"system:authenticated:oauth",
				"system:authenticated"
			],
			"extra": {
				"scopes.authorization.openshift.io": [
					"user:full"
				]
			}
		},
		"object": {
			"kind": "Pod",
			"apiVersion": "v1",
			"metadata": {
				"name": "debug",
				"namespace": "webhook-tutorial-system",
				"uid": "349a1319-63e0-49d9-9b67-5e502238c944",
				"creationTimestamp": "2022-05-12T05:47:11Z",
				"labels": {
					"run": "debug"
				},
				"annotations": {
					"openshift.io/scc": "anyuid"
				},
				"managedFields": [
					{
						"manager": "kubectl-run",
						"operation": "Update",
						"apiVersion": "v1",
						"time": "2022-05-12T05:47:11Z",
						"fieldsType": "FieldsV1",
						"fieldsV1": {
							"f:metadata": {
								"f:labels": {
									".": {},
									"f:run": {}
								}
							},
							"f:spec": {
								"f:containers": {
									"k:{\"name\":\"debug\"}": {
										".": {},
										"f:args": {},
										"f:image": {},
										"f:imagePullPolicy": {},
										"f:name": {},
										"f:resources": {},
										"f:stdin": {},
										"f:stdinOnce": {},
										"f:terminationMessagePath": {},
										"f:terminationMessagePolicy": {},
										"f:tty": {}
									}
								},
								"f:dnsPolicy": {},
								"f:enableServiceLinks": {},
								"f:restartPolicy": {},
								"f:schedulerName": {},
								"f:securityContext": {},
								"f:terminationGracePeriodSeconds": {}
							}
						}
					}
				]
			},
			"spec": {
				"volumes": [
					{
						"name": "kube-api-access-8b26w",
						"projected": {
							"sources": [
								{
									"serviceAccountToken": {
										"expirationSeconds": 3607,
										"path": "token"
									}
								},
								{
									"configMap": {
										"name": "kube-root-ca.crt",
										"items": [
											{
												"key": "ca.crt",
												"path": "ca.crt"
											}
										]
									}
								},
								{
									"downwardAPI": {
										"items": [
											{
												"path": "namespace",
												"fieldRef": {
													"apiVersion": "v1",
													"fieldPath": "metadata.namespace"
												}
											}
										]
									}
								},
								{
									"configMap": {
										"name": "openshift-service-ca.crt",
										"items": [
											{
												"key": "service-ca.crt",
												"path": "service-ca.crt"
											}
										]
									}
								}
							],
							"defaultMode": 420
						}
					}
				],
				"containers": [
					{
						"name": "debug",
						"image": "registry.gitlab.com/mosuke5/debug-container:latest",
						"args": [
							"/bin/bash"
						],
						"resources": {},
						"volumeMounts": [
							{
								"name": "kube-api-access-8b26w",
								"readOnly": true,
								"mountPath": "/var/run/secrets/kubernetes.io/serviceaccount"
							}
						],
						"terminationMessagePath": "/dev/termination-log",
						"terminationMessagePolicy": "File",
						"imagePullPolicy": "Always",
						"securityContext": {
							"capabilities": {
								"drop": [
									"MKNOD"
								]
							}
						},
						"stdin": true,
						"stdinOnce": true,
						"tty": true
					}
				],
				"restartPolicy": "Always",
				"terminationGracePeriodSeconds": 30,
				"dnsPolicy": "ClusterFirst",
				"serviceAccountName": "default",
				"serviceAccount": "default",
				"securityContext": {
					"seLinuxOptions": {
						"level": "s0:c28,c27"
					}
				},
				"imagePullSecrets": [
					{
						"name": "default-dockercfg-mbbwf"
					}
				],
				"schedulerName": "default-scheduler",
				"tolerations": [
					{
						"key": "node.kubernetes.io/not-ready",
						"operator": "Exists",
						"effect": "NoExecute",
						"tolerationSeconds": 300
					},
					{
						"key": "node.kubernetes.io/unreachable",
						"operator": "Exists",
						"effect": "NoExecute",
						"tolerationSeconds": 300
					}
				],
				"priority": 0,
				"enableServiceLinks": true,
				"preemptionPolicy": "PreemptLowerPriority"
			},
			"status": {
				"phase": "Pending",
				"qosClass": "BestEffort"
			}
		},
		"oldObject": null,
		"dryRun": false,
		"options": {
			"kind": "CreateOptions",
			"apiVersion": "meta.k8s.io/v1",
			"fieldManager": "kubectl-run"
		}
	}
}
```

レスポンスについては、MutatingAdmissionWebhookがValidatingAdmissionWebhookかで、若干記載内容が変わります。
わかりやすいValidatingAdmissionWebhookから見ていきましょう。

必要最低限では、次のような形式でレスポンスしてあげればいいです。
`response.uid` は、リクエスト内の `request.uid` を取得して入れてあげればよいです。
`allowd=true`であれば、APIリクエストを許可、`allowd=false`であれば拒否というシンプルなものです。

```json
{
  "apiVersion": "admission.k8s.io/v1",
  "kind": "AdmissionReview",
  "response": {
    "uid": "<value from request.uid>",
    "allowed": true
  }
}
```

### 認証
Admission Webhookでは、Kubernetes API ServerからWebhook Serverに通信が行われますが、TLS認証が必須です。
TLS通信のためのサーバ証明書とその秘密鍵をWebhook Serverに読み込ませる必要があります。

他のブログで、この証明書を作るために{{< external_link title="KubernetesのCSRの機能" url="https://kubernetes.io/docs/reference/access-authn-authz/certificate-signing-requests/" >}}を用いているものもありましたが、わたしが理解する限りKubernetesのCSRを使って証明書を発行する必要はとくにないと思っています。（もし違うよというコメントあれば教えて下さい。）

### 便利なフレームワーク
上記に見てきたように、Admission webhookを作るのに必要なことは、決められたJSONフォーマットでHTTPS通信できることです。
簡単な処理であれば、作るのにそれほど労力をかけずにできるでしょう。
一方で、証明書の管理であったり、独自のリソース（カスタムコントローラやOperatorと呼ばれる独自リソース）に対してのAdmission webhookを作ろうと思うとフレームワークを使っていってもいいのかなと思います。

自分が経験あるわけではないのですが、紹介だけしておきます。  
（OperatorSDKは、Admission webhook用途ではなくOperator開発用途としては使っていました。）

<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://github.com/slok/kubewebhook" target="_blank">
      <img class="belg-site-image" src="https://opengraph.githubassets.com/df193c2452a9a8acbc5c471c21fd7f7b1948db2e7cf44c046c006aadbd4a4160/slok/kubewebhook" />
    </a>
  </div>
  <div class="belg-right col-md-10">
  <div class="belg-title">
      <a href="https://github.com/slok/kubewebhook" target="_blank">GitHub - slok/kubewebhook: Go framework to create Kubernetes mutating and validating webhooks</a>
    </div>
    <div class="belg-description">Go framework to create Kubernetes mutating and validating webhooks - GitHub - slok/kubewebhook: Go framework to create Kubernetes mutating and validating webhooks</div>
    <div class="belg-site">
      <img src="https://github.githubassets.com/favicons/favicon.svg" class="belg-site-icon">
      <span class="belg-site-name">GitHub</span>
    </div>
  </div>
</div>


<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://github.com/kubernetes-sigs/kubebuilder" target="_blank">
      <img class="belg-site-image" src="https://opengraph.githubassets.com/b6fffe8899c45346330a84e393bd94a34cf715c8f7ee117251c5911bf6845172/kubernetes-sigs/kubebuilder" />
    </a>
  </div>
  <div class="belg-right col-md-10">
  <div class="belg-title">
      <a href="https://github.com/kubernetes-sigs/kubebuilder" target="_blank">GitHub - kubernetes-sigs/kubebuilder: Kubebuilder - SDK for building Kubernetes APIs using CRDs</a>
    </div>
    <div class="belg-description">Kubebuilder - SDK for building Kubernetes APIs using CRDs - GitHub - kubernetes-sigs/kubebuilder: Kubebuilder - SDK for building Kubernetes APIs using CRDs</div>
    <div class="belg-site">
      <img src="https://github.githubassets.com/favicons/favicon.svg" class="belg-site-icon">
      <span class="belg-site-name">GitHub</span>
    </div>
  </div>
</div>

<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://github.com/operator-framework/operator-sdk" target="_blank">
      <img class="belg-site-image" src="https://opengraph.githubassets.com/14edbdf01af127245ea00742123c7960589c410e0f4504c7156c786f90e107ae/operator-framework/operator-sdk" />
    </a>
  </div>
  <div class="belg-right col-md-10">
  <div class="belg-title">
      <a href="https://github.com/operator-framework/operator-sdk" target="_blank">GitHub - operator-framework/operator-sdk: SDK for building Kubernetes applications. Provides high level APIs, useful abstractions, and project scaffolding.</a>
    </div>
    <div class="belg-description">SDK for building Kubernetes applications. Provides high level APIs, useful abstractions, and project scaffolding. - GitHub - operator-framework/operator-sdk: SDK for building Kubernetes application...</div>
    <div class="belg-site">
      <img src="https://github.githubassets.com/favicons/favicon.svg" class="belg-site-icon">
      <span class="belg-site-name">GitHub</span>
    </div>
  </div>
</div>

## AdmissionWebhookのKubernetesへの設定
前項では、自作のWebhook Serverに関する説明をしました。
最終的にはこのWebhook ServerをKubernetes内部あるいは外部サーバにホストすることになります。
Kubernetes API Serverから、対象のWebhook Serverに通信を行わせるためには、「ValidatingWebhookConfiguration」と「MutatingWebhookConfiguration」リソースを設定する必要があります。

本記事で詳細にすべて説明はしませんが、簡単に紹介します。  
このMutating/ValidatingWebookConfigurationリソースでは、ざっくり「どのWebhook Serverに」「どのルールで（対象のnamespaceはどこ？どのリソースに対するどんな処理がおきたときに？）」を記述することになります。

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: "sample-validating-webhook"
webhooks:
- name: "sample-validating-webhook.hoge.fuga.local"
  namespaceSelector:
    matchExpressions:
    - key: kubernetes.io/metadata.name
      operator: In
      values: ["webhook-tutorial-system"]
  failurePolicy: Fail
  rules:
  - apiGroups: [""]
    operations: ["CREATE"]
    apiVersions: ["v1"]
    resources: ["pods"]
    scope: "Namespaced"
  clientConfig:
    caBundle: 
    service:
      namespace: webhook-tutorial-system
      name: mytest-service
      path: /my-validation
  admissionReviewVersions: ["v1"]
  timeoutSeconds: 5
  sideEffects: None
```

## さいごに
本記事ではここまでにして、実際に作って動かすところは以下を参照してください。

<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://blog.mosuke.tech/entry/2022/05/15/admission-webhook-2/" target="_blank">
      <img class="belg-site-image" src="https://blog.mosuke.tech/image/logo.png" />
    </a>
  </div>
  <div class="belg-right col-md-10">
  <div class="belg-title">
      <a href="https://blog.mosuke.tech/entry/2022/05/15/admission-webhook-2/" target="_blank">Admission Webhookを作って遊んで、その仕組みを理解しよう（動作編） · Goldstine研究所</a>
    </div>
    <div class="belg-description">Kubernetesの運用には欠かせなくなってくる拡張。そのひとつであるAdmission Webhookを作って遊んでみるというものです。本記事は実際に作って動かす動作編です。</div>
    <div class="belg-site">
      <img src="https://blog.mosuke.tech/image/favicon.ico" class="belg-site-icon">
      <span class="belg-site-name">Goldstine研究所</span>
    </div>
  </div>
</div>
