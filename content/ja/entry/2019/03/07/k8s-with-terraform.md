+++
categories = ["Kubernetes", "DevOps"]
date = "2019-03-07T01:06:27+09:00"
description = "TerraformでKubernetes上のリソースを管理する方法およびそのメリット・デメリットをみてみます。こちらをふまえ、最近のOperatorの動きなどを考察してみたいと思います。"
draft = false
image = ""
tags = ["Tech"]
title = "Kubernetes上のリソースをTerraformで管理するメリットとデメリット"
author = "mosuke5"
archive = ["2019"]
+++

@mosuke5です。早くも3月になってしまいました。  
しかし、個人的にはこの2か月は非常に動きがあった2か月でしたのでいろいろ楽しかったです。

さて、本題ですが、、  
わたしの好きなTerraformを使ってKubernetesクラスタ上のリソースを管理するのをやってみたいと思います。  
そもそもKubernetesをTeraformで管理するとなると2つのレイヤーの話があります。
今回は、後者のほうに重きを置いてお伝えします。

1. KubernetesクラスターそのものをTerraformで管理する
1. Kubernetesクラスター上のリソースをTerraformで管理する

<!--more-->

## KubernetesクラスターそのものをTerraformで操る
こちらは軽く流していきますが、Terraformでクラウドのサービスを操ることができるので、もしKubernetesのサービスを提供している場合は、下記のようにクラスターそのものを構築することが容易です。
こちらは、Alibaba CloudのContainer Serviceを起動する例としていてます。

```json
provider "alicloud" {
  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  region     = "${var.region}"
}

resource "alicloud_cs_kubernetes" "main" {
  name_prefix = "my-first-k8s"
  availability_zone = "${data.alicloud_zones.default.zones.0.id}"
  new_nat_gateway = true
  master_instance_types = ["ecs.n4.small"]
  worker_instance_types = ["ecs.n4.small"]
  worker_numbers = [3]
  key_name = "hogekey"
  pod_cidr = "192.168.1.0/24"
  service_cidr = "192.168.2.0/24"
  enable_ssh = true
  install_cloud_monitor = true
}
```

## Kubernetes上のリソースをTerraformから操るメリットとデメリット
次はクラスターそのものではなくて、クラスター上のリソースをどう扱うかを見ていきます。
そもそもKubernetesクラスタのリソースはmanifestファイルで扱うことが一般的です。
Terraformで管理するメリット/デメリットってどんなところにあるのか考えてみたいと思います。

### メリット
- stateファイルを使って状態管理、差分管理ができる
- 他の豊富なproviderと組み合わせて利用ができる
- 削除が容易

### デメリット
- 対応リソースが少ない or 最新のリソースへの対応が遅い
- manifestで十分な感じもある

## Hello world
### 認証、provider設定
まずは試してみます。認証ですが、いろんな方法がありますが、もしすでに`~/.kube/config`にクライアント証明の入った設定ファイルがあるのならば、特に設定することなく利用できます。
認証に、`servicea ccount`のtokenを利用している場合などは、既定の設定をいれる必要があります。
ここでは、`~/.kube/config`があるので以下だけのProvider設定で行きます。

```text
provider "kubernetes" {}
```

### Deploymentを作ってみる
例えばすごく単純に、Nginxが3つ立ち上がるdeploymentを作ることとします。
manifestなら以下のようになりますね。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-sample-deployment
spec:
  selector:
    matchLabels:
      app: nginx-sample
  replicas: 3
  template:
    metadata:
      labels:
        app: nginx-sample
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80
```

こちらをTerraformで記述していくとどうなるのか。  
書いてみた所感だと、ストラクチャーはもちろんmanifestファイルと同じなので書きやすいのですが、
一部のArgumentsの名前がmanifestで書くものと異なります。
例えば、`matchLabels`を`match_labels`としなければいけなかったりします。
このあたりが少し面倒という印象です。

```json
resource "kubernetes_deployment" "test" {
  metadata {
    name = "nginx-sample-deployment"
  }

  spec {
    selector {
      match_labels {
        app = "nginx-sample-deployment"
      }
    }
    replicas = 3
    template {
      metadata {
        labels {
          app = "nginx-sample-deployment"
        }
      }
      spec {
        container {
          name = "nignx"
          image = "nginx:latest"
          port {
            container_port = 80
          }
        }
      }
    }
  }
}
```

Terraform管理のいいところは、なんといっても、この`terraform plan`によるDry-runができることですね。
やってみます。

```text
$ terraform plan
Refreshing Terraform state in-memory prior to plan...
The refreshed state will be used to calculate this plan, but will not be
persisted to local or remote state storage.

------------------------------------------------------------------------

An execution plan has been generated and is shown below.
Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  + kubernetes_deployment.test
      id:                                                            <computed>
      metadata.#:                                                    "1"
      metadata.0.generation:                                         <computed>
      metadata.0.name:                                               "nginx-sample-deployment"
      metadata.0.namespace:                                          "default"
(中略)

Plan: 1 to add, 0 to change, 0 to destroy.
```

差分を確認してapplyしてデプロイしていきます。

```text
$ terraform apply
(中略)
Apply complete! Resources: 1 added, 0 changed, 0 destroyed.

$ kubectl get deployment
NAME                       DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
nginx-sample-deployment    3         3         3            3           30s

$ kubectl get pods
NAME                                        READY     STATUS    RESTARTS   AGE
nginx-sample-deployment-6c668d7f76-2djrb    1/1       Running   0          49s
nginx-sample-deployment-6c668d7f76-5ncww    1/1       Running   0          49s
nginx-sample-deployment-6c668d7f76-t9lfp    1/1       Running   0          49s
```

変更があったと仮定して、Terraformの定義ファイルの中身を少し変えてみます。
レプリカ数とコンテナ名を変更してみました。  
変更の差分を確認できるのはやっぱりTerraformで管理する最大のメリットですね。

```text
$ terraform plan
kubernetes_deployment.test: Refreshing state... (ID: default/nginx-sample-deployment)

------------------------------------------------------------------------

An execution plan has been generated and is shown below.
Resource actions are indicated with the following symbols:
  ~ update in-place

Terraform will perform the following actions:

  ~ kubernetes_deployment.test
      spec.0.replicas:                           "3" => "5"
      spec.0.template.0.spec.0.container.0.name: "nignx" => "nignx-hogege"

Plan: 0 to add, 1 to change, 0 to destroy.
```

## Kubernetes側からクラウドリソースを制御する動き
しかし最近はKubernetes側からクラウドリソースを制御するようにするという動きが顕著です。
先日Redhatがオープンした[OperatorHub.io](https://www.operatorhub.io/)ではAWSもカスタムリソースを提供していて、DynamoDBやSQSなどの一部のクラウドリソースをKubernetesから扱えるようにするモジュールを提供しています。  
こちらについては、まだ試せていないので試したら別でブログに書こうと思います。

以上にみてきたように、Terraformではstate管理ができるので、それゆえに差分管理やDry-runなどの機能が使えて便利な側面がありました。一方で、Kubernetes側からのクラウドリソースの管理の流れをみると、アプリケーション寄りの人はこちらのほうがスタンダードになってくるかなと思っている部分もあります。

今後の動きが楽しみです。