+++
categories = ["Alibaba Cloud", "DevOps", "クラウド技術"]
date = "2018-06-08T15:03:10+09:00"
description = "Terraformを使って複数リージョン（マルチリージョン）をまたいだリソースを管理する方法を紹介します。Moduleなどうまく活用して冗長なコードをなくすことができます。"
draft = false
image = ""
tags = ["Tech"]
title = "Terraformで複数リージョンをまたいだリソース制御する"
author = "mosuke5"
archive = ["2018"]
+++

Terraformを使って、リージョンをまたいでリソースを制御したくなることがありました。
Terraformではプロバイダーを指定する際に、リージョンを指定することが多く、異なるリージョンでリソース制御したい場合には工夫が必要です。

なおこの記事はAlibaba Cloudを例にとっていますが、AWSなどでも同じことが可能ですので、あまりクラウドベンダーは気にしないでください。
<!--more-->

## リージョン毎にリソースを記述する
まずは、一番ベーシックなやりかたから紹介します。  
リージョン毎にリソースを記述していく方法です。

まず、`provider`をリージョン毎に設定する必要があります。その際に`alias`を指定します。  
リソースを作成する際に、`alias`を使って`provider`を指定することでそのリソースを作るリージョンをコントロールできます。  
下記の例では、「東京」と「上海」リージョンでVPCを作成する例です。

こちらの方法は、シンプルでわかりやすい方法ではありますが、  
デメリットとして、もし東京と上海でおなじリソースを作りたい場合には、コードがかなり冗長になってしまいます。  
リージョンをまたいで同じような構成を作りたい場合には、次に紹介する方法をとったほうがよさそうです。

```json
# main.tf
variable "access_key" {}
variable "secret_key" {}

# 東京リージョン用のprovider
provider "alicloud" {
  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  region = "ap-northeast-1"
  alias = "tokyo"
}

# 上海リージョン用のprovider
provider "alicloud" {
  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  region = "cn-shanghai"
  alias = "shanghai"
}

# 東京リージョンにVPCを作成
resource "alicloud_vpc" "vpc_tokyo" {
  provider = "alicloud.tokyo"
  name = "tokyo-vpc"
  cidr_block = "192.168.1.0/24"
}

# 上海リージョンにVPCを作成
resource "alicloud_vpc" "vpc_shanghai" {
  provider = "alicloud.shanghai"
  name = "shanghai-vpc"
  cidr_block = "192.168.2.0/24"
}
```

## moduleを使ってリージョンをまたいで操作する
今度は`module`という機能を使って、もって効率的に、複数のリージョンにリソースを構築していく方法についてです。  
この例では、`global`ディレクトリに東京と上海での共通で作りたいリソースの記述をしておくことで、上の方法より冗長なコードではなくすことができます。  
もちろん、リージョン毎に異なる値などは変数で渡すことができます。

```
# 階層構造
├── README.md
├── global
│   └── main.tf
├── terraform.tf
└── terraform.tfvars
```

```json
# terrafomr.tf
variable "access_key" {}
variable "secret_key" {}

# 東京リージョン用のprovider
provider "alicloud" {
  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  region = "ap-northeast-1"
  alias = "tokyo"
}

# 上海リージョン用のprovider
provider "alicloud" {
  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  region = "cn-shanghai"
  alias = "shanghai"
}

module "tokyo" {
  source = "./global"
  vpc_cidr = "192.168.1.0/24" # リージョン毎に異なる値は変数で渡すことができます。
  providers = {
    alicloud = "alicloud.tokyo"
  }
}

module "shanghai" {
  source = "./global"
  vpc_cidr = "192.168.2.0/24" # リージョン毎に異なる値は変数で渡すことができます。
  providers = {
    alicloud = "alicloud.shanghai"
  }
}
```

```json
# global/main.tf
variable "vpc_cidr" {}

resource "alicloud_vpc" "vpc" {
  name = "test-vpc"
  cidr_block = "${var.vpc_cidr}"
}
```

上の例はかなりシンプルな例ですが、こちらの方法を応用して実践に適応することができると思います。  
実際に、わたしは、東京・上海・シリコンバレーでとある同一の環境を作る必要が以前にありこういった方法を使いました。その時の一部伐採をGithubにアップロードしました。

Multi Region Smaple  
https://github.com/mosuke5/terraform_for_alibabacloud_examples/tree/master/multi_region_sample

また、繰り返しになりますが、providerがAlibabaCloudという聞き慣れないクラウドかもしれませんが、AWSなどでも応用可能です。  
ぜひ、複数リージョンでのTerraform操作の参考にしてください。

