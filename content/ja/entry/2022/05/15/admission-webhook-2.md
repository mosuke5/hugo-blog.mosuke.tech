+++
categories = ["Kubernetes"]
date = "2022-05-16T18:37:40+09:00"
description = "Kubernetesの運用には欠かせなくなってくる拡張。そのひとつであるAdmission Webhookを作って遊んでみるというものです。本記事は実際に作って動かす動作編です。"
draft = false
image = ""
tags = ["Tech"]
title = "Admission Webhookを作って遊んで、その仕組みを理解しよう（動作編）"
author = "mosuke5"
archive = ["2022"]
+++

こんにちは、もーすけです。  
前回は、Admission Webhookの説明編を書きました。今回は実際に動かしていくことをやっていきたいと思います。
前回ブログおよび関連ブログは以下にもありますので、あわせて確認してみてください。

{{< admission-webhook-series >}}
<!--more-->

## 解説動画
はじめての試みで、ブログ記事をみながら雑に解説していく動画をとってみました。
こういうの良かったと思えば評価ボタンとかコメントでフィードバックもらえると嬉しいです。  
※こちらの動画は第1-2回分です。

<iframe width="560" height="315" src="https://www.youtube.com/embed/E0XCDpUTR0I" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

## サンプルで作ってみるもの
というわけで、さっそくValidating Admission Webhookをスクラッチで作ってみましょう。今回は動きを理解するためにあえて {{< external_link title="kubewebhook" url="https://github.com/slok/kubewebhook" >}} や {{< external_link title="kubebuilder" url="https://github.com/kubernetes-sigs/kubebuilder" >}} といったフレームワークは使わずにやってみようと思います。

![admission-webhook-overview](/image/admission-webhook-overview.png)

### 仕様
Podの `.spec.SecurityContext.RunAsUser`がrootの場合、あるいは明示的に指定されていないときにPodの作成を禁止する。ただし、特定のNamespace("admin-*")内では許可する。というValidatingAdmissionWebhookを作ってみたいと思います。  
※ `.spec.containers[].SecurityContext.RunAsUser` が記載があった場合はどうするんだ？というツッコミを自分でいれたいところではありますが、ブログ用のサンプルなので許してください。気が向いたら修正するかもしれません。

### ポイント
ポイントとしては、対象とNamespaceが一定でないことです。  
`ValidatingWebhookConfiguration` の設定で次のように `namespaceSelector` を指定できます。
しかし、この`namespaceSelector`では、正規表現は使えず、対象のNamespaceを明示的に指定する必要があります。そのため、Webhook Server側で対象のNamespaceかどうかを判定するようにしてみました。

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
      values: ["admin-1", "admin-2", "admin-3"]
...
```

### ソースコード
ソースコードおよび、ビルドしたコンテナイメージはGitHubにアップロードしてあります。

<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://github.com/mosuke5/sample-validating-admission-webhook" target="_blank">
      <img class="belg-site-image" src="https://opengraph.githubassets.com/23cae14e2ee81ca608367b12d22b9743d374b5948981aa1b6c9e0b4a1f33cd91/mosuke5/sample-validating-admission-webhook" />
    </a>
  </div>
  <div class="belg-right col-md-10">
  <div class="belg-title">
      <a href="https://github.com/mosuke5/sample-validating-admission-webhook" target="_blank">GitHub - mosuke5/sample-validating-admission-webhook</a>
    </div>
    <div class="belg-description">Contribute to mosuke5/sample-validating-admission-webhook development by creating an account on GitHub.</div>
    <div class="belg-site">
      <img src="https://github.githubassets.com/favicons/favicon.svg" class="belg-site-icon">
      <span class="belg-site-name">GitHub</span>
    </div>
  </div>
</div>

## Kubernetesクラスタへのデプロイ
### TLS証明書の作成
今回は、opensslを使って自己証明書を作って対応することにします。

```text
## webhook serverの秘密鍵作成
$ openssl genrsa 2048 > server.key
Generating RSA private key, 2048 bit long modulus
..+++
................+++
e is 65537 (0x10001)

## CSRの作成
$ openssl req -new -key server.key -out server.csr
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) []:JP
State or Province Name (full name) []:Tokyo
Locality Name (eg, city) []:
Organization Name (eg, company) []:
Organizational Unit Name (eg, section) []:
Common Name (eg, fully qualified host name) []:mywebook.mynamespace.svc.cluster.local
Email Address []:

Please enter the following 'extra' attributes
to be sent with your certificate request
A challenge password []:

% ll
total 16
-rw-r--r--  1 shinyamori  staff   968B  5 17 11:49 server.csr
-rw-r--r--  1 shinyamori  staff   1.6K  5 16 22:41 server.key

## SubjectAltNameに対応するためのファイル作成
$ echo "subjectAltName = DNS:mywebhook.mynamespace.svc, DNS:mywebhook.mynamespace.svc.cluster.local" > san.txt

$ cat san.txt
subjectAltName = DNS:mywebhook.mynamespace.svc, DNS:mywebhook.mynamespace.svc.cluster.local

## サーバ証明書の作成
$ openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt -extfile san.txt
Signature ok
subject=/C=JP/ST=Tokyo/CN=mywebook.mynamespace.svc.cluster.local
Getting Private key
```

x509の証明書の中身を確認する方法はぱっとコマンドを打てるようにしておくと結構便利です。
Kubernetes環境の運用でも、各種サービスの証明書を確認することも多いでしょう。
ここでのポイントは `X509v3 Subject Alternative Name` がきちんと付与されているかです。

```text
## 証明書の中身確認
$ openssl x509 -text -noout -in server.crt
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number: 14353298851236901938 (0xc731294216ff7432)
    Signature Algorithm: sha1WithRSAEncryption
        Issuer: C=JP, ST=Tokyo, CN=mywebook.mynamespace.svc.cluster.local
        Validity
            Not Before: May 17 02:52:21 2022 GMT
            Not After : May 17 02:52:21 2023 GMT
        Subject: C=JP, ST=Tokyo, CN=mywebook.mynamespace.svc.cluster.local
        Subject Public Key Info:
            Public Key Algorithm: rsaEncryption
                Public-Key: (2048 bit)
                Modulus:
                    ...
                Exponent: 65537 (0x10001)
        X509v3 extensions:
            X509v3 Subject Alternative Name:
                DNS:mywebhook.mynamespace.svc, DNS:mywebhook.mynamespace.svc.cluster.local
    Signature Algorithm: sha1WithRSAEncryption
         ...
```


### SubjectAltNameに対応しましょう
サーバ証明書を作成するときに、CommonNameのみで、SANをとくに付与しなくても作成が可能です。
しかし、{{< external_link title="HTTP Over TLSのRFC2818" url="https://datatracker.ietf.org/doc/html/rfc2818" >}}に次のように書かれています。

> If a subjectAltName extension of type dNSName is present, that MUST be used as the identity. Otherwise, the (most specific) Common Name field in the Subject field of the certificate MUST be used. Although the use of the Common Name is existing practice, it is deprecated and  Certification Authorities are encouraged to use the dNSName instead.
>
> ({{< external_link title="日本語訳" url="https://www.ipa.go.jp/security/rfc/RFC2818JA.html#31" >}})  
> dNSName 型の subjectAltName 拡張 がある場合、それは、身元として使われなければなりません（MUST）。それ以外の場合は、証明書の Subject フィールドにある（最も具体的）な Common Name フィールドを使用しなければなりません（MUST）。 Common Name の利用が既存の実践ですが、これは不当であり、代わりに認証機関には、dNSName を使うことが強く薦められます。（日本語訳は）


もし、SANを使っていないCommon Nameのみでの証明を使うとWebhookをcallするときに次のようなエラーがでます。
Goの古いバージョンでは、`GODEBUG=x509ignoreCN=0` を与えることで回避できましたが、Go1.17移行を使っているKubernetesのバージョンでは正式にSANを使った証明書を用意しましょう。
Go 1.17で `The temporary GODEBUG=x509ignoreCN=0 flag has been removed.` と無視するオプションが削除されています（{{< external_link url="https://go.dev/doc/go1.17#crypto/x509" title="リリースノート" >}}）。

```text
Error from server (InternalError): Internal error occurred: failed calling webhook "sample-validating-webhook.hoge.fuga.local": failed to call webhook: Post "https://mywebhook.mynamespace.svc:443/runasuser-validation?timeout=5s": x509: certificate relies on legacy Common Name field, use SANs instead
```

### ローカル実行
作成した証明書を使って動作するかローカルで確認しておきます。
起動オプションに証明書と鍵を指定できるようにしました。

```text
$ go run server.go -server-cert=./tmp/server.crt -server-key=./tmp/server.key -body-dump
...
```

別ターミナルセッションでCurlを使ってリクエストを送信してみます。
`testdata`ディレクトリにサンプルのJSONリクエストを用意しておきました。
レスポンスの形式が、公式ドキュメントであることをしっかり確認しておきましょう。

```text
$ curl -s -k -H 'Content-Type: application/json' -XPOST https://localhost:8443/runasuser-validation -d @testdata/noRunAsUserRequestTemplate.json | jq .
{
  "response": {
    "uid": "2e556680-fe1b-412d-9660-4e0574adcf47",
    "allowed": false,
    "status": {
      "metadata": {},
      "message": "runAsUser is required in user namespace.",
      "code": 403
    }
  }
}
```

### デプロイ to Kubernetes
作成した証明書と鍵は、Kubernetes上で動作するPodも読み込む必要があります。
証明書等の機密情報はSecretに格納してマウントするのが常套手段ですね。

```text
$ kubectl create ns mynamespace
$ kubectl create secret tls mywebhook-secret --key server.key --cert server.crt -n mynamespace
secret/mywebhook-secret created

$ kubectl describe secret mywebhook-secret -n mynamespace
Name:         mywebhook-secret
Namespace:    mynamespace
Labels:       <none>
Annotations:  <none>

Type:  kubernetes.io/tls

Data
====
tls.crt:  1253 bytes
tls.key:  1675 bytes
```

次のようなかたちで証明書と鍵をPod内にマウントして使うようにしてみました。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mywebhook
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mywebhook
  template:
    metadata:
      labels:
        app: mywebhook
    spec:
      containers:
      - name: app
        args:
          - -server-cert=/tmp/tls/tls.crt
          - -server-key=/tmp/tls/tls.key
          - -body-dump
        imagePullPolicy: Always
        image: ghcr.io/mosuke5/sample-validating-admission-webhook:main
        ports:
        - containerPort: 8443
        volumeMounts:
        - name: tls
          mountPath: /tmp/tls/
      volumes:
      - name: tls
        secret:
          secretName: mywebhook-secret
```

```text
$ kubectl apply -f manifests/deploy.yaml -n mynamespace
$ kubectl get pod,service -n mynamespace
NAME                             READY   STATUS    RESTARTS   AGE
pod/mywebhook-685f859975-tfd2n   1/1     Running   0          37s

NAME                TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
service/mywebhook   ClusterIP   172.30.26.80   <none>        443/TCP   2m6s
```

### AdmissionWebhook設定
いよいよデプロイの最後のフェーズです。  
Webhook Serverとしてはデプロイできましたので、AdmissionWebhookの設定を行って実際に動作するようにします。
今回は自己証明書をつかっているので、`caBundle`の記載を忘れずに行いましょう。

```text
$ sed  "s/BASE64_ENCODED_PEM_FILE/$(base64 server.crt)/g" manifests/validatingwebhookconfiguration.yaml.template | kubectl apply -f -
validatingwebhookconfiguration.admissionregistration.k8s.io/sample-validating-webhook created
```

これで、Admission webhookの設定は終わりです。  
期待通り動くのでしょうか？
`user-foo`と`admin-bar`というnamespaceに対してPodを作成して挙動を確認してみます。

```text
$ kubectl create ns user-foo
$ kubectl create ns admin-bar

$ kubectl run debug --rm -it --image busybox:latest -n user-foo -- /bin/sh
Error from server: admission webhook "mywebhook.mynamespace.svc.cluster.local" denied the request: runAsUser is required in user namespace.

$ kubectl run debug --rm -it --image busybox:latest -n admin-bar -- /bin/sh

If you don't see a command prompt, try pressing enter.
/ # uname -a
Linux debug 4.18.0-305.45.1.el8_4.x86_64 #1 SMP Wed Apr 6 13:48:37 EDT 2022 x86_64 GNU/Linux

$ cat <<EOF | kubectl apply -n user-foo -f -
apiVersion: v1
kind: Pod
metadata:
  labels:
    run: debug
  name: debug
spec:
  containers:
    - image: busybox:latest
      command:
        - /bin/sh
      args:
        - -c
        - 'sleep 3600'
      name: debug
      resources: {}
  securityContext:
    runAsUser: 1001
EOF
pod/debug created
```

## さいごに
解説編と動作編の2回に分けて、Admission webhookの作成について見てきました。
わかるとそんなにむずかしくないですね？

今回は、フレームワークを使わずに作りましたが、やはりTLS証明書の管理であったり、そもそもデプロイなど自分で用意するのがめんどうになってきます。あとは、メトリクスを仕込んだりするのも大変ですよね。フレームワークはそういった煩わしいところをまとめてやってくれるので非常に便利そうです。機会あれば、フレームワークを使ったAdmission webhook開発もトライしてみようと思います。

## 参考文献
- {{< external_link title="Dynamic Admission Control | Kubernetes" url="https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/" >}}
- {{< external_link title="Docker/Kubernetes開発・運用のためのセキュリティ実践ガイド" url="https://amzn.to/3MsfCs7" >}}
- {{< external_link title="Programming Kubernetes" url="https://amzn.to/3lfSKQP" >}}