+++
categories = ["ElasticSearch", "API"]
date = "2018-01-14T14:00:39+09:00"
description = "ElasticSearch APIでよくつかうものをまとめました。基本的なAPIをいつもググっている方これみて活用してください。"
draft = false
image = ""
tags = ["Tech"]
title = "[随時更新] ElasticSearchの基本APIのまとめ"
author = "mosuke5"
archive = ["2018"]
+++

とにかく、ElasticSearchの基本APIを自分のためにまとめていったものです。  
参考につかってください。
<!--more-->

## 全般
### ユーザ名とパスワードをつけてAPIを実行する
```
$ curl  -u user:password -XGET localhost:9200/_cat/indices?v
```

### レスポンス結果を見やすくする
パラメータに`pretty`をつける。

```
$ curl -XGET 'localhost:9200/xxxxx?pretty
```

## インデックス、ドキュメント関連
### インデックスの一覧を確認する
```
$ curl localhost:9200/_cat/indices?v
status index   uuid                   pri rep docs.count docs.deleted store.size pri.store.size
yellow open   blog    rwvaOBVcRaSLqt3NDRFZ-w   5   1          0            0       324b           324b
```

### インデックスを作成する
```
$ curl -XPUT localhost:9200/blog
```

### インデックスの削除をする
```
$ curl -XDELETE localhost:9200/blog
```

### インデックスのマッピングを確認する
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


// 特定のタイプのみ
$ curl -XGET localhost:9200/blog/user/_mapping?pretty
```

### バルクインサート
```
$ curl -H "Content-Type: application/json" -XPOST 'localhost:9200/blog/post/_bulk?pretty&refresh' --data-binary @sample-data.json
```

### マッピング
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