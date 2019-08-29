+++
categories = ["Alibaba Cloud", "Datadog"]
date = "2019-08-28T00:11:44+09:00"
description = "DatadogのAlibaba Cloud integrationを試してみました。できることできないこと、注意点などまとめました。待望のDatadog連携なので期待です。"
draft = false
image = ""
tags = ["Tech"]
title = "DatadogのAlibaba Cloud integrationでできること"
author = "mosuke5"
archive = ["2019"]
+++

仕事でDatadogを触る機会があり、フリートライアルのアカウントを作りました。  
ちょうどいい機会だったので、前々から試したいと思っていたAlibaba Cloudとの連携について試してみました。
この連携は2019年の3月くらいに開始したものです。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://www.datadoghq.com/blog/monitor-alibaba-cloud-datadog/" data-iframely-url="//cdn.iframe.ly/bkZv6KL?iframe=card-small"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>
<!--more-->

## Datadogでの監視の仕組み
Alibaba Cloudに限らずではあるのですが、Datadogにはクラウドとの連携の機能があります。  
こちらと通常のサーバの監視とでなにが違うかみていきます。
基本的なことですが、非常に重要なことなので本ブログでも紹介します。

![datadog-integration](/image/datadog-alibaba-integration.png)

Datadogではデータの取得方法が2つあります。  
1つ目は、図の上にあわらした、サーバにagentをインストールする方法です。いままでの監視システムでも同じようなことを行っていたかと思います。APMメトリックを取得する場合もagentのインストールが必要です。
メトリック情報とログ収集を同じagentでできて一括管理できるのは非常に良いと思います。また、対応しているデータの種類も豊富です。

2つ目は、integrationという機能を使った方法です。  
Datadogではagentをサーバにインストールする方法に加えて、integrationという外部サービスやミドルウェアと連携するための機能をもっています。この機能では、現在350以上の連携を用意していて、その中にはAWSなどをはじめとしたパブリッククラウドとの連携があります。Alibaba Cloudとの連携が今年の3月にリリースしました。  
この機能では、必要な認証情報をDatadogに登録すると、DatadogがAlibaba CloudのAPIを代わりに実行しメトリックをDatadog内に取り込んでくれます。

## Alibaba Cloud integrationでできること
### 取得できるデータ
取得できる情報はたくさんあるので、公式ドキュメントのリンクを貼っておきます。  
現在以下に記載のメトリックを収集することができます。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://docs.datadoghq.com/ja/integrations/alibaba_cloud/" data-iframely-url="//cdn.iframe.ly/zQmVRgo"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

Alibaba Cloudのマネージドサービス、例えばRDSやSLBといったサービスはこの機能で収集するのがいいです。マネージドサービスではユーザ自信でagentなどを導入することができないので、Alibaba CloudのAPIからデータを取得する必要があります。  
ECSインスタンスの情報も取得できますが、あくまでクラウドとしてサーバの外から取得できる情報しか連携できないので、より詳細な情報をとりたい場合はagentのインストールが必要です。

### ホストの監視登録追加
agentを入れなくても、動いているホストは判定してdatadog側に連携してくれます。  
リージョンやAZ、アカウントIDなどいくつかのタグをつけてくれます。
このタグがあることによってメトリックの絞り込みなどに非常に便利です。

![ecs-instance](/image/datadog-ecs-instance-info.png)

### プリセットのダッシュボード
いくつかのプリセットのダッシュボードも用意されています。  
integrationを有効にさえすれば以下のようなダッシュボードの閲覧が可能です。

![datadog-dashboard](/image/datadog-alibaba-dashboard.png)

## Alibaba Cloud integrationでできないこと
### 料金の表示
もしAWSでDatadogをお使いの方なら料金もダッシュボードに表示したいと思われるでしょう。  
現在は対応していません。原理的にはたしかAlibaba Cloudもbilling apiを公開していたはずなので実装は可能です。
待つしかないです。

### CloudMonitorからの連携
一番個人的にはやりたかったことなのですが、Alibaba CloudにはCloudMonitorと呼ばれる監視サービスがあり、
そちらにもCloudMonitor agetnがあります。
CloudMonitor agentは無料で利用できるもので、こちらを使って取得したデータをCloudMonitor API経由でdatadogへ連携させたかったのですがこれがいまはできないようです。

Datadog Agentを入れることがベストではあるのですが、いろいろな事情で全台のサーバにインストールできないこともあるかなと思うので、これができるといろいろと便利です。もしかして、datadogが売れなくなっちゃうからそういうことはできない？笑

![cloudmonitor](/image/datadog-cloudmonitor-integration.png)

## 注意点
注意点としては、注意というほどでもないのですが、
Datadogはクラウド連携すると、稼働しているホストをタグをつけて登録してくれます。
AWSのインスタンスと同時に管理していると、AZ名がかぶることがあるので、AZのみでフィルターをかけると一緒にカウントされてしまうので注意しましょう。"ap-northeast-1a"が完全にかぶります。

## まとめ
というわけで、Datadog for Alibaba Cloudを見てきました。  
Alibaba Cloudはグルーバル基準で連携できるいい監視サービスが今までなく、Datadogは待望でした。
まだやれることはすくないのですが、これでも十分にAlibaba CloudユーザがDatadogを採用するメリットは大きいと考えています。

これからの進化にも期待しましょう。
