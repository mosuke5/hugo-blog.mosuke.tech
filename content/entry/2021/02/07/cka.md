+++
categories = ["Kubernetes", "資格試験"]
date = "2021-02-07T11:57:42+09:00"
lastmod = "2022-07-08T16:12:22+09:00"
description = "新形式のCKAを受験してきました。受験に際して学習したことや、受験時の失敗談などを中心にまとめました。"
draft = false
image = ""
tags = ["Tech"]
title = "新形式のCKAを受験し合格しました。受験の教訓紹介。"
author = "mosuke5"
archive = ["2021"]
+++

こんにちは、もーすけです。  
本日は、ついに？ようやく？[CKA（Certified Kubernetes Administorator）](https://training.linuxfoundation.org/ja/certification/certified-kubernetes-administrator-cka/)をとりましたのでその報告です。
いまさらのCKA取得に関することなので、CKAとはなんなのか？とかそのあたりについては本ブログでは割愛します。ぜひ他のブログを参照してください。
どちらかというと、個人的なモチベーションや準備したこと、受験に関する教訓（失敗談）などを中心にまとめたいと思います。
1年半ほど前にCKADをとったときのブログは以下です。合わせて読んでみてください。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2019/07/08/ckad/" data-iframely-url="//cdn.iframe.ly/mmfuBDQ"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>
<!--more-->

## 新形式について
いちおう前提知識として、2020年9月1日からCKAは出題範囲や試験時間に変更があり、[新形式としてスタート](https://training.linuxfoundation.org/ja/cka-program-changes-2020/)しました。
これから受験される方は、いろいろとブログなど見ているかと思いますが、新形式に関しての情報を見ておくといいと思います。とくに勉強方法については若干スコープが狭まったようなので（CKADの差別化を意識したので）、注意が必要かと思います。

## 新プラットフォーム（PSI Bdirdge Platform）について
CKAを受けたときは、旧プラットフォームだったのですが、その後に再認定のために受けたCKADがPSI Bdirdge Platformだったので、以下ブログに追記しました。

<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://blog.mosuke.tech/entry/2019/07/08/ckad/" target="_blank">
      <img class="belg-site-image" src="https://blog.mosuke.tech/image/logo.png" />
    </a>
  </div>
  <div class="belg-right col-md-10">
  <div class="belg-title">
      <a href="https://blog.mosuke.tech/entry/2019/07/08/ckad/" target="_blank">CKADを取得の対策や試験当日の対応について · Goldstine研究所</a>
    </div>
    <div class="belg-description">CKAD(Certified Kubernetes Application Developer)を受験してきて無事に合格しました。合格のために準備すべきことと、試験受験に関して不安だったことなどをまとめました。</div>
    <div class="belg-site">
      <img src="https://blog.mosuke.tech/image/favicon.ico" class="belg-site-icon">
      <span class="belg-site-name">Goldstine研究所</span>
    </div>
  </div>
</div>

## モチベーション
上でリンクを貼ったとおり、2019年7月にCKADを受験して取得しました。
それから約1年半経ってCKAを取ろうかなと思ったのは、モチベーションに少し変化があったからです。
仕事でKubernetesに関する業務をしているのですが、自分のバックグラウンドや興味から、Kubernetesそのものを運用すること（いわゆるクラスタ管理）よりも、Kubernetes上で動かすアプリケーションの開発や運用ことに重きをおいてきました。
まさにこの1年半、Kubernetesを利用する側の方に対しての支援を中心に行ってきました。
実際に、CKAD取得のブログの最後には `次はCKAを取るのかとも聞かれるのですが、個人的にはしばらくKubernetesの構築サイドよりは、それを使ったアプリケーション開発や運用に焦点をあてる予定なので、いまのところCKAの予定はありません。` と書いていました。

このスタンスは今もそんなに大きく変わってはいないのですが、CKAを取ろうと思ったきっかけがありました。
それは、アプリケーションの開発・運用サイドの業務がメインとはいえ、お客さんはKubernetesそのものも運用しています。
顧客との信頼関係が深くなればなるほど、課題に対して広い視野でご質問いただくことが増えてきて、Kubernetesクラスタ管理のことなのでわかりません、というのはちょっと違うなと思いはじめたわけです。
もちろん、クラスタ管理も幅が広いのでディープなことは専門の人にお願いするとしても、かんたんなことであれば答えられる状態にしておきたい（最低限の会話はできるようになっておきたい）という思いがでてきたためでした。  
あとは、Kubernetesを知れば知るほどもっといろんなことを知りたいと思うようになってきたのもその理由のひとつです。

わたしの個人的なモチベーションについては、ふーんと思っていただければいいです。
CKAとCKADのどちらに挑戦するか、あるいは両方挑戦するかは、自分が重きを置きたいスキルやキャリアの考え方次第かと思うので、その参考になればと思っています。CKAとCKADでは、以前以上に差別化をはかっているので、必ずしも両方とったほうがいいといったことはないと思います。

## 準備したこと
わたしは、CKADは1年半前に受験し、Kubernetesに関しての業務は2年ほど行っています。
なので今回の試験のための勉強という観点では、Kubernetesを始めたばかりの人にはあまり参考にならないと思っています。
一方で、過去2年間の中でCKA取得に向けてやっておくと良さそうなことについては、総合的に言えるかなと思ってます。

### Udemy: Certified Kubernetes Administrator (CKA) with Practice Tests
まず、試験対策という意味では、Udemyの<a href="https://px.a8.net/svt/ejp?a8mat=3H3F8L+198YR6+3L4M+BW8O2&a8ejpredirect=https%3A%2F%2Fwww.udemy.com%2Fcourse%2Fcertified-kubernetes-administrator-with-practice-tests%2F" rel="nofollow">Certified Kubernetes Administrator (CKA) with Practice Tests</a>
<img border="0" width="1" height="1" src="https://www11.a8.net/0.gif?a8mat=3H3F8L+198YR6+3L4M+BW8O2" alt="">というコースが一番良いと思っています。
このコースですが、コンテンツボリュームが非常に多く、試験の内容をすべて網羅している点や、なんといってもハンズオン試験が非常に豊富にあります。実際の試験に似た形式のハンズオン試験がたくさんできるので、このコースでスラスラ解ければおそらく本番の試験も大丈夫でしょう。
試験の難易度も、問題の形式もかなり類似しているので、合格の基準に使ってくれていいと思います。

デメリットとしてはすべて英語という観点です。
しかし、再生スピードは調整できるので聞き取りが難しい場合はゆっくりすることや字幕をだすことも可能です。
英語がそんなに得意ではなくても十分にリカバリーできるくらいのしかけがあります。
ハンズオン試験は、文字量も多くないですし、英語自体も難しくないので問題ないと思います。是非チャレンジしてほしいです。

Udemy上のターミナル
![udemy-cka-handson-terminal](/image/udemy-cka-handson-terminal.png)

Udemy上のハンズオン問題例
![udemy-cka-handson-question](/image/udemy-cka-handson-question.png)

### Kubernetes The Hard Way
Kubernetesを構築する方法はさまざまありますが、ある程度勉強が進んだところで、Kubernetes The Hard Wayに挑戦してみるとやはり理解が非常に進むと思っています。試験に直接的に役立つわけではないと思いますが、試験で問われることのベース知識が身につくと言った感じです。
Kubernetesを触り始めたときから、Kubernetes The Hard Wayをやると、わけわからずつまらなくなってしまうと思いますので、ある程度学習が進んだ頃にやってみるといいと個人的に思ってます。
GCP版もAWS版もあるので、使い慣れてるクラウドでお試しください。

- Github: [kelseyhightower/kubernetes-the-hard-way](https://github.com/kelseyhightower/kubernetes-the-hard-way)
- Github: [prabhatsharma/kubernetes-the-hard-way-aws](https://github.com/prabhatsharma/kubernetes-the-hard-way-aws)

### 困ったときの「Kubernetes完全ガイド」
紹介する必要もなさそうですが、困ったときの「Kubernetes完全ガイド」を手元においておきましょう。辞書代わりに使ってます。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://www.amazon.co.jp/Kubernetes%25E5%25AE%258C%25E5%2585%25A8%25E3%2582%25AC%25E3%2582%25A4%25E3%2583%2589-%25E7%25AC%25AC2%25E7%2589%2588-Top-Gear-%25E9%259D%2592%25E5%25B1%25B1/dp/4295009792?&amp;linkCode=sl1&amp;tag=mosuke5-22&amp;linkId=58d74fdd3ca112a81ccbd103d4ca7058&amp;language=ja_JP&amp;ref_=as_li_ss_tl" data-iframely-url="//cdn.iframe.ly/ve2Qcob?iframe=card-small"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

## 受験における教訓
今回の受験で非常にやらかしたことがあったので書き残しておきます。  
受験の際は、PCのカメラをオンにして試験監督に顔の画像を送らななければいけません。
自分のPCは、オンライン会議のときに背景を消したりできるように[Snap Camera](https://snapcamera.snapchat.com/)というアプリをインストールしています。
最近のオンライン会議ツールの多くはツール側（サーバ側）で処理してくれますが、対応していないツールでも背景を消せるように入れてあります。
Chromeの設定でデフォルトのカメラ設定がSnap Cameraになっており、Snap Cameraを起動しないと試験監督に映像を送れなくなっていました。その場は、少しテンパっていたのもあり、すぐに対処することができず、Snap Cameraをオンにしたまま試験を開始することになりました。  
これが悲劇を生みました。。。

利用したことある方ならわかると思いますが、Snap CameraのようなPCのアプリケーション側で画像処理をするアプリはとにかくCPUを使います（仮に背景処理をいれてなかったとしても）。
PCはファンをガンガンにまわり始め、試験のサーバ上でコマンドを打ってもその2秒後にようやく反映されるという状況になってしまいました。リモートサーバ上のvimの操作はもうひどいです。
こうなってしまうと、とにかく問題を解くのに時間がかかる。
コマンドを打つ回数を減らしたいと思い始め、本来であれば確認コマンドを打ちたいところでも確認せず先に進む、そんなことをしなければいけませんでした。きわめつけは、そういった焦りから、問題で使うファイルを別作業で上書きしてしまいました（その問題は、解けなくなってしまったので捨てました）。
端的に言って最悪なので、Snap Camera等をインストールしているひとは必ずカメラ設定を確認しておいてください。
幸い、試験を合格することができたものの、途中で試験を放棄しようかとも考えたほどでした。皆さんはお気をつけください。

ちなみに、上でとあるファイルを上書きした話をしましたが、もう少し状況を説明します。
etcdに関する問題で、まず現状のetcdのスナップショットを取得してとあるファイル名で保存してくださいというのがありました。
その後に、すでに用意してあるetcdのスナップショットにリストアしてくださいというものです。
最初のスナップショットを、間違ってリストアする既存のファイル名で出力しました。次の問題のリストア用のスナップショットを上書きして削除してしまったということです。
チャットで試験監督に、「誤ってファイルを消してしまったのだが、クラスタを初期状態に戻すことができるか？」と聞きましたが、当然答えはNoでもとに戻せませんでした。つまり、その場合はその問題を諦めるということです。十分に操作には気をつけてください。

## さいごに
これからCKAを受験されようとしている方、ぜひ良い教材でKubernetesを楽しみながら受験してください。
個人的には資格のたぐいは持っているからどうこうというのはないと思っていて、ただ学ぶきっかけであり、Kubernetesを楽しんでいくきっかけだと思っているので全力でとりくんでみてください。気が向けばCKS（Certified Kubernetes Security）も挑戦してみたいと思います。

CKADの方もどうぞ。
<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2019/07/08/ckad/" data-iframely-url="//cdn.iframe.ly/mmfuBDQ"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>