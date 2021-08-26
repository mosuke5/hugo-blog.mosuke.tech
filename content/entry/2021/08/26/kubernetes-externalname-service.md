+++
categories = ["Kubernetes"]
date = "2021-08-26T15:50:25+09:00"
description = "KubernetesのExternalName Serviceについて検証しました。コンテナ内での名前解決の様子をtcpdumpを使いながら確認します。動作を追っていくと利用時の注意点などもわかってきました。"
draft = true
image = ""
tags = ["Tech"]
title = "Kubernetes、ExternalName Serviceの検証と利用時の注意事項"
author = "mosuke5"
archive = ["2021"]
+++

こんにちは。もーすけです。  
いろいろとKubernetesナレッジは溜まってきているのですが、なかなかアウトプットができていないこの頃です。本日は、KubernetesのServiceタイプのひとつである「ExternalName」について解説したいと思います。
基礎的な内容ではありますが、よく説明することが多かったのでまとめます。

<!--more-->

## ExternalName Serviceとは
KubernetesのServiceのタイプのひとつにExternalNameがあります。  
名前の通り、Kubernetesクラスタの外部のホスト名をKubernetes内部の名前にマッピングするものです。

具体例を示してみます。
次のマニフェストでExternalName Serviceを作成した場合、`my-database.default.svc.cluster.local` を名前解決すると `myrds.xxxx.ap-northeast-1.rds.amazonaws.com` という値を持つCNAMEレコードを返します。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-database
  namespace: default
spec:
  type: ExternalName
  externalName: xxxx.rds.amazonaws.com 
```

つまり、Kubernetesクラスタ外のServiceであっても、Podからは `my-database.default.svc.cluster.local` で名前解決できるようになります。
ExternalName Serviceを作成した同じNamespace内からであれば `my-database` で名前解決できるというわけです。（Serviceの名前解決について理解していない方は[こちらのブログ](https://blog.mosuke.tech/entry/2020/09/09/kuubernetes-dns-test/)を参照してください）

![](/image/kubernetes-externalname-service-overview.png)

## ExternalName Serviceの用途
では、どんなときに使うと便利なのか考えてみましょう。  
単純に外部サービスへの接続であれば、アプリケーション側に直接エンドポイントを設定すればよいですね。わざわざExternalName Serviceを利用する価値はどこにあるのでしょうか？

外部サービスのエンドポイントを「抽象化」できる。これに尽きるとは思います。  
たとえば、運用の中で外部のサービスをリプレイスするときなどに有効です。
下の図は、RDSインスタンスを別のものに移行する場合ですが、ExternalName Serviceの値を書き換えるだけで、アプリケーション側からの接続は変えることなく移行できます。

![](/image/kubernetes-externalname-service-migration.png)

RDSインスタンスを変えることなんてほぼないよ！と思うかもしれませんが、RDSに限らず、呼び出し先のAPIサーバであったり、Redisといったキャッシュであったりさまざまに応用はできます。
運用の中で、サービスのリプレイスを行ったり、新しいクラウドサービスがでたので移行したいなど要件はさまざまでてくるものです。

## 名前解決
実際の名前解決される様子をtcpdumpを使いながら確認してみましょう。  
検証用に次のマニフェストを用います。本ブログのドメインをExternalName Serviceに登録します。

```yaml
# external-name-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-blog
  namespace: test
spec:
  type: ExternalName
  externalName: blog.mosuke.tech 
```

次のように設定されていることを確認します。

```
$ kubectl apply -f external-service.yaml
service/my-blog created

$ kubectl get service
NAME      TYPE           CLUSTER-IP   EXTERNAL-IP        PORT(S)   AGE
my-blog   ExternalName   <none>       blog.mosuke.tech   <none>    6s
```

それでは、名前解決の様子などを確認するため、デバッグコンテナを起動します。
デバッグコンテナ内で、tcpdumpも実行します。デバッグコンテナの起動には以下を使用しました。
`registry.gitlab.com/mosuke5/debug-container:latest` は、わたしが作成しているデバッグコンテナのイメージで、tcpdumpやdigなどのツールをいれてあります。

```yaml
# debug-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  labels:
    run: debug
  name: debug
spec:
  containers:
  - image: registry.gitlab.com/mosuke5/debug-container:latest
    name: debug
    command:
      - /bin/sh
    args:
      - '-c'
      - 'sleep infinity'
    securityContext:
      runAsUser: 0
      privileged: true
  dnsPolicy: ClusterFirst
```

```
$ kubectl apply -f debug-pod.yaml
$ kubectl get pod
NAME    READY   STATUS    RESTARTS   AGE
debug   1/1     Running   0          4s

## debugコンテナにアクセスし、tcpdumpを仕掛けます
$ kubectl exec -it debug -- bash
[root@debug /]# tcpdump
dropped privs to tcpdump
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
...
```

別のターミナルからデバッグコンテナに接続し、digなどを実行します。

```
$ kubectl exec -it debug -- bash
[root@debug /]# 
[root@debug /]# dig +search my-blog

; <<>> DiG 9.16.20-RH <<>> +search my-blog
;; global options: +cmd
;; Got answer:
;; WARNING: .local is reserved for Multicast DNS
;; You are currently testing what happens when an mDNS query is leaked to DNS
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 6985
;; flags: qr aa rd; QUERY: 1, ANSWER: 3, AUTHORITY: 0, ADDITIONAL: 1
;; WARNING: recursion requested but not available

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 512
; COOKIE: 674a1d9f47b8259d (echoed)
;; QUESTION SECTION:
;my-blog.test.svc.cluster.local.	IN	A

;; ANSWER SECTION:
my-blog.test.svc.cluster.local.	5 IN	CNAME	blog.mosuke.tech.
blog.mosuke.tech.	5	IN	A	172.67.165.72
blog.mosuke.tech.	5	IN	A	104.21.57.182

;; Query time: 38 msec
;; SERVER: 172.30.0.10#53(172.30.0.10)
;; WHEN: Thu Aug 26 08:24:54 UTC 2021
;; MSG SIZE  rcvd: 195
```

`dig +search my-blog` を実行したときのtcpdumpの出力が以下です。  
'my-blog.test.svc.cluster.local' へ名前解決しに行き、結果として `CNAME blog.mosuke.tech., A 172.67.165.72, A 104.21.57.182` が返ってきていることがわかります。予想通りですね。

```
## tcpdumpの出力
08:24:54.761076 IP debug.43126 > dns-default.openshift-dns.svc.cluster.local.domain: 6985+ [1au] A? my-blog.test.svc.cluster.local. (71)
08:24:54.798904 IP dns-default.openshift-dns.svc.cluster.local.domain > debug.43126: 6985*- 3/0/1 CNAME blog.mosuke.tech., A 172.67.165.72, A 104.21.57.182 (195)
```

ちなみに`blog.mosuke.tech`を直接名前解決したとき（`dig +search blog.mosuke.tech`）のtcpdumpの出力結果です。なんどもリクエストしていることがわかります。

```
08:25:51.192858 IP debug.38890 > dns-default.openshift-dns.svc.cluster.local.domain: 46897+ [1au] A? blog.mosuke.tech.test.svc.cluster.local. (80)
08:25:51.193849 IP dns-default.openshift-dns.svc.cluster.local.domain > debug.38890: 46897 NXDomain*- 0/1/1 (173)
08:25:51.194182 IP debug.52319 > dns-default.openshift-dns.svc.cluster.local.domain: 21491+ [1au] A? blog.mosuke.tech.svc.cluster.local. (75)
08:25:51.194422 IP dns-default.openshift-dns.svc.cluster.local.domain > debug.52319: 21491 NXDomain*- 0/1/1 (168)
08:25:51.194698 IP debug.55762 > dns-default.openshift-dns.svc.cluster.local.domain: 60867+ [1au] A? blog.mosuke.tech.cluster.local. (71)
08:25:51.194881 IP dns-default.openshift-dns.svc.cluster.local.domain > debug.55762: 60867 NXDomain*- 0/1/1 (164)
08:25:51.195152 IP debug.49306 > dns-default.openshift-dns.svc.cluster.local.domain: 21857+ [1au] A? blog.mosuke.tech.us-east-2.compute.internal. (84)
08:25:51.197946 IP dns-default.openshift-dns.svc.cluster.local.domain > debug.49306: 21857 NXDomain 0/1/1 (197)
08:25:51.198198 IP debug.51284 > dns-default.openshift-dns.svc.cluster.local.domain: 5698+ [1au] A? blog.mosuke.tech. (57)
08:25:51.198332 IP dns-default.openshift-dns.svc.cluster.local.domain > debug.51284: 5698* 2/0/1 A 172.67.165.72, A 104.21.57.182 (121)
```

## ホスト名を用いる場合は注意を
ExternalName Serviceを使うときには一部の用途で注意が必要です。  
`$ curl my-blog` したときのホスト名に注目しましょう。
`Host: my-blog` となっており、`blog.mosuke.tech` がホスト名ではありません。それにより、TLSの暗号化やプロキシに問題がおこる可能性もあります。十分に仕組みを理解して使いましょう。

```
$ curl my-blog -v
*   Trying 172.67.165.72:80...
* Connected to my-blog (172.67.165.72) port 80 (#0)
> GET / HTTP/1.1
> Host: my-blog  ←★ここ
> User-Agent: curl/7.76.1
> Accept: */*
>
* Mark bundle as not supporting multiuse
< HTTP/1.1 403 Forbidden
< Date: Thu, 26 Aug 2021 08:28:44 GMT
< Content-Type: text/plain; charset=UTF-8
< Content-Length: 16
< Connection: close
< X-Frame-Options: SAMEORIGIN
< Cache-Control: private, max-age=0, no-store, no-cache, must-revalidate, post-check=0, pre-check=0
< Expires: Thu, 01 Jan 1970 00:00:01 GMT
< Server: cloudflare
< CF-RAY: 684bb03cd8285967-IAD
<
* Closing connection 0
```

## さいごに
今回はKubernetesのServiceタイプのひとつである、ExternalName Serviceを解説しました。  
それ自体の理解はもちろん、コンテナ内でtcpdumpを仕掛けるなどデバッグは運用上も非常に便利なので慣れておきましょう。  
また、関連するトピックとして以下の内容は抑えておくことをオススメします。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2020/09/09/kuubernetes-dns-test/" data-iframely-url="//cdn.iframe.ly/vOnQgF5"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>