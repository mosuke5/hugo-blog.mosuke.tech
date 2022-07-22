+++
categories = ["Alibaba Cloud"]
date = "2021-07-03T19:50:03+09:00"
description = "Alibaba CloudのALBをAWSのものと比べながらその内容を確認します。機能が充実したCLBとどう使い分けていけばいいかそのヒントを探ります。"
draft = false
image = ""
tags = ["Tech"]
title = "Alibaba CloudのALBとは？AWSのALBとの違い"
author = "mosuke5"
archive = ["2021"]
+++

こんにちは、もーすけです。  
ひさびさにAlibaba Cloud関連の情報を更新します。
2021年1月頃にALB（Application Load Balancer）がリリースしました。本日は、ALBについて、そしてCLB（Classic　Load Balancer、従来のSLB）はかなり高機能だったのでどう違うのかなどみていきます。
<!--more-->

## スライド
本内容はAliEaters#18でも発表しているためスライドもあります。
合わせてご確認ください。

<iframe src="//www.slideshare.net/slideshow/embed_code/key/BcvBLyaHLlbnCt" width="595" height="485" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px; max-width: 100%;" allowfullscreen> </iframe> <div style="margin-bottom:5px"> <strong> <a href="//www.slideshare.net/mosuke5/20210714-alibaba-cloudalbaws" title="20210714 なるほど、Alibaba CloudのALB。AWS脳の人はこう考えろ" target="_blank">20210714 なるほど、Alibaba CloudのALB。AWS脳の人はこう考えろ</a> </strong> from <strong><a href="https://www.slideshare.net/mosuke5" target="_blank">Shinya Mori (@mosuke5)</a></strong> </div>

## AWSにおけるALBとCLB
「ALB」と聞くと、AWSのALBを思い浮かべるでしょう。というわけで、まずはAWSのALBとCLBをおさらいしておきます。

2021年7月現在、AWSでは多くのLoad Balancerサービスがあります。ALB,NLB,GLB,CLBと4種類提供しています。今回は、ALBとCLBだけピックアップしますが、従来のCLBはL4/L7をサポートしつつも、L7らしい機能はあまり多く提供していませんでした。詳細は「<a href="https://aws.amazon.com/jp/elasticloadbalancing/features/" target="_blank">特徴 - Elastic Load Balancing | AWS</a>」を参照していただくとして、ここでは後ほどのAlibaba Cloudとの比較のために、超抜粋していくつかピックアップします。  
AWS ALBは、L7のLBとして特化しているために、対応するプロトコルにTCPは当然含みません。そして、L7レイヤーでのデータを用いたルーティングや、コンテナへの分散ができるように設計されています。

{{< table class="table" >}}
|  |AWS ALB  |AWS CLB  |
|---|---|---|
|ロードバランサの種類  |L7  |L4/L7  |
|プロトコルレイヤー  |HTTP、HTTPS、gRPC  |TCP、SSL/TLS、HTTP、HTTPS  |
|サポートネットワーク  |VPC |VPC/EC2-Classic  |
|パスベースルーティング|✓||
|ドメインベースルーティング|✓||
|WebSocket対応|✓||
|コンテナへの分散|✓||
|SNI対応|✓||
{{</ table >}}

## Alibaba CloudのCLBは高機能
続いて、Alibaba Cloudの話にいきましょう。Alibaba Cloudでは、2020年10月に<a href="https://www.alibabacloud.com/blog/alibaba-cloud-releases-alb-to-accelerate-the-delivery-of-enterprise-applications_596711" target="_blank">ALBをリリース</a>しましたが、そもそもCLBの機能が非常に充実していたのも事実です。
先程の表にAlibaba CloudのCLBを追加して比較してみましょう。

{{< table class="table" >}}
|  |AWS ALB  |AWS CLB  | Alibaba Cloud CLB |
|---|---|---|---|
|ロードバランサの種類  |L7  |L4/L7  |L4/L7  |
|プロトコルレイヤー  |HTTP、HTTPS、gRPC  |TCP、SSL/TLS、HTTP、HTTPS  |TCP、UDP、SSL/TLS、HTTP、HTTPS|
|サポートネットワーク  |VPC |VPC/EC2-Classic |クラシックネットワーク |
|パスベースルーティング|✓||✓|
|ドメインベースルーティング|✓||✓|
|WebSocket対応|✓||✓|
|コンテナへの分散|✓||✓|
|SNI対応|✓||✓|
{{</ table >}}

いくつかピックアップして機能にたいしてコメントします。

- パスベースルーティング、ドメインベースルーティング
  - Alibaba Cloud CLBでは、Listerの設定に"forwarding"の設定ができ、ドメインおよびパスベースのルーティングの設定が可能です。
  - <a href="https://www.alibabacloud.com/help/doc-detail/85955.html" target="_blank">Forward requests based on domain names or URLs</a>
- WebSocket対応
  - 共有型のSLBではなく、パフォーマンス確保型のSLBのみの対応になります。
  - <a href="https://www.alibabacloud.com/help/doc-detail/63421.htm" target="_blank">WebSocket and WebSocket Secure support FAQ</a>
- コンテナへの分散
  - 正確には、CLBはENIにも分散でき、ECIにも分散できるという意味です。また、SLB Ingress Controllerも用意されているので、Container Service for Kubernetesを利用していてもSLBをIngressに利用できます。


## Alibaba CloudのALB
Alibaba CloudのCLBは高機能とのことで、ALBはなんの役に立つのかと疑問に思います。
細かいところではいくつかあるみたいですが、大きな方向性としてピックアップします。
ALBとCLBの違いはドキュメントにまとまっていませんが、以下が参考になります。

<a href="https://www.alibabacloud.com/help/doc-detail/197204.htm" target="_blank">Features and limits of different editions - Application Load Balancer</a>

### サポートプロトコル
まずは、サポートプロトコルです。当然ALBはL7に特化しているので、CLBが対応していたTCP/UDPでのListenerは作れません。その代わりQUICに対応しているのはめずらしいですね。

### 高度なルーティング
L7レイヤーのルーティングがより充実している印象です。
たとえば、HTTPのメソッドレベルのルーティングや、クエリストリングベースでのルーティングなどです。
おそらく、マイクロサービスの文脈で、Readする処理とWriteする処理を別々のアプリで受けたいといったニーズに対応するものではないかと思います。

### 課金体系
課金体系をみると、ALBが現代的なビジネスシナリオのために作られたことがわかります。
以下はドキュメントのALBの料金体系に独自にCLBの料金体系を加えたものです。

{{< table class="table" >}}
|タイプ |インスタンス料金  |CU料金  |帯域幅料金 |
|---|---|---|---|
|ALB Internet  |課金  |課金  |課金  |
|ALB Private Network  |課金  |課金  ||
|CLB Internet  |課金  | | |
|CLB Private Network  | | |
{{</ table >}}

ALBでは、主にCU料金と帯域幅料金が追加されていることがわかります。
帯域幅料金はインターネットに対するものなので、Private NetworkのALBであればかかりません。

このCU料金がなにものかというと、「新規コネクション数」「同時接続数」「処理トラフィック量」「ルール数」といった複数の指標をもとに計算されるものです。CLBでは、パフォーマンス確保型インスタンスと、ある程度トラフィック需要見込んだインスタンスの準備が必要でした。このあたりが、より現代のビジネスシナリオに対応してきたという感じです。

### Kubernetes連携
ちなみに、Container Service for Kubernetesでは、SLB Ingress Controllerが用意されており、IngressにSLBを利用できます。しかし、現時点で国際版では、このIngress ControllerにはCLBが利用されます。前に述べたとおり、CLBはドメインやパスベースルーティングが可能であり、コンテナの世界でも十分使えてしまうということです。

<strike>おそらく、今後Ingress ControllerはALBに移行していくとは思います。</strike>

【2021/9/6追記】  
2021年8月よりALB Ingress Controllerが追加されました（[ドキュメント](https://www.alibabacloud.com/help/doc-detail/283329.htm)）。
Serverless Kubernetesを用いて検証しました。Serverless Kubernetesの所属するvswitchを自動で検出することはなく、Ingressリソースにvswitch idsを記載しなければならない点が少し使いづらくもありますが、期待通りにALB対応もしておきました。

## まとめ
今回は、Alibaba CloudがリリースしたALBをAWSのものと比較しながら確認してきました。
個人的には、Container Service for Kubernetesでの、SLB Ingress Controllerでの対応を楽しみにしています。
より現代的なビジネスシナリオにあったプロダクトの登場をもっと楽しみにしています。

## 関連ドキュメント
<iframe src="//www.slideshare.net/slideshow/embed_code/key/hiPphlQUSvL00u" width="595" height="485" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px; max-width: 100%;" allowfullscreen> </iframe> <div style="margin-bottom:5px"> <strong> <a href="//www.slideshare.net/sbcloud/awsalibaba-cloudvpc" title="AWSユーザがはじめる、Alibaba CloudのVPCとネットワーク" target="_blank">AWSユーザがはじめる、Alibaba CloudのVPCとネットワーク</a> </strong> from <strong><a href="https://www.slideshare.net/sbcloud" target="_blank">SBクラウド株式会社</a></strong> </div>