+++
categories = ["Alibaba Cloud", "オープンソース", "YAPC", "沖縄"]
date = "2018-03-04T10:16:22+09:00"
description = "YAPC::OkinawaのリジェクトコンでAlibaba Cloudを支えるオープンソースについて話してきました。TengineやRocketMQ、AliSQLなどクラウドサービスの裏側で活用されています。"
draft = false
image = ""
tags = ["Tech"]
title = "Alibaba Cloudを支えるオープンソース。at YAPC::Okinawa リジェクトコン"
author = "mosuke5"
archive = ["2018"]
+++

ブログを書くまでがYAPC。  
ということで、2017年に続き2018年もYAPCの前夜祭にて話してきたので簡単にご報告です。  
ちなみに昨年のトークは[こちら](https://blog.mosuke.tech/entry/2017/07/01/yapc_fukuoka/)。

今年はLT枠ではなく、リジェクトコンということで、本番のエントリーには選ばれなかったが、補欠枠ということで前夜祭で20分の枠をもらって話しました。  
タイトルは「知られざる。Alibaba Cloudを支えるオープンソース」です。
<!--more-->

<iframe src="//www.slideshare.net/slideshow/embed_code/key/4R1gJJFb4rBGNm" width="510" height="420" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px; max-width: 100%;" allowfullscreen> </iframe> <div style="margin-bottom:5px"> <strong> <a href="//www.slideshare.net/mosuke5/alibaba-cloud-89353793" title="知られざる、Alibaba Cloudを支えるオープンソース" target="_blank">知られざる、Alibaba Cloudを支えるオープンソース</a> </strong> from <strong><a href="//www.slideshare.net/mosuke5" target="_blank">Shinya Mori (@mosuke5)</a></strong> </div>

## オープンソース
調べていて面白うなものをピックアップ

- NginxベースWebサーバ：Tengine
  - https://github.com/alibaba/tengine
- MySQL100%互換高速化DBエンジン：AliSQL
  - https://github.com/alibaba/AliSQL
- Redis, Memcache：ApsaraCache
  - https://github.com/alibaba/ApsaraCache
- メッセージブローカー：RocketMQ
  - https://rocketmq.apache.org/
- Java RPCフレームワーク: dubbo
  - https://github.com/alibaba/dubbo
- etcdとかzookeeper的なやつ: tair
  - https://github.com/alibaba/tair
- Dockerオーケストレーション: pouch
  - https://github.com/alibaba/pouch


## 雑談
内容は上のスライドを見てもらうとして、今回YAPCに参加するにあたっての準備や参加しての所感、その後などについて雑談をまとめておきます。

- どうやらスタッフ側もアリババの話はほとんど聞いたことがないので気になっていた様子。嬉しい限り。
- 会場の参加のみんなも、なんとなく話は聞いていた、広告ではみた、なんて人は多かったのでネタとしてはよかったのかなと思う。
- すでにAlibaba Cloudを仕事で使ったりでいろいろ@mosuke5のこと知ってくれている人もいて驚きだった。
- 今回のネタに行き着くには実は結構苦労した
- YAPCで、サービスの紹介はしたくない。宣伝もしたくない。
- 個人的にはAlibaba Cloudの宣伝したいわけではまったくなく、純粋にアリババという企業のテクノロジー的な取り組みを自分でも気になってたから調べていて思いついた。
- AlibabaのGithubレポジトリを片っ端から漁ったのはいまではいい思い出。
- やっぱりYAPCとかのお酒を飲みながらのトークは最高。Perlerじゃないけど。。
- YAPCで沖縄に来たついでにいままでいきたかった竹富島など回ろうと思ってます
- トラディッショナルな沖縄の風景をみたいなと。