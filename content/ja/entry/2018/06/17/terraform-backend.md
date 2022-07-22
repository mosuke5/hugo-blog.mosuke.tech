+++
categories = ["DevOps", "クラウド技術"]
date = "2018-06-17T15:39:29+09:00"
description = "Terraformのbackend機能の必要性から使い方まで説明します。backend機能は複数人でTerraformを利用する際の必須機能です。"
draft = false
image = ""
tags = ["Tech"]
title = "Terraformのbackend機能を利用してstateファイルを共有する"
author = "mosuke5"
archive = ["2018"]
+++

Terraformのbackend機能について紹介します。  
まずはbackend機能が必要な理由についてから説明していきます。
<!--more-->

## なぜbackend機能が必要か
Terraformでは、その実行結果をstateファイルを使って管理します。  
`terraform apply`を実行すると必ずstateファイルが作成されます。  
stateファイルには、Terraformの実行によって、どのようなりソースが作成されたか、そのリソースのIDや設定内容などを保存しています。Terraformの定義を変更し、再びTerraformを実行する際には、stateファイルを参照し、どの箇所を変更するかなどを判断します。もし、stateファイルを削除してしまうと、またゼロからすべてのリソースを作成することになってしまいます。

このように、重要な役割を果たすstateファイルですが、複数人でTerraformを利用する場面において、stateファイルの共有が重要になります。このstateファイルの共有にbackend機能がとても有効です。

backend機能を利用することで、stateファイルを実行環境のローカル環境に作成するのではなく、リモートの共有ストレージなどに保存することができます。
たとえば、Amazon S3などに保存することができます。

## backendの設定と実行
backend機能を有効にする方法はとても簡単です。  
Terraformの定義ファイルに下記のように設定を追加するだけで利用することができます。以下はAmazon S3に保存するのを例としています。

```
terraform {
  backend "s3" {
    bucket = "mosuke5"
    key    = "terraform.tfstate.aws"
    region = "ap-northeast-1"
  }
}
```

上の例だと必要な情報は３つです。

- どのS3バケットに保存するか
- ファイル名をどうするか
- Bucketのリージョンはどこか

もちろん、S3に保存する場合はAWSのProvider設定が必要です。
AWSのリソースをTerraformで管理している場合にはすでに記述済みなはずですので、そのままでいいと思います。  
たとえば、OpenStack環境の構築をTerraformで行っており、StateファイルをS3に保存したい、といった場合にはAWSのProvider設定も忘れないように注意してください。

実際に、`terraform apply`を実行後、S3内を確認すると、下記のようにstateファイルが保存されていることが確認できました。

![terraform-backend-s3](/image/terraform-backend-s3.png)

## S3を使うならバージョンニング機能を有効にしよう
公式ドキュメントで推奨されていることですが、S3をbackendに利用する場合にはS3のバージョンニング機能を有効にすることをおすすめします。  
S3の[バージョンニング機能](https://docs.aws.amazon.com/ja_jp/AmazonS3/latest/dev/Versioning.html)は名前の通りですが、S3内のオブジェクトのバージョン管理をしてくれる機能です。
この機能を有効にすることで、誤ってファイルを消してしまった際のリカバリーなどに活用できます。

上で述べたように、StateファイルはTerraformにおいて非常に大事なファイルです。
こちらを削除してしまうと、現在のインフラストラクチャの状態を把握することができず、事実上Terraformでの管理ができなくなってしまいます。そのため、このバージョンニングの機能はとても重要なものになるでしょう。

バージョンニングを有効にすると下記のようにStateファイルのバージョン管理ができることを確認できました。

![terraform-backend-s3-versioning](/image/terraform-backend-s3-versioning.png)