+++
categories = ["Kubernetes", "資格試験"]
date = "2019-07-08T09:12:22+09:00"
lastmod = "2022-07-08T16:12:22+09:00"
description = "CKAD(Certified Kubernetes Application Developer)を受験してきて無事に合格しました。合格のために準備すべきことと、試験受験に関して不安だったことなどをまとめました。"
draft = false
image = ""
tags = ["Tech"]
title = "新システム対応）CKADを取得の対策や試験当日の対応について"
author = "mosuke5"
archive = ["2019"]
+++

**※本記事は、もともと2019年7月に執筆されたものですが、当時の有効期限である2年が経過したので、2022年7月に認定を更新しました。2022年7月現在の状況に更新してお知らせします。**

[@mosuke5](https://twitter.com/mosuke5)です。<a href="https://www.cncf.io/certification/ckad/" target="_blank">CKAD(Certified Kubernetes Application Developer)</a>を受けてきました。  
すでに多くのCKA/CKADの合格レポートや体験記がでておりますが、
それでも自分が実際に受けてみるまで不安な要素も多くあったので、
そのあたりを払拭するべくこの記事を書きたいと思います。

2019年7月5日にCKADを受験して無事に合格しました。（その後、2022年7月8日に認定を更新しました。）  
スコアは89%と案外高く(66%で合格)、驚きでもあったのですが、その体験をこれから受験する人にもシェアできればと思います。

![ckad-certificate](/image/ckad-certificate.png)
<!--more-->

## モチベーション
前置き的な。適当に流してください。  
今年の4月からDevOpsを中心とした技術・プロダクトやそのプロセスなどをお客さんに提供する立場になりました。
個人的にいつもそうなのですが、自分の資格そのものはお客さんからのはじめの信頼を得るため、くらいのものでしかないと思っていますが、一方で、資格試験は「学び」の手段の１つとして有効と思います。
仕事の中で自分のスキルも当然必要ですが、他者がよりはやく正確な学びをするためにどうしたらいいかも自分の関心事なわけです。
この資格試験がどういうレベル感でなにをもとめているのか、それを自分で知りたいというのが一番のモチベーションでした。

## 準備したこと
なにを勉強すればいいかについては、すでにでているブログなどを多く参考にしました。
その中で、下記が一番役に立ったものでしたので紹介します。

### CKAD-exercises
<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://github.com/dgkanatsios/CKAD-exercises" target="_blank">
      <img class="belg-site-image" src="https://opengraph.githubassets.com/bc5a133d46242ec01c13bc8ca75399937820ddd5112fc5350cd200de8e103b50/dgkanatsios/CKAD-exercises" />
    </a>
  </div>
  <div class="belg-right col-md-10">
  <div class="belg-title">
      <a href="https://github.com/dgkanatsios/CKAD-exercises" target="_blank">GitHub - dgkanatsios/CKAD-exercises: A set of exercises to prepare for Certified Kubernetes Application Developer exam by Cloud Native Computing Foundation</a>
    </div>
    <div class="belg-description">A set of exercises to prepare for Certified Kubernetes Application Developer exam by Cloud Native Computing Foundation - GitHub - dgkanatsios/CKAD-exercises: A set of exercises to prepare for Certi...</div>
    <div class="belg-site">
      <img src="https://github.githubassets.com/favicons/favicon.svg" class="belg-site-icon">
      <span class="belg-site-name">GitHub</span>
    </div>
  </div>
</div>

こちらのサイトはGithubのページなのですが、CKADの資格試験の問題の中で行うであろう「操作」について効率的に学べるものです。
ここにある問題のレベルがそのままでるわけではないのですが（一部そのレベルのものもある）、CKADでは問題を解くスピードも重要で、基本的な動作を「身体に染み込ませる」ために役立ちます。
必要なコマンドや概念についてはexercisesをやっておけばほぼ網羅できるものだったかなと感じています。

しかし、CKAD-exercisesでは、実際に実行する環境までは用意していないので、自分で環境は用意する必要があります。
自分の場合は、自分で構築したKubernetesクラスターがあったのでそちらで練習しましたが、お持ちでない方も多いとお思います。
もし今後、Kubernetesをガッツリ触っていく予定があるのであれば、自前で構築するないしはGKEやEKSなどを一時的に借りて触ってみることをおすすめします。
自前構築は、CKAを受ける方はやることになるはずですが、それなりに大変なのも事実です。
まずはアプリケーション寄りでCKADを取りたいというかたはパブリッククラウドのKubernetesサービスか、~~Katacodaなど~~をおすすめします。  
~~Katacoda自身も基本操作を学べるサイトですが、ここでは一時的にクラスタを借りれるのでその上でCKAD-exercisesに練習をすることも一部可能かなと思います。~~  
**→2022年5月にKatacodaはサービスを終了してしまいました。**


### Linux Academy
CKAD-exercisesで基本的な操作は体得できるとして、とはいえ実際にどんな問題がでるのだろうか、、と気になるのではないかと思います。
試験の内容は公開してはいけないので、ブログ等をみてもあまり参考になるものはでてきませんでした。Linux Academyと下記のCloud Academyでは実際の問題に近い練習ができるのでやっておくといいでしょう。

Linux AcademyとCloud Academyは実践問題だけではなく、1から学ぶコースも用意しています。基礎の部分からやっていきたいというかたはどちらかを選んでやってみてもいいと思います。  
こちらの練習問題ですが、かなり本番のテストとにていますが、問題数が3つと多くないので、あくまで「こういう形式のテストね」と納得するものとして活用するといいです。

{{< external_link title="Certified Kubernetes Application Developer (CKAD) | A Cloud Guru" url="https://acloudguru.com/course/certified-kubernetes-application-developer-ckad" >}}

##### 2020/12/15追記
気がついたら、A Cloud GuruがLinux Academyを買収していいて少しコンテンツ体系などかわっているようでした。
[A Cloud Guru Acquires The Linux Academy and Claims 1.5 M Learners](https://iblnews.org/a-cloud-guru-acquires-the-linux-academy-and-claims-1-5-m-learners/)

### Cloud Academy
こちらも上のLinux Academyとほぼ同様です。基礎の部分から学ぶことができ、最後に練習問題があるという形式です。
すべて受講したわけではないのですが、以前にAWSの資格試験を取得する際にこちらのサイトはお世話になり、それなりに内容は充実していました。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://cloudacademy.com/learning-paths/certified-kubernetes-application-developer-ckad-exam-preparation-451/" data-iframely-url="//cdn.iframe.ly/iq3FYij?iframe=card-small"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

### 模擬試験
2022年7月現在では、試験を申し込むと模擬試験がついてきます。

模擬試験の種類はひとつで、2回まで受験できます。 模擬試験を起動すると、本番と同様に2時間のカウントダウンが行われますが、起動後36時間さわることができるので復習などできる仕組みとなっています。 自分は、試験受験の1週間前に1回目を、復習して試験の2日前に2回目を受験して活用しました。

写真はCKSのものですが、CKA/CKADでも同様です。

![cks-exam-contents](/image/cks-exam-contents.png)

### Kubernetes完全ガイド
CKADの資格取得対策、という意味で役立つわけではないですが、Kubernetesを理解する上で圧倒的に役に立ったのがKubernetes完全ガイドです。これなくして、CKADは受からなかったと思います。みなさんはCKADを取得することが目的ではないはずです。
ぜひ完全ガイドで基礎を身につけましょう。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://www.amazon.co.jp/Kubernetes%25E5%25AE%258C%25E5%2585%25A8%25E3%2582%25AC%25E3%2582%25A4%25E3%2583%2589-impress-top-gear-%25E9%259D%2592%25E5%25B1%25B1/dp/4295004804" data-iframely-url="//cdn.iframe.ly/uH10ejv?iframe=card-small"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

## 受験開始まで
### 申し込み、環境チェック
ある程度勉強ができたら、思い切って試験の申込みをしてみましょう。
実は、この試験では「再試験」が1度だけ可能です。仮に落ちたとしても無料でもう一度受けることができるので、
ある程度の勉強ができたらトライしてみることも重要です。

申込みが完了したら、ポータルページから「Check System Requirements」というのがあるので必ずチェックしておきましょう。
他の人のブログ等でWebカメラを用意した、というのを書いている人もいますが、要件を満たしていればノートPCに備え付けのインカメラでも受験可能です。
実際に自分は、2017年モデルのMacBook Proで受験しました。

### 場所の確保
申し込みにあたって、「場所の確保」という難題があります。
この試験は、オンラインで受験することが可能ですが、試験の時間まわりにだれもいない環境を作らなければいけません。
だれにも邪魔されない自分の部屋をもっているか、持っていない方は会議室などを抑える必要があります。ご注意ください。
自分の場合は、会社の会議室を人があまりいない時間帯で抑えて利用しました。

試験時間は、CKA/CKADともに2時間なのですが、会議室は試験予定の前後30分程度多くとっておくといいです。
というのも、後述しますが、実際の試験開始までの準備ややり取りで30分程時間もかかるためです。

## 試験について
### 試験開始前の準備
試験もそうなのですが、試験をきちんとうけられるのか？そこが実際に受けるまで不安な要素でした。

マイポータルのページに行くと、残り何時間で試験が受けられます、というカウントダウンがされています。当日はそのカウントが０になるまでとりあえず待ちます。
カウントが０になると、試験開始のボタンが出てくるのでそちらを押して、試験監とのやりとりがはじまります。

基本的に下記おようなチェックが試験監との間で行われます。  
やりとりはすべてチャットで英語で行われます。こちらから質問がない限りは、英語を書く必要はなく、相手から言われたことを淡々とこなせば大丈夫です。

- 画面共有がきちんと相手側とされているかどうか
- カメラの映像が相手に届いているか
- 身の回りの環境にだれもいないか、筆記用具など不必要なものが置かれていないか
  - カメラをゆっくり回して周りの状況を相手に伝えます
  - ドリンクはOK。ただしラベルははずせと言われました。
- 本人確認
  - 日本人の場合はたいてい２つのIDが必要です。顔がわかる運転免許証などと、英語表記で名前が書かれたクレジットカードなどの２つ。
- ブラウザ以外に余計なアプリケーションが立ち上がっていないか
  - ブラウザのタブも余分なものは閉じる必要があります
  - kubernetesの公式ドキュメントはみてよい。公式ドキュメント内の検索ももちろん使ってよい

### 新システム PSI Bridge Platform
2022年6月から試験プラットフォームに変更がありました（{{< external_link title="https://training.linuxfoundation.org/ja/bridge-migration-2021/" url="https://training.linuxfoundation.org/ja/bridge-migration-2021/" >}}）。  
あくまで試験プラットフォームなので試験問題が変わるわけではないのですが、いくつか受験者に影響がありそうだったので書き留めておきます。

- 試験環境は、Linuxデスクトップにリモート接続した環境で行われるようになります。
  - Linuxデスクトップにブラウザとターミナルが入っているのでそれで試験をこなします。
  - PSI SecureBrowserというソフトウェアをダウンロードし、そのソフトウェア内で試験を行います。
  - これによって、自分のブラウザのブックマークは使えなくなります。とはいえ、試験問題にドキュメントURLが書いてあるので、URLを覚えておくなどの必要性はありません。
  - リモートデスクトップなので、操作感がイマイチです。もっさり感があり操作は遅く、手元でなれているショートカットも使えないので問題を解くスピードは落ちることを覚悟しておいたほうがいいと思います。
- いろいろトラブルがあって、試験開始までのやりとりで1時間位かかってしまいました。順調に行っても30分くらいはかかると思います。試験時間の2時間 + 30~60分くらいを見積もっておくとよいでしょう。
- これは試験プラットフォームは関係ないと思うのですが、切り替わったことで試験のバグになったのか、はたまた試験問題の一つ7日怪しいところなので書いておきます。試験問題内に 「`curl http://xxxxxx` でアプリケーションにアクセスできます」と書いてあったにも関わらず、実行しても対象アプリケーションに到達できませんでした。時間に余裕があったので、`/etc/hosts` ファイルの改行が崩れていて、名前解決がうまくできていないことがわかりました。直してあげれば正常に動くので、もし試験中に名前解決がおかしいと思ったなら見てみるといいです。

### 試験問題について
試験問題については、多く語れませんが下記だけは注意しておいたほうがいいです。
自分もヒヤッとした場面がありました。

- 問題ごとに利用するクラスタ環境が異なります。連続して同じクラスタ環境を使うこともあるのですが、必ず問題冒頭のクラスタ切り替えは年のため毎回実施しておいたほうが安心です。
- かなりサクサク解いたつもりでも時間はギリギリなので、わからないものは飛ばしてもいいかもしれません。ただし、あとで戻れるように問題にフラグを立てたりはできなかったので注意です。
  - 2022年7月に再認定で受験したときには、時間に余裕がありました。全部で16問あり、比較的かんたんな問題が10問ほどあったので、余裕がありました。これは、自分のスキルが上がったからなのかはよくわかりませんｗ
- 調べ方をマスターしておきましょう。どういうことかというと、問題ごとにだいたいキーワードがあります。"ConfigMap"とか"PersistentVolume"とか。そのYAMLの書き方をすべて覚えておくのは不可能なので、どうやって自分のやりたいことが書いてあるドキュメントにたどり着けるかは練習しておいたほうがいいです。基本的には検索を使ってキーワードでたどり着けるとお思いますが、見慣れておきましょう。

### 合否について
~~合否は試験後36時間以内にメールで通知がきます。~~  
いまは、合否は24時間以内にくると書かれています。

## さいごに
自分がとくにきになったところを中心にCKAD受験について書きました。  
他の人の体験記なども多く参考にしながら、ぜひKubernetesライフを楽しんでください。

次はCKAを取るのかとも聞かれるのですが、個人的にはしばらくKubernetesの構築サイドよりは、それを使ったアプリケーション開発や運用に焦点をあてる予定なので、いまのところCKAの予定はありません。
アプリケーション開発・運用の観点で今後も情報発信できればと思います。

### 2021年2月追記 CKA受験
この記事を書いた当初は、CKAの受験予定はありませんでしたが、1年半後ではありますが受験しました。

<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://blog.mosuke.tech/entry/2021/02/07/cka/" target="_blank">
      <img class="belg-site-image" src="https://blog.mosuke.tech/image/logo.png" />
    </a>
  </div>
  <div class="belg-right col-md-10">
  <div class="belg-title">
      <a href="https://blog.mosuke.tech/entry/2021/02/07/cka/" target="_blank">新形式のCKAを受験し合格しました。受験の教訓紹介。 · Goldstine研究所</a>
    </div>
    <div class="belg-description">新形式のCKAを受験してきました。受験に際して学習したことや、受験時の失敗談などを中心にまとめました。</div>
    <div class="belg-site">
      <img src="https://blog.mosuke.tech/image/favicon.ico" class="belg-site-icon">
      <span class="belg-site-name">Goldstine研究所</span>
    </div>
  </div>
</div>

### 2022年6月追記 CKS受験
<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://blog.mosuke.tech/entry/2022/06/19/cks/" target="_blank">
      <img class="belg-site-image" src="https://blog.mosuke.tech/image/logo.png" />
    </a>
  </div>
  <div class="belg-right col-md-10">
  <div class="belg-title">
      <a href="https://blog.mosuke.tech/entry/2022/06/19/cks/" target="_blank">CKS合格しました。学習方法や気になる疑問などまとめ · Goldstine研究所</a>
    </div>
    <div class="belg-description">CKS(Certified Kubernetes Security)を取得しました。勉強方法や気になる疑問などをまとめておきました。</div>
    <div class="belg-site">
      <img src="https://blog.mosuke.tech/image/favicon.ico" class="belg-site-icon">
      <span class="belg-site-name">Goldstine研究所</span>
    </div>
  </div>
</div>