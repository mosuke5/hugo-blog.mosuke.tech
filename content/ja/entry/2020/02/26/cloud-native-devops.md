+++
categories = ["DevOps", "Kubernetes"]
date = "2020-02-26T23:42:24+09:00"
description = "Kubernetesで実践するクラウドネイティブDevOps、という書籍が発売しました。Kubernetes上でのアプリケーションの開発・運用について網羅的に知見が展開されている良い本です。デプロイやSecret管理、モニタリングなど様々な視点で書かれています。"
draft = false
image = ""
tags = ["Tech"]
title = "運用課題の指南書、Kubernetesで実践するクラウドネイティブDevOps"
author = "mosuke5"
archive = ["2020"]
+++

こんにちは、もーすけです。  
先日、O'REILLY Japanから <a href="https://amzn.to/2PraGZ8" target="_blank" onClick="ga('send','event','link','click','to-amz-cloudnativedevops');">Kubernetesで実践するクラウドネイティブDevOps</a> という本が出版されました。
最近仕事でKubernetes上のアプリケーションに関するDevOpsやCI/CDによく携わっているのもあり、発売日に手にとりにいきました。
せっかくなので、こちらの本の紹介をしていきたいと思います。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://www.amazon.co.jp/Kubernetes%25E3%2581%25A7%25E5%25AE%259F%25E8%25B7%25B5%25E3%2581%2599%25E3%2582%258B%25E3%2582%25AF%25E3%2583%25A9%25E3%2582%25A6%25E3%2583%2589%25E3%2583%258D%25E3%2582%25A4%25E3%2583%2586%25E3%2582%25A3%25E3%2583%2596DevOps-John-Arundel/dp/4873119014" data-iframely-url="//cdn.iframe.ly/j1izGzy?iframe=card-small"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>
<!--more-->

## どんな本か
この本は、Kubernetes上でアプリケーションを運用している人、これからする予定のある人が主なターゲットの書籍です。
著者自身も「Kubernetesを本番で使用しようとする場合に知っておく必要があると著者らが考えること」を判断材料に内容の取捨選択をしたと書いてあります。

本書では、タイトルにDevOpsとあるとおり、開発の工程からKubernetesでアプリケーションを実行し運用していくなかで必要なトピックを網羅的に扱っています。
以下はそれを表した図です。Kubernetesのリソースの基礎的な説明をしつつ、その上で開発フローの過程で必要な技術要素をピックアップして紹介しています。図に書いてあることが全てではないのですが、大きくこのようなトピックを扱っています。

![cloudnative-devops-overview](/image/cloudnative-devops-overview.png)

この本のいいところは、なんといっても **「考え方の選択肢を与えてくれる」** ことです。  
この界隈、たくさんのツールがありやりたいことができないという悩みよりも、どうしたらいいかわからない悩みのほうが強いと思います。本書では、考えるべきポイントをきちんとおさえ、その上で実現するための考え方の選択肢を与えてくれます。

## どんな人におすすめか
上にも書きましたが、本書自体のターゲットがKubernetes上でのアプリケーションを開発・運用する人です。
その中でも、Kubernetes上のアプリケーションの運用をどう考えたらいいか悩んでいる人におすすめと思います（クラスター運用ではない）。  
そもそも、Kuberntesそのものの基礎的なところに不安のある人は、<a href="https://amzn.to/3a0PWPE" target="_blank">「Kubernetes完全ガイド」</a>におまかせしましょう。

## 内容について
多数あるトピックのうち、デプロイとSecret管理の部分について特に本書のよいところがでていると思ったので（あと、自分の関心が高かったので）、その部分のみ簡単に自分の思いも含めて書きます。

### デプロイ
Kubernetesでのデプロイをどう考えるか最近すこし悩んでいました。  
個人的にはむかしからKubernetesのメリットはアプリケーションとその実行環境をすべて宣言的にマニフェストとして記述できるということが一番重要であると思っていました。そのため、デプロイもあるべき姿のマニフェストを適応していくことがベストであると考えています。
一方で、エンタープライズなKubernetesの世界ではいろいろな理由から、オペレーション(コマンド操作やGUI操作)による変更が充実していることもあり、どうであるべきかわからなくなってきていたところでした。

この書籍の中でも、Kubernetesの宣言的に記述できるメリットを最大限に活用するためには、マニフェストの管理とマニフェストの適応によるデプロイが重要であると書かれていました。

上を実現するためには、マニフェストのテンプレート化・生成が必要になります。
テスト環境とプロダクション環境でパラメータが異なるかもしれません。他のチームにマニフェストを渡して実行してもらうかもしれません。環境毎に異なる条件でもマニフェストで動作させるためには、テンプレート化・パラメータ化する必要があるからです。
そのためのツールも多種多様で、実現には困りません。
本書ではHelmを中心に書かれていることがおおかったですが、KustomizeやAnsibleも紹介されていました。
なにが重要なポイントかを教えてくれ、それを実現するためのアプローチの選択肢をきちんと書いてくれています。改めていままでのアプローチは間違っていなかったことを再確認できました。

思えば、Kubernetesの宣言的な記述の良さを活かしつつデプロイする手法として、以前にKustomizeもAnsibleもきちんと検証済みで（Kustomizeは運用で利用）ブログも書いていました。前から関心の高いテーマでした。

- [Kustomizeで環境ごとに異なるマニフェストを作る](https://blog.mosuke.tech/entry/2019/06/21/kustomize/)
- [Kubernetes上のリソースをAnsibleで管理する](https://blog.mosuke.tech/entry/2019/08/21/ansible-for-k8s-resources/)

### Secret管理
Kubernetesでのデプロイを考えていると、Secret管理をどうするかも非常に悩ましい問題です。  
本書ではSecret管理についても考え方の選択肢を用意してくれています。3つのアプローチが紹介されています。

1. バージョン管理を通じた機密情報の暗号化
1. 機密情報のリモート保存
1. 専用の機密情報管理ツールの使用

1.は、Gitレポジトリなどに機密情報を保存する方法で、よくアンチパターンとよくいわれたりしますね。
しかし、本書での推奨は1.のバージョン管理を通じた機密情報の暗号化です。
もちろん、なぜ推奨するのか、そしてそのデメリットやデメリットを補う対策法も一緒にかかれています。

機密情報をGit管理する際には、なんといっても平文でコミットしてしまったときのリスクがあります。
これを解消するためには暗号化して保存することになるわけですが、具体的なツールとしてSOPSが紹介されています。  
SOPSは、ファイル全体を暗号化するのではなく、JsonやYAMLのvalueだけを暗号化できます。
そのためプルリクエストでも内容をみやすく非常に強力なツールです。
以前にAnsibleのansible-vaultを使って同様のことを行いましたが、ファイル単位での暗号化のため苦労した覚えもありました。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://github.com/mozilla/sops" data-iframely-url="//cdn.iframe.ly/Uy7gztd"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

## まとめ
上に見てきたように、Kubernetesの運用上の悩みポイントにおいて何が重要か教えてくれ、そのアプローチ方法を理由と共に書かれいるのがよいところです。
デプロイとSecret管理の部分だけピックアップしましたが、その他にもKubectlを便利に使う方法や、コンテナのデバッグ方法などなどおもしろいトピックが盛りだくさんです。  
Kubernetesを本番で使っていく人ならぜひ読んでみるといいと思います。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://www.amazon.co.jp/Kubernetes%25E3%2581%25A7%25E5%25AE%259F%25E8%25B7%25B5%25E3%2581%2599%25E3%2582%258B%25E3%2582%25AF%25E3%2583%25A9%25E3%2582%25A6%25E3%2583%2589%25E3%2583%258D%25E3%2582%25A4%25E3%2583%2586%25E3%2582%25A3%25E3%2583%2596DevOps-John-Arundel/dp/4873119014" data-iframely-url="//cdn.iframe.ly/j1izGzy?iframe=card-small"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>