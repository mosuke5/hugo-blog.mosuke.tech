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

どうも、SlideShareの記事の管理をスプレッドシートでやりたいというちょっとした自分のニーズがあって、
SlideShare APIってあるのか？そしてGoogleAppsScriptもほとんどやったことがない、自分でしたが試してみたのでメモっておきます。

## SlideShare API
結論から言うと[SlideShare API](https://www.slideshare.net/developers)ありました。

利用できるAPIは執筆時点では8個で、主にスライドを検索したり、スライドの情報を編集や削除といったところがメインです。
スライドをアップロードするのはAPIがなさそうなので投稿や更新は自動化できなさそうでした。

利用するには以下のバリデーションや認証が必要です。

### APIバリデーション
まずはAPI KEYを取得するためにこちらの「[Apply for API key](https://www.slideshare.net/developers/applyforapi)」から申請しましょう。

API Keyを申請するとメールにて、`api_key`と`shared_secret`の2つが送られてきます。
実際にAPIを利用するためには、以下の３つの情報をそろえる必要があります。

|item|description|
|---|---|
|api_key|こちらはメールで送られてくる通りのapi_key|
|ts|タイムスタンプ。Unix timestampの秒までのもの|
|hash|shared_secretとtsのくっつけた文字列をSHA1ハッシュしたもの|

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

`get_slideshows_by_user`の必要なメッソドやパラメータ  
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
  ...
```

## GASで実行する
もともとは、スプレッドシートでSlideShareの投稿を管理したい用途があって、
GoogleAppsScript(GAS)で実行したいと思っていました。
GASは初心者なのですが、これを機にすこしさわってみようかなと思い、こちらをGASで実行してみました、

SHA1でハッシュする関数は用意されていなかったので、ググりながら下記のように自分で関数を用意する必要がありました。
それ意外は、上で手動で実行したのをGASでほぼ再現したのみです。
取得したXMLの結果を、スプレッドシートに書き込むという部分は特有な部分ですが慣れれば簡単そうでした。

```javascript
var api_key = "xxxxx",
    shared_secret = "xxxxx"

function main() {
  var username = "mosuke5"
  var bk = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = bk.getSheetByName("SlideShare");
  var xml = getSlideshowsByUser(api_key, shared_secret, username);
  var document = XmlService.parse(xml);
  var entries = document.getRootElement().getChildren('Slideshow');
  for (var i = 0; i < entries.length; i++) {
    var slide_id = entries[i].getChild('ID').getText();
    var slide_title = entries[i].getChild('Title').getText();
    var slide_url = entries[i].getChild('URL').getText();
    var slide_username = entries[i].getChild('Username').getText();
    var slide_created_at = entries[i].getChild('Created').getText();
    
    var row = i + 1
    sheet.getRange('A' + row).setValue(slide_id);
    sheet.getRange('B' + row).setValue(slide_title);
    sheet.getRange('C' + row).setValue(slide_url);
    sheet.getRange('D' + row).setValue(slide_username);
    sheet.getRange('E' + row).setValue(slide_created_at);
  }
}

function getSlideshowsByUser(api_key, shared_secret, username_for) {
  var date = new Date();
  var ts = Math.floor(date.getTime()/1000).toString();
  var hash = toSHA1(shared_secret + ts);
  var base_url = "https://www.slideshare.net/api/2/get_slideshows_by_user";
  var request_url = base_url + '?api_key=' + api_key + '&ts=' + ts + '&hash=' + hash + '&username_for=' + username_for;
  return UrlFetchApp.fetch(request_url).getContentText();
}

function toSHA1(text) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, text);
  var txtHash = "";
  
  for (i = 0; i < rawHash.length; i++) {
	 var hashVal = rawHash[i];
	 if (hashVal < 0) {
		hashVal += 256;
	 }
	 if (hashVal.toString(16).length == 1) {
		txtHash += '0';
	 }
	 txtHash += hashVal.toString(16);
  }
  return txtHash;
}
```

![slideshare-api-to-spreadsheet](/image/slideshare_api_to_spreadsheet.png)

## さいごに
[google/clasp](https://github.com/google/clasp)というツールもあって、ローカル環境でもGASのコードが書けるようになってきています。  
まだまだ勝手がわからないのですが、業務Hackに役立ちそうのは間違いなしです。