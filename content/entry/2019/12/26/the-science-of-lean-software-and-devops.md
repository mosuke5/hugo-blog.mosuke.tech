+++
categories = ["DevOps"]
date = "2019-12-26T11:29:20+09:00"
description = "「LeanとDevOpsの科学」という本を読みました。DevOpsの本質や重要なことが理解できる素晴らしい本です。なんとなく重要と感じるDevOpsを科学的になぜ重要か示してくれています。"
draft = true
image = ""
tags = ["Tech"]
title = "「LeanとDevOpsの科学」を読んで。DevOpsの本質を科学的に理解する"
author = "mosuke5"
archive = ["2019"]
+++

おひさしぶりです。[@mosuke5](https://twitter.com/mosuke5)です。  
最近<a href="https://amzn.to/2tVOWN8" target="_blank">「LeanとDevOpsの科学」</a>という本を読みました。
自分の周りの先輩方たちのあいだでは当たり前のようにこの本のコンテキストで会話がすすんでいるということもあり、読んでみたのがきっかけです。
実際に、読んでみるととても素晴らしい書籍であり、是非みなさんにも読んでほしいと思ったためこの記事を書くにいたりました。
<!--more-->

## ここでいうDevOpsとは
この本を紹介する前に、先に説明しておきたい言葉があります。
この本を紹介していく中でタイトルにもある「DevOps」という単語ですが、いろんな解釈がされています。
Infrastructure as Codeに代表されるような自動化のツールの利用を指している場合もあります。
このブログ・この書籍でいう「DevOps」は下記のような手法を指し、関心の対象は技術だけでなく組織やチーム、にもあるということを説明しておきます。

> 「安全で耐障害性が高く急速に進化できるスケーラブルな分散型システムを構築するためにはどうしたらよいのか」という難題を抱えた、少数の組織から生まれた手法である。

もし、DevOpsそのものの考え方や原則を知りたい場合は下記の本をおすすめします。

<div class="amazlet-box" style="margin-bottom:0px;"><div class="amazlet-image" style="float:left;margin:0px 12px 1px 0px;"><a href="https://amzn.to/2Mzobod" ="amazletlink" target="_blank"><img src="https://images-fe.ssl-images-amazon.com/images/I/51fzQFmdrXL._SL160_.jpg" alt="The DevOps ハンドブック 理論・原則・実践のすべて" style="border: none;" /></a></div><div class="amazlet-info" style="line-height:120%; margin-bottom: 10px"><div class="amazlet-" style="margin-bottom:10px;line-height:120%"><a href="https://amzn.to/2Mzobod" ="amazletlink" target="_blank">The DevOps ハンドブック 理論・原則・実践のすべて</a><div class="amazlet-powered-date" style="font-size:80%;margin-top:5px;line-height:120%">posted with amazlet at 19.12.27</div></div><div class="amazlet-detail">ジーン・キム ジェズ・ハンブル パトリック・ボア ジョン・ウィリス <br />日経BP <br />売り上げランキング: 55,522<br /></div><div class="amazlet-sub-info" style="float: left;"><div class="amazlet-link" style="margin-top: 5px"><a href="https://amzn.to/2Mzobod" ="amazletlink" target="_blank">Amazon.co.jpで詳細を見る</a></div></div></div><div class="amazlet-footer" style="clear: left"></div></div>


## どんな本なのか
この本は、LeanやDevOpsの考え方や実践が、企業のパフォーマンスにどのような影響を与えるのか「科学的に」研究した結果が書かれている本です。
タイトルにも「科学」と書かれていますが、読んでみるまで「科学的な研究の成果」を示した本であるとは思っていませんでした。
データに基づいて、Lean/DevOpsが組織に与える影響を示し、またどのようにデータ収集したのか、どのような分析をしたのかも含めて書かれているものです。
こう聞くと、「論文」のような印象を受け、非常に難しそうに聞こえるかもしれませんが、ページも多くなく読みやすくかかれている点もポイントと思います。

<div class="amazlet-box" style="margin-bottom:0px;"><div class="amazlet-image" style="float:left;margin:0px 12px 1px 0px;"><a href="https://amzn.to/2tVOWN8" ="amazletlink" target="_blank"><img src="https://images-fe.ssl-images-amazon.com/images/I/51t4VE8uuQL._SL160_.jpg" alt="LeanとDevOpsの科学[Accelerate] テクノロジーの戦略的活用が組織変革を加速する (impress top )" style="border: none;" /></a></div><div class="amazlet-info" style="line-height:120%; margin-bottom: 10px"><div class="amazlet-" style="margin-bottom:10px;line-height:120%"><a href="https://amzn.to/2tVOWN8" ="amazletlink" target="_blank">LeanとDevOpsの科学[Accelerate] テクノロジーの戦略的活用が組織変革を加速する (impress top )</a><div class="amazlet-powered-date" style="font-size:80%;margin-top:5px;line-height:120%">posted with amazlet at 19.12.27</div></div><div class="amazlet-detail">Nicole Forsgren Ph.D. Jez Humble Gene Kim <br />インプレス (2018-11-22)<br />売り上げランキング: 80,372<br /></div><div class="amazlet-sub-info" style="float: left;"><div class="amazlet-link" style="margin-top: 5px"><a href="https://amzn.to/2tVOWN8" ="amazletlink" target="_blank">Amazon.co.jpで詳細を見る</a></div></div></div><div class="amazlet-footer" style="clear: left"></div></div>



## どんな人におすすめか
この本は個人的に次の人たちにおすすめと考えています。

1. **社内でDevOpsを実践しているが効果がいまいちと感じている人**
1. **DevOpsの手法や文化を社内 or 顧客へ推進したい人**

まず、DevOpsを実践しているが効果がいまいちと感じている場合、どの観点が抜けているかの確認として有効です。
あとでも紹介するのですが、この本ではソフトウェアのデリバリーのパフォーマンスに影響する24つのケイパビリティを分析結果として示しています。どの点ができているのか？できていないのか？できていると思っているのか？発見できる機会になるのではと思います。

また、社内や顧客にDevOpsなどの文化を推進したいと思っているが、説得力に欠けているなと感じているときにも有効です。
私も経験があるのですが、ソフトウェア開発手法の価値を訴求するのは非常に難しいです。「どういった効果があるのか？」これをしっかりと示すのはなかなか難しいことです。
効果について自分で調査するよりも、研究結果としてこの本は述べているので非常に強力な武器となりえると思います。

## どんな人におすすめではないか
一方で、この本の中では「具体的な手法」が書かれたものではありません。  
いままでだれもしらなかったような新しい考え方がかかれているわけでもありません。

なんとなく重要、と思っていたことを裏付けている、ということがこの本の価値と感じます。
そのため、具体的な自動化の手法や、具体的な組織の作り方を知りたい人には期待とのギャップがあるかもしれませんので注意です。

## 内容と考察
本の構成は、3部構成になっています。  
研究の手法などに興味がなく、結果を知りたいよという人は1章と3章だけ読んでも十分だと思います。

- 1章: 調査結果から見えてきたもの
- 2章: 調査・分析方法
- 3章: 改善努力の実際

### バリューストリーム
まず、この本の中にキーワードとしてはあまりでてこないのですが、
バリューストリームの考え方を頭に入れておくとより深く理解できると思ったので、紹介します。
バリューストリームは、「製品あるいはサービスを顧客の手に運ぶことに要求される全体的な活動」([引用](mitsue.co.jp/case/glossary/s_151.html))のことです。
ソフトウェアに例えるならば、アイディアの発想から、企画・開発・テスト・リリースなどを経て顧客が利用できる状態までの一連の流れをいいます。

![value-stream](/image/value-stream.png)

DevOpsの考え方の背景には、このバリューストリームを「いかに速くできるか」「繰り返す実行できるか」「はやくフィードバックを得られるか（学習できるか）」というものがあります。この考えを理解した上で本書籍を読み進めるとより理解が深まると思います。

### ソフトウェアデリバリーのパフォーマンス
本書の中では、ソフトウェアのデリバリーのパフォーマンスの計測指標として次の4つを採用している点は重要です。従来の研究などでは、「コード量」や「ベロシティ」が用いられていましたが、その問題点にも着目しています。

1. コードのデプロイ回数
1. 変更のリードタイム
1. MTTR
1. 変更失敗率

ここでも大事なポイントが、「グローバルな指標」を用いるということです。グローバルな指標とはどういうことかというと、上で示したバリューストリーム全体として影響のある指標ということです。
縦割りの組織ではよく部門の指標をもって追っていますが、DevOpsの考えではバリューストリームに影響の与えるグローバルな指標を重視しているということを表しています。
バリューストリームの途中経過である、開発やテストだけにフォーカスされたローカルな指標より、グローバルな指標を重要視します。

### パフォーマンス指標があらわすもの
上の指標をみて、つまるところ「プロダクトの価値」をうまく表しているなと感じました。  
下の図は、ある2つのチームのプロダクトの価値を表したグラフです。
Team1は、1週間毎に10という価値の機能を追加するチームで、
Team2は、5週間毎に50という価値の機能を追加するチームを表しています。

![release-cycle-and-product-value](/image/release-cycle-and-product-value.png)

5週目、10週目という時点で見れば同じ総量の機能を追加するわけですが、**顧客に届いている価値の総量はどうでしょうか？**
早くリリースされるということは、その分長い期間顧客に価値が届いているということです。
2つのグラフの総面積をみるとTeam1のほうが多い価値を提供していることがわかりますよね。

### ハイパフォーマンスを実現する24のケイパビリティ
上で紹介したソフトウェアデリバリーのパフォーマンスの指標が高くするために必要なケイパビリティ（組織がもつべき能力や機能）を24つ見つけ出しました。大きく以下の5つの項目で分類されるのですが、詳細は是非書籍で確認してください。

1. 継続的デリバリの促進効果が高いケイパビリティ
1. アーキテクチャ関連のケイパビリティ
1. 製品・プロセス関連のケイパビリティ
1. リーン思考に即した管理・監視に関わるケイパビリティ
1. 組織文化に関わるケイパビリティ

その中で2つのポイントに着目して考えてみたいと思います。

#### (1)アーキテクチャ
ソフトウェアのデリバリーパフォーマンスをあげるためのケイパビリティの1つにアーキテクチャに関連した項目があります。
システムのタイプ（SoEなのかSoRなのか、自社開発か他社開発かなど）とデリバリーパフォーマンスの調査です。興味深いのは、**システムのタイプとデリバリーパフォーマンスに有意な相関はなかった**ということです。
現場でもよく、「SoRシステムだから改善できない」などといわれることもただあります。
この調査では、システムタイプに有意な相関はないが、**テストやデプロイが他のシステムと独立した形でできるかどうかがより重要**と結果がでています。
当たり前といえば当たり前なのです。マイクロサービスアーキテクチャだからデリバリーパフォーマンスがあがるというわけではなく、その本質を本当に理解する必要が我々にはあります。

#### (2)マネジメント
本研究では、リーダシップやマネジメントの重要性についても述べられています。
変革型リーダーがいないチームで高いパフォーマンスをあげる確率は低いと結果が出ています。
しばしば、「マネジメントは技術がわからず無能である」とか、「Execelワークになるのでマネジメントになりたくない」といった意見も現場では見受けられますが、ようは論点が異なるということですよね。
マネジメントには、マネジメントのやるべきことがある。このことをマネジメント側も現場側も理解する必要があります。

Googleも最近、マネジメントのためのナレッジを公開しました([re:Work](https://rework.withgoogle.com/jp/subjects/managers/))。
こちらに書かれていることはまさしくこの本で示されているリーダーシップのあり方に類似されていると感じます。

前職で半年ほどマネージャーをやったことがあったのですが、
やはりマネジメントはまったく別のロールであり、考えるべきこともやるべきことも今までとは異なる。このギャップをうまく理解して実践できないからこそ、ただ使えないマネジメントといわれてしまうと感じます。

## さいごに
「LeanとDevOpsの科学」という書籍の紹介とまとめをしてきました。  
個人的には非常に素晴らし書籍と感じています。
真新しい考え方や具体的な手法があるわけではないですが、DevOpsといわれるものに含まれる物事がなぜ重要なのか、本質はどこにあるのか、その理解を促してくれる本と思っています。
みなさんの読んでみた感想もぜひ教えてください。

<div class="amazlet-box" style="margin-bottom:0px;"><div class="amazlet-image" style="float:left;margin:0px 12px 1px 0px;"><a href="https://amzn.to/2tVOWN8" ="amazletlink" target="_blank"><img src="https://images-fe.ssl-images-amazon.com/images/I/51t4VE8uuQL._SL160_.jpg" alt="LeanとDevOpsの科学[Accelerate] テクノロジーの戦略的活用が組織変革を加速する (impress top )" style="border: none;" /></a></div><div class="amazlet-info" style="line-height:120%; margin-bottom: 10px"><div class="amazlet-" style="margin-bottom:10px;line-height:120%"><a href="https://amzn.to/2tVOWN8" ="amazletlink" target="_blank">LeanとDevOpsの科学[Accelerate] テクノロジーの戦略的活用が組織変革を加速する (impress top )</a><div class="amazlet-powered-date" style="font-size:80%;margin-top:5px;line-height:120%">posted with amazlet at 19.12.27</div></div><div class="amazlet-detail">Nicole Forsgren Ph.D. Jez Humble Gene Kim <br />インプレス (2018-11-22)<br />売り上げランキング: 80,372<br /></div><div class="amazlet-sub-info" style="float: left;"><div class="amazlet-link" style="margin-top: 5px"><a href="https://amzn.to/2tVOWN8" ="amazletlink" target="_blank">Amazon.co.jpで詳細を見る</a></div></div></div><div class="amazlet-footer" style="clear: left"></div></div>