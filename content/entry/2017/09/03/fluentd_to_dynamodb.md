+++
categories = ["AWS", "dynamoDB", "Fluentd", "ログ", "Nginx"]
date = "2017-09-03T15:48:40+09:00"
description = "NginxのログをFluentdを使ってAWSのDynamoDBへの送信を行ってみました。Fluetndの基本的な使い方から、AWS DynamoDBへ送信するまで、設定のハマリポイントなどを紹介します。"
draft = false
image = ""
tags = ["Tech"]
title = "NginxのログをFluentdでDynamoDBへ送る"
author = "mosuke5"
archive = ["2017"]
+++

NginxのログをFluentdを使ってAWSのdynamoDBへ送る実験を行ったので、そのメモを残します。  
Fluetnd自体あまり触ったことがなかったので、その入門から、AWS DynamoDBへ送信するまでを紹介します。

<!--more-->

## はじめに
### 環境
本ブログの実験環境は下記のとおりです。

- サーバ: AWS EC2, Ubuntu16.04
- Fluentd: 0.12.35

### どんな場面で使えるの？
WebサーバのログをわざわざFluetndを使ってDynamoDBへ送信する必要があるのか？どんなときに使えるのか？
そのあたりを少し説明したいと思います。

まず、サーバが複数ある環境では、とくにクラウドのようにサーバの台数が増減する環境では、ログの集約は重要になってきます。AWSをはじめクラウドサービスではオブジェクトストレージのサービス(AWSならS3)があることが多く、オブジェクトストレージにログを集めることもよく紹介されます。
しかし、オブジェクトストレージの特性上、リアルタイムでの処理は向いていません。

DynamoDBのようなスケーラビリティに特徴のもつデータストアを利用することで、大量のログデータもリアルタイムに書き込みができ、冗長化もユーザ視点では気にする必要がありません。大量のログデータの集約に役立つソリューションになるでしょう。

また、FluentdはRaspberry PiのようなIoTデバイスでも利用することができます。
IoTデバイスから直接DynamoDBへログを送信することができればスケーラビリティの面でも安心ですよね。

![fluentd-usage-overview](/image/fluentd_usage_overview.png)

## Fluetndインストールと入門
### インストール
Fluetndのインストールはとても簡単です。  
以下のページの各OSの"Installation Guide"を見るといいでしょう。  
https://www.fluentd.org/download

今回はUbuntu16.04環境で行いました。レポジトリからのインストールをします。
インストールしたら起動と、起動できたかの確認を行ってみます。
```
$ curl -L https://toolbelt.treasuredata.com/sh/install-ubuntu-xenial-td-agent2.sh | sh
$ sudo systemctl start td-agent
$ sudo systemctl status td-agent
● td-agent.service - LSB: data collector for Treasure Data
   Loaded: loaded (/etc/init.d/td-agent; bad; vendor preset: enabled)
   Active: active (running) since Sun 2017-09-03 06:41:59 UTC; 27min ago
     Docs: man:systemd-sysv-generator(8)
  Process: 2083 ExecStop=/etc/init.d/td-agent stop (code=exited, status=0/SUCCESS)
  Process: 2127 ExecStart=/etc/init.d/td-agent start (code=exited, status=0/SUCCESS)
    Tasks: 27
   Memory: 236.1M
      CPU: 1.951s
   CGroup: /system.slice/td-agent.service
           ├─2153 /opt/td-agent/embedded/bin/ruby /usr/sbin/td-agent --log /var/log/td-agent/td-agent.log --daemon /var/run/td-agent/td-agent.pid
           ├─2156 /opt/td-agent/embedded/bin/ruby /usr/sbin/td-agent --log /var/log/td-agent/td-agent.log --daemon /var/run/td-agent/td-agent.pid
           ├─2162 /opt/td-agent/embedded/bin/ruby /usr/sbin/td-agent --log /var/log/td-agent/td-agent.log --daemon /var/run/td-agent/td-age.pid
           └─2171 /opt/td-agent/embedded/bin/ruby /usr/sbin/td-agent --log /var/log/td-agent/td-agent.log --daemon /var/run/td-agent/td-agent.pid
```

デフォルトだとポート8888にてHTTP経由でログをPostできるようになっています。
確認を兼ねて見てみます。

```
$ sudo lsof -i:8888
COMMAND  PID     USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
fluentd 3503 td-agent   15u  IPv4  27930      0t0  TCP *:ddi-tcp-1 (LISTEN)
ruby    3508 td-agent   15u  IPv4  27930      0t0  TCP *:ddi-tcp-1 (LISTEN)

$ curl -X POST -d 'json={"json":"message"}' http://localhost:8888/debug.test
$ tail /var/log/td-agent/td-agent.log
(略)
2019-07-04 02:08:51.077729521 +0000 debug.test: {"json":"message"}
```

### Hello Fluentd
まずはFluetndがどういうものか理解するために、一番単純な例を試してみます。  
NignxのログをFluetndを使って別のファイルに書き出してみます。

まずはNginxのインストールをします。  
fluetndからNginxのログファイルが閲覧できるように権限の変更は忘れずに行ってください。

```
$ sudo apt-get install nginx
$ sudo systemctl start nginx
$ curl localhost
  // ちゃんとHTMLが返ってくればOK
$ sudo chmod 644 /var/log/nginx/access.log
  // Fluentdからログファイルが読み取れるようにします。
```

次に、Fluetndの設定をいます。  
そもそもFluentdの基本的な考え方は、インプットとアウトプットです。
どのようにFluentdにデータをインプットするか、またそれをどのようにアウトプットするかを指定して利用します。
（アウトプットするにあたってフィルターなどかけられる）

Nginxのログを入力には、`tail`を今回利用します。
`tail`という名前からもう想像もできるかもしれませんが、ファイルを監視しIOイベントを読み取って、追記された情報に対して処理を行っていきます。

以下の設定ファイルで、`format`部分が少し難しそうに見えますが、アクセスログの内容をFluetnd側でJsonに変換できるように形式を指定しているだけです。以下参考にしています。  
http://qiita.com/liubin/items/92a4e7e3917143ae4aaf

アウトプットは`file`タイプを選択し、`/tmp`以下にファイルとして出力するようにします。

```
$ sudo vim /etc/td-agent/td-agent.conf
<source>
  type tail
  path /var/log/nginx/access.log
  format /^(?<remote>[^ ]*) (?<host>[^ ]*) (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^ ]*) +\S*)?" (?<code>[^ ]*) (?<size>[^ ]*)(?: "(?<referer>[^\"]*)" "(?<agent>[^\"]*)" "(?<forwarder>[^\"]*)")?/
  time_format %d/%b/%Y:%H:%M:%S %z
  tag nginx.access
  pos_file /var/log/td-agent/nginx.pos
</source>

<match nginx.access>
  type file
  path /tmp/output_nignx_access_log
</match>
```

設定が完了したらfluetndを再起動して、curlでNginxにアクセスします。  
何回かアクセスするといいと思います。
```
$ sudo systemctl restart td-agent
$ curl localhost
```

さて、`/tmp`以下に出力できているか確認します。  
ついでに中身をのぞいてみると、Nginxのログの内容がJsonになって出力されていることが確認できます。

```
$ ls -l /tmp/
-rw-r--r--  1 td-agent td-agent  552 Sep  3 06:14 output_nignx_access_log.20170903.b55842e6a17fff571

$ cat /tmp/output_nignx_access_log.20170903.b55842e6a17fff571
2017-09-03T06:13:11+00:00       nginx.access    {"remote":"127.0.0.1","host":"-","user":"-","method":"GET","path":"/","code":"200","size":"11321"}
2017-09-03T06:13:17+00:00       nginx.access    {"remote":"127.0.0.1","host":"-","user":"-","method":"GET","path":"/","code":"200","size":"11321"}
```

## dynamoDBへのログ送信
では、続いてDynamoDBへのログ送信をおこなっていきます。

### dynamoDBのテーブル作成
DynamoDBのテーブルを作成しますが、今回は難しいことは何もしません。
下記の通りでテーブルを作ります。

- テーブル名: mosuke5-test
- プライマリーキー: id, 文字列

### プラグインの設定
fluetndからDynamoDBへ書き込むには、プラグインを別途インストールする必要があります。こちらのプラグインを使用していきます。  
https://github.com/gonsuke/fluent-plugin-dynamodb

インプットは先程と変えずに、アウトプットをDynamoDBに変更し使っていきます。  
設定は以下のとおりです。
```
$ sudo td-agent-gem install fluent-dynamodb-plugin
$ sudo vim /etc/td-agent/td-agent.conf
<match nginx.access>
  @type dynamodb
  aws_key_id xxxxxxxxxxxxxxx
  aws_sec_key xxxxxxxxxxxxxxxxxxxxxxxxxx
  dynamo_db_region ap-northeast-1
  dynamo_db_endpoint https://dynamodb.ap-northeast-1.amazonaws.com
  dynamo_db_table mosuke5-test
</match>

# 変更したら再起動しましょう
$ sudo systemctl restart td-agent
```

ではcurlでWebサーバへアクセスした後に、AWSコンソールからDynamoDBをみてみましょう。  
きちんとDynamoDBへログが保存されていることが確認できるかとおもいます。
ちなみにIDはプラグインの方で自動で付与しているものです。

![fluentd-dynamodb-console](/image/fluentd_dynamodb_console.jpg)

### 設定Tips
fluent-dynamodb-pluginを設定する上で、ハマったポイントがあったので書いておきます。

- `dynaamo_db_region`を設定しよう
    - `dynamo_db_region`を指定しないと、「[Credential Should Be Scoped to a Valid Region (認証情報の範囲を有効なリージョンに限定する必要があります)](http://docs.aws.amazon.com/ja_jp/opsworks/latest/userguide/common-issues.html#common-issues-instance-registration-valid-region)」のエラーが出るの注意。
- endpointにhttps(or http)をつけよう
    - `dynamo_db_endpoint`には`https(or http)`をつけましょう。

## さいごに
とても簡単な例でしたが、Fluentdの初歩的な使い方から、DynamoDBへのログの書き込みまで理解できましたでしょうか。  
設定方法も重要ですが、大事なのは冒頭にも書いた、これがどのような場面で役立つソリューションであるか、ほかのログ収集ソリューションとはどこが特徴的であるかです。  
そのあたりの振り返りにご活用いただければと思います。