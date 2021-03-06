+++
archive = ["2017"]
author = "mosuke5"
categories = ["Alibaba Cloud", "AWS", "イベント"]
date = "2017-07-14T15:33:38+09:00"
description = "TerraformとRancherを使って、マルチクラウドを環境の考え方についてはなしてきました。マルチクラウドのメリットや他のサービスとどう組み合わせていくか話しました。"
draft = false
image = ""
tags = ["Tech"]
title = "Terraform×Rancherでマルチクラウドを一歩すすめる"

+++

7月12日の[MasterCloud#3](https://mastercloud.connpass.com/event/59832/)で「Terraform×Rancherでマルチクラウドを一歩すすめる」という題で話してきました。  
本記事ではスライドはもちろん、文面で補足しながら話してきた内容をまとめます。  
<!--more-->

## スライド
まずは当日のスライドについて公開します。  
内容としてはYAPC::Fukuokaの前夜祭で話してきた内容の続きです。  

<script async class="speakerdeck-embed" data-id="1e0a3455986748d2bad51872254f8d03" data-ratio="1.77777777777778" src="//speakerdeck.com/assets/embed.js"></script>

##### 2017/7/18 追記  
動画がでてました。  
<iframe width="560" height="315" src="https://www.youtube.com/embed/vMBP0Wgyw08" frameborder="0" allowfullscreen></iframe>

## 内容解説
### はじめに
私は、AlibabaCloudの日本リージョンの担当などを普段しています。  
実はAlibabaCloudは去年の12月から日本リージョン開設しています。  

### マルチクラウド
最近「マルチクラウド」という言葉をよく聞く気がします。  
クラウド事業者としてはもちろん、AWSをはじめとするビッグなところだけでなく他の事象者も目を向けてほしいとも思っていますし、  
ユーザ目線でもどんなクラウドサービスも落ちることもあるのでバックアップを用意しておきたいと思っているはずです。  
あとは、良いサービスがあればマルチクラウドで使いたいというニーズも増えてきています。  

マルチクラウドのメリットは他にもたくさんあると考えています。  

#### 1.価格を最適化したい
クラウドサービスも裏では物理的なハードウェアで動作します。  
なので新しいほうが当然ながら安くいいスペックのものが利用できます。  
老舗のクラウドサービスもいいですが、新しいハードウェアが入ってきたクラウドサービスでは、
意外に安くいいスペックのものが使えたりします。  
そのほか、キャンペーンなどで安くサーバが手に入る場合もあります。  

#### 2.DR,BCPとして活用する
1つのクラウドサービスに依存していると、そのサービスに障害が起きた際にサービスが全断しますよね。  
最近でもオブジェクトストレージが落ちるなどいろいろニュースがありました。  
特定のクラウドサービスに依存しないようにすることで可用性は高まります。  

#### 3.サービスロックインを避ける
サービスロックインを避けたい、という考え方もあります。  
特定の事業者、サービスのやり方に則ることで効率的になるということは過去からよくあることです。  
一方で、次のイノベーションが起きたときに、脱却できず苦しんできた歴史もあったかとおもいます。  
クラウドサービスでもそういうことは起きうるでしょう。  

#### 4.最適サービスを使いたい
今や、クラウドサービスありすぎな時代です。  
自社の環境や組織にあったクラウドサービスを組み合わせ利用することは、
事業もコストも最適化することにつながるかもしれません。  

### Rancher
そんなマルチクラウドのメリットがあるなか、Rancherというソフトウェアに出会いました。  
RancherはDockerコンテナのオーケストレーションツールです。  
特徴としてDockerが動く環境であれば、クラウドサービスの種類やリージョンなど問わず、
Dockerアプリケーションを動かすホストサーバとして利用できオーケストレーションできるツールです。  

### Rancherでのマルチクラウド
Rancherを利用することで、さまざまなクラウドサービスをまたがってDockerアプリケーションをデプロイできます。  
一方、このときに話したマルチクラウドは課題がありました。  
すべてのアプリケーションをDockerとして動かすことを前提としている点です。  
クラウドサービスは仮想サーバサービスばかりではなくデータベースサービスやストレージサービス、PaaSなどさまざまです。  
これらをうまく使ってこそ本当のマルチクラウドではないかなと思っていました。  

### Terraform
そこで思い出したのがTerraformです。  
構築したいインフラをTerraformの書式で記述することで、Terraformがその通りにインフラを構築してくれるというものです。  
Terraformはマルチベンダーで動作するインフラ管理ツールというのがまた特徴的です。  

ちなみにAlibabaCloudもTerraform対応ベンダーなのですよ。  

### RancherとTerraform
RancherとTerraformどちらともマルチクラウド的なツールと言えます。  
ですが、そのカバーする領域は全く別物です。  

Rancherはアプリケーションの動作環境（仮想サーバ）をマルチクラウド化します。  
Terraformはクラウドサービス（マルチベンダー）の提供する様々なサービスの操作や管理を可能にします。  

この２つを上手く使うと何か面白いことができるのはないか、そう考えました。  

### たとえば
Rancherを使いつつ、仮想サーバだけでなくクラウド事業者の提供するサービスを組み合わせるとどういうことがきるのか。  
例えばだが、サービス基盤はAlibabaCloudを使う。理由はDBサービスが優れているから。最新のCPUインスタンスを利用できるから。  
しかし、データ分析はAWSのS3を起点としたワークフローが便利と思っている。  
S3にデータを集め、Athenaを使うもよし、AWS上にRancherでHadoopを構築するもよし。  
こういった使い方が簡単に出来るようになるのです。  

### デモンストレーション
デモンストレーションでは、下記2つを主に行った。  

- Terraformを使ってマルチベンダーのRancherホストを管理する方法
- Rancher上で動くコンテナからAlibabaCloudのデータベースサービスを利用する方法