+++
categories = ["OpenShift"]
date = "2021-12-22T15:55:22+09:00"
description = "送信元IPアドレスでAWSリソース操作に制限がかけられている環境での、OpenShiftのIPIインストールに関する注意事項です。"
draft = true
image = ""
tags = ["Tech"]
title = "OpenShift、送信元IPアドレスで制限がかかった環境でのIPIインストールの注意事項"
author = "mosuke5"
archive = ["2021"]
+++

こんにちは、もーすけです。  
最近ハマったOpenShiftのネタを雑にアウトプットします。
送信元IPアドレスでAWSリソース操作に制限がかけられている環境での、IPI方式を用いたOpenShiftを構築する際の注意事項です。
<!--more-->

## やりたいこと
AWS上にIPI方式を用いて、OpenShiftを構築することです。  
ただし、<u>構築する際に利用するIAMユーザは、送信元IPアドレス（例えば自宅やオフィスのIPアドレス）に基づいてAWSリソースへのアクセスが拒否されている</u>状態です。企業ではよく見かける光景ではないかなと思います。

IAMユーザに、次のドキュメントのように送信元IPアドレス（SourceIP）で制限がかけてあると想定してください。

<div class="belg-link row">
  <div class="belg-right col-md-12">
  <div class="belg-title">
      <a href="https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/reference_policies_examples_aws_deny-ip.html" target="_blank">AWS: 送信元 IP に基づいて AWS へのアクセスを拒否する - AWS Identity and Access Management</a>
    </div>
    <div class="belg-description">この IAM ポリシーを使用して、送信元 IP に基づいて AWS へのアクセスを拒否します。</div>
    <div class="belg-site">
      <img src="https://docs.aws.amazon.com/assets/images/favicon.ico" class="belg-site-icon">
      <span class="belg-site-name">docs.aws.amazon.com</span>
    </div>
  </div>
</div>

## 何が起きるか？
うえの状態のIAMユーザを用いて、OpenShiftをIPIインストールを行うと、インストールに失敗します。
なにが起きるか説明していきます。このブログでは細かなインストール方法については割愛します。

`openshift-install`コマンドを用いてクラスタ作成を実行すると、次のようにKubernetes APIの起動を待っているところで処理が終わらず失敗します。

```
$ openshift-install create cluster --dir=. --log-level=debug
...
INFO Waiting up to 20m0s for the Kubernetes API at https://api.test.mosuke5.com:6443...
DEBUG Still waiting for the Kubernetes API: Get "https://api.test.mosuke5.com:6443/version?timeout=32s": dial tcp 52.198.18.69:6443: connect: connection refused
DEBUG Still waiting for the Kubernetes API: Get "https://api.test.mosuke5.com:6443/version?timeout=32s": dial tcp 35.74.169.90:6443: connect: connection refused
...
```

Bootstrap nodeの起動に失敗するためです。  
Bootstrap nodeはRHCOS(Red Hat CoreOS)と呼ばれるOSで起動しており、起動時にIgnitionfileをユーザデータとして渡して起動させます。
Bootstrap nodeに行うべき設定は多いため、Ignitionfileにすべての設定を書ききれず、外部のIgnitionfileを参照するように記述されています。
インストールの過程でS3バケットを作成し、そこにBootstrap node用のIgnitionfileが置かれます。
当然、セキュリティの観点からS3の事前署名付きURL（Pre-signed URL）を用います。

Bootstrap nodeに直接渡すIgnitionfileのイメージは以下です。

```json
{
    "ignition": {
        "version": "3.2.0",
        "config": {
            "replace": {
                "source": "https://<s3-endpoint>/bootstrap.ign?<署名>",
                "verification": {}
            }
        }
    }
}
```

Bootstrap nodeの起動に失敗しています。  
EC2としての起動は成功しますが、OSのブート時の設定でこけています。AWSのコンソール画面から、「シリアルコンソール接続」して状態を確認してください。
`journalctl`コマンドでログを確認します。

```
# journalctl
...
Displaying logs from failed units: ignition-fetch.service
-- Logs begin at Fri 2021-12-17 08:46:34 UTC, end at Fri 2021-12-17 08:46:48 UTC. --
Dec 17 08:46:42 ignition[729]: DEBUG    : parsing config with SHA512: 82a49d4e22267606ff1aa2d6d4f9e174cb5cdaf7da01b5150af807f7d07e00a58a9331f8befefb07a7e2c4364299c0f62ab2748cd05260c204
f8726b7a2dd91f
Dec 17 08:46:42 ignition[729]: INFO     : GET https://test-l8dh4-bootstrap.s3.ap-northeast-1.amazonaws.com/bootstrap.ign?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=xxxxx&X-Amz-Date=20211217T083920Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=xxxxx: attempt #1
Dec 17 08:46:42 ignition[729]: INFO     : GET result: Forbidden
Dec 17 08:46:42 ignition[729]: failed to fetch config: failed to fetch resource
Dec 17 08:46:42 ignition[729]: failed to acquire config: failed to fetch resource
Dec 17 08:46:42 ignition[729]: Ignition failed: failed to fetch resource
Dec 17 08:46:42 systemd[1]: ignition-fetch.service: Main process exited, code=exited, status=1/FAILURE
Dec 17 08:46:42 systemd[1]: ignition-fetch.service: Failed with result 'exit-code'.
Dec 17 08:46:42 systemd[1]: Failed to start Ignition (fetch).
Dec 17 08:46:42 systemd[1]: ignition-fetch.service: Triggering OnFailure= dependencies.
```

ログを確認するとわかるのですが、S3に配置したIgnitionfileの取得時にエラーで取得に失敗します。  

これがなぜ起こるのか考えてみます。  
理由は簡単です。事前署名付きURLにアクセスすると、そのURLを発行したIAMユーザの権限でもって検証します。一番初めに説明したとおり、このユーザは送信元IPアドレスの制限がかかっています。Bootstrap nodeは付与されたAWS内の「パブリック IPv4 アドレス」で接続します。そのため検証に失敗するわけです。

図に表すと次のとおりです。

![bootstrap-ignitionfile](/image/bootstrap-ignitionfile.png)

## どうしたらいいのか？
どうしたらいいかですが、一番は構築時のみ送信元IPアドレスに基づく制限を解除するになるかなと思います。
Bootstrap nodeのパブリックIPv4アドレスが事前にわかればいいのですが、不明なのでポリシーに入れておくことができません。もちろん、リージョン・AZごとにおおよその付与されるレンジはわかるので、それを記入してもいいですが、実質意味がない制限でしょう。

## おまけ）installerのコードを追う
OpenShiftのinstallerはGithubで開発されており、AWSリソースはTerraformで生成されます。
bootstrap nodeを生成しているTerraformのコードは `data/data/aws/bootstrap/main.tf`あたりにあります。`user_data`にignitionの内容を渡しています。

```hcl
# https://github.com/openshift/installer/blob/release-4.9/data/data/aws/bootstrap/main.tf#L142
...
resource "aws_instance" "bootstrap" {
  ami = var.ami_id

  iam_instance_profile        = aws_iam_instance_profile.bootstrap.name
  instance_type               = var.aws_bootstrap_instance_type
  subnet_id                   = var.aws_publish_strategy == "External" ? var.public_subnet_ids[0] : var.private_subnet_ids[0]
  user_data                   = var.aws_bootstrap_stub_ignition
  vpc_security_group_ids      = [var.master_sg_id, aws_security_group.bootstrap.id]
  associate_public_ip_address = local.public_endpoints
...
```

`var.aws_bootstrap_stub_ignition`をどこで作っているかを追っていくと、次辺りにたどり着きます。

```go
// https://github.com/openshift/installer/blob/release-4.9/pkg/tfvars/aws/bootstrap_ignition.go#L39-L75
func generateIgnitionShim(bootstrapConfigURL string, userCA string) (string, error) {
	ign := igntypes.Config{
		Ignition: igntypes.Ignition{
			Version: igntypes.MaxVersion.String(),
			Config: igntypes.IgnitionConfig{
				Replace: igntypes.Resource{
					Source: ignutil.StrToPtr(bootstrapConfigURL),
				},
			},
		},
	}
//...
```