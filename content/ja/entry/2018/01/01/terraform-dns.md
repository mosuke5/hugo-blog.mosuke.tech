+++
categories = ["AWS", "DevOps"]
date = "2018-01-01T07:34:20Z"
description = "TerraformでCloudFlareのDNSの設定を行います。AWSのEIPを使ってCloudFlareのDNSを設定します。その際の設定のポイントなどを解説します。"
draft = false
image = ""
tags = ["Tech"]
title = "TerraformでCloudFlareのDNS設定を操る"
author = "mosuke5"
archive = ["2018"]
+++

あけましておめでとうございます。今年も本ブログおよびmosuke5をよろしくお願いします。  
新年元旦のブログなので軽く。年末年始は普段できない開発をやっていて、そこでできたちょっとしたメモを。

趣味で作っているサービスで、基盤はAWSを利用し、CloudFlareも利用したい理由もありDNSの設定などはRoute53ではなくCloudFlareで制御する必要があった。複数のサービスをまたいで設定を管理できるTerraformの出番なわけだが、その設定方法についてメモしておく。
<!--more-->

## 設定方法
まずはAWS側の設定を見ておく。  
今回はELB使うわけではなかったので、EC2インスタンスにElasticIPをバインドした。
aws側のTerraformのコードでいつも通りEIPを購入する。

```
# aws.tf
resource "aws_eip" "main" {
  instance = "${aws_instance.main.id}"
  vpc      = true
}
```

次に、CloudFlare側のコードをみる。  
CloudFlareをTerraformで扱うには３つの情報が必要なのでここは変数化しておくとよい。  
providerを指定し、あとはresouceを書いていく。

```
# cloudflare.tf
variable "cloudflare_email" {}
variable "cloudflare_token" {}
variable "cloudflare_domain" {}

provider "cloudflare" {
  email = "${var.cloudflare_email}"
  token = "${var.cloudflare_token}"
}

resource "cloudflare_record" "gill-search-manage" {
  domain = "${var.cloudflare_domain}"
  name   = "gill-search-manage"
  value  = "${aws_eip.main.public_ip}"
  type   = "A"
  ttl    = 1
  proxied = false
}

resource "cloudflare_record" "gill-search" {
  domain = "${var.cloudflare_domain}"
  name   = "gill-search"
  value  = "${aws_eip.main.public_ip}"
  type   = "A"
  ttl    = 1
  proxied = true
}
```

- `domain`はCloudFlareで管理しているドメイン名を入力。今回の場合は`mosuke.tech`を管理しているのでそれを入力。
- `name`は今回Aレコードなのでサブドメインに当たる部分。
- `value`は実際にIPアドレス。なので今回はAWS EIPの値が入る。`${aws_eip.main.public_ip}`
- `type`はAレコードなりCNAMEなり。
- `ttl`は名前の通り、TTLの値。１にすると、CloudFlareの設定で言うAutomaticになる。
- `proxied`はCloudFlareの仕組みによるもの。次に説明する。

## CloudFlareのDNS
設定すると下記のようになるのだが、右側のオレンジやグレーの雲マークが注目だ。  
![cloudflare_proxy](/image/cloudflare_dns.png)

CloudFlareでのDNSは、普通のDNSとちがってProxyの設定のON/OFFが必要だ。なぜなら、もともとCloudFlareはHTTP Proxyであり、それによってキャッシュしたりセキュリティを高めたりするものだからだ。
なので、例えばSSHで接続などHTTPプロトコル以外を通そうとするとCloudFlareが邪魔になる。
そのため、サービスで利用するHTTP用のアクセスルートと管理で利用するSSH用のアクセスルートを分けておくといい。

![cloudflare_proxy](/image/cloudflare_proxy.png)