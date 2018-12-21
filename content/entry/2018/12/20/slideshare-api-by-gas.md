+++
categories = ["SlideShare", "GoogleAppsScript"]
date = "2018-12-20T21:46:14+09:00"
description = ""
draft = true
image = ""
tags = ["Tech"]
title = "SlideShare APIをGoogleAppsScriptから利用する"
author = "mosuke5"
archive = ["2018"]
+++


## SlideShare API
### APIバリデーション
まずはAPI KEYを取得するためにこちらの「[Apply for API key](https://www.slideshare.net/developers/applyforapi)」から申請しましょう。

API Keyを申請するとメールにて、`api_key`と`shared_secret`の2つが送られてきます。
実際にAPIを利用するためには、以下の３つの情報をそろえる必要があります。

|item|description|
|---|---|
|api_key|こちらはメールで送られてくる通りのapi_key|
|ts|タイムスタンプ。Unix timestampの秒までのもの|
|hash|shared_secretとtsのくっつけた文字列をSHA1ハッシュしたも|

たとえば、shared_secretが"abcdef"でタイムスタンプが"1545315685"の場合、
"abcdef1545315685"をsha1ハッシュすればいいということです。

```
$ echo -n "abcdef1545315685" | sha1sum
e4d673a71b769782541920b7acfcee92a686b91c  -
```

### 認証
プライベートなデータを取得するような一部のAPIでは、上のバリデーションとはべつに、
認証で`username`と`password`が必要です。

### get_slideshows_by_user APIを使ってみる
では実際に`get_slideshows_by_user`を、まず手作業で実行していきたいと思います。
このAPIでは公開情報のみ使うので認証は必要ありません。
必須パラメータは`username_for`のみなので、取得したいユーザの名前だけで大丈夫です。
今回は、`mosuke5`のスライドを取得してみます。

![slideshare-api](/image/slideshare_api_by_user.png)

メソッドはGETなので、URLの後ろにパラメータを付けて下記のようにリクエストURLを完成させます。
ブラウザからアクセスしてみて、成功していればXMLが返ってくるはずです。

```
https://www.slideshare.net/api/2/get_slideshows_by_user?api_key=xxxxx&ts=1545315685&hash=xxxxxxxxxxxx&username_for=mosuke5
```

```xml
<User>
  <Name>mosuke5</Name>
  <Count>16</Count>
<Slideshow>
  <ID>124228224</ID>
  <Title>Double 11を支えるApsaraDB for Redis (AliEaters #8)</Title>
  <Description>Alibaba Cloudで提供しているマネージドのRedisの概要や特徴とTaobao内での利用について少しだけ触れます。元ネタはAlibaba Cloudの国際チームが投稿しているブログです。</Description>
  <Status>2</Status>
  <Username>mosuke5</Username>
  <URL>https://www.slideshare.net/mosuke5/double-11apsaradb-for-redis-alieaters-8</URL>
  <ThumbnailURL>//cdn.slidesharecdn.com/ss_thumbnails/apsaradbforredis-181128061230-thumbnail.jpg?cb=1543385711</ThumbnailURL>
```

## GASで実行する
```javascript
```

## さいごに
