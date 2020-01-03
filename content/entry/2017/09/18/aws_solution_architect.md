+++
categories = ["AWS", "資格試験"]
date = "2017-09-18T19:34:21+09:00"
description = "AWSソリューションアーキテクト認定試験（アソシエイト）に合格したので記録しておきます。前回、「英語でAWSソリューションアーキテクト認定の模擬試験を受けてみた」の報告の続きです。"
draft = false
image = ""
tags = ["Tech"]
title = "【合格】AWSソリューションアーキテクト Associate認定試験"
author = "mosuke5"
archive = ["2017"]
+++

こんにちは。もーすけです。  
AWSソリューションアーキテクト認定試験（アソシエイト）に合格したので報告です。前回に、英語で模擬試験を受けた話をブログに書きました。その後に、本試験を受けたというわけです。
模擬試験や英語での試験に関して知りたい方は"[英語でAWSソリューションアーキテクト認定の模擬試験を受けてみた](https://blog.mosuke.tech/entry/2017/08/04/aws_certificate_practice_exam/)"のブログを読んでみてください。

<!--more-->

## 資格の価値について
(この章は資格取得の数年後に追記している内容です)  
まず、AWSソリューションアーキテクトの資格の価値について少し書きたいと思います。
ここのブログにたどり着いている人は、すでに資格をとうろかな？とりたいけどどう勉強したら良いのかな？と考えている人かと思いますが、現場でどう役に立っているかも含めて書きたいと思います。

グローバルのデータとしてAWSの資格保有者のサラリーが高いよ、というのはこちらの[レポート](https://www.globalknowledge.com/us-en/resources/resource-library/articles/top-paying-certifications/)ででています。米国では、いまはGCPが一番のようですが、依然としてAWSもトップに君臨していますし、日本においても非常に役に立つものとなっています。

実際に筆者が仕事をしていく中で感じているのは、**「AWSが顧客との共通プロトコルになる」**ということです。
AWSを使ったシステムを開発・運用している人にとっては、この資格で得られる内容が有意義なことはいうまでもないでしょう。
しかし、たとえばITコンサルタントやAWS以外のクラウドを使っている人、AWS以外も扱っているSierの方たちなどにとっても非常に役に立ちます。
理由は、日本の多くの顧客の中心にはAWSがあり、AWSを中心に会話を進めたり、AWS関連での困りごとは非常に多いからです。
わたしは、Alibaba Cloudという全く違うクラウドを売っていることもありましたし、いまではソフトウェアベンダーでコンサルタントをしていますが、AWSの知識があることで圧倒的に信頼されやすくなり、仕事が取りやすくなるのを実感しています。
ぜひ、少しでも迷っている人は、迷わず資格の取得に挑戦してみてほしいです。

## トレーニング
さて、資格の価値がわかったところで、どうやって勉強していくか見ていきます。まずはトレーニングです。  
個人で受講するのはなかなか難しいのですが、もし機会に恵まれている方ならば、下記2つの公式トレーニングの受講をおすすめします。

### Technical Essentials
このコースには1と2があるのですが、特におすすめなのが2の方です。
1の方は座学で知識を蓄えるためのトレーニングです。AWSの初歩の知識レベルから勉強したい人は1も受けていただくと良いです。  
<a href="https://www.trainocate.co.jp/reference/course_details.aspx?SearchKind=1&SearchText=aws&SearchDate=&CorpFlag=0&CorpNo=&code=AWC0027V&BeforeFlag=1" target="_blank">AWS Technical Essentials 2 ～Amazon Web Services 演習ワークショップ～</a>

なぜこのトレーニングがいいかというと、徹底して「AWSの考え方を学ぶもの」だからです。
AWSのソリューションアーキテクトのアソシエイトの試験は半分は「AWS宗教（考え方）」に即した試験といっても過言ではありません。
Wordpressを題材に、AWSでどう設計すれば良いのか、AWSとして重要なところはなんなのか？ひたすらに演習していきます。
内容は<a href="https://aws.amazon.com/jp/blogs/news/aws-well-architected-whitepaper/" target="_blank">AWS Well-Architected フレームワーク</a>に多くは基づいています。
これが理解できれば、大抵のシステムまでは応用できると考えます。

### Architecting on AWS
続いて、Architecting on AWSもおすすめします。  
3日間と長丁場ではあるのですが、Technical Essentialsに比べて、よりAWS固有のサービスを使った設計について学んでいきます。
かなりスピードが速く、トレーニング中はコピペしてついていくだけになってしまうこともあるので、あとから復習して身につけていくと非常にいいです。

<a href="https://www.trainocate.co.jp/reference/course_details.aspx?SearchKind=1&SearchText=aws&SearchDate=&CorpFlag=0&CorpNo=&code=AWC0006V&BeforeFlag=1" target="_blank">Architecting on AWS</a>

## 自習方法
### Well-Architected フレームワークを理解する
アソシエイトレベルは、<a href="https://aws.amazon.com/jp/blogs/news/aws-well-architected-whitepaper/" target="_blank">AWS Well-Architected フレームワーク</a>が理解できていれば解ける問題が非常に多いです。
まずは、これを熟読して試せる部分は自分で試していくことが非常に重要です。

### 基礎知識の習得
基本的な知識とポイントは下記の書籍で学ぶことができます。重要なところがきちんとまとまっているので薄い本ですがおすすめです。

<div class="amazlet-box" style="margin-bottom:0px;"><div class="amazlet-image" style="float:left;margin:0px 12px 1px 0px;"><a href="http://www.amazon.co.jp/exec/obidos/ASIN/479739739X" ="amazletlink" target="_blank"><img src="https://images-fe.ssl-images-amazon.com/images/I/51DY%2BM37OIL._SL160_.jpg" alt="AWS認定資格試験テキスト AWS認定 ソリューションアーキテクト-アソシエイト" style="border: none;" /></a></div><div class="amazlet-info" style="line-height:120%; margin-bottom: 10px"><div class="amazlet-" style="margin-bottom:10px;line-height:120%"><a href="http://www.amazon.co.jp/exec/obidos/ASIN/479739739X" ="amazletlink" target="_blank">AWS認定資格試験テキスト AWS認定 ソリューションアーキテクト-アソシエイト</a><div class="amazlet-powered-date" style="font-size:80%;margin-top:5px;line-height:120%">posted with amazlet at 20.01.03</div></div><div class="amazlet-detail">NRIネットコム株式会社 佐々木 拓郎 林 晋一郎 金澤 圭 <br />SBクリエイティブ <br />売り上げランキング: 6,772<br /></div><div class="amazlet-sub-info" style="float: left;"><div class="amazlet-link" style="margin-top: 5px"><a href="http://www.amazon.co.jp/exec/obidos/ASIN/479739739X" ="amazletlink" target="_blank">Amazon.co.jpで詳細を見る</a></div></div></div><div class="amazlet-footer" style="clear: left"></div></div>


## 本番試験について
書籍や勉強で得られない、本番試験について書いておきます。
点数アップには繋がりませんが、心構えとして参考になるかと思います。

- 本番の試験は、各地のテストセンター（PC教室など）で行われています
- 土日の試験の予約はかなり埋まっているので、はやめの予約をおすすめします
- 試験を受ける端末にはカメラが付いていて、遠隔で監視されています
- 試験中は試験官とのチャットも可能です
    - ぼくだけかもしれないが、日本語が打てず英語でやり取りすることになりました笑
- 試験中に腕を組んでいたら「手はデスクの上においてください」と指示をもらいました。きびしいです
- 試験を受ける前に本人確認があり、免許証などの本人確認ができるものとクレジットカードなどもう１つ証明できるものの用意が必要です
- 免許証は端末に備え付けのスキャナにかざすと情報が試験官側に送付されました
- 模擬試験よりも本番試験のほうが難しく感じました。
    - しかし、実際の点数は模擬試験よりも良かったので、心理的な問題かと思います

## 次のステップに進みたい人へ
また、アソシエイトの次のステップとして、AWSソリューションアーキテクト プロフェッショナルへ進みたいと思っている人は、下記も参考にしてみてください。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2018/11/08/aws-sa-pro/" data-iframely-url="//cdn.iframe.ly/7sHKb2q"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>