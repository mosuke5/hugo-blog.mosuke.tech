+++
date = "2020-10-16T00:00:00+09:00"
description = "Kubernetesを学びたい人のためのページを作成しました。Kubernetesの効率よく学ぶためのクイズなどを公開。"
draft = false
image = ""
title = "Kubernetesを学ぶ"
author = "mosuke5"
+++

本ページは、Kubernetesを学びたい人向けにコンテンツを整備していくことを目的にしたものです。
随時更新しますので、ぜひご活用ください。

## なぜコンテナを使いたいかを考える
まずはなぜ自分たちがコンテナやKubernetesに興味を持っているのか、使いたいのかを改めて考えるきっかけをつくるといいです。
もちろん触ってみないとわからないことも多いので、勉強という意味では意義を無視してどんどんすすめてみてください。
なぜコンテナを使いたいかを考える材料として、「{{< external_link url="https://amzn.to/2HRo47K" title="LeanとDevOpsの科学 テクノロジーの戦略的活用が組織変革を加速する" >}}」がとてもオススメです。[書評ブログ](https://blog.mosuke.tech/entry/2019/12/26/the-science-of-lean-software-and-devops/)も過去に書いているのであわせてご覧ください。

## Kubernetesの前に単体コンテナの扱いを学ぶ
Kubernetesは、コンテナオーケストレーションツールです。
Kubernetesを学びたいと思っていて、まだDockerなどのコンテナをきちんと勉強したことない方は、先にコンテナを単体として扱う練習をしておくといいです。一番手軽な方法として、Dockerを手元の端末にインストールし、操作感や概念を理解しておくことです。
Kubernetesは、アプリケーションをコンテナで運用する際に、コンテナ単体だけでは足りなかった部分を補ってくれる存在となります。いきなりKubernetesから入ると学習効率は下がる可能性がありますので注意してください。

## コンテナ謎解き for アプリ開発者
友人から、書籍を読めばトピック毎のことはわかるが、膨大にあるKubernetesのことをなにからどの様に学んでいけばいいかわからないという相談をうけました。
そこで、わたしの経験からアプリ開発を主に行う人がKubernetesの何をどのように学んでいけばいいかをクイズ形式でまとめたところ、好評だったため本サイトでも公開してみました。
以下のクイズは順番を意識して作っているので順にこなしていけばと思います。

1. Dockerを用いて、Nginxを起動せよ
1. Dockerを用いて、"Hello mokumoku kai" と返すNginxイメージを自作せよ
    - また、そのイメージをDockerhubで公開せよ
1. minikube上に、前の項目で作成したNginxイメージをデプロイせよ
    - マニフェストファイルを用意できていること
    - Podを削除してもサービスを継続できること
    - Pod数が3以上であること
1. Deployment、ReplicaSet、Podの3つの関係性を考えよ
1. Serviceの役割について説明せよ
1. 作成したNginxに追加して下記の仕組みに変えよ
    - なんらかのアプリケーションサーバの追加（phpでもrubyでもなんでも可）
    - 環境変数 `MOKUMOKUKAI=mokumokusaikou` を設定し、設定した環境変数を返すアプリケーションを作成せよ
1. MySQLを追加し、MySQL内の任意のデータを返すアプリケーションを作成せよ
1. Nginxのバージョンを変更しデプロイしてみよ
1. アプリケーションに変更を加えてアプリケーションのイメージを作り直しデプロイしてみよ
1. その際、コンテナイメージのタグ名をどのように指定したか復習し、latestタグを使うことが悪手といわれているか理由を考えよ
    - （ヒント）イメージの管理やimagePullPolicyの観点から考えるといい
1. 作成したアプリケーションのイメージのサイズを確認してみよ
1. コンテナイメージは一般的に軽いほうが良いといわれるが、その理由と軽くする方法について調べ考えよ
1. 上の例でいうとNginxとアプリケーションは同じPod上で動作させることも可能だが、同じPodで動かした場合のデメリットを考えよ
    - （ヒント）１コンテナ１プロセスの原則が何を意味するのか考えてみよう
1. ここまで完了したらそろそろ、minikubeを卒業してクラウドサービスのKubernetesで上をデプロイしてみよう。
    - より分散環境で動作することを意識していこう
1. GKE上でIngressリソースを使って、デプロイしたアプリケーションをインターネットに公開せよ
    - GKEでなくても、Kubernetesサービスならなんでもいいですが、手軽で安価に使えるクラウド上のKubernetesとしてGKEとしました。
1. Ingressがどのような仕組みで動き、どんな働きをするのか考察せよ
    - その際には、Sevice Type:loadbalancerやNodePort Serviceとの違いに着目せよ
1. アプリケーションで利用しているMySQLのボリュームをGCP上のPersistent Volume（ブロックストレージ）に置き換えよ（すでに対応済みならスキップ）
1. クラウドサービスとKubernetesの関係性について整理せよ
1. デプロイしたNginxに、`/hello` のリクエストのときだけバックエンドサーバへプロキシせずに "Hello from Nginx"と返すように設定せよ
    - その際、Nginxの設定ファイルはKubernetesのConfigMapを用いてNginx Podに引き渡すこと
1. アプリケーションのMySQLへの接続のIDとPasswordをKubernetesのSecretを用いる構成に変更せよ
1. SecretとConfigMapの違いを説明せよ
1. 作成したSecretのYAMLの中身を閲覧し、エンコードされた文字列を確認せよ。このエンコードされた文字列はセキュアである状態か考えてみよ。もしセキュアでないと考えた場合、どのようにSecretを管理するべきか検討せよ。

## おすすめの勉強材料
Kubernetesを学ぶのに非常に参考になっている書籍などを紹介します。

### 基礎知識
本ブログ内ではよく紹介していますが、Kubernetesの基礎知識や仕様の辞書として使いたいのであればKubernetes完全ガイドがまずいちばんの良書と考えています。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://www.amazon.co.jp/Kubernetes%25E5%25AE%258C%25E5%2585%25A8%25E3%2582%25AC%25E3%2582%25A4%25E3%2583%2589-%25E7%25AC%25AC2%25E7%2589%2588-impress-top-gear%25E3%2582%25B7%25E3%2583%25AA%25E3%2583%25BC%25E3%2582%25BA-ebook/dp/B08FZX8PYW" data-iframely-url="//cdn.iframe.ly/xzXY0oj?iframe=card-small"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

### DevOps
「Kubernetesで実践するクラウドネイティブDevOps」という本があります。こちらについては過去にレビュー記事を書いたのでこちらからご参照ください。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2020/02/26/cloud-native-devops/" data-iframely-url="//cdn.iframe.ly/0pYInqQ"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

### セキュリティ
セキュリティに特化してここまで詳細に書かれた本はほかにありません。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://www.amazon.co.jp/Docker-Kubernetes%25E9%2596%258B%25E7%2599%25BA%25E3%2583%25BB%25E9%2581%258B%25E7%2594%25A8%25E3%2581%25AE%25E3%2581%259F%25E3%2582%2581%25E3%2581%25AE%25E3%2582%25BB%25E3%2582%25AD%25E3%2583%25A5%25E3%2583%25AA%25E3%2583%2586%25E3%2582%25A3%25E5%25AE%259F%25E8%25B7%25B5%25E3%2582%25AC%25E3%2582%25A4%25E3%2583%2589-Compass-Books%25E3%2582%25B7%25E3%2583%25AA%25E3%2583%25BC%25E3%2582%25BA-%25E9%25A0%2588%25E7%2594%25B0/dp/4839970505" data-iframely-url="//cdn.iframe.ly/14dZOCz?iframe=card-small"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

### 拡張
Kubernetesをより使いこなすために、自作のコントローラ（Operator）を作ってみたい人やKubernetesの内部をより良く理解したい人はこちらから入るとおすすめです。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://www.amazon.co.jp/%25E5%25AE%259F%25E8%25B7%25B5%25E5%2585%25A5%25E9%2596%2580-Kubernetes%25E3%2582%25AB%25E3%2582%25B9%25E3%2582%25BF%25E3%2583%25A0%25E3%2582%25B3%25E3%2583%25B3%25E3%2583%2588%25E3%2583%25AD%25E3%2583%25BC%25E3%2583%25A9%25E3%2583%25BC%25E3%2581%25B8%25E3%2581%25AE%25E9%2581%2593-%25E6%258A%2580%25E8%25A1%2593%25E3%2581%25AE%25E6%25B3%2589%25E3%2582%25B7%25E3%2583%25AA%25E3%2583%25BC%25E3%2582%25BA%25EF%25BC%2588NextPublishing%25EF%25BC%2589-%25E7%25A3%25AF-%25E8%25B3%25A2%25E5%25A4%25A7-ebook/dp/B0851QCR81" data-iframely-url="//cdn.iframe.ly/r2pMc79?iframe=card-small"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

### 認定試験
Linux FoundationとCloud Native Computing Foundation（CNCF）によって、Kubernetesの認定試験を提供しています。
Certified Kubernetes Administrator(CKA)とCertified Kubernetes Application Developer(CKAD)の2種類です。
試験はコマンド操作による実技試験のため、非常に実践的なスキルが学べます。こちらの認定資格をはじめの目標にしてみるのもよいかとおもいます。わたしも過去にCKADを受けたことがあります。（ブログ: [CKADを取得の対策や試験当日の対応について](https://blog.mosuke.tech/entry/2019/07/08/ckad/)）

## Kubernetesに関するブログ記事
本サイトのKubernetesに関するブログ記事は下記からたどれます。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/categories/kubernetes/" data-iframely-url="//cdn.iframe.ly/xXZggBO"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>