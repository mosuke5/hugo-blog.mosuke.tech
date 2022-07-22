+++
categories = ["DevOps"]
date = "2019-03-25T15:22:11+09:00"
description = "AnsibleからTerraformを実行するmoduleを触ってみました。こちらを使う上で考慮必要なことなどについてまとめました。またTerraformとAnsibleを連携する上での考え方もご紹介します。"
draft = false
image = ""
tags = ["Tech"]
title = "AnsibleのTerraform moduleを考察してみる"
author = "mosuke5"
archive = ["2019"]
+++

気がつけば、2018年度も終了間際で時の流れの速さを実感しています。  
はい。[@mosuke5](https://twitter.com/mosuke5)です。

Ansibleのmodule(モジュール)でTerraformが知らぬ間にできていたので、
さっそく触ってみたのと、その有用性や使いみちについて考えてみました。  
[terraform – Manages a Terraform deployment (and plans)](https://docs.ansible.com/ansible/latest/modules/terraform_module.html)

Terraformでクラウド環境のセットアップをして、その後にそのクラウド環境のサーバに対してプロビジョニングすることが一気通貫でできるようになります。素晴らしいことですね。
一方、こちらのツールを使ってみると、実現にあたっていろいろと工夫しなければ行けない点が出てきたのでご紹介していきます。
<!--more-->

## AnsibleのTerraform module
Ansibleはもともと?サーバのconfigurationの自動化のツールとして発達し、
ファイルの配置だったり、yumやaptなどのパッケージマネジメント、シェルの実行だったり多くのmoduleを用意しています。
最近では、単なるサーバへのプロビジョニングを超えて、クラウドリソースの制御などもできるようになっており、使い方の幅が広がってきています。
今回発見したのは、クラウド上のリソース管理に強みをもつTerraform（自分が好きなツールでもある）をAnsibleから実行する[module](https://docs.ansible.com/ansible/latest/modules/terraform_module.html)が出ていました。
TerraformとAnsibleはカバーする領域が異なりますが、もちろんかぶる領域もあり、今回はその組み合わせ方の１つのあり方かなと思っています。

まずは最小限で試したかったのでこんな感じで用意しました。  
`terraform_module_test.yml`がAnsibleの実行Taskが記載されたファイルで、`terraform/`以下がTerraformの実行ファイルを置いています。

```
% tree
.
├── terraform_module_test.yml
└── terraform
    ├── outputs.tf (こちらはなくていい)
    ├── terraform.tf
    └── terraform.tfvars
```

以下はAnsibleのコードです。Terraformを実行するのは今回はローカル環境なので、実行の対象ホストはこのPCで、接続方式もlocalで問題ないです。Terraform moduleは機能自体も多くなく、Terraformを実行(apply)するだけなら下記だけで十分です。

```yaml
# terraform_module_test.yml
---
- hosts: 127.0.0.1
  connection: local
  tasks:
  - name: Exec terraform scripts
    terraform:
      project_path: 'terraform/'
      state: present
```

さて、実行してみます。まああっさり。これだけじゃつまらんって感じです。
```
$ ansible-playbook terraform_module_test.yml
PLAY [127.0.0.1] ******************************************************************

TASK [Gathering Facts] ************************************************************
ok: [127.0.0.1]

TASK [Exec terraform scripts] *****************************************************
changed: [127.0.0.1]

PLAY RECAP ************************************************************************
127.0.0.1                  : ok=0    changed=1    unreachable=0    failed=0
```

## クラウド構築とサーバプロビジョニングの一連の流れを考える
AnsibleからTerraformが実行できるとなると、まっさきにやりたいと思うのが、
Terraformでサーバなどのインフラ作って、Ansibleで作ったサーバに対してデプロイのフローを一気通貫でやりたいということでしょう。
こちら実際にやってみたのですが、いくつか実装上の工夫点が必要だったのでお伝えします。

※以下、試行錯誤の過程を書いてますのでご了承ください。

一番はじめに考えたのは、Ansibleベストプラクティスに則って、以下のような`site.yml`作ればそれで終わりや。ということでした。

```yaml
# site.yml
---
- import_playbook: setup_cloud.yml          # クラウドインフラ構築
- import_playbook: provisioning_config.yml  # 構築したインフラにプロビジョニング
```

ですが、Ansibleを普段触っている人ならお気づきかと思いますが、
このまま実行しても正しくプロビジョニングされません。
それもそのはずで、Ansible実行時にはプロビジョニングするサーバの対象がわからないからです。

と、まあそこで[Dynamic Inventry](https://docs.ansible.com/ansible/latest/user_guide/intro_dynamic_inventory.html)の話がでてくるわけです。
Dynamic Inventryの作り方はいろいろありますが、ここでは簡易的にシェルスクリプトで、
Terraformのstateファイルから生成することにしておきます。
`inventry.sh`というのを次のように雑に書きまして。。

```shell
#!/bin/sh
if [ -e terraform/terraform.tfstate ]; then
    ip=`cat terraform/terraform.tfstate | jq '.modules[].outputs[].value' | cut -d '"' -f 2`
    cat << EOS
{
    "cloud_servers"  : [ $ip ]
}
```

```
# 実行するとこんな感じにと
$ ./inventry.sh
{
    "cloud_servers"  : [ 47.74.155.39,47.88.168.127,47.88.169.94 ]
}
```

Dynamic Inventryもできるようになったので、今度こそこれでいけると思って実行して見るわけですが、`skipping: no hosts matched`と。
実はもう一つ考慮しなければいけないことに気づきました。

```
$ ansible-playbook -i ./inventry.sh site.yml -u sshuser
...
PLAY [Provisioning to instances] *************************************************
skipping: no hosts matched
```

それは、サーバのIPアドレスが決まるのはTerraformの実行が終わったあとになります。
一方、AnsibleでDynamic Inventryを作ったのはAnsibleの実行時です。
そうなると、Terraformの実行とその後のサーバプロビジョニングがこのままでは一気通貫にできないということになります。

なんかいい方法はないのかと調べると、`refresh_inventry`というのがありました。([公式ドキュメント](https://docs.ansible.com/ansible/latest/modules/meta_module.html))
こちらを使って、Ansibleの実行中にTaskとしてinventryの更新が可能になります。

```yaml
- name: Refresh inventory because of creating cloud servers
  meta: refresh_inventory
```

その他、サーバ起動した直後だとSSHのプロセスが上がっておらず、接続できないこともあったので、
サーバの起動を待つというのも大事な要素になりました。

### つまり
いろいろと試行錯誤過程を書いてしまいましたが、下記を考慮しておかなければいけなさそうということです。
今回の実装例についてはAlibaba Cloudの例にはなりますがGithubに[コード](https://github.com/mosuke5/terraform_examples_for_alibabacloud/tree/master/invoking_from_ansible_sample)をあげてあります。  
もしもっと効率的なやりかたあるよって方はぜひ教えてくださいm(_ _)m

1. Dynamic Inventry
2. Inventryの更新
3. サーバ起動までのWait

全体を図にすると今感じです。  
![invoking_terraform_from_ansible](/image/invoking_terraform_from_ansible.png)

## TerraformとAnbileの棲み分けの話
冒頭でも少し書いたのですが、TerraformとAnsible、異なるカバー領域をもつ製品だと私は認識していますが、一方で領域が被る部分もあると思っています。この２つを一緒に使う方法についてレッドハットの[ホワイトペーパー](https://www.redhat.com/cms/managed-files/pa-terraform-and-ansible-overview-f14774wg-201811-en.pdf)をみつけました。

このホワイトペーパーにも一緒に使う方法として以下２つがあると書かれていて、今回は後者の方の使い方をご紹介した形になります。
この２つは正解、不正解ではなく、管理する人の立場によって大きく変わると書かれています。

1. TerraformからAnsibleを実行する方法
1. AnsibleからTerraformを実行する方法

また、前者の方については少しアプローチが違いますが、過去に「[Terraform+ユーザデータ+Ansibleでのサーバプロビジョニングを活用する](https://qiita.com/mosuke5/items/bf1d486d633e3b106087)」書いたことがありますので、合わせて読んでみてください。

## おまけ
こんなのも見つけました。  
terraform-inventory  
https://github.com/adammck/terraform-inventory