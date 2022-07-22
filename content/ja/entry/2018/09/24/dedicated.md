+++
categories = ["AWS", "Alibaba Cloud", "クラウド技術"]
date = "2018-09-24T16:49:32+09:00"
description = "AWSとAlibaba Cloudででてくる「Dedicated」「専有」の意味を整理します。Dedicated Hostsやハードウェア専有インスタンスなどいろんな意味合いで使われるので混同しがちです。"
draft = false
image = ""
tags = ["Tech"]
title = "AWSとAlibaba Cloudの「Dedicated」インスタンスを整理する"
author = "mosuke5"
archive = ["2018"]
+++

だいぶ久しぶりです。[@mosuke5](https://twitter.com/mosuke5)です。  
どういうわけか、3か月くらいブログの更新ができていませんでした。  
勉強や活動をサボっていたわけではないのですが。。。

最近Alibaba CloudでもBYOLの要求に対応することのできる、Dedicated Host（通称DDH）というサービスをリリースしました。
サービスの仕様を把握するために、いろんなクラウドサービスを調べるのですが、とにかく「Dedicated」という単語がいろんな意味合いで利用され混同しがちです。  
このブログではAWSとAlibaba Cloudででてくる「Dedicated」という言葉について整理したいと思います。
<!--more-->

ややこしいので、先に出てくるサービス・機能を一覧にしておきます。  
それぞれが何者かは順に説明していきます。

- AWS
  1. Dedicated Hosts
  1. Dedicated Instnaces
  1. Bare Metal Instances
- Alibaba Cloud
  1. Dedicated Host(DDH)
  1. Enterprise-level Instance(Dedicated resource)
  1. Bare Metal Instnace(Dedicated hardware resouce)
  1. RDS Dedicated Instnace

## AWSでいうDedicated HostsとDedicated Instances
まず読者の多くがなじみのあるであろうAWSから整理します。  
AWSではEC2の起動方法に「Dedicated Hosts」と「Dedicated Instances（ハードウェア専有インスタンス）」という２つがあります。
この２つの比較については今更自分がまとめるほどもなく下記がわかりやすいので掲載しておきます。

[AWS | Amazon EC2 Dedicated Hosts](https://aws.amazon.com/jp/ec2/dedicated-hosts/)

自分の理解のためにも少し情報を加えてまとめると下記のとおりです。

### AWS: Dedicated Hosts
Dedicated Hostsは、自分専用の物理ホストを購入するイメージです。  
とはいっても物理ホストのサーバを直接いじれるわけではなく、その物理ホスト上に自分のEC2インスタンスを立ち上げることができるというものです。課金体系は、インスタンスではなくその物理ホストに対して支払います。  
こちらの物理ホスト上のEC2インスタンスでは「ソケット、コア、ホスト ID の可視性」があり、いわゆるBYOLの要件を満たすためによく利用されます。

### AWS: Dedicated Instances（ハードウェア専有インスタンス）
Dedicated Instances(日本語名ハードウェア専有インスタンス)は、Dedicated Hostsと同様で自分専用の物理ホストに対してEC2インスタンスを起動できるものです。
しかし、大きく異なる点があります。物理ホストに対してお金を払うわけではなく、あくまでEC2インスタンスに対してお金を払います。  
ここで、疑問に思うことあるでしょう。
この方式のインスタンスは通常のインスタンスよりも若干料金が高いのですが、物理ホストを専有しているわりにはとても安いです。
例えば、低スペックのインスタンスを１つだけ立てた場合でも、物理ホストを専有しているのでAWSとしてとても損をしてしまいそうです。
そのため、「リージョン専用料金」というインスタンスとは別の料金を別途払う必要がある仕組みとなっています。

また、このインスタンスタイプでは、「ソケット、コア。ホストIDの可視性」はありません。  
BYOLのためというよりは、セキュリティ要件で、他社のお客さんとホストを共有したくないときに利用するもの、と認識しておくとよさそうです。

### AWS: Bare Metal Instances
AWSでDidicatedというと上２つが代表的ですがもう１つだけ。  
仮想化層のオーバーヘッドを気にする人やVMWareを動かしたい人のためのベアメタルインスタンスタイプですね。  
https://aws.amazon.com/jp/blogs/news/new-amazon-ec2-bare-metal-instances-with-direct-access-to-hardware/

## Alibaba Cloudでの"Dedicated"
またAlibaba Cloudで英語ドキュメントを読んでいると、いろんな場面で「Dedicated」という言葉がでてきます。
大きく４つの場面ででてきます。

### Alibaba Cloud: Dedicated Host
まず、AWSの「Dedicated Hosts」と同じような用途で利用できる「Dedicated Host(DDH)」というサービスを展開しています。
仮想サーバインスタンスでの下記ではなく、物理ホストに課金をし、その上に仮想サーバを構築できるものです。

サービスについて気になる方は下記から参照ください。
https://jp.alibabacloud.com/product/ddh

### Alibaba Cloud: Enterprise-level Instance 
Alibaba Cloudを調べていて一番勘違いしやすいものが、ECSインスタンスのEnterprise-level Instnaceで使われる「Dedicated Resource」ではないかなと思います。  
Alibaba Cloudの仮想サーバサービスElastic Compute Service(通称 ECS)では、インスタンスのタイプファミリーが、大きく「Enterprise-level Instance」と「Entry-level Instance」の２つに分かれています。  
このEnterprise-level Instanceの説明では「Dedicated Resource」と書かれています。この意味合いがよく勘違いされがちです。

Enterpsise-level Instanceでは、「排他的で安定したコンピューティング、ストレージ、およびネットワークリソースで設計」しているため、パフォーマンスを安定的（Stable）にできるといっています。この意味を英語「Dedicated Resource」と記載されていることがあります。  
物理ホストを専有しているわけでも、ベアメタルインスタンスというわけでもなく、仮想サーバで物理ホストはほかのユーザと共有ですが、利用できるリソースが「専有（Dedicated）」ということを意味しているようです。

「Enterprise-level Instance」と「Entry-level Instance」の違いについては以下参照しましょう。  
https://jp.alibabacloud.com/help/faq-detail/44078.htm

### Alibaba Cloud: Baremetal Instance
Alibaba CloudでもECSインスタンスのタイプファミリーの１つとして、ベアメタルインスタンスを提供しています。  
仮想化層のオーバーヘッドをなくしたい人や、VMWareなどのハイパーバイザーを動かしたい人向けのインスタンスです。
こちらは、名前の通り「ベアメタル」のため、物理サーバレベルで専有されています。  
そのため、英語で「Provides dedicated hardware resources and physical isolation」と書かれることがあります。

Instance type families - Product Introduction  
https://www.alibabacloud.com/help/doc-detail/25378.htm#concept_sx4_lxv_tdb__xn4-n4-mn4-e4

### Alibaba Cloud: RDS Dedicated Instance
データベースのマネージドサービスであるRDSについても仮想サーバと同様にリソースが専有化されたインスタンスを提供しています。(※まだ日本のお客さんに提供できていませんが)

https://www.alibabacloud.com/help/doc-detail/49875.htm

## まとめ
自分は、最近クラウド系のドキュメントを読むときに極力英語で情報を収集しています。
そうするとたくさんの「Dedicated」という意味がでてくることがありますが、それぞれが提供するものは違うこともあります。
「なにがDedicatedなのか？」ここに注意しながら技術キャッチアップをしていきましょう。

最近後にもこちら記載しておきます。

- AWS
  1. Dedicated Hosts
  1. Dedicated Instnaces
  1. Bare Metal Instances
- Alibaba Cloud
  1. Dedicated Host(DDH)
  1. Enterprise-level Instance(Dedicated resource)
  1. Bare Metal Instnace(Dedicated hardware resouce)
  1. RDS Dedicated Instnace