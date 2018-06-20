+++
categories = ["Terraform", "import", "AWS"]
date = "2018-06-20T11:08:12+09:00"
description = "Terraformのimport機能の使い方と使う際の注意ポイントについてです。"
draft = true
image = ""
tags = ["Tech"]
title = "Terraformのimportの使い方と注意ポイント"
author = "mosuke5"
archive = ["2018"]
+++

ここずっとTerraformの基本的な部分の投稿がつづいている@mosuke5です。  
理由は、Terraformを最近結構触ることが多いのもあるが、今まであんまり使ってこなかった機能をきちんとキャッチアップして、より効率的にTerraformを活用できるようにしようと思っているからです。  
と、まあ余談はおいておき、import機能をやっていきます。

import機能についてはできることもなんとなくしっていたが、自分の手でやったことがなかったのでやってみようと思っています。
<!--more-->

## 使い所
importは、Terraformで現状管理されていない既存のクラウド上のリソースをTerraform管理できるように取り込むことのできる機能です。  
今まで、手動で管理していたクラウドリソースをTerraformでの管理にに変更していきたい、あるいは、Terraformに非対応だったリソースは手動で作っていたが、対応したのでTerraformに取り込んでいきたい、こういったユースケースがよくあります。

## 使い方と注意ポイント
今回は、既存のAlibaba Cloud上のVPCリソースをTerraformにimportしていきたいと思います。(AWSでも同様です。)  
まずはじめに、importしたいリソースについて、空の定義をしておく必要があります。

```
# terraform.tf
resource "alicloud_vpc" "vpc" {
}
```

つぎにリソースをimportしていきます。リソースをimportするには、対象のリソースを特定する必要があるため、リソースのIDが必要になります。既存でリソースを作っている場合には、コンソールやAPIなどを使って確認する必要があります。

```
terraform import alicloud_vpc.vpc vpc-xxxxxxxxxxxxxx
```

そうすると、Terraformにおいて一番重要とも言えるstateファイルに、importしたリソースが書き込まれていることが確認できます。

しかし、importを利用後に注意があります。  
現状(version 0.11.7 現在)では、importしたリソースについて、stateファイルにそのリソースを書き込んでくれるのみとなっています。  
つまりどういうことかというと、現状terraformの定義ファイルにはVPCは空の定義のため、Stateファイルとの差がでてしまっています。現状とコードに差分がある状態です。
この状態で、実行しても必須項目の定義もされていないためエラーになってしまいます。

importしたあと、実際に取り込んだリソースと定義を合わせていく必要があります。
以下のように設定を足していく必要があります。

```
```

## まとめ
