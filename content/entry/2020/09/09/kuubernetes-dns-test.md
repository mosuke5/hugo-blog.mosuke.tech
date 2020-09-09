+++
categories = ["Kubernetes"]
date = "2020-09-09T17:45:05+09:00"
description = "KubernetesのPod内でどのように名前解決されるのか検証して確かめてみました。tcpdumpなどを活用しながら確認していくことでより実践的なトラブルシューティングに役立てる知見を得ることができました。"
draft = true
image = ""
tags = ["Tech"]
title = "KubernetesのPod内からの名前解決を検証する"
author = "mosuke5"
archive = ["2020"]
+++

もーすけです。本日は最近おこなったトラブルシューティングの中で、自分がKubernetesのDNSまわりについて理解が乏しく手こずっていたのでその内容について簡単に書いていきたいと思います。

## 前提
これからcurlをhttpサーバに打ったり、digを行ったりしますが、Kubernetes内の下記のような環境で行ってます。

![overview](/image/kubernetes-dns-test-overview.png)

<!--more-->

## KubernetesのServiceへのアクセス
Serviceへは `service.namespace.svc.cluster.local` で名前解決ができ、アクセスできます。
こちらは基礎的なことなので知っている方も多いかと思います。もし知らなかったという方は、デバッグに非常に役立ちますのでぜひ理解しておくといいです。
(公式ドキュメント: {{< external_link url="https://kubernetes.io/ja/docs/concepts/services-networking/dns-pod-service/" title="ServiceとPodに対するDNS - Kubernetes" >}})

```
# curl -I http://httpd-example.mosuke5.svc.cluster.local:8080
HTTP/1.1 200 OK
Date: Wed, 09 Sep 2020 08:59:19 GMT
Server: Apache/2.4.34 (Red Hat) OpenSSL/1.0.2k-fips
Last-Modified: Wed, 09 Sep 2020 04:45:46 GMT
ETag: "924b-5aeda1ff7f280"
Accept-Ranges: bytes
Content-Length: 37451
Content-Type: text/html; charset=UTF-8
```

## resolv.conf
PodはどこのDNSサーバを利用して通信できているのでしょうか。
Pod内の `/etc/resolv.conf` をのぞいてみます。
(この時点ではPodの`spec.dnsPolicy`は何も記述しないものとしています。)

```
# cat /etc/resolv.conf
search mosuke5.svc.cluster.local svc.cluster.local cluster.local ap-southeast-1.compute.internal
nameserver 172.30.0.10
options ndots:5
```

`nameserver 172.30.0.10` となっていますが、Kubernetes内に存在するcoreDNSのServiceのIPアドレスです。
クラスタ内部のDNS問い合わせにいっていることがわかります。

```
$ kubeclt get service
NAME          TYPE        CLUSTER-IP    EXTERNAL-IP   PORT(S)                  AGE
dns-default   ClusterIP   172.30.0.10   <none>        53/UDP,53/TCP,9153/TCP   26h
```

`search` をみると、`mosuke5.svc.cluster.local svc.cluster.local cluster.local ap-southeast-1.compute.internal` と複数ドメインが記述されています。クラスタの環境にもよると思いますが、この環境はAWSのEC2上のクラスタのためAWSのインターナルのドメインも含めて4つの記述があります。  

上の設定があることで、必ずしも `httpd-example.mosuke5.svc.cluster.local` のようにフルの名前でなくてもアクセスが可能ということになります。
試しに`Service名`と`Service名.Namespace名`で接続を試みますが接続可能です。

```
# curl -I httpd-example:8080
HTTP/1.1 200 OK
Date: Wed, 09 Sep 2020 09:16:42 GMT
Server: Apache/2.4.34 (Red Hat) OpenSSL/1.0.2k-fips
Last-Modified: Wed, 09 Sep 2020 04:45:46 GMT
ETag: "924b-5aeda1ff7f280"
Accept-Ranges: bytes
Content-Length: 37451
Content-Type: text/html; charset=UTF-8

# curl -I httpd-example.mosuke5:8080
HTTP/1.1 200 OK
Date: Wed, 09 Sep 2020 09:16:50 GMT
Server: Apache/2.4.34 (Red Hat) OpenSSL/1.0.2k-fips
Last-Modified: Wed, 09 Sep 2020 04:45:46 GMT
ETag: "924b-5aeda1ff7f280"
Accept-Ranges: bytes
Content-Length: 37451
Content-Type: text/html; charset=UTF-8
```

## digやnslookupを使う
上の例では、curlでServiceに対して接続しにいきました。その過程で名前解決もされていました。  
現実のトラブルシューティングでは、digやnslookupを用いてIPアドレスを確認したいことも多くあると思います。
実際に、digやnslookupを使ってIPアドレスを引いてみたいと思います。

しかし、digでなんのオプションもなしに実行してみましたがAレコードが返ってきません。
ちなみにnslookupでは、アドレスは正しくひけています。これはなぜでしょうか？

```
# dig httpd-example

; <<>> DiG 9.11.22-RedHat-9.11.22-1.fc32 <<>> httpd-example
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 33678
;; flags: qr rd ra; QUERY: 1, ANSWER: 0, AUTHORITY: 1, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
; COOKIE: 668ad3bad60bfc44 (echoed)
;; QUESTION SECTION:
;httpd-example.			IN	A

;; AUTHORITY SECTION:
.			30	IN	SOA	a.root-servers.net. nstld.verisign-grs.com. 2020090900 1800 900 604800 86400

;; Query time: 74 msec
;; SERVER: 172.30.0.10#53(172.30.0.10)
;; WHEN: Wed Sep 09 09:18:18 UTC 2020
;; MSG SIZE  rcvd: 129
```

```
# nslookup httpd-example
Server:		172.30.0.10
Address:	172.30.0.10#53

Name:	httpd-example.mosuke5.svc.cluster.local
Address: 172.30.147.209
```

こちらはKubernetesの話ではまったくありませんが、digはオプションをつけない状態では、`/etc/resolv.conf`のsearchは読んでいません。
digを使ってアドレスをひくときは、`httpd-example.mosuke5.svc.cluster.local`とフルの名前を用いるか、`+search` オプションをつけて、`/etc/resolv.conf`から設定を使うようにするといいです。

```
# dig httpd-example +search
...
;; ANSWER SECTION:
httpd-example.mosuke5.svc.cluster.local. 5 IN A	172.30.147.209
...
```

## tcpdumpで詳細をみてみる
pod内でtcpdumpを起動してみてみます。

```
# tcpdump port 53
...
```

tcpdumpを起動した状態で、`dig google.com +search` を実行してみます。
そうするとおもしろいことがおきます。
下記の通り、5つのクエリを発行して `google.com` のアドレスにたどり着けていることがわかります。

1. `google.com.mosuke5.svc.cluster.local.`
1. `google.com.svc.cluster.local.`
1. `google.com.cluster.local.`
1. `google.com.ap-southeast-1.compute.internal.`
1. `google.com.`

以下はdigを実行した際のtcpdumpのログです。
```
10:13:38.113836 IP debug.55582 > dns-default.openshift-dns.svc.cluster.local.domain: 501+ [1au] A? google.com.mosuke5.svc.cluster.local. (77)
10:13:38.115079 IP dns-default.openshift-dns.svc.cluster.local.domain > debug.55582: 501 NXDomain*- 0/1/1 (170)
10:13:38.115350 IP debug.49587 > dns-default.openshift-dns.svc.cluster.local.domain: 15110+ [1au] A? google.com.svc.cluster.local. (69)
10:13:38.115815 IP dns-default.openshift-dns.svc.cluster.local.domain > debug.49587: 15110 NXDomain*- 0/1/1 (162)
10:13:38.116056 IP debug.56245 > dns-default.openshift-dns.svc.cluster.local.domain: 52411+ [1au] A? google.com.cluster.local. (65)
10:13:38.117719 IP dns-default.openshift-dns.svc.cluster.local.domain > debug.56245: 52411 NXDomain*- 0/1/1 (158)
10:13:38.117958 IP debug.44526 > dns-default.openshift-dns.svc.cluster.local.domain: 49759+ [1au] A? google.com.ap-southeast-1.compute.internal. (83)
10:13:38.119446 IP dns-default.openshift-dns.svc.cluster.local.domain > debug.44526: 49759 NXDomain 0/0/1 (83)
10:13:38.119649 IP debug.56412 > dns-default.openshift-dns.svc.cluster.local.domain: 54109+ [1au] A? google.com. (51)
10:13:38.121954 IP dns-default.openshift-dns.svc.cluster.local.domain > debug.56412: 54109 6/0/1 A 74.125.68.102, A 74.125.68.138, A 74.125.68.100, A 74.125.68.101, A 74.125.68.139, A 74.125.68.113 (207)
```

この現象は、`/etc/resolv.conf`に`options ndots:5`の設定があることと関係しています。  
上でservice名だけで名前がひけたように、`search` に記載されたドメインで検索をかけにいくということです。もし仮に、`google.com.svc.cluster.local`などでレコードが登録されていた場合、こちらが優先されるため、本物の`google.com`へはアクセスできなくなるということです。

## dnsの設定を変える
前の項目で紹介したように、Podから外部接続する際にクラスタ内のドメインを再帰的に検索したりするのは効率が悪いです。あるいは、別のDNSサーバを利用したいこともあります。
このようなケースでは、Podには`spec.dnsPolicy`という設定があり、こちらを利用することでコントロールができます。(公式ドキュメント: {{< external_link url="https://kubernetes.io/ja/docs/concepts/services-networking/dns-pod-service/#pod%E3%81%AEdns%E3%83%9D%E3%83%AA%E3%82%B7%E3%83%BC" title="PodのDNSポリシー" >}})

本ブログでは詳しくは紹介しませんが、DNS設定を変更したいときはまず `spec.dnsPolicy` の設定を検討してみてください。詳細な設定についてはぜひわれわれのバイブルである完全ガイド様におまかせします。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://www.amazon.co.jp/Kubernetes%25E5%25AE%258C%25E5%2585%25A8%25E3%2582%25AC%25E3%2582%25A4%25E3%2583%2589-%25E7%25AC%25AC2%25E7%2589%2588-Top-Gear-%25E2%25BB%2598%25E2%25BC%25AD/dp/4295009792" data-iframely-url="//cdn.iframe.ly/o1xk9gJ?iframe=card-small"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>