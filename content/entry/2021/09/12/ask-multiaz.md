+++
categories = ["Alibaba Cloud", "Kubernetes"]
date = "2021-09-12T17:27:08+09:00"
description = ""
draft = true
image = ""
tags = ["Tech"]
title = "Alibaba Cloud、Serverless KubernetesのマルチAZ対応について"
author = "mosuke5"
archive = ["2021"]
+++

こんにちは、もーすけです。  
本日は、Alibaba CloudのServerless Kubernetes（ASK）のマルチAZ対応について、ナレッジをためていきます。
前回も書きましたが、Serverless Kubernetesの構築を最近行っており関連のトピックについて書く頻度が増えそうです。

<!--more-->

## マルチAZでクラスタを作成する
WebコンソールからASKクラスタを作成する場合、VPCの選択で `Create VPC` を選択すると、シングルAZでクラスタが作成されてしまいます。
また、クラスタ作成後にマルチAZ化することは、ブログ執筆時点ではできないので、マルチAZで運用したい人はクラスタ作成時に必ずマルチAZで作成してください。
マルチAZで作成するには、2つの方法があります。

- Webコンソールの場合は、VPC選択で `Select Existing VPC` を選択する
- API経由で作成する

コンソールから作成する場合は、`Select Existing VPC` を選択すればよい。

![ask-select-vswitch](/image/ask-select-vswitch.png)

わたしは、Alibaba Cloudの構築はいつもTerrafromで行っています。  
Terraformであれば、次のように`vswitch_ids`が配列で指定できるので、必要な数だけvswitchを設定しましょう。

```hcl
resource "alicloud_vswitch" "first" {
  vswitch_name  = "vsw-first"
  vpc_id        = alicloud_vpc.default.id
  cidr_block    = var.vswitch_first_cidr
  zone_id       = data.alicloud_zones.default.zones[0].id
}

resource "alicloud_vswitch" "second" {
  vswitch_name  = "vsw-second"
  vpc_id        = alicloud_vpc.default.id
  cidr_block    = var.vswitch_second_cidr
  zone_id       = data.alicloud_zones.default.zones[1].id
}

resource "alicloud_cs_serverless_kubernetes" "default" {
  name_prefix                     = "sample-cluster"
  version                         = var.kubernetes_engine_version
  vpc_id                          = alicloud_vpc.default.id
  vswitch_ids                     = [alicloud_vswitch.first.id, alicloud_vswitch.second.id]
  new_nat_gateway                 = false
  endpoint_public_access_enabled  = true
  deletion_protection             = false
  load_balancer_spec              = var.kubernetes_slb_spec
  service_cidr                    = var.kubernetes_service_cidr
  service_discovery_types         = ["PrivateZone"]
  time_zone                       = "Asia/Tokyo"
  logging_type                    = "SLS"

  addons {
    name = "slb-ingress-controller"
  }
}
```

マルチAZで作成できたかどうかは、ノードを確認するのがよいでしょう。  
Serverless Kubernetesは、virtual kubeletを使ってPodをECIで起動しますが、AZ毎にノードリソースが作成されます。

```
$ kubectl get node
NAME                              STATUS   ROLES   AGE     VERSION
virtual-kubelet-ap-northeast-1a   Ready    agent   3h17m   v1.20.4-aliyun.1
virtual-kubelet-ap-northeast-1b   Ready    agent   3h17m   v1.20.4-aliyun.1
```

## NAT Gateway自動作成の課題
Serverless Kubernetesのクラスタを作成する場合、`Configure SNAT for VPC`という設定があります（Terraformでは、`new_nat_gateway`オプション）。
このオプションは、クラスタ作成時に、NAT GatewayとSNAT設定を自動生成するかどうかになります。
便利そうな機能なので有効にしてしまうのですが、このオプションに課題があるので注意が必要です。

このオプションを有効にした場合は、どちらかひとつのvswitch内にNAT Gatewayが作成され、SNAT設定もどちらかひとつのvswitchのCIDRしか登録されません。
次の図のような状態になります。

![ask-snat-error](/image/ask-snat-error.png)

こちらには、おおきく2つの課題があります。

1. Zone Bに配置されたコンテナは、インターネットに出られないということ
2. NAT Gatewayがひとつしかないので、完全なマルチAZ構成になっていないということ

この問題に対してはいくつかの対処方法があるので考えていきます。  
まず、1.の課題については、おそらく多くの場合で致命的なため、NAT GatewayにSNATの設定を追加してあげましょう。Zone BのCIDRを追加する必要があります。

次に、2.の課題については、要件次第かなと思います。コンテナがインターネットにでることが必須の場合（たとえば、外部サービスと通信する、外部のコンテナレジストリを使う）といった場合は、NAT GatewayもマルチAZ化しておく必要性が高いです。クラスタだけマルチAZにしても意味がないからです。
NAT GatewayをZone Bにも作成し冗長化を図りましょう。

## 結論
結論ですが、マルチAZでクラスタを構築する場合は、`Configure SNAT for VPC`のオプションは外して自前でNAT Gatewayの設定を管理するのがまちがいなくよいでしょう。
このあたりのクラウド上の仕様を把握しながら構築をすすめていってください。
