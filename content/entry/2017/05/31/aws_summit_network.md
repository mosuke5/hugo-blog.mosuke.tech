+++
archive = ["",""]
author = "mosuke5"
categories = ["",""]
date = "2017-05-31T16:25:20+09:00"
description = ""
draft = true
image = ""
tags = ["",""]
title = ""

+++

# 特徴
物理設計いらない
可用性はすでにセット
　VRRP
プロフラマブル

# サービス
意外とすくないよね。VPCがほぼすべて。
VPC
Direct Connect
Route53

# 前提知識
物理設計はいらないんだけど、
やっぱり物理知っていることがアドバンテージになる。
VPCはリージョンの中。ゾーンまたぐ

専用線
DCの場所は公開していない
じゃどうやって接続するの？
相互接続接続ポイントを用意しているからそこに繋いでね

エッジロケーション
CDNノードやRoute53が動作しているところ
リージョンとはまた別

# 設計をはじめよう
AWSのどのサービスを使いたいかでNWの設計はかわるよ。
VPCの中で使うもの
　EC2とかRDSとかRedshift、EMR
VPCの外で使うもの
　S3、LamdaとかDynamoDB、CloudWatch

VPCと外の接続
　専用線orインターネットVPNorパブリック(ssh/https)
VPCがない場合
　httpsでまかなう場合が多い。
　VPCがなくてもDX使えるよ。DXのパブリック接続

Route53は内部のドメインもできるよ。

# プライベートNW設計のステップ
1. VPCの作成
  - VPCのCIDRレンジは変えられないから大きくとっておこう
  - オンプレミスとのレンジも被らないように
1. 