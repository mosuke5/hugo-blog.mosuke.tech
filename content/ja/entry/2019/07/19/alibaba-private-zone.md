+++
categories = ["Alibaba Cloud"]
date = "2019-07-19T18:24:08+09:00"
description = "Alibaba CloudのPrivateZoneというVPC内での名前解決の機能について確認してみました。CENとの組み合わせで日中間での名前解決ができるようになることは非常にいい進化と感じています。"
draft = false
image = ""
tags = ["Tech"]
title = "Alibaba CloudでのPrivate DNS(PrivateZone)の仕様と用途の解説"
author = "mosuke5"
archive = ["2019"]
+++

お疲れ様です。mosuke5です。  
Alibaba Cloudのプライベートの名前解決機能である、<a href="https://www.alibabacloud.com/products/private-zone" target="_bkank">PrivateZone</a>の仕様とその用途について解説していきます。

## PrivateZoneとは
Alibaba CloudにはDNSのサービスがあり、インターネットからのアクセスに対しては昔から名前解決をすることができました。
しかし、VPC内部でだけ使うプライベートアドレスに対しての名前解決については今までできませんでした。
PrivateZoneは、VPC内部だけで使えるDNSです。
この機能により、VPC内部でのシステム間の連携やサーバ管理などが楽になります。
<!--more-->

## 名前解決のパターン検証
使い方は簡単なので、本ブログでは使い方の説明はしません。
確認したことをベースに書き残していきます。

まずはZoneを作ります。プライベートの空間なのでZoneの名前は適当に"mosuke.local"としました。  
作成したZoneはVPCとBind（紐づけ）することができます。紐づけたVPCからのみ名前解決ができるようになります。
ちなみに、複数のVPCと紐付けることができますので、異なるVPC間での名前解決も可能です。
これは、日中をつなぐ構成にはいいですね。

### ECSの名前解決
まずは、紐づけしたVPCの中にECSを1台立てます。  
そのECSのプライベートIPアドレスをAレコードとして登録します。
設定は以上です。  
AWSのRoute53のプライベートDNSとは違って、VPC側の設定などは特に必要ありません。

```
aaaa.mosuke.local  A 192.168.1.205 
```

作成したECSにログインして、確認してみます。
ECS側もとくに設定はいじる必要はありません。  
しっかりプライベートアドレスで名前解決ができていることが確認できました。

```
# dig aaaa.mosuke.local

; <<>> DiG 9.9.4-RedHat-9.9.4-74.1.al7.1 <<>> test.mosuke.local
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 21240
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
;; QUESTION SECTION:
;test.mosuke.local.		IN	A

;; ANSWER SECTION:
test.mosuke.local.	60	IN	A	192.168.1.205

;; Query time: 67 msec
;; SERVER: 100.100.2.136#53(100.100.2.136)
;; WHEN: 金  7月 19 13:25:04 CST 2019
;; MSG SIZE  rcvd: 62
```

### ワイルドカードでの名前解決
わけあってワイルドカードでの名前解決も確認しました。
下記のとおり、レコードを登録。

```
*.apps.mosuke.local A 192.168.1.205 
```

*の部分がなんであっても`192.168.1.205`を返す想定です。
`a.apps.mosuke.local`と`ab.apps.mosuke.local`を試してみますが、期待通りでした。

```
# dig a.apps.mosuke.local

; <<>> DiG 9.9.4-RedHat-9.9.4-74.1.al7.1 <<>> a.apps.mosuke.local
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 55367
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
;; QUESTION SECTION:
;a.apps.mosuke.local.		IN	A

;; ANSWER SECTION:
a.apps.mosuke.local.	60	IN	A	192.168.1.205

;; Query time: 84 msec
;; SERVER: 100.100.2.136#53(100.100.2.136)
;; WHEN: 金  7月 19 13:25:45 CST 2019
;; MSG SIZE  rcvd: 64


# dig ab.apps.mosuke.local

; <<>> DiG 9.9.4-RedHat-9.9.4-74.1.al7.1 <<>> ab.apps.mosuke.local
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 38492
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
;; QUESTION SECTION:
;ab.apps.mosuke.local.		IN	A

;; ANSWER SECTION:
ab.apps.mosuke.local.	60	IN	A	192.168.1.205

;; Query time: 110 msec
;; SERVER: 100.100.2.136#53(100.100.2.136)
;; WHEN: 金  7月 19 13:25:47 CST 2019
;; MSG SIZE  rcvd: 65

```

### RDSなどのマネージドサービスの名前解決
ECSだけではなく、RDSなどのマネージドサービスでエンドポイントを持つものにも役に立ちます。
RDSを１つ構築して、そのエンドポイントをCNAMEとして登録しました。

```
db.mosuke.local  CNAME  rm-0iwmm56ph2qe2v9n6.mysql.japan.rds.aliyuncs.com
```

接続するときに、`db.mosuke.local`と任意のものを指定できるようになったのはいいですね。  
DBの入れ替えなど発生してもアプリケーション側で変更がいらないです。

```
# dig db.mosuke.local

; <<>> DiG 9.9.4-RedHat-9.9.4-74.1.al7.1 <<>> db.mosuke.local
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 18478
;; flags: qr rd ra; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
;; QUESTION SECTION:
;db.mosuke.local.		IN	A

;; ANSWER SECTION:
db.mosuke.local.	60	IN	CNAME	rm-0iwmm56ph2qe2v9n6.mysql.japan.rds.aliyuncs.com.
rm-0iwmm56ph2qe2v9n6.mysql.japan.rds.aliyuncs.com. 60 IN A 192.168.1.206

;; Query time: 69 msec
;; SERVER: 100.100.2.136#53(100.100.2.136)
;; WHEN: 金  7月 19 18:07:49 CST 2019
;; MSG SIZE  rcvd: 123

# mysql -u root -p -h db.mosuke.local
Enter password:
Welcome to the MariaDB monitor.  Commands end with ; or \g.
Your MySQL connection id is 62
Server version: 5.7.25-log Source distribution

Copyright (c) 2000, 2018, Oracle, MariaDB Corporation Ab and others.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

MySQL [(none)]>
```

### VPC間の名前解決
続いて、VPC間です。  
Alibaba CloudではCENといったプロダクトで日本と中国のリージョンのVPCをプライベートネットワークで結ぶのは定石です。
こちらの構成でも非常に役に立ちます。今回は同じリージョン内のもう１つのVPCとしましたが同じことが国際間でもできます。

#### 概要図
![cen-ping](/image/alibaba-cen-ping.png)

#### CENの設定
![cen-setting](/image/alibaba-cen-setting.png)

#### 結果
VPC BのインスタンスからVPC AのインスタンスとVPC A内のRDSに対して疎通確認を行いました。
期待通りの結果です。

```
# ping aaaa.mosuke.local
PING aaaa.mosuke.local (192.168.1.205) 56(84) bytes of data.
64 bytes from 192.168.1.205 (192.168.1.205): icmp_seq=1 ttl=64 time=0.367 ms
64 bytes from 192.168.1.205 (192.168.1.205): icmp_seq=2 ttl=64 time=0.282 ms
^C
--- aaaa.mosuke.local ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1001ms
rtt min/avg/max/mdev = 0.282/0.324/0.367/0.046 ms
#
#
# ping db.mosuke.local
PING rm-0iwmm56ph2qe2v9n6.mysql.japan.rds.aliyuncs.com (192.168.1.206) 56(84) bytes of data.
64 bytes from 192.168.1.206 (192.168.1.206): icmp_seq=1 ttl=102 time=0.162 ms
64 bytes from 192.168.1.206 (192.168.1.206): icmp_seq=2 ttl=102 time=0.189 ms
64 bytes from 192.168.1.206 (192.168.1.206): icmp_seq=3 ttl=102 time=0.172 ms
^C
--- rm-0iwmm56ph2qe2v9n6.mysql.japan.rds.aliyuncs.com ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2019ms
rtt min/avg/max/mdev = 0.162/0.174/0.189/0.015 ms
```

## まとめ
Alibaba CloudにできたPrivateZoneを試してみました。
確認した限り、必要なことはおおむねできそうでよいです。
とくに、Alibaba Cloudの最大のユースケースである、日中間で利用した際の通信でDNSを使えるのでなかなかいい進化ではないかと思っています。
