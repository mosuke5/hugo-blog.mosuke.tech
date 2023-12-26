+++
categories = ["DevOps", "クラウド技術"]
date = "2018-06-16T18:27:35+09:00"
description = "Terraformのworkspace機能の入門から、実践的な利用方法までご紹介します。条件分岐(IF)などを使ったリソース名のコントロールなどを行いました。"
draft = false
image = ""
tags = ["Tech"]
title = "Terraform workspaceを利用して環境毎のリソース名の変更を行う"
author = "mosuke5"
archive = ["2018"]
+++

Terraformのバージョン0.9以降で追加された、workspace機能について自分の環境で使い始めたので、その使い方やtipsなどを残していきたいと思います。  
workspaceは名前から推測できますが、同じTerraformのコードをワークスペース（環境）ごとに使い分けることのできる機能です。例えば、productionとdevelopmentの2つのworkspaceを作れば、同じTerraformコードを利用してこの2つの環境で別のリソースを作成していくことができます。
<!--more-->

Terraformでは、実行結果をstateファイルに保存することで、インフラストラクチャの状態を管理することができます。([ドキュメント](https://www.terraform.io/docs/state/))  
このworkspace機能を利用すると、このstateファイルを環境ごとに分けて管理するようになります。このあたりは使い方をみながら理解していきましょう。

## workspaceはじめの一歩
まず、workspace機能は以下5つの機能しかなく、とてもシンプルです。
基本的には、workspaceを作る、切り替える、消す。それが主なところです。

```text
$ terraform workspace -h
Usage: terraform workspace

  Create, change and delete Terraform workspaces.

Subcommands:
    delete    Delete a workspace
    list      List Workspaces
    new       Create a new workspace
    select    Select a workspace
    show      Show the name of the current workspace
```

はじめは`default`というworkspaceになっています。
それでは、`development`というworkspaceを作ってみます。

```text
$ terraform workspace list
* default

$ terraform workspace new development
Created and switched to workspace "development"!

$ terraform workspace list
  default
* development
```

`development`のworkspaceが作られ、切り替わっていることがわかります。  
また、この状態でディレクトリを表示すると`terraform.tfstate.d/`というディレクトリができていることが確認できます。その中に、`development/`があります。tfstateファイルがこの中に保存されるようにな、環境ごとにstateファイルの保実行状態を管理できるようになるというものです。

```text
$ ls -l
-rw-r--r-- 1 mosuke5 197609 1056 Jun 16 19:24 main.tf
drwxr-xr-x 1 mosuke5 197609    0 Jun 16 19:24 terraform.tfstate.d/
-rw-r--r-- 1 mosuke5 197609  298 Jun 14 20:58 terraform.tfvars

$ ls -l terraform.tfstate.d
drwxr-xr-x 1 mosuke5 197609 0 Jun 16 19:24 development/
```

## 実践的な利用を考える
入門部分をご紹介しましたが、これを実践でどのように利用していくのか、自分が趣味プロダクトを例にとって紹介します。

開発環境と本番環境で分離するためにworkspaceを利用しています。  
作成するリソースは開発環境と本番環境で同様であるが、もちろん設定内容が環境ごとに変わることもあります。環境ごとどのように設定をわけてるか３つの観点で紹介します。

### tfvarsファイルを分ける
まずは、Terraformの変数ファイルである`tfvars`ファイルを環境ごとにわけました。
具体的には`terraform.tfvars.development`と`terraform.tfvars.production`にわけ、実行時に`-var-file`オプションを利用して、適切なファイルを選択するようにしました。

development時の実行方法についてです。
```text
$ ls -l ./terraform.tfvars.*
terraform.tfvars.development
terraform.tfvars.production

$ terraform workspace select development
$ terraform workspace list
  default
* development
  production
$ terraform plan -var-file=terraform.tfvars.development
$ terraform apply -var-file=terraform.tfvars.development
```

### リソース名をworkspaceごとに変える
リソースに付ける名前ですが、同一の名前をつけてしまうと見分けがつかなくなります。場合によっては同一名称を付けることができないこともあります。  
いくつかやり方がありますが、リソース名については`project_name`という変数を用意しており、環境ごとにその名前をわけることにしています。

terraformでは、workspaceの名前を変数的に利用することも可能です。
そちらの方法については次でご紹介します。

```text
# terraform.tfvars.development
project_name = "mosuke5-gillsearch-dev"
region = "ap-northeast-1"
....
```

```text
# terraform.tfvars.production
project_name = "mosuke5-gillsearch-prod"
region = "ap-northeast-1"
....
```

```json
variable "project_name" {}

resource "aws_vpc" "vpc" {
  cidr_block = "192.168.1.0/24"

  tags {
    Name = "${var.project_name}-vpc"
  }
}
```

### productionのときだけ名前を変えたい
DNSをCloudFlareで管理しているのですが（[参照](https://blog.mosuke.tech/entry/2018/01/01/terraform-dns/)）、DNSレコードを以下のように環境によって変える必要がありました。  
workspace名をうまく使えばできそうですが、production環境だけはworkspaceの名前をいれるわけにはいきません。Terraformの条件分岐を使って以下のように実現しました。

| Workspace | Domain |
|:-----------|------------:|
| production | gill-search.mosuke.tech |
| development | development.gill-search.mosuke.tech |
| staging | staging.gill-search.mosuke.tech |
※`gill-search.mosuke.tech`というのがサービスのURL。

```json
resource "cloudflare_record" "gill-search" {
  domain  = "${var.cloudflare_domain}" # <- "mosuke.tech"がはいる

  # productionのときのみ任意の値で、それ以外のときにはworkspace名を入れたいと思っていた。
  name    = "${terraform.workspace == "production" ? "gill-search" : "${terraform.workspace}.gill-search"}"

  value   = "${aws_eip.main.public_ip}"
  type    = "A"
  ttl     = 1
  proxied = true
}
```