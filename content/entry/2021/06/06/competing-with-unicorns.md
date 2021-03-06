+++
categories = ["DevOps"]
date = "2021-06-06T18:40:35+09:00"
description = "Spotifyのソフトウェアづくりと働き方を書いた「ユニコーン企業のひみつ」を読んでその内容や個人的な考えをまとめました。我々がなにをしなければならないのか、真剣に向き合うヒントとしましょう。"
draft = false
image = ""
tags = ["Tech"]
title = "「ユニコーン企業のひみつ」を読んで、我々はなにをすればいいのだろうか？"
author = "mosuke5"
archive = ["2021"]
+++

こんにちは、もーすけです。  
本日は、2021年4月に発売された「<a href="https://amzn.to/3fTPYyA" target="_blank">ユニコーン企業のひみつ</a>」を読みましたので、書籍の内容や自分なりの考えをまとめてみます。
現代となっては、アメリカのGAFAをはじめとしたテック企業のビジネス脅威を感じないことはないと思います。
彼らに対抗するため、日本企業はどんなふうに戦えばいいのか？そんなヒントになる本です。

この本は発売と同時に多くの方がレビューを書いているので、ぜひ他の人の書評もたくさん読んでみてください。
<!--more-->

## どんな本なのか？
「ユニコーン企業のひみつ」は、作者のJonathan Rasmusson（以下、ジョナサン）がSpotifyにアジャイルコーチ（その後、エンジニアへ転身）としてジョインし、その中で得たソフトウェアづくりと働き方についてまとめた本です。
Spotifyの実体験がもとになっていますが、いわゆるユニコーン企業がどのように組織を作って、プロダクトを生み出しているかを書いています。
Spotifyをはじめ、GoogleやAmazon, Netflixといった企業が、あれほど大きくなりつつも（規模だけで言えばいわゆる大手のエンタープライズよりも大きいこともあるわけですが）、スタートアップのフェーズのときと変わらないスピード感でプロダクトを作り続けるには「それなりの理由」があるということです。その秘密を紐解くものです。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://www.amazon.co.jp/%E3%83%A6%E3%83%8B%E3%82%B3%E3%83%BC%E3%83%B3%E4%BC%81%E6%A5%AD%E3%81%AE%E3%81%B2%E3%81%BF%E3%81%A4-%E2%80%95Spotify%E3%81%A7%E5%AD%A6%E3%82%93%E3%81%A0%E3%82%BD%E3%83%95%E3%83%88%E3%82%A6%E3%82%A7%E3%82%A2%E3%81%A5%E3%81%8F%E3%82%8A%E3%81%A8%E5%83%8D%E3%81%8D%E6%96%B9-Jonathan-Rasmusson/dp/4873119464?__mk_ja_JP=%E3%82%AB%E3%82%BF%E3%82%AB%E3%83%8A&amp;crid=3L8ISAY1VU1CO&amp;dchild=1&amp;keywords=%E3%83%A6%E3%83%8B%E3%82%B3%E3%83%BC%E3%83%B3%E4%BC%81%E6%A5%AD%E3%81%AE%E3%81%B2%E3%81%BF%E3%81%A4&amp;qid=1622983665&amp;sprefix=%E3%83%A6%E3%83%8B%E3%82%B3%E3%83%BC%E3%83%B3%E4%BC%81%E6%A5%AD%E3%81%AE,aps,260&amp;sr=8-1&amp;linkCode=sl1&amp;tag=mosuke5-22&amp;linkId=1a0c354a1079e9f990544f760f195fb6&amp;language=ja_JP&amp;ref_=as_li_ss_tl" data-iframely-url="//cdn.iframe.ly/DGSoEc4?card=small"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

## 「アジャイルサムライ」から10年
作者のジョナサンは、10年前に「<a href="https://amzn.to/34RH66j" target="_blank">アジャイルサムライ</a>」という本を書いています。おそらく皆さんの中にもよく知っている人も多いでしょう。アジャイル系の書籍では非常に有名な本ですし、わたしもオススメしている一冊です。

出版された当時は、アジャイル開発はあたりまえでありませんでしたが、いまとなっては「あたりまえ」になってきたと作者も言っています。一方で、ユニコーン企業は、もはやアジャイル開発の代表フレームワークであるスクラムをもうやっていないといいます。

ではどんなふうに組織をつくっていっているのか？それを紹介しているのがこの書籍です。

## 誰に読んでほしいか？
この書籍は、Spotifyのソフトウェアエンジニアリング組織のことに主に書かれています。
O'Reillyから出版されていることもあり、ITエンジニアの方が手に取ることが多いのかなと思いますが、一番読むべきは、「**組織を作っている人**」でしょう。

これからポイントを後述しますが、Spotifyが実践していることは、チームに「権限を与え」チームを「信頼して」結果をだす組織をつくることです。
組織を作っている、<u>役員、管理職、マネージャ、エンジニアリングマネージャ</u>など一番読むべき対象と考えます。

また、書籍ではソフトウェアエンジニアリングチームに焦点があたっていますが、昨今テックの領域を取り込みつつあるマーケティングやセールス分野の組織作りにもおそらく役に立ってくる内容と思います。

## Spotify流のポイント
書籍にかかれていることでいくつかのポイントをピックアップしました。

1. ミッションで目的を与える
    - チームが行うべきタスクを誰も指示しない。チームが達成すべき抽象度の高いミッションのみが与えられ、自分たちがやるべきことは自分たちで決めて実行する。自立性の高さが求められる。
    - それにはやはりチームへの「権限移譲」と「信頼」がすべてである。
1. スクワッドという自己組織化されたチーム
    - 上で「チーム」と書いたが、Spotifyの中では「スクワッド」と呼ばれている。多くは8名以下で構成される。クロスファンクショナルなチームであり、スクワッドでデリバリーを完結できるようにしている。このあたりは、一般的なアジャイルな組織やスクラム組織と似ている。Amazonのthe Two Pizza Ruleとも共通する。
    - スクラムマスターがいないことは、スクラムとは異なる。スクワッドは「デリバリーする」メンバーだけで構成したいというのが強い信念としてある。
1. トライブでスケールを狙う
    - スクワッドで成し遂げられない大きな仕事は、複数のスクワッドを束ねたトライブで成し遂げていく。トライブをミニ企業ととらえ、トライブで業務を完結できるようにする。
    - トライブ間の依存関係を少なくするように努めている。これは、マイクロサービスアーキテクチャとも関連してくると考える。コンウェイの法則の「システム設計(アーキテクチャ)は、組織構造を反映させたものになる」と対応して考えると納得がいく。
1. ベットで会社目標をアライン
    - 自己組織化されたチームで、自立して仕事を行うことと、会社レベルでのミッションを無視して勝手に仕事をすることは別である。そこで、ベットという仕組みを使って会社として成し遂げるべきことをいくつか焦点を絞って実行していく。
1. データ
    - スクワッドのチームには「データサイエンティスト」をいれている。ソフトウェア開発に、データの力を使っているということ。プロダクトの使われ方の計測とそのデータを使った改善を、「チーム内」でやるということ。
1. 文化
    - 文化は勝手にできるものではなくて、投資して育てるものというマインドが強い。アジャイルコーチを採用することも多かったのもその現れ。アジャイルコーチは、文化を作り出すコーチとして捉えられている。

上で述べたようなSpotifyのやり方（いわゆるSpotifyモデル）が述べられているわけですが、おそらくいちばん重要なのは、そのモデルではなく、「そのモデルを変化し続けていること」だと思います。
現実に、いまはこの書籍で紹介しているモデルは利用しておらず違う形とのことです。
（「<a href="https://agile.quora.com/Spotify%E3%81%AF-Spotify%E3%83%A2%E3%83%87%E3%83%AB-%E3%82%92%E4%BD%BF%E3%81%A3%E3%81%A6%E3%81%84%E3%81%AA%E3%81%84" target="_blank">Spotifyは "Spotifyモデル "を使っていない</a>」を参照）

自らが必要な形を自らで考える、これはスクワッドに対して求めていることですが、エンジニアリング組織についても同様ということです。

## 「ユニコーン企業ではスクラムをやっていない」への見解
Twitterやコメントをみると「ユニコーン企業ではスクラムをやっていない」というフレーズにかなり反応しているように見えました。この点について自分なりの考えをまとめておきます。

たしかに、Spotifyを始めとしたいくつかのテック企業ではスクラムを採用していません。ですが、それはスクラムというフレームワークを使っていないだけで、「アジャイルな状態ではないということを意味していない」と思います。

スクワッドはミッションを与えられ、スクワッドがやるべきことは自らが決めて開発するわけです。
プロダクトオーナーが作ったバックログを「ただ消化する組織」ではないということです。
高度に洗練されたスクラムチームも、おそらくはただただそのフレームに従うだけでなく、いい方法を考えて動くはずでしょう。そういう意味では、Spotifyは、アジャイル開発の本質を突き詰めた結果であるというだけだと思います。

## この本を読んでどうするか？
さて、ここまでSpotify流の方法をまとめてきました。この本を読んだ方は、「Spotifyすげーなーー」と呆然とするかもしれません。しかし、そう思っているうちは、海外のテック企業に残念ながらやられていくだけでしょう笑

この書籍にも書かれていますが、じゃあSpotify流も真似すればいい！というわけでもありません。それはやめろと、Spotifyの社員誰もが言うでしょう。

優秀な人材を集めてできるテック企業だけができることで自分たちには関係ないと思ってしまうところですが、わたしはSpotifyの話を聞いて「アジャイルの延長」にあるだけで、そこまで絶望することはないと思います。
もちろん、Spotifyのやっていることはかなり遠いところではありますが、つながっていると思います。

というのも、Spotifyのやっていることは、たしかにスクラムなどのフレームに沿っているわけではありません。しかし、スクラムやアジャイルの本質は「自己組織化されたチームを作っていくこと」だと思っています。Spotifyのモデルは自己組織化されたチームを突き詰めていった結果でしょう。ひとつのスクラムチームを作れない状態からSpotifyのチームは作れません。
まだアジャイルやスクラムをやりはじめたというチームも、スクラムはオワコンというわけではなく、自己組織化されたチームを作っていくことにまず焦点をあてるべきです。

関連する書籍に「LeanとDevOpsの科学」があると思います。Spotifyのような「ハイパフォーマンスの企業」になるための必要な要素を科学的な研究に基づいて紹介しています。ハイパフォーマーになるためになにができるか？ひとつずつ挑戦していくほかありませんね。非常に大変なことなんですが。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2019/12/26/the-science-of-lean-software-and-devops/" data-iframely-url="//cdn.iframe.ly/oEgBPE6"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>