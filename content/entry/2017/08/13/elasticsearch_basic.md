+++
categories = ["インフラ構築"]
date = "2017-08-13T16:28:48+09:00"
description = "ブログ記事の全文検索などをやりたくて、ElasticSearchはどんなもんじゃろか？と触ってみました。AWS上でElasticSearchのインストールと入門的な検索やデータのインポート方法、そしてKibanaについて解説します。"
draft = false
image = ""
tags = ["Tech"]
title = "ElasticSearch入門 インストールから検索、そしてKibanaまで"
author = "mosuke5"
archive = ["2017"]
+++

ブログ記事の全文検索などをやりたくて、ElasticSearchはどんなもんじゃろか？と触ってみたのでメモ。
ElasticSearchの入門についてはたくさんの記事がすでにでていますが、本記事ではインストールからデータの投入、検索、そしてKibanaまで扱います。

<!--more-->

## 1.ElasticSearchとは
ElasticSearchとはElastic社が提供する、全文検索エンジンのソフトウェアです。
Elastic社はいくつかのソフトウェアを提供しているのですが、ElasticSearchはそのプロダクトラインナップの中核であり、他のソフトウェアはElasticSearchを支えるソフトウェアという立ち位置になっています。

Elastic社が提供するソフトウェア体系を図にすると以下のとおりです。(Fluentdは他社が提供するものですが、類似製品としてよく利用されるので載せておきました。)

![elastic-products](/image/elastic-products.png)

「Elastic」という言葉はクラウド時代になって、かなり浸透した言葉かと思いますが、その名前がついているとおり、スケーラビリティがあるということはこのプロダクトの大きなポイントとしているようです。分散アーキテクチャでスケールしやすい点は抑えておく必要があります。

ElasticSearchのデータ構造などはこちらの記事がわかりやすいです。  
本当は自分の言葉で説明したいところでしたが、現時点でこのブログにまさる解説は難しいです…  
http://dev.classmethod.jp/server-side/elasticsearch-getting-started-01/

## 2.ElasticSearchをシングルノードで動かす
### 環境
今回はAWSのEC2上にインストールして試してみました。インスタンスタイプはt2.mediumで、OSはCentOS7.4を選択しています。

### インストール
ElasticSearchはJavaで動作します。なのでJavaのインストールを行います。  
推奨は、「1.8.0_131 or later」とのことです。詳しくは以下参照。  
https://www.elastic.co/guide/en/elasticsearch/reference/current/setup.html

CentOS7.4ではYumで条件を満たすJavaがインストールできますが、環境によってはインストールできないので、適宜ダウンロードしたりしてインストールしてください。
```
$ sudo yum install java
```

続いてElasticSearch本体のインストールですが、いろいろやり方はありますが、公式のYumレポジトリの登録をすると便利です。
```
$ sudo vim /etc/yum.repos.d/elasticsearch.repo
[elasticsearch-5.x]
name=Elasticsearch repository for 5.x packages
baseurl=https://artifacts.elastic.co/packages/5.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=1
autorefresh=1
type=rpm-md

$ sudo yum install elasticsearch
```

あとは起動するだけで実は最低限は動きます。簡単ですね。

```
$ sudo systemctl enable elasticsearch
$ sudo systemctl start elasticsearch
$ sudo systemctl status elasticsearch
● elasticsearch.service - Elasticsearch
   Loaded: loaded (/usr/lib/systemd/system/elasticsearch.service; enabled; vendor preset: disabled)
   Active: active (running) since Sun 2017-08-13 07:07:34 UTC; 1h 2min ago
     Docs: http://www.elastic.co
  Process: 12494 ExecStartPre=/usr/share/elasticsearch/bin/elasticsearch-systemd-pre-exec (code=exited, status=0/SUCCESS)
 Main PID: 12496 (java)
   CGroup: /system.slice/elasticsearch.service
           └─12496 /bin/java -Xms2g -Xmx2g -XX:+UseConcMarkSweepGC -XX:CMSInitiatingOccupancyFraction=75 -XX:+UseCMSInitiatingOccupancyOnly -XX:+AlwaysPreTou...

Aug 13 07:07:34 ip-172-31-22-86.ap-northeast-1.compute.internal systemd[1]: Starting Elasticsearch...
Aug 13 07:07:34 ip-172-31-22-86.ap-northeast-1.compute.internal systemd[1]: Started Elasticsearch.
```

起動の確認をします。デフォルトでは9200番ポートでAPIを利用できます。
```
$ curl localhost:9200
{
  "name" : "mJ6XIq1",
  "cluster_name" : "elasticsearch",
  "cluster_uuid" : "r_sINFWcQKeSheOqYejhOA",
  "version" : {
    "number" : "5.5.1",
    "build_hash" : "19c13d0",
    "build_date" : "2017-07-18T20:44:24.823Z",
    "build_snapshot" : false,
    "lucene_version" : "6.6.0"
  },
  "tagline" : "You Know, for Search"
}

//ついでに9200ポート見とく
$ sudo lsof -i:9200
COMMAND   PID          USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
java    13118 elasticsearch  133u  IPv6 140804      0t0  TCP *:wap-wsp (LISTEN)
```

### 使ってみる
ElasticSearchなのではやく何か検索したい！って思うかと思います。  
ぼくもそう思いました。

検索するためのデータを投入していきましょう。  
まずは、インデックスの作成を行います。

```
// blogというインデックスを作成
$ curl -XPUT localhost:9200/blog

// インデックスの確認
$ curl localhost:9200/_cat/indices?v
health status index   uuid                   pri rep docs.count docs.deleted store.size pri.store.size
yellow open   blog    rwvaOBVcRaSLqt3NDRFZ-w   5   1          0            0       324b           324b
```

##### Q.healthがyellowだけどだいじょうぶなの？
この段階では大丈夫です。サーバが1台のみだとレプリカを配置できないのでyellowとなりますが、動作上は問題ありません。

データを投入していきます。
下記のように1件ずつ投入することができます。


```
$ curl -XPUT 'localhost:9200/blog/entry/1' -d '
{
  "date": "2017-08-13T16:28:48+09:00",
  "title": "ElasticSearch入門",
  "body": "ブログ記事の全文検索などをやりたくて、ElasticSearchはどんなもんじゃろか？と触ってみたのでメモ。ElasticSearchの入門についてはたくさんの記事がすでにでているので、ほぼ自分の理解のために残します。"
}'

//Response
{"_index":"blog","_type":"entry","_id":"1","_version":1,"result":"created","_shards":{"total":2,"successful":1,"failed":0},"created":true}
```

が、今回はあらかじめ用意したデータでいくつかのデータをまとめて入れていきたいと思います。  
サンプルデータ：[test.json](/entry/2017/08/13/test.json)

```
$ curl -o https://blog.mosuke.tech/entry/2017/08/13/test.json
$ curl -H "Content-Type: application/json" -XPOST 'localhost:9200/blog/entry/_bulk?pretty&refresh' --data-binary @test.json
```

##### Q.curlするときにパラメータにprettyってつけているのはなんで？？
prettyパラメータを付けるとレスポンスのJsonを整形して出力してくれます。
jqなど利用してもいいと思いますが、prettyつけるだけでお手軽に見やすくなります。


### 検索しよう
ではいよいよ、「検索」やっていきます。  
細かい検索の方法はまずおいておいてキーワード検索を！  

```
//"ElasticSearch 入門"というキーワードで検索
$ curl 'localhost:9200/blog/_search?pretty' -d '
{
  "query": { "match": { "body": "ElasticSearch 入門" } }
}'

//結果レスポンス
{
  "took" : 2,
  "timed_out" : false,
  "_shards" : {
    "total" : 5,
    "successful" : 5,
    "failed" : 0
  },
  "hits" : {
    "total" : 2,
    "max_score" : 2.9046252,
    "hits" : [
      {
        "_index" : "blog",
        "_type" : "entry",
        "_id" : "AV3gigX6d7baLXgnTis6",
        "_score" : 2.9046252,
        "_source" : {
          "date" : "2017-08-13 10:00:00",
          "title" : "ElasticSearch入門",
          "body" : "ブログ記事の全文検索などをやりたくて、ElasticSearchはどんなもんじゃろか？と触ってみたのでメモ。ElasticSearchの入門についてはたくさんの記事がすでにでているので、ほぼ自分の理解のために残します。",
          "tag" : [
            "ElasticSearch",
            "入門"
          ]
        }
      },
      {
        "_index" : "blog",
        "_type" : "entry",
        "_id" : "AV3gigX6d7baLXgnTis7",
        "_score" : 0.7911521,
        "_source" : {
          "date" : "2017-08-14 22:00:00",
          "title" : "ElasticSearch実践",
          "body" : "ElasticSearchを利用した実践的な検索方法などについて開設します。また、クラスターの組み方なども解説。",
          "tag" : [
            "ElasticSearch",
            "実践",
            "検索"
          ]
        }
      }
    ]
  }
}
```

検索結果はスコアリングまでしてくれていてとてもいい感じ。  
「ElasticSearch」と「入門」の２つのワードで検索し、両方のワードを持つ記事のスコアが高くなっているのがわかります。

その他、基本的な検索オプションもほぞぼそと紹介します。

```
//sizeは取り出すデータの量。SQLでいうLimit
$ curl 'localhost:9200/blog/_search?pretty' -d '
{
  "query": { "match_all": {} },
  "size": 1
}'

//取り出すデータフィールドの指定。SQLでいうselect指定的な
$ curl 'localhost:9200/blog/_search?pretty' -d '
{
  "query": { "match_all": {} },
  "_source": ["title"]
}'

//タイトルで検索
$ curl 'localhost:9200/blog/_search?pretty' -d '
{
  "query": { "match": { "title": "ElasticSearch" } }
}'

//「ElasticSearch」と「全文検索」のAND検索
$ curl 'localhost:9200/blog/_search?pretty' -d '
{
  "query": { "match": { "title": "ElasticSearch" } },
  "query": { "match": { "body": "全文検索" } }
}'
```

## 3.Kibana
最後にKibanaについて少し書きます。
KibanaはElasticSearchと組み合わせて利用する可視化ツールです。
ElasticSearchの検索クエリーをGUI上から実行できたり、その結果を可視化したりすることができます。

AWS上で動かしているので、`server.host`の設定を変更して、外部からアクセスできるようにしています。  
外部に晒すのは危険なこともあるので、注意してください。
また、AWS上のセキュリティグループの設定も見直してくださいね。

```
//まずはインストール
$ sudo yum install kibana

//外部ネットワークからアクセスできるように
$ sudo vim /etc/kibana/kibana.yml
server.host: "0.0.0.0"

//起動して起動の確認
$ sudo systemctl enable kibana
$ sudo systemctl start kibana
$ sudo systemctl status kibana
● kibana.service - Kibana
   Loaded: loaded (/etc/systemd/system/kibana.service; disabled; vendor preset: disabled)
   Active: active (running) since Tue 2017-08-15 09:15:42 UTC; 11min ago
 Main PID: 21269 (node)
   CGroup: /system.slice/kibana.service
           └─21269 /usr/share/kibana/bin/../node/bin/node --no-warnings /usr/share/kibana/bin/../src/cli -c /etc/kibana/kibana.yml
```

ではさっそく接続して、なにかやってみます。  
デフォルトでは`5601`番ポートでアクセスできます。

Tag Cloudという機能があったのでためしてみました。
タグに利用されている頻度が大きいものが大きく表示されます。

![kibana-blog-tag-cloud](/image/kibana-blog-tag-cloud.png)

## 4.さいごに
今回は、本当にインストールして触るという初歩的なことを扱いました。  
これからElasticSearchを使って実践的なことをやっていこうと思っているので、おもしろい報告ができたらと思います。