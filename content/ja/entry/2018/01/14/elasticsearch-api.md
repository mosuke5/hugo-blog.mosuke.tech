+++
categories = ["インフラ構築"]
date = "2018-01-14T14:00:39+09:00"
description = "ElasticSearch APIでよくつかうものをまとめました。基本的なAPIをいつもググっている方これみて活用してください。"
draft = false
image = ""
tags = ["Tech"]
title = "[随時更新] ElasticSearchの基本APIのまとめ"
author = "mosuke5"
archive = ["2018"]
+++

こんにちは。もーすけです。  
ElasticSearchを使っているのですがいつもAPI操作を忘れてしまうので、基本的な操作をまとめました。  
参考につかってください。

そもそものElasticSearchやKibanaのインストールなどについては下記をご覧ください。
<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2017/08/13/elasticsearch_basic/" data-iframely-url="//cdn.iframe.ly/e14fjI9"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

<!--more-->

## 全般
### ユーザ名とパスワードをつけてAPIを実行する
curlでのベーシック認証です。デフォルトでは、ユーザ名`elastic`、パスワード`password`とついていて使うことが多い。

```
$ curl  -u elastic:password -XGET 'localhost:9200/_cat/indices?v'
```

### レスポンス結果を見やすくする
GETパラメータに`pretty`をつける。以下で違いを見てみる。

```
$ curl -XPUT 'localhost:9200/blog'
{"acknowledged":true,"shards_acknowledged":true,"index":"blog"

$ curl -XPUT 'localhost:9200/blog?pretty'
{
  "acknowledged" : true,
  "shards_acknowledged" : true,
  "index" : "blog"
}
```

## インデックス、ドキュメント関連
### インデックスの一覧を確認する
作成したインデックスを確認する。`index`は複数形になると`indices`になるので注意。

```
$ curl 'localhost:9200/_cat/indices?v'
status index   uuid                   pri rep docs.count docs.deleted store.size pri.store.size
yellow open   blog    rwvaOBVcRaSLqt3NDRFZ-w   5   1          0            0       324b           324b
```

ちなみに`_cat`で出力できるものはこちらで確認できる。

```
$ curl -X GET 'localhost:9200/_cat'
=^.^=
/_cat/allocation
/_cat/shards
/_cat/shards/{index}
/_cat/master
/_cat/nodes
/_cat/tasks
/_cat/indices
/_cat/indices/{index}
/_cat/segments
/_cat/segments/{index}
/_cat/count
/_cat/count/{index}
/_cat/recovery
/_cat/recovery/{index}
/_cat/health
/_cat/pending_tasks
/_cat/aliases
/_cat/aliases/{alias}
/_cat/thread_pool
/_cat/thread_pool/{thread_pools}
/_cat/plugins
/_cat/fielddata
/_cat/fielddata/{fields}
/_cat/nodeattrs
/_cat/repositories
/_cat/snapshots/{repository}
/_cat/templates
```

### インデックスを作成する
`blog`という名前のインデックスを作成。Methodが`PUT`であることに注意。

```
$ curl -XPUT 'localhost:9200/blog'
```

### インデックスの削除をする
`blog`という名前のインデックスを削除する。

```
$ curl -XDELETE localhost:9200/blog
```

### インデックスのマッピングを確認する
インデックスのマッピングを確認する。

```
// インデックス全体
$ curl -XGET localhost:9200/blog/_mapping?pretty
true
{
  "blog" : {
    "mappings" : {
      "user" : {
        "properties" : {
          "image_url" : {
            "type" : "text",
            "index" : false
          },
          "last_login_at" : {
            "type" : "date",
            "fields" : {
              "keyword" : {
                "type" : "keyword",
                "ignore_above" : 256
              }
            },
(略)
```

```
// 特定のタイプのみ
$ curl -XGET localhost:9200/blog/user/_mapping?pretty
```

### バルクインサート
データをバルクインサートする。バルクインサートするデータのサンプルフォーマットはこちら。
```
$ cat sample-data.json
{ "index" : {} }
{"date" : "2017-08-13 10:00:00","title" : "ElasticSearch入門","body" : "ブログ記事の全文検索などをやりたくて、ElasticSearchはどんなもんじゃろか？と触ってみたのでメモ。ElasticSearchの入門についてはたくさんの記事がすでにでているので、ほぼ自分の理解のために残します。", "tag": ["ElasticSearch", "入門"]}
{ "index" : {} }
{"date" : "2017-08-14 22:00:00","title" : "ElasticSearch実践","body" : "ElasticSearchを利用した実践的な検索方法などについて開設します。また、クラスターの組み方なども解説。","tag": ["ElasticSearch", "実践", "検索"]}
{ "index" : {} }
{"date" : "2017-08-12 11:00:00","title" : "Hugoサマリー機能","body" : "今まで、ブログのトップページは最新の数記事の記事全文を掲載していました。  そのため、当然ながら記事内の画像や埋め込みの動画などすべて表示されるので、トップページの表示速度はとても遅くなります。  そこで、サマリーだけを表示しようとHugoの`{{ .Summary }}`を利用しようとしたのですが、とても長いサマリーが出てきてなぜかと困っていました。","tag": ["Hugo", "ブログ"]}
{ "index" : {} }
{"date" : "2017-08-04 11:00:00","title" : "英語でAWSソリューションアーキテクト認定の模擬試験を受けてみた","body" : "英語でAWSソリューションアーキテクト認定の模擬試験を受けてみたので報告。AWS認定試験ってどんなものか、英語の試験ってどんなものか、どんな学習をしたか、あたりの参考にしてください。","tag": ["英語", "AWS"]}
{ "index" : {} }
{"date" : "2017-07-14 20:00:00","title" : "Terraform×Rancherでマルチクラウドを一歩すすめる、を話してきた","body" : "TerraformとRancherを使って、マルチクラウドを環境の考え方についてはなしてきました。マルチクラウドのメリットや他のサービスとどう組み合わせていくか話しました。","tag": ["Terraform", "Rancher", "マルチクラウド"]}

// バルクインサート
$ curl -H "Content-Type: application/json" -XPOST 'localhost:9200/blog/post/_bulk?pretty&refresh' --data-binary @sample-data.json
```

### マッピング
マッピングを定義ファイルから設定する。

```
$ cat user.json
{
  "properties" : {
    "last_login_at" : {
      "type" : "date",
      "format": "yyyy-MM-dd HH:mm:ss",
      "fields" : {
        "keyword" : {
          "type" : "keyword",
          "ignore_above" : 256
        }
      }
    },
    "user_name" : {
      "type" : "text",
      "fields" : {
        "keyword" : {
          "type" : "keyword",
          "ignore_above" : 256
        }
      }
    },
    "image_url" : {
      "type" : "text",
      "index": false
      }
    }
  }
}

$ curl -XPUT 'localhost:9200/blog/_mapping/user?pretty' -d @user.json
```

### ドキュメントを削除する
```
$ curl -XDELETE localhost:9200/blog/user/123456
($ curl -XDELETE localhost:9200/:index/:type/:id)
```

## 検索関連
### 基本検索
```
//"ElasticSearch 入門"というキーワードで検索
$ curl 'localhost:9200/blog/_search?pretty' -d '
{
  "query": { "match": { "body": "ElasticSearch 入門" } }
}'
```