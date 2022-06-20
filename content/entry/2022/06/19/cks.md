+++
categories = ["Kubernetes", "資格試験"]
date = "2022-06-19T15:52:32+09:00"
description = "CKS(Certified Kubernetes Security)を取得しました。勉強方法や気になる疑問などをまとめておきました。"
draft = false
image = ""
tags = ["Tech"]
title = "CKS合格しました。学習方法や気になる疑問などまとめ"
author = "mosuke5"
archive = ["2022"]
+++

こんにちは、もーすけです。  
最近少し時間があったので、ようやくCKS(Certified Kubernetes Security)をとってきたので、やってきたことなどかんたんに残します。
CKA,CKADの取得に関しては過去ブログを参照ください。

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
<!--more-->

## 座学
### Kubernetes CKS 2022 Complete Course - Theory - Practice
ほかの多くの人がブログでも書いているとおりではありますが、Udemyで販売されているKim Wüstkampさんの「<a href="https://px.a8.net/svt/ejp?a8mat=3H3F8L+198YR6+3L4M+BW8O2&a8ejpredirect=https%3A%2F%2Fwww.udemy.com%2Fcourse%2Fcertified-kubernetes-security-specialist%2F" rel="nofollow">Kubernetes CKS 2022 Complete Course - Theory - Practice</a>
<img border="0" width="1" height="1" src="https://www11.a8.net/0.gif?a8mat=3H3F8L+198YR6+3L4M+BW8O2" alt="">」を利用しました。

これ以外に、良さげな教材がそもそもあんまり存在しないというのもありますが、彼は模擬試験をLinux Foundationに提供していることもあり、試験内容を網羅しているので安心です。後述しますが、模擬試験もかなり実際の問題と類似しており、きちんとこなしていれば合格は間違いないでしょう。

ひとつだけ注意点があります。
以前はこのコースに模擬試験がついてきていたようですが、いまはUdemyのコースにはついてきません。
ただし、Linux Foundation側で試験を申し込むと、そちらに「試験シミュレーター」という形でついてきます。

![cks-exam-contents](/image/cks-exam-contents.png)

### Kubernetes Security Essentials (LFS260)
Linux Foundationで提供している{{< external_link url="https://training.linuxfoundation.org/ja/training/kubernetes-security-essentials-lfs260/" title="Kubernetes Security Essentials（LFS260）" >}}も購入してみました。試験とバンドルして買うと安くなるので買ってみました。
メインは、上の<a href="https://px.a8.net/svt/ejp?a8mat=3H3F8L+198YR6+3L4M+BW8O2&a8ejpredirect=https%3A%2F%2Fwww.udemy.com%2Fcourse%2Fcertified-kubernetes-security-specialist%2F" rel="nofollow">Kubernetes CKS 2022 Complete Course - Theory - Practice</a>でやって、一部保管する形で利用しました。

こちらも内容は盛り沢山です。  
試験に必要な要素はほぼすべてみっちり入っていると言えるでしょう。多くのSaaSサービスと違い、実行環境は自分で用意する必要があります。AWSやGCPあるいは、手元の環境でいじれるKubernetesを用意して学習するものです。
CKSを受けようとしている皆さんであれば、学習用のKubernetesを用意すること自体はそれほど難しくないとは思いますが、個人的には動画形式で必要な環境がセットアップされたサービスのほうが楽だなあと感じてやっていました。
※動画はストレッチしながら流し見して学ぶなどしていたのでｗ

ただし、{{< external_link url="https://training.linuxfoundation.org/ja/training/kubernetes-security-essentials-lfs260/" title="Kubernetes Security Essentials（LFS260）" >}}のほうが、Lab（試して学ぶセクション）で扱う幅は広いです。自分で手を動かしてやるコンテンツがたくさん欲しい人にはよいかもしれません。

## 模擬試験
前に書きましたが、試験を購入すると模擬試験が同梱されています。

模擬試験の種類はひとつで、2回まで受験できます。
模擬試験を起動すると、本番と同様に2時間のカウントダウンが行われますが、起動後36時間さわることができるので復習などできる仕組みとなっています。
自分は、試験受験の1週間前に1回目を、復習して試験の2日前に2回目を受験して活用しました。

## CKA/CKADより求められるLinuxの知識
CKSの学習をして、CKAやCKADと一番違うなと思ったことは、よりLinuxの知識が求められることです。
CKAやCKADはどちらかというとKubernetesの試験であり、Kubernetesの仕組みや使い方がメインだったと思います。

一方で、CKSでは、Kubernetes上でセキュリティを保つための次のような要素を知る必要がでてきます。

- Capability
- SELinux
- AppArmor
- Seccomp
- Sytemcalls
- ...

これらは、Kubernetesというよりは、Linuxの機能であります。  
コンテナとLinuxの関係性、そしてそれらの知識を改めて整理することが合格に近づくと思います。

## 気になっていたこと
いくつか試験前に気になっていたことがあるのでメモっておきます。

### CKAやCKADより難しいの？
CKSのホームページには次のように書いてあります。

> Certified Kubernetes Security Specialist (CKS) は、Kubernetesの熟練した実践者（CKA認定が必要）であり、コンテナベースのアプリケーションやKubernetesプラットフォームの構築、デプロイ、ランタイム時のセキュリティを確保するための幅広いベストプラクティス能力を実証します。

CKA認定が必要であり、明らかに上位資格のように見えます。  
なので、CKAやCKADよりも難しい試験なのかな？と思っていましたが、そんなことはないと思います。
もちろん、セキュリティの話なのでKubernetesのことがある程度わかった上での内容になるので、たしかにCKA認定相当が必要とは思います。  
試験の難易度として難しいかというと、CKAやCKADと同じくらいと思います。

### Pod Security Policy(PSP)って試験にでるのか？
カリキュラムには出ると書いてありますし、上で紹介した学習コンテンツにもでてきます。  
一方で、Kubernetes 1.23現在ではすでにDepricatedであり、1.25にはRemovedされる予定の機能です。いまの状況でPSPが試験に本当に出るんだろうか？と思っていました。きっと同じ疑問を持っている人もいると思います。

結論から言うと、ちゃんと試験にでました。  
たしかに今からPSPがを学ぶというのはやる気がでないかもしれませんが、PSPがDepricatedになる背景など知りながら学習していくといいと思います。今後のKubernetesライフでも、きっと役に立つ知識になるはずです。

そのうちPSPのはカリキュラムから外れると思いますが、<u>カリキュラムに載っていることはでる!</u>、ということです。

### 個別製品(FalcoとかTrivyとか)の話って出るの？
CKSの中では、FalcoやTrivyといったOSS製品の話もでてきます。  
こういった個別製品（OSS）のことって出題されるの？と疑問に思っていましたが、こちらも出題されました。

Trivyを使って、コンテナイメージの脆弱性の検査や、Falcoのログ出力の変更方法など、触ったことないと解くのが難しい問題もでます。概念だけでなく、実際にインストールして、触っておきましょう。

### 日本語で試験を受けられる？
試験を購入したときに、Language: Englishとなっていましたが、試験任意の言語で受けれます。  
試験画面で言語切り替えできるのでご安心を。

## 調べてまとめたこと
学習期間中にAdmission Webhookについてまとめたりしていたので、ぜひ学習材料に使ってください。
解説動画も撮ってみたのでお時間あればぜひ。

{{< admission-webhook-series >}}