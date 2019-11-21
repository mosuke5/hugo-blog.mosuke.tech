+++
categories = ["Datadog", "APM"]
date = "2019-11-21T11:32:38+09:00"
description = ""
draft = true
image = ""
tags = ["Tech"]
title = "Datadog APMとトレーシングの仕組みについて"
author = "mosuke5"
archive = ["2019"]
+++

こんにちは。@mosuke5です。  
最近[Datadog](https://www.datadoghq.com/)を触る機会が多いのですが、Datadog APM (Application Perfomance Monitoring) が強力だったので紹介したいのと、その仕組みについて調べてみたので共有します。
Datadogは、observabilityの3本柱ということで、メトリックとトレース(APM)とログこの3つを統合した監視サービスであることを強くおしだしています。
<!--more-->

## APMとはなにか、なぜ必要か
### 従来的な監視との違い
今回に至るまで、APMは名前は聞いたことがありましたが、実際に利用したことはありませんでした。
APMはApplication Performance Monigoringの略で、名前から想像ができる通りアプリケーションに関するモニタリングです。
アプリケーションのモニタリングというと、通常の監視となにも変わらないように思えるのですが下記の点で異なります。

- **APM**
    - 専用のライブラリをアプリケーションに組み込んで、「実際のユーザからのリクエスト」に対するパフォーマンスやエラーを計測、監視する。
- **従来的なアプリケーションの監視**(※1)
    - アプリケーションのプロセスが動いているか確認する。
    - 外形監視として定期的に、アプリケーションにリクエストを発行して正常化確認する。
        - あくまで実際のユーザのリクエストではなく、監視のためのリクエスト。
    - アプリケーションのログでエラーが出ていないか監視する。

<small>※1: ここでいっている「従来的なアプリケーションの監視」とは、私のAPMに出会う前のアプリケーションの監視の認識をもとに書いています。</small>

### セットアップ
APMを使ってみて、いかに今までアプリケーションの監視や実際のふるまいが運用として理解できていなかったかわかります。

と、言葉で説明してもイメージがわかないので、動画でAPMがどういったものか確認しましょう。

<iframe width="560" height="315" src="https://www.youtube.com/embed/faoR5M-BaSw" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>


インストールは簡単すぎるので、省く。
railsアプリケーションを例に導入。
ライブラリのインストールとコンフィグだけ。
これだけで、〇〇ができるようになる。


## どうしてこんなことができるのか
ドキュメントのインストールの手順の通りで言えば、ライブラリを入れて、アプリケーションの設定ファイルに数行書くだけ。
それだけで、上のようなことができてしまうわけです。一見魔法のように見えるDatadog APMですが、どんな情報を取得しているのか気になります。  

### トレースの簡単な仕組み
トレース、トレーシングというと、最近では「分散トレーシング」という言葉で聞くことが多いと思いますが、
必ずしも分散システムやマイクロサービスのでなくてもトレーシングは今回のように実現できるし重要です。
ひとつのモノリシックなアプリケーションの中での各処理もトレーシングを使ってみていくことができます。

まずは、トレーシングの簡単な概要について説明します。  
下記のような簡単な処理を行うWebアプリケーションの1つのリクエスト例に考えてみましょう。  

1. アプリケーションがリクエストを受け付けます
1. コントローラがリクエストを処理をします
1. コントローラは画面を表示するのに必要なデータをDBから取り出します
1. ビューレンダリングをします

実際にどうやってトレースされていくのかというと、
下図のように3つのIDが振られて管理されていきます。

![tracing-basic](/image/tracing-basic.png)

|項目名  |意味  |
|---|---|
|Trace ID |一連のトレースを管理するID。この例でいうとすべて同じ。  |
|Parent ID  |親の処理のSpan ID。Parent IDが0のものは一番親でありはじめの処理。  |
|Span ID  |それぞれの処理のID  |


### トレースのログ
デフォルトの設定だとトレースのログの出力がされませんが、設定を変更してログファイルを出力させてみると理解ができます。

#### 設定の変更
Datadogの設定において、下記のように`my-custom.log`にログを出力するようにしておきます。

```ruby
f = File.new("my-custom.log", "w+")
Datadog.configure do |c|
  c.use :rails
  c.tracer log: Logger.new(f)
end
```

|項目名  |意味  |
|---|---|
|Name  |2  |
|Span ID  |5  |
|Parent ID  |5  |
|Trace ID |5  |
|Resource |5  |
|Start |5  |
|End |5  |
|Duration |5  |

```
 Name: rack.request
Span ID: 4092285044422002896
Parent ID: 0
Trace ID: 5153016093792861274
Type: web
Service: redmine_app
Resource: WelcomeController#index
Error: 0
Start: 1574235569204547584
End: 1574235569259600128
Duration: 55052569
Allocations: 9632
Tags: [
   system.pid => 12492,
   language => ruby,
   http.method => GET,
   http.url => /,
   http.base_url => http://xxxxx.ap-northeast-1.elb.amazonaws.com,
   http.status_code => 200,
   http.response.headers.content_type => text/html; charset=utf-8,
   http.response.headers.x_request_id => a1c70291-36bd-41ad-bbb8-8ef1d1c6c2b0]
Metrics: [
   _sampling_priority_v1 => 1.0],

 Name: postgres.query
Span ID: 5781776840616204252
Parent ID: 4092285044422002896
Trace ID: 5153016093792861274
Type: sql
Service: redmine_app-postgres
Resource: UPDATE "tokens" SET "updated_on" = '2019-11-20 07:39:29.205854' WHERE "tokens"."user_id" = $1 AND "tokens"."value" = $2 AND "tokens"."action" = $3
Error: 0
Start: 1574235569208989952
End: 1574235569215289088
Duration: 6299193
Allocations: 26
Tags: [
   active_record.db.vendor => postgres,
   active_record.db.name => redmine,
   out.host => xxxxx.ap-northeast-1.rds.amazonaws.com,
   out.port => 5432]
Metrics: [ ],
```

全体像の図が入る

### 分散トレーシングの場合
分散トレーシングまでは実施していないのですが、考え方は同じです。
他の異なるサービスにたとえばHTTP経由でアクセスする場合には、

サービスマップ

<図が入る>

## まとめ

