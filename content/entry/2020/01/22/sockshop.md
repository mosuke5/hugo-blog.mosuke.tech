+++
categories = ["アプリケーション開発", "Kubernetes"]
date = "2020-01-22T14:44:04+09:00"
description = "Sock Shopを使ってマイクロサービスの体験をしていきます。マイクロサービスの特徴や課題を体験できるようにシナリオを作りました。ただ起動して終わりではなく、Sock Shopからより多くのことを学ぶきっかけとなればと思います。"
draft = false
image = ""
tags = ["Tech"]
title = "Sock Shopを使ったマイクロサービス体験のハンズオン"
author = "mosuke5"
archive = ["2020"]
+++

あけましておめでとうございます。<a href="https://twitter.com/mosuke5" target="_blank">@mosuke5</a>です。  
マイクロサービスの実際の体験や研修を探したことがありますでしょうか。
残念ながら、実際に手を動かしなら学ぶトレーニングや研修は多く存在しませんが、
マイクロサービスのデモアプリケーションとして<a href='https://microservices-demo.github.io/' target='_blank'>Sock Shop</a>が有名で、これはトレーニングに最適です。

日本語でもたくさんのSock Shopの紹介やインストール記事がでています。しかし、自分もそうだったのですが、なんとなく起動して動かして、終わりとなっているものがおおく、どんな観点でこのSock Shopをいじっていけばいいかの情報が足りないと感じました。
機会があり、Sock Shopをさわるタイミングがあったので、実際にどんなデータ構造になっているのか、マイクロサービスゆえの課題など、Sock Shopから少しでも多くの学びが得られるようにこの記事を書きます。
<!--more-->

## Sock Shopを動かす
Sock Shopはdocker-composeを始め、Kubernetesなど多様な環境で動かせるようになっています。
この記事では、Kubernetesを例に書きますが、どの環境で動かしていただいても構いません。
本ブログでは起動方法については割愛します。お好みの環境で動かしてみてください。

また、OpenShift上でSock Shopを動かしたい場合は<a href="https://github.com/mosuke5/microservices-demo-openshift">こちらのレポジトリ</a>も参考にしてください。

## Sock Shopのアーキテクチャ
Sock Shopのデザインは下記の通りで、Java, NodeJS, Goなどとマイクロサービスの特徴であるポリグロットを体現しています。
ポリグロットな構成に「できる」、というだけで戦略なしに「やっていい」というわけではないので、この点は誤解ないように理解していきましょう。詳細は[こちら](front-end-rh-mori-sock-shop.3d6a.kepcodevops.openshiftapps.com)。

![application-design](/image/sockshop-architecture.png)

## データ構造を見る
まずは、データ構造を見ていきます。  
マイクロサービスでは、どこのサービスでどのようにデータを持つかは非常に重要です。
Sock Shopではデータベースを持つサービスが4つあります。
下では、サンプルの出力結果を表示しておきますが、ぜひ自分の目で確かめていくといいです。

- catalogue (mysql)
- user (mongodb)
- cart (mongodb)
- order (mongodb)

### catalogue
靴下の商品情報や、靴下のタグの情報を管理するcatalogueサービスのデータベース構造を示します。
MySQLを利用しており、非常にわかりやすいデータ構造となっています。
`sock`テーブルでは靴下の情報を`tag`テーブルでは靴下のタグ情報を管理しており、それらは1対nの関係性なので、`sock_tag`テーブルで中間テーブルとして機能させています。

```
mysql> desc sock;
+-------------+--------------+------+-----+---------+-------+
| Field       | Type         | Null | Key | Default | Extra |
+-------------+--------------+------+-----+---------+-------+
| sock_id     | varchar(40)  | NO   | PRI | NULL    |       |
| name        | varchar(20)  | YES  |     | NULL    |       |
| description | varchar(200) | YES  |     | NULL    |       |
| price       | float        | YES  |     | NULL    |       |
| count       | int(11)      | YES  |     | NULL    |       |
| image_url_1 | varchar(40)  | YES  |     | NULL    |       |
| image_url_2 | varchar(40)  | YES  |     | NULL    |       |
+-------------+--------------+------+-----+---------+-------+

mysql> desc sock_tag;
+---------+--------------+------+-----+---------+-------+
| Field   | Type         | Null | Key | Default | Extra |
+---------+--------------+------+-----+---------+-------+
| sock_id | varchar(40)  | YES  | MUL | NULL    |       |
| tag_id  | mediumint(9) | NO   | MUL | NULL    |       |
+---------+--------------+------+-----+---------+-------+

mysql> desc tag;
+--------+--------------+------+-----+---------+----------------+
| Field  | Type         | Null | Key | Default | Extra          |
+--------+--------------+------+-----+---------+----------------+
| tag_id | mediumint(9) | NO   | PRI | NULL    | auto_increment |
| name   | varchar(20)  | YES  |     | NULL    |                |
+--------+--------------+------+-----+---------+----------------+

mysql> select * from tag;
+--------+--------+
| tag_id | name   |
+--------+--------+
|      1 | brown  |
|      2 | geek   |
|      3 | formal |
|      4 | blue   |
|      5 | skin   |
|      6 | red    |
|      7 | action |
|      8 | sport  |
|      9 | black  |
|     10 | magic  |
|     11 | green  |
+--------+--------+
```

### user
続いて、ユーザを管理するサービスです。
mongodbのcollectionは3つ存在します。

```
> show collections;
addresses
cards
customers

> db.customers.find()
{
  "_id" : ObjectId("57a98d98e4b00679b4a830af"),
  "firstName" : "Eve",
  "lastName" : "Berger",
  "username" : "Eve_Berger",
  "password" : "fec51acb3365747fc61247da5e249674cf8463c2",
  "salt" : "c748112bc027878aa62812ba1ae00e40ad46d497",
  "addresses" : [ ObjectId("57a98d98e4b00679b4a830ad") ],
  "cards" : [ ObjectId("57a98d98e4b00679b4a830ae") ]
}

> db.cards.find()
{
  "_id" : ObjectId("57a98d98e4b00679b4a830ae"),
  "longNum" : "5953580604169678",
  "expires" : "08/19",
  "ccv" : "678"
}

> db.addresses.find()
{
  "_id" : ObjectId("57a98d98e4b00679b4a830ad"),
  "street" : "ebisu street",
  "number" : "1-1-1",
  "country" : "japan",
  "city" : "tokyo",
  "postcode" : "111-1111",
  "links" : {  }
}
```

### cart
次は、ショッピングカートです。

```
> show collections
cart
item

> db.cart.find()
{
  "_id" : ObjectId("5e20278e03277a00079dd215"),
  "_class" : "works.weave.socks.cart.entities.Cart",
  "customerId" : "5e184694b6c6850001a762da",
  "items" : [
    DBRef("item", ObjectId("5e2115f003277a00079dd217"))
  ]
}

> db.item.find()
{
  "_id" : ObjectId("5e2115f003277a00079dd217"),
  "_class" : "works.weave.socks.cart.entities.Item",
  "itemId" : "510a0d7e-8e83-4193-b483-e27e09ddc34d",
  "quantity" : 1,
  "unitPrice" : 15
}
...
```

### order
最後は、注文履歴を管理するorderサービスです。  
orderサービスの中では、注文した商品のIDのみ保有し、そのデータは持っていないことは少し頭の片隅に覚えておいてください。
後ほど、サービスをまたいだデータの取得に関して考えていきます。

```
> show collections;
customerOrder

> db.customerOrder.find()
{
  "_id" : ObjectId("5e197a445196950008004bf1"),
  "_class" : "works.weave.socks.orders.entities.CustomerOrder",
  "customerId" : "5e184694b6c6850001a762da",
  "customer" : {
    "_id" : null,
    "firstName" : "shinya",
    "lastName" : "mori",
    "username" : "mosuke5",
    "addresses" : [ ],
    "cards" : [ ]
  },
  "address" : {
    "_id" : null,
    "number" : "1-1-1",
    "street" : "ebisu street",
    "city" : "tokyo",
    "postcode" : "111-1111",
    "country" : "japan"
  },
  "card" : {
    "_id" : null,
    "longNum" : "111111111",
    "expires" : "03.22",
    "ccv" : "111"
  },
  "items" : [
    {
      "_id" : ObjectId("5e184c4b03277a00079dd204"),
      "itemId" : "3395a43e-2d88-40de-b95f-e00e1502085b",
      "quantity" : 1,
      "unitPrice" : 18 
    },
    {
      "_id" : ObjectId("5e197a2703277a00079dd206"),
      "itemId" : "510a0d7e-8e83-4193-b483-e27e09ddc34d",
      "quantity" : 1,
      "unitPrice" : 15
    },
    {
      "_id" : ObjectId("5e197a2f03277a00079dd207"),
      "itemId" : "808a2de1-1aaa-4c25-a9b9-6612e8f29a38",
      "quantity" : 1,
      "unitPrice" : 17.31999969482422
    },
    {
      "_id" : ObjectId("5e197a3203277a00079dd208"),
      "itemId" : "819e1fbf-8b7e-4f6d-811f-693534916a8b",
      "quantity" : 1,
      "unitPrice" : 14
    },
    {
      "_id" : ObjectId("5e197a3a03277a00079dd209"),
      "itemId" : "d3588630-ad8e-49df-bbd7-3167f7efb246",
      "quantity" : 1,
      "unitPrice" : 10.989999771118164
    },
    {
      "_id" : ObjectId("5e197a3e03277a00079dd20a"),
      "itemId" : "a0a4f044-b040-410d-8ead-4de0446aec7e",
      "quantity" : 1,
      "unitPrice" : 7.989999771118164
    }
  ],
  "shipment" : {
    "_id" : "70a338f4-f40c-4512-86c7-5ad6ed8d57eb",
    "name" : "5e184694b6c6850001a762da" 
  },
  "date" : ISODate("2020-01-11T07:33:24.861Z"),
  "total" : 88.29000091552734
}
```

### データ分割による弊害
このアプリケーションではマイクロサービス特有のデータの分割による問題がしっかり発生しています。  
靴下を注文したあと、注文履歴を見るページでは、注文の情報と注文した商品の情報の両方を表示しています。
しかし、catalogueとorderの2つでサービスを分離しているため、これらの情報をまとめて取得することができません。

![sockshop-order-screen](/image/sockshop-order-screen.png)

では、どのように取得しているか見ていきます。  
下記のように、orderサービスに問い合わせたあと、注文した商品を別でcatalogueサービスに問い合わせにいっています。
いわゆるN+1問題が発生しています(<a href-"https://github.com/microservices-demo/front-end/blob/5e21067c2011a1f220322a704c9984fa206c4d12/public/customer-order.html#L205" target="_blank">該当のコード</a>)。
これは、マイクロサービスではよく発生します。

![sockshop-order](/image/sockshop-order.png)

解決へのアプローチはいくつかあります。  
どれがいいということはなく、データの特性などによるのですが、以下のようなポイントを考えていくといいと思います。

1. そもそもデータの特性はどうか？
    - リアルタイムに更新が必要な情報か。
1. DBを非正規化して対応するか？
1. オーダー処理をイベントとして保存しておくか？
1. 複数のitemを取得できるAPIをつくるか？
1. 共有データベースにしてしまうか？
1. BFFで結合、キャッシュするか？
1. item情報を同期するか？CQRSパターンを採用するか？


## APIを実行する
商品オーダーのAPIなどは当然ながら認証しないとと実行できません。
残念ながら、認証の方法などについてドキュメントに書いていなかったので補足していきます。
認証はクッキーを使います。  
試しに、ログインセッションを持たないまま、オーダーAPIを実行してみるとログインしてくれとエラーが返ってきます。

```
$ curl -XGET $FRONTEND_ADDRESS/orders
{"message":"User not logged in.","error":{}}
```

ログインには"username:password"をbase64でエンコードしたものが必要です([該当コード](https://github.com/microservices-demo/front-end/blob/5d9a4272fec3983250364917d8ea7a210cdbf58c/public/js/client.js#L23))。  
コマンドラインで生成するか、こちらのような[Base64エンコードをしてくれるWebサービス](https://uic.jp/base64encode/)で生成しましょう。

```
$ echo -n "user:password" | base64
dXNlcjpwYXNzd29yZA==

$ curl -XGET -c cookie.txt -H "Authorization: Basic dXNlcjpwYXNzd29yZA==" -v $FRONTEND_ADDRESS/login

$ cat cookie.txt
# Netscape HTTP Cookie File
# https://curl.haxx.se/docs/http-cookies.html
# This file was generated by libcurl! Edit at your own risk.

xxxxxxx
```

ログインができているか確認します。オーダー情報が返ってきていれば成功です。

```
$ curl -XGET -b cookie.txt $FRONTEND_ADDRESS/orders
[
    {
        "customerId": "57a98d98e4b00679b4a830b2",
        "customer": {
            "firstName": "User",
            "lastName": "Name",
            "username": "user",
            "addresses": [],
            "cards": []
        },
        "address": {
            "number": "246",
            "street": "Whitelees Road",
            "city": "Glasgow",
            "postcode": "G67 3DL",
            "country": "United Kingdom"
        },
        "card": {
            "longNum": "5544154011345918",
            "expires": "08/19",
            "ccv": "958"
        },
        "items": [
            {
                "itemId": "808a2de1-1aaa-4c25-a9b9-6612e8f29a38",
                "quantity": 1,
                "unitPrice": 17.32
            }
        ],
        "shipment": {
            "name": "57a98d98e4b00679b4a830b2"
        },
        "date": "2019-12-23T06:35:49.925+0000",
        "total": 22.31,
        "_links": {
            "self": {
                "href": "http://orders/orders/5e006045dc2f2e0006f35ee4"
            },
            "order": {
                "href": "http://orders/orders/5e006045dc2f2e0006f35ee4"
            }
        }
    }
]
```

ログインさえできてしまえば、同じ要領で他のAPIも実行することが可能です。
APIは[こちらを参考](https://microservices-demo.github.io/api/index.html)にしながら実行していくことが可能です。

## 独立性、回復性 
マイクロサービスのメリットの中には、サービスが独立することによる、デプロイやスケールのしやすさや回復性があります。
実際に特定のサービスの停止・スケール・デプロイをやってみます。

### cartsサービスの停止
マイクロサービスの回復性について考えてみます。  
cartsサービスを落としてみて、どんな影響があるか確認してみます。

```
$ kubectl scale --replicas=0 deployment/carts
```

- オーダーはできるか？
- 他のコンポーネントへの影響は？
- ユーザ体験はどう変わったか？

#### デグレードの実装
cartsサービスを落としたあと、UI上からカートボタンが消えました。（ボタンが消えるのにタイムラグがあるのはまあサンプル実装だから大目に見ようｗ）
これは、よくあるデグレードの考え方を実装しているからです。マイクロサービスでは、利用するマイクロサービスがどういう状態か把握し、防御的な実装をいれることがあります。
その１つの例になりますでしょうか。
[該当のコード](https://github.com/microservices-demo/front-end/blob/5d9a4272fec3983250364917d8ea7a210cdbf58c/public/navbar.html#L227)

#### サーキットブレーカについて
cartsサービスを落とした状態で、ブラウザのデバッグツールを開いて、cartsサービスへの通信状況を見てみましょう。  
アクセスの度にcartsサービスのタイムアウトを待っているのがわかるのがわかります。
このサンプルではサーキットブレーカの実装は入っていません。こういった通信状況をみているとなぜサーキットブレーカが必要なのか、など感じてくるかと思います。

### front-endのスケールとデプロイ
マイクロサービスのスケーリングについて考えてみます。  
マイクロサービスでは特定のサービスのみをスケールすることが容易であることが特徴の１つです。
以下、実行することは非常に簡単なわけですが、重要なのはそのサービスの独立性です。
１サービスで１チームと仮に想定した場合、チームの動きやすさを想像することができると思います。

ためしにフロントエンドサービスをスケールさせてみてみましょう。

```
$ kubectl scale --replicas=3 deployment/front-end 
```

フロントエンドのコンテナイメージを変更してデプロイしてみます。  
サンプルで、背景色を変更したフロントエンドのイメージを用意しました。

```yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: front-end
  namespace: sock-shop
spec:
  replicas: 1
  template:
    metadata:
      labels:
        name: front-end
    spec:
      containers:
      - name: front-end
        image: mosuke5/front-end:master-bd5039f4
        #image: weaveworksdemos/front-end:0.3.12
```

## 非同期通信
マイクロサービスアーキテクチャでは、サービス間の通信をどのように行うかは重要な選択の１つです。  
Sock Shopでも、アーキテクチャデザインの図を見ると、shippingサービスはRabbitMQに対してデータを送り、queue-masterが処理していることがわかります。

`shipping`サービスと`queue-master`サービスのPodのログを見ながら、画面上からオーダー処理を行ってみましょう。
ログからキューへの書き込みおよび、キューからの受信を確認することができます。

非同期通信のメリットは、通信先の相手の状態に関係なく通信できることです。  
例えば、あなたがAWSなどのパブリッククラウドで仮想サーバを作成すると仮定します。
作成する仮想サーバの設定をしたあと、作成ボタンを押してから実際にできあがるまで約5分程度かかります。
同期的処理では、仮想サーバが出来上がるまでの間、ずっと待っていなければいけません。その間、ブラウザのタブを閉じたりしてはいけません。
非同期処理では、「仮想サーバの作成を受け付けました」とレスポンスを先に返すことが可能であり、実際の作成は裏側で行うことができます。
これにより、仮想サーバが出来上がるまでの間、自由に他のことをすることができます。  
一般的に、時間のかかる処理や、同期的な処理では間に合わない場合などに利用されることが多いです。

## トレーシング
Soch Shopでは、トレーシングも体験することができます。
jaegerなどのコンポーネントをデプロイします。デプロイについてはドキュメントには書かれておらず、Githubにあるマニフェストファイルを使って起動することが必要です。
[こちら](https://github.com/microservices-demo/microservices-demo/tree/master/deploy/kubernetes/manifests-jaeger)を参考にしてください。

下記のような画面にアクセスできれば成功です。

![jaeger-query](/image/jaeger-query.png)

トレーシングのコンポーネント起動後に、もう一度Sock Shopで購入などの様々なアクションを実行しましょう。
起動後はSock Shop内でのアクションがjaeger内部に保存されていきます。
検索から`orders`サービスで検索をし、`orders: http:/orders`を探してみましょう。
靴下の注文処理の裏側では、userやpaymentなど複数のサービスにまたいで処理が行われていることがわかってきます。

![jaeger-query-order](/image/jaeger-query-order.png)

paymentサービスに障害が起きたと仮定し、paymentサービスを落としたあとに、もう一度購入操作をしてみましょう。
この複雑な処理のなかでもどこでエラーが起きたか一目瞭然に確認することができます。

## フィードバック
Sock Shopを使ったマイクロサービスの体験を紹介してきました。  
もっと〇〇なことも体験できるよ、とかシナリオとして入れたほうがいい、というものがあればリクエストください。
みなさんでマイクロサービスを理解するいいきっかけを作れればと思っています。

## 参考文献
マイクロサービスを学習していく中でかなりお世話になった書籍があります。
デモアプリケーションで試すと同時にこちらの書籍での学習も進めてみてください。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://www.amazon.co.jp/%25E3%2583%259E%25E3%2582%25A4%25E3%2582%25AF%25E3%2583%25AD%25E3%2582%25B5%25E3%2583%25BC%25E3%2583%2593%25E3%2582%25B9%25E3%2582%25A2%25E3%2583%25BC%25E3%2582%25AD%25E3%2583%2586%25E3%2582%25AF%25E3%2583%2581%25E3%2583%25A3-Sam-Newman/dp/4873117607" data-iframely-url="//cdn.iframe.ly/bLsItzw?iframe=card-small"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>