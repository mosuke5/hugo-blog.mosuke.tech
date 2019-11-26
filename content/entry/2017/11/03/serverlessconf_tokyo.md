+++
categories = ["イベント", "クラウド技術"]
date = "2017-11-03T11:01:52+09:00"
description = "Serverlessconf Tokyo2017に参加してきたのでレポート。2016年との違いを多く感じたし、Terraformのようなツールの重要性増しそうなど個人的な見解も広がった素晴らしいイベントでした。"
draft = false
image = ""
tags = ["Tech"]
title = "今年も、Serverlessconf Tokyo(2017)に参加してきた"
author = "mosuke5"
archive = ["2017"]
+++

去年に引き続き、[Serverlessconf Tokyo](http://tokyo.serverlessconf.io/)に参加してきたので簡単ですが報告です。  
予定があって途中までしかいられずちょっとした感想です。

サーバレスってなんだっけという復習はぜひ去年のブログをみてください。  
タイトルはふざけていますがまじめに書いてますよ笑

昨年の参加ブログ：「[三葉よ、サーバーレス、それもまた結び。](https://blog.mosuke.tech/entry/2016/10/02/212420/)」

<!--more-->

## ServerlessConf Tokyo2017
Serverlessconf Tokyoですが、  
コーヒー飲めて、ドーナツも食べれて、Tシャツもたくさんゲットできて最高です笑
<blockquote class="twitter-tweet" data-lang="ja"><p lang="ja" dir="ltr">去年に続き <a href="https://twitter.com/hashtag/serverlessconf?src=hash&amp;ref_src=twsrc%5Etfw">#serverlessconf</a> に参加。コーヒーもドーナツもあって最高 (@ ベルサール飯田橋ファースト in 文京区, 東京都) <a href="https://t.co/ZNjzhkEb4W">https://t.co/ZNjzhkEb4W</a> <a href="https://t.co/SE2VGr7Znp">pic.twitter.com/SE2VGr7Znp</a></p>&mdash; もーすけ (@mosuke5) <a href="https://twitter.com/mosuke5/status/926267082735538177?ref_src=twsrc%5Etfw">2017年11月3日</a></blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

<blockquote class="twitter-tweet" data-lang="ja"><p lang="en" dir="ltr">nice to meet you for a consecutive year! <a href="https://t.co/KQTSMqzGWX">pic.twitter.com/KQTSMqzGWX</a></p>&mdash; Wayland Zhang (@WaylandZhang) <a href="https://twitter.com/WaylandZhang/status/926320073416908801?ref_src=twsrc%5Etfw">2017年11月3日</a></blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

## サーバレスに関する認識
去年はおもしろくって、そもそもサーバレスの定義的なところでの話題（Twitter上でのやりとり）が多かったです。
サーバレスとはFaaSのことなのか、SaaSはサーバレスなのか？という割とどうでもいいのだがそういうところも認識があっていなくて論争していましたね。懐かしい。  
ここ1年でクラウドプロバイダーは例えばAmazon S3のようなサーバを意識しないサービスもサーバレスコンポーネントの１つとして押し出しているし、FaaSはサーバレスな「コンピューティング」というあくまでその一部としての位置づけです。とはいえ、FaaS的なところが真新しいのでここにフォーカスされるのがこのServerlessconfといったところで落ち着いていたようにみえる。

## 圧倒的に事例が増えた
なによりも今年は「事例」がとても多くなってきていました。1年経ったのであたりまえではあるのですが、去年の時点では目立った事例としては日経新聞社さんの事例くらいでした。しかし、日経新聞社の例のバッチ処理の代替としての事例はもちろん、それ以外の部分での適応についても多く出てきていたのが特徴的だった。

FaaSの特徴は何と言っても「イベントドリブン」で実行されるということです。
その特徴を活かして、突然のピークにも対応する例があった。もちろんクラウドにはAutoScalingという考え方でピークトラフィックに対応することが一般的です。しかし、AutoScalingは一般的にサーバ負荷のアラートをトリガーに仮想サーバを増やして対応します。そのため、突発的な負荷への対応には向いていなかったりします。
そこでFaaSの出番というわけです。FaaSの起動から実行までの時間はとても短く、並列性が強いです。なので、突発的な負荷への対応も可能です。さらにデータベース側でもそのようなスケールに耐えられるようにAzureの例で言えばCosmosDBのような製品がでてきたというはなしもありました。

## Terraformの重要性が増す
個人的な意見なのですが、今回のいくつかのセッションを聞いて、色んな人と話して思ったことがあります。それは、Terraformのようなクラウドプラットフォーム上の構成管理ツールの重要性が今まで以上に増してくるかなってことです。もちろん、いままでも十分Terraform的な存在は重要でしたが、FaaSはクラウドプラットフォームとの結びつきがとても強く、いろんなサービスと連携する必要があります。そのあたりの価値はますます高くなるかもしれません。

## おまけ
Serverlessとかどうとか関係ない部分で。  
昨年から開催されたServerlessconfですが、去年参加したときはまだぼくはクラウドプロバイダーへ移ったばかりで話題のサーバレスがどんなふうに捉えられ、どんなふうに利用されているか興味あってたまたま行きました。  
それから、このクラウド界隈で仕事やイベントに参加していくその中で出会った人たちが、このServerlessConfの主催者であったり、ブースにいたり、登壇したりしたいた。特に、去年ブースであったMobingiというスタートアップの人たちはいまも一緒に仕事したりしている。  
去年、飛び込んだこの界隈ですが、1年経つと人脈面でも大きく変化していてイベントに行くことそのものが楽しみになっている自分がいて不思議です。

MSの牛尾さんの発表も聞きました。今年からマイクロソフトのエバンジェリストの評価基準が変わったと聞いています。プレゼンやデモによる顧客満足の向上ではなく、エバンジェリスト自身もコードをお客様と書いたりして問題解決していくようになったと。とくにアメリカではそのように変わりつつ有るようです。MSの牛尾さんもいまはソフトウェアエンジニアとして活動しながら仕事しているようですが、自らの経験を自らのことはで語っている感じはとてもよかったです。エバンジェリストではありませんが、似たようなポジションの人間としてこれは心揺さぶられる感覚がありました。

## 最後に
Serverlessconf Tokyoを主催してくれた吉田さん、スタッフ、スポンサーなどにまず感謝です。
また来年も開催されるならば参加したいし、発表やブースの立場で参加できたらなんていう思いもあります。

では、みんなも来年はでようね！