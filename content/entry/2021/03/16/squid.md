+++
categories = ["インフラ構築"]
date = "2021-03-16T19:05:38+09:00"
description = "プロキシソフトウェアで有名なsquidのインストール方法と簡単な設定について説明します。"
draft = false
image = ""
tags = ["Tech"]
title = "squidを使ってプロキシ環境の再現検証に活用する"
author = "mosuke5"
archive = ["2021"]
+++

こんにちは、もーすけです。  
squidを使った検証は年に1回くらいは出てくるのですが、やるたびに忘れるのでメモします。
ちなみに、squidを使う理由としてはいろいろなのですが、だいたい以下のような理由です。

1. 顧客のシステムを使う際にIPアドレス制限がかかっており、特定のサーバからアクセスさせたい
1. 顧客のネットワーク環境ではプロキシを利用しており、それゆえに環境を再現するためにプロキシを立てたい
1. システムにアクセスするのにクラウドのリージョン間専用線を通して接続したい
<!--more-->

## squidのインストールと動作確認
まず、本検証環境はAWS EC2上のRHEL8です。

```
$ cat /etc/redhat-release
Red Hat Enterprise Linux release 8.3 (Ootpa)
```

インストールして起動します。
```
$ sudo dnf install -y squid
...
Complete!

$ sudo systemctl start squid
$ sudo systemctl enable squid
$ sudo systemctl status squid
● squid.service - Squid caching proxy
   Loaded: loaded (/usr/lib/systemd/system/squid.service; enabled; vendor preset: disabled)
   Active: active (running) since Tue 2021-03-16 10:02:08 UTC; 10min ago
     Docs: man:squid(8)
  Process: 15518 ExecStartPre=/usr/libexec/squid/cache_swap.sh (code=exited, status=0/SUCCESS)
 Main PID: 15525 (squid)
    Tasks: 3 (limit: 4836)
   Memory: 16.0M
   CGroup: /system.slice/squid.service
           ├─15525 /usr/sbin/squid --foreground -f /etc/squid/squid.conf
           ├─15528 (squid-1) --kid squid-1 --foreground -f /etc/squid/squid.conf
           └─15529 (logfile-daemon) /var/log/squid/access.log
...
```

squidのバージョンは4.11です。
```
$ squid -v
Squid Cache: Version 4.11
Service Name: squid

This binary uses OpenSSL 1.1.1g FIPS  21 Apr 2020. For legal restrictions on distribution see https://www.openssl.org/source/license.html
```

起動後、squidを使ってプロキシできるか簡単に確認します。  
まずは、ポートの利用確認です。lsofを利用して、対象ポートを利用しているか確認します。
デフォルトでは `3128` ポートを使います。

```
$ sudo dnf install -y lsof
$ sudo lsof -i:3128
COMMAND   PID  USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
squid   15528 squid   13u  IPv6  46287      0t0  TCP *:squid (LISTEN)
```

squidのサーバ内から、プロキシ経由でサイトにアクセスできるか確認します。
`curl -I https://blog.mosuke.tech -x http://localhost:3128`のレスポンスが返ってきており、ログで`TCP_TUNNEL/200`と出ているので問題なさそうです。

```
$ curl -I https://blog.mosuke.tech -x http://localhost:3128
HTTP/1.1 200 Connection established

HTTP/2 200
date: Tue, 16 Mar 2021 10:15:34 GMT
content-type: text/html; charset=utf-8
set-cookie: __cfduid=dd67f1a3e156c6fd95e6d4d5c661341a21615889734; expires=Thu, 15-Apr-21 10:15:34 GMT; path=/; domain=.mosuke.tech; HttpOnly; SameSite=Lax; Secure
last-modified: Sun, 14 Mar 2021 04:39:32 GMT
vary: Accept-Encoding
access-control-allow-origin: *
expires: Sun, 14 Mar 2021 04:54:54 GMT
...

$ sudo tail -f /var/log/squid/access.log
...
1615889656.008    155 ::1 TCP_TUNNEL/200 35651 CONNECT blog.mosuke.tech:443 - HIER_DIRECT/172.67.165.72 -
```

## 外部からのプロキシ利用
ひとつ前のセクションでは、squidサーバから自身のプロキシポートを指定してcurlを実行しました。  
たとえば、おつかいのPCなどsquidサーバ以外から実施してみてください。おそらく以下のようなエラーになるのではないかと思います。
※そもそもナニもレスポンスが返ってこない人は、AWSのセキュリティグループなどFWの設定を見直しましょう。

```
local-pc $ curl -I https://blog.mosuke/tech -x http://<squid-global-ip>:3128
HTTP/1.1 403 Forbidden
Server: squid/4.11
Mime-Version: 1.0
Date: Tue, 16 Mar 2021 12:43:31 GMT
Content-Type: text/html;charset=utf-8
Content-Length: 3588
X-Squid-Error: ERR_ACCESS_DENIED 0
Vary: Accept-Language
Content-Language: en
X-Cache: MISS from ip-192-168-1-54.ap-northeast-1.compute.internal
X-Cache-Lookup: NONE from ip-192-168-1-54.ap-northeast-1.compute.internal:3128
Via: 1.1 ip-192-168-1-54.ap-northeast-1.compute.internal (squid/4.11)
Connection: keep-alive
```

これは、squidのデフォルトの設定が、プライベートネットワークなど一部のIPからのみプロキシするように設定されているからです。
以下はデフォルト設定の一部を切り出したものですが、`0.0.0.1-0.255.255.255`や`10.0.0.0/8`などが`localnet`というグルーピングがされており、`localnet`のみが`http_access allow`に記述されているからです。

```
acl localnet src 0.0.0.1-0.255.255.255  # RFC 1122 "this" network (LAN)
acl localnet src 10.0.0.0/8             # RFC 1918 local private network (LAN)
acl localnet src 100.64.0.0/10          # RFC 6598 shared address space (CGN)
acl localnet src 169.254.0.0/16         # RFC 3927 link-local (directly plugged) machines
acl localnet src 172.16.0.0/12          # RFC 1918 local private network (LAN)
acl localnet src 192.168.0.0/16         # RFC 1918 local private network (LAN)
acl localnet src fc00::/7               # RFC 4193 local private network range
acl localnet src fe80::/10              # RFC 4291 link-local (directly plugged) machines
...
...
http_access allow localnet
```

もし外部ネットワークからのプロキシを許可したい場合は以下のように追加して、squidを再起動しましょう。

```
# /etc/squid/squid.conf
acl myhome src xx.xx.xx.xx/24

http_access allow myhome
```

```
$ sudo systemctl restart squid
```

## まとめ
簡単ですが、squidのインストール方法と簡単な設定方法を見てきました。いつも忘れてしまうため未来の自分および同じような境遇のひとの役に立てばと思います。プロキシ環境をさっと建てられるように準備しておくと、再現検証などに非常に役に立ちます。
いちどは自分の手で構築して感覚を掴んでおくと良いでしょう。