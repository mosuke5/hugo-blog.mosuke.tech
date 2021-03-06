+++
categories = ["AWS", "ブログ運用"]
date = "2017-12-05T14:53:46Z"
description = "AWS Cloud9でブログを書くことについて、AWS Cloud9で書いてみました。最高です。Hugoで管理しているブログをCloud9で書いてデプロイします。"
draft = false
image = ""
tags = ["Tech"]
title = "AWS Cloud9でブログを書くことについて、AWS Cloud9で書いてみた"
author = "mosuke5"
archive = ["2017"]
+++

こんにちは。mosuke5です。先日AWS re:Inventは楽しみましたか？  
まだキャッチアップしきれていないのですが、前から楽しみにしていたCloud9がついにAWSとしてでたので早速さわってみました。

せっかくなので、  
このブログ記事は**Cloud9でブログを書くことについて、Cloud9で書いている**様子をお伝えしています。
<!--more-->

## AWS Cloud9とは
Cloud9はもともとAWSとは関係なくブラウザエディタとして開発が進められていました。しかし、昨年AWSに買収され、ブラウザエディタがAWSとどう融合していくかとても楽しみにしていました。それが今年のre:InventにてついにAWS Cloud9として発表されました。
基本的な部分はもちろんいままでのCloud9と変わっていないのですが、いくつかの機能がAWSと連携するようになっていて、クラウド上での開発により最適化されたエディタとなっています。

Cloud9ではエディタを起動するときに、EC2インスタンスを同時にたちあげます。そしてEC2サーバ上のファイルを編集していくというスタイルです。簡単に言ってしまえば、インスタンスの時間課金で利用するエディタということです。

## ブログサイトをCloud9で管理する
冒頭にも書いたのですが、この記事をCloud9で書いていて、Cloud9でテストして、Cloud9から公開してみようとしています。
以前にブログで紹介したことがありますが、このブログはHugoを使ったスタティックWebとして構築しています。(過去記事は[こちら](https://blog.mosuke.tech/entry/2017/05/28/blog_migration/))
そのため、記事を書くのにすることといえば、

1. blogレポジトリをダウンロード
2. 記事を執筆
3. hugo serverを起動して確認
4. 問題なければGithubへプッシュ
5. あとはWerckerが起動して自動デプロイ

こんな流れなわけです。つまり、記事がかけて、Hugoやgitがインストールされた環境でコマンドラインが使えれば十分です。
AWS Cloud9ではこれがすべてブラウザだけで完結してしまうのです。すばらしい。

こちら書いている様子です。  
![cloud9_overview](/image/aws_cloud9_overview.png)

## ターミナル
AWS Cloud9では、Cloud9が操作するファイルはEC2インスタンス上にあります。
あります、というかEC2インスタンスを起動させその上のファイルを編集するわけです。
ということは、ファイルの編集だけでなくターミナル操作も可能なわけです。  
Gitはコマンドラインで操作したい派の自分としてはこれまた最高ですね。

![cloud9_overview](/image/aws_cloud9_terminal.gif)

## Vimモードもあって最高
ぼくはにわかVimmerで、Vimの操作ができることをいつも望んでいるのですが、Cloud9はちゃんとVimモードもあります。最高です。

## Cloud9でHugoを管理するにあたっての技術的なポイント
Cloud9でHugoを管理するにあたっていくつかの技術的なポイントで工夫が必要だったのでまとめておきます。

### SSHの鍵
Githubにあるレポジトリにアクセスしなければいけないので、SSHの鍵の問題がでてきます。  
Cloud9上で動くターミナルは端末からログインしているわけではないので、SSHのエージェントフォワードは活用できません。  
この点は仕方ないので、新しくSSH鍵を作成しGithubへ登録を行いました。ただ初回だけで継続して利用するならまあいいでしょう。

### Hugoサーバの立ち上げ
Hugoサーバを立ち上げて、実際に書いた記事を確認する必要がありますが、こういった仮想環境上だと一つ問題があります。
それは端末からCloud9で編集しているサーバに対してアクセスしなければいけなという点です。
そのためにはHugoサーバを立ち上げ時にベースURLとして、サーバのグローバルIPアドレスを指定する必要がありました。

```
$ hugo server -D -b <Global IPaddress> --bind 0.0.0.0
```

Cloud9ではしばらく利用していないと、自動的にEC2インスタンスを停止し費用の節約をしてくれます。  
しかし、AWSの仮想インスタンスの仕様上、一度インスタンスを停止し起動すると、IPアドレスなどが変更されてしうので、Hugoサーバを立ち上げるときのグローバルIPが毎回変わってしまいます。毎回調べて貼り付けるのはナンセンスすぎます。  
というわけで、AWSにはメタデータという便利な機能があるので、以下のようにサーバを起動するようにして解決しました。

```
$ hugo server -D -b `curl http://169.254.169.254/latest/meta-data/public-ipv4` --bind 0.0.0.0
```

メタデータの機能を知らない方は下記を見ておきましょう。  
[インスタンスメタデータとユーザーデータ](http://docs.aws.amazon.com/ja_jp/AWSEC2/latest/UserGuide/ec2-instance-metadata.html)

### セキュリティグループの設定
あたりまえですが、AWSのEC2上なのでHugoサーバで使う1313ポート（デフォルトでは）はセキュリティグループで開放しておきましょう。

## 自分のスタイルにあっている
とにかくCloud9を使い始めてこれは自分のスタイルにあっているなと感じました。  
ぼくは、あまりローカルPCでの開発をするのが好きではないです。Hugoのブログぐらいならいいですが、システム開発だと環境差分を大きくしないために、極力本番に近い環境でやりたいといつも思っています。  
また、Vimをよく使いますが、プラグインに依存せずなるべく素のまま使っているのもあるので、Cloud9のVimモードでまったく違和感がないのです。  
最後に、gitはコマンドライン派というのも大きいです。gitはコマンドライン行いたいのでそのあたりがスムーズにできる点も大きいです。

## では公開します
いろいろとつらつら書きましたが、そろそろ記事も終わりにしてGithubへプッシュしたいと思います。  
公開されたブログの世界でお会いしましょう。
