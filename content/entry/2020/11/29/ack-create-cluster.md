+++
categories = ["Alibaba Cloud", "Kubernetes"]
date = "2020-11-29T20:46:17+09:00"
description = "Alibaba CloudのKubernetesサービスであるACKに、新しくサービスレベルの高いモードが追加されました。このクラスタの特徴やポイントを解説します。より成熟していくACKを理解するのに使ってください。"
draft = false
image = ""
tags = ["Tech"]
title = "[Alibaba Cloud] KubernetesのProfessional managed clustersは何が違うのか？"
author = "mosuke5"
archive = ["2020"]
+++

こんにちは、もーすけです。  
[Container Service for Kubernetes (ACK)](https://www.alibabacloud.com/product/kubernetes) では、新しくマネージドクラスタの中でサービスレベルを選べるようになりました。
[Professional managed clusters](https://www.alibabacloud.com/help/doc-detail/173290.htm)というものです。
このクラスターは通常のマネージドクラスタと比べて何が違うのでしょうか？
調べてみたのでまとめました。
<!--more-->

## 料金
クラスタあたり、`$0.09/時間`の料金がかかります。  
ざっくり計算すると、一ヶ月あたり `0.09ドル * 24時間 * 30日 * 110円 = 7,128円` となります。
AWSのEKSとくらべても少し安いくらいでしょうか？（サービスレベルでは比べていない）

この他、サーバーリソース代が別途かかるので注意してください。

## 通常クラスタとの違い
通常のクラスタとの違いをまとめます。  
[ドキュメント(ACK Pro clusters)](https://www.alibabacloud.com/help/doc-detail/173290.htm)に比較表があるのですが、正直情報が不足しているのでそのあたりを補って解説していきたいと思います。

### Cluster size
Professionalは、Worker Nodeを**5,000ノードまで**追加できるようになります。  
Standardでは100ノードまでです。

とはいえ、相当な規模のクラスタでないと100ノード以上追加することはないでしょう。
アプリケーションなどの用途によってクラスタ自体を分離してしまうことがも多いと思います。正直この点の恩恵をうけるのはまれでしょう。

### SLA
Professionalでは99.95%となり、補償付きです。  
補償付きというのは、SLAを満たさなかった場合に返金が行われるということです。
ただの目標値としてではなく、お客さんの期待にコミットしていくという意思表示に見えます。

### API Server
Professionalでは、可用性の監視があり、そして自動的なスケールもされるとのことです。
KubernetesのMaster Nodeについては、マネージドになっているためユーザでは状況を確認することや対策をすることができない領域です。
この領域について、自動でスケーリングすることや可用性の監視が行われる点は非常におおきいと考えます。
KubernetesのAPI Serverのパフォーマンスが劣化するのはかなりの規模の場合にのみとも考えられますが、別の要因で遅くなる可能性もあるので安心ポイントです。

どのように監視してスケーリングをしているかのヒントは下記のブログに隠されています。
合わせて読んでみてください。
<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2020/11/17/how-to-manage-lots-of-k8s/" data-iframely-url="//cdn.iframe.ly/vJTSNCL"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

### etcd
etcd自身のバックアップを行ってくれるようです。  
Master Nodeがマネージドの環境では、etcdのバックアップもユーザサイドでは実施できません。
Kubernetes内の情報は、すべて別にマニフェストとして外出しする必要がありました。
もちろんProfessionalでもKubernetesの魅力を発揮するためにマニフェスト管理は必要なのですが、有事の際の対応としては嬉しいです。

### Kube-scheduler
`Topology-aware CPU scheduling` という機能が使えるようになります。  
詳しい実装などについては記述がないのですが、CPU集中型のワークロードの場合に効率的にPodのスケジューリングを行うもののようです。
Podの`requests.cpu`と`limits.cpu`の値を同値にすることで、スケジューリング時に最大のCPU利用量も考慮します。
その分、CPUを使わないときでもリソースを確保するため、Podの集約率は落ちます。その点を考慮できる仕組みとみてとれます。

Topology-aware CPU schedulingに関するドキュメント  
https://www.alibabacloud.com/help/doc-detail/178168.htm

もうひとつは`Gang scheduling`です。  
これは、バッチジョブなどで、複数のPodを動かす必要があった場合に、all or nothing（全部同時にスケジュールされるか。しないか）の状態である必要があります。
こういったスケジュールを提供するGang schedulingが有効にできるとのことです。
この考え方は、KubernetsのSIGの中でも[kubernetes-sigs/kube-batch](https://github.com/kubernetes-sigs/kube-batch)などで実装されたりしています。

Gang Schedulingに関するドキュメント  
https://www.alibabacloud.com/help/doc-detail/178169.htm

### Data encryption
kms-pluginによるデータの暗号化を提供、と書いてあるのですが、これはコントロールプレーンのetcdの暗号化のことです。
ユーザサイドの運用上はなにも影響がありません。
仮に第三者にIaaSレイヤーの管理に問題があっても、中のデータを閲覧できないようにするというものです。
暗号化・復号化にCPUを使いますが、パフォーマンス劣化になるほどではないと考えています。

https://www.alibabacloud.com/help/doc-detail/177372.htm

### Security management
不明です。分かり次第追記します。

## まとめ
新しく高いサービスレベルを求めるユーザ向けにProfessional managed clusterなるものがでました。
その違いを見ていきました。不明な部分もありますが、全貌が見えてきました。
また、これらの内容をより深く理解するためには、先日翻訳した下記記事が役に立ちそうです。
ACKの開発メンバーがなにを考えて作っているか理解していくことができます。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2020/11/17/how-to-manage-lots-of-k8s/" data-iframely-url="//cdn.iframe.ly/vJTSNCL"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>