+++
archive = ["2017"]
author = "mosuke5"
categories = ["Hugo","はてなブログ"]
date = "2017-05-28T13:02:14+09:00"
description = "はてなブログからHugoに移行した。移行した理由は移行に際して行ったことをご紹介します。例えば、Hugoを運用するアーキテクチャや移行時に利用したスクリプトや注意事項など。"
draft = true
image = ""
tags = ["Tech"]
title = "はてなブログからHugoに移行した際に行ったあれこれ"

+++

# はじめに
2017年5月27日に2014年2月から約3年3ヶ月程度使ってきたはてなブログからHugoを使ったブログへ移行をした。  
長らく使いやすいブログを提供してきたはてなさんにはとても感謝している。  
はてなブログはとても魅力なブログプラットフォームであると感じているし、いまでもそう思うのだけれどいくつかの判断をした結果Hugoへの移行を決めた。  
本記事では、移行を決めた理由や移行する際に行ったこと、Hugoの実行環境などを紹介する。

# Hugoに移行した理由
Hugoに移行した理由というか、はてなブログから別のところに移行しようとした理由になるのだが、  
端的に言うと以下のとおりだ。

- 常時SSL化したかった
- HTTP/2に対応したかった
- 独自ドメイン(mosuke.tech)を利用したかった

（常時SSLの背景）

Hugo以外にももちろん他のツールやサイトも検討を行った。

- はてなブログPro
- jekyll
- medium

まず、はてなブログProだが、もっとも手間がかからず独自ドメイン利用もできてよかったのだが、  
SSL化とHTTP/2化はやはり難しかったので外部を検討した。 

次にGithub製のJelyllだが、Github Pagesとの相性もよくはじめに検討はじめたものだった。  
Ruby製ということもあり、自分に馴染みのあるツールで最有力候補だった。  
しかし、後発のHugoの完成度の高さ、コンパイルの速さ、気に入ったテンプレートがあった、という理由でHugoに劣った。

最後にmediumだが、自前で構築することなくやりたいことのすべてを実現していた。  
正直一番いいのではないかとも思う（笑）  
最終的には、よりカスタマイズ度の高いHugoを選んだ。特にこれといった理由はない。  
ちょうどGo言語をやってみたいモチベーションがあったので、これをきっかけに勉強がはかどればいいなぁくらいの気持ちはあった。

# 移行に際して行ったこと
## Hugoでのサイト構築、アーキテクチャ
Github上でHugoを管理し、コンパイルしてできたPublicファイルを、Github Pages対応の別のレポジトリで管理。  
独自ドメイン利用、SSL対応、HTTP/2対応するためにフロントにCloudFlareを利用した。  
後ほど後述したいと思うが、CloudFlareはとても便利なツールだが、キャッシュの扱いは気をつけてなければいけない。  
図にすると以下のとおりだ。

![hugo-architecture](/image/hugo-architecture.png)

## 記事の移行
はてなブログはそのままのこし、新規に書くブログからHugoへ移行することも検討したが、  
せっかくなのではてなブログ時代に書いた記事もすべて移行することを決めた。

### Hugoファイルへの変換
はてなブログからデータのエクスポートができる。  
![hatena-blog-entry-export](/image/hatena-blog-entry-export.png)

エクスポートしたファイルを簡単なスクリプトを作ってHugoファイルへの変換を行った。（[Github mosuke5/hatena-blog-parser](https://github.com/mosuke5/hatena-blog-parser)）  
しかし、正直汎用的なツールではなく、このスクリプトだけではうまく行かない部分もあり、  
いくぶんかsedなど使って（たまに手動編集・・・）して整えた。

#### はてなブログのエクスポートファイルのフォーマット
```
--------
AUTHOR: mosuke5
TITLE: 万能じゃない。オブジェクトストレージの仕組みと利用を正しく理解する
BASENAME: 2017/03/18/182252
STATUS: Publish
ALLOW COMMENTS: 1
CONVERT BREAKS: 0
DATE: 03/18/2017 18:22:52
CATEGORY: オブジェクトストレージ
CATEGORY: ObjectStorage
CATEGORY: クラウド
CATEGORY: S3
IMAGE: https://cdn-ak.f.st-hatena.com/images/fotolife/m/mosuke5/20170318/20170318164020.jpg
-----
BODY:
<h2>1.はじめに</h2>

<p><a class="keyword" href="http://d.hatena.ne.jp/keyword/Amazon%20S3">Amazon S3</a>をはじめとして、オブジェクトストレージが身近になってきています。<br/>
各<a class="keyword" href="http://d.hatena.ne.jp/keyword/%A5%AF%A5%E9%A5%A6%A5%C9">クラウド</a>ベンダーはオブジェクトストレージサービスを提供しています。</p>
```

#### 変換後のHugoファイルフォーマット

```
+++
Categories = ["オブジェクトストレージ", "ObjectStorage", "クラウド", "S3"]
Description = " 1.はじめに  Amazon S3をはじめとして、オブジェクトストレージが身近になってきています。 各クラウドベンダーはオブジェクトストレージサービスを提供しています。   Amazon S3  Azure Blob Storage  G"
Tags = ["オブジェクトストレージ", "ObjectStorage", "クラウド", "S3"]
date = "2017-03-18T18:22:00+9:00"
title = "万能じゃない。オブジェクトストレージの仕組みと利用を正しく理解する"
author = "mosuke5"
archive = ["2017"]
+++

<h2>1.はじめに</h2>

<p><a class="keyword" href="http://d.hatena.ne.jp/keyword/Amazon%20S3">Amazon S3</a>をはじめとして、オブジェクトストレージが身近になってきています。<br/>
各<a class="keyword" href="http://d.hatena.ne.jp/keyword/%A5%AF%A5%E9%A5%A6%A5%C9">クラウド</a>ベンダーはオブジェクトストレージサービスを提供しています。</p>
```

## リダイレクト関連
### リダイレクト処理
はてなブログのデザイン設定から「ヘッダー」→「タイトル下」に、ブログ移転をお知らせする文言とリダイレクト処理を書いた。

```javascript
<p><span style="font-size: 150%; color: blue;">ブログ移転しました。5秒後にリダイレクトします。</span><br />
<script type="text/javascript" language="javascript">
// 新urlの作成
var domain = "https://blog.mosuke.tech";
var path = location.pathname; // パスの整形
var url = domain + path; 

// リンクhtmlの出力
document.write("<a href=\"" + url + "\">" + url + "</a></p>");

// リダイレクト
setTimeout("redirect()", 5000);  // 5 sec
function redirect(){
   location.href = url; 
}
</script>
```

### スマホサイトでのリダイレクト
スマホで開いた時にも同様の動作をして欲しかったのだが、私の設定ではもともと、  
スマホは別デザインとなっていて、うえで設定したJSが実行されない。  
スマホ用でHTML/JSを埋め込むのは有料プランでしかできず、  
「詳細設定」の「レスポンシブデザイン」にチェックを入れて、スマホで表示した場合もPCと同じ画面を出すようにして対応した。

```
[x] レスポンシブデザイン
スマートフォンでもPCと同じデザイン設定でブログを表示します。レスポンシブデザインのテーマを設定しているときのみ使用してください。
```

### Google Search Console
一般的にブログのドメイン変更を行った場合は、
変更元のサイトで301リダイレクトを行ってGoogleに恒久的にサイトが移動したことを伝える。
しかし、はてなブログを利用しているとWebサーバレベルでの変更はできず、301リダイレクトができない。
Canonicalを変更したりしたが、うまくGoogle Search Consoleに変更を読み取らせることができなかった。
（いい方法あったら教えてください…）

なので以下手順で移行を進めた。

1. 新サイト(blog.mosuke.tech)を公開
1. はてなブログにJavaScriptによるリダイレクト処理追加
1. はてなブログへのクローリングを拒否

## CloudFlareのキャッシュ削除
フロントにCloudFlareを利用していると書いた。  
Hugoは静的ブログサイトなので、基本的にCloudFlare側で全てキャッシュする。
そのため、ブログ記事の更新やデザインの本番への反映が時間かかる。

CloudFlareは便利なものでapiを用意している。
簡単だが、以下のようなキャッシュ全削除スクリプトを用意した。

```shell
#!/bin/sh
curl -X DELETE "https://api.cloudflare.com/client/v4/zones/$1/purge_cache" \
     -H "X-Auth-Email: $2" \
     -H "X-Auth-Key: $3" \
     -H "Content-Type: application/json" \
     --data '{"purge_everything":true}'
```

# 今後の課題
まずは新しいHugoの環境でブログを書いて、課題点など洗いだしていく必要がある。  
あとは、はてなブログからの移行でだいぶSEOあたり下がったと思う。  
そのあたりの挽回をどうするかはこれからの検討課題。  
あとは、デプロイからCloudFlareのキャッシュ削除の流れはぜひ自動化していきたい。