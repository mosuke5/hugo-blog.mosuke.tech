+++
categories = ["Kubernetes"]
date = "2020-04-09T17:59:23+09:00"
description = "Kubernetesのnamespaceの切り方について迷ったときの考えるポイントを紹介します。リソースの観点、組織・チームの観点、ネットワークセキュリティの観点などから考えることができます。"
draft = false
image = ""
tags = ["Tech"]
title = "Kubernetesのnamespace分け方に迷った場合に考えること"
author = "mosuke5"
archive = ["2020"]
+++

こんにちは。もーすけです。  
Kubernetes Lifeは順調でしょうか？  
今回は、すごく基本的なところなのですが、意外となやんでしまうnamespaceの切り方について考えてみようと思います。
よくご質問いただくこともあり、迷ってしまった場合に何を考えればいいか、そのポイントをまとめてみました。
<!--more-->

## リソースの観点
まずはリソースの観点から考えることができます。
namespaceに設定できるリソース関連に`Resource Quotas`と`Limit Ranges`があります。

### Resource Quotas
お使いのKubernetesの環境にもよると思いますが、namespaceに対してResource Quotasが設定されている可能性があります。
Resource Quotasでは、namespace内で利用できるリソースの量を設定できます。
「リソースの量」といっても、Podに設定できるメモリーやCPUの量、作成できるSecretなどの数などで、前者だけではありません。

極端な例を出せば、開発者の検証用と、運用環境を同じnamespaceで行っていた場合、検証に多くのリソースを使ってしまい、いざ本当に必要となった運用環境の方でこのクォータに達して使えない、ということが起こりえます。
これは極端な例ですが、その環境が必要とする分だけのリソースが利用できる状態にあるかどうかというのは1つの判断ポイントと思います。

もう少し現実的な例を出すとすると、アプリケーションの運用にアプリケーション本体とそれをビルドやデプロイしたりするJenkins等のCIツールが必要であるとします。CIツールは、開発者のソースコードのコミットを契機にPodを起動してジョブを実行します。
CIのジョブが並列してたくさん動いていたことにより、アプリケーションのPodのスケールができなかったというのでは困ります。
優先度としてはアプリケーションのPodのほうがこの場合は高いはずです。

状況によっては、クラスタを分けるか？という議論にまで発展すると思います。

### Limit Ranges
namespae毎に設定できるリソースとして、もうひとつLimit Rangesがあります。
Limit Rangesは、Podに割り当てるデフォルトのリソース設定やMax,Minで利用できるリソースを設定できるものです。
アプリケーションによって、利用するリソースの要件が大きく異なる場合にはnamespaceを分離してLimit Rangesの設定もそれぞれに適したものにするといったことも考えられます。

### リソースに関する参考
以前にKubernetesのリソースについて下記のブログを書いているので合わせて参考にしてください。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2020/03/31/kubernetes-resource/" data-iframely-url="//cdn.iframe.ly/7kQ1w8n"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

## 組織・チームの観点
続いては、組織やチームの観点です。
namespaceは、アプリケーションを運用する組織やチームの体制と大きく関係することがあります。
Kubernetesでは、ユーザがどのような操作をすることが許可されるか（認可）は、RBACという仕組みを用いて管理されます。このRBACはnamespaceレベルで設定することができます。
そのユーザが操作していい範囲や内容をnamespaeで管理することができるわけです。

例えば、Aチームの運用メンバーが操作できるnamespaceに、運用の責務を持っていないBチームのアプリケーションが稼働していたらどういうことになるでしょうか？
ご想像の通り、誤って消してしまった、誤って編集してしまったなど他のチームに影響を及ぼしてしまう可能性があります。
当然ながら避けたい問題です。

一方、Aチームが甲アプリケーションと乙アプリケーションを管理していたとして、それが同じnamespaceにある限りは、Aチームが責任をもてる範囲なのでそれはそれでいいでしょう。
もちろん別の理由で甲と乙を別々のnamespaeにわけることもあるでしょう。

チームが責任を持つ範囲は、その組織・プロダクトのビジネスのステージによって大きく変わるでしょう。
ステージによるnamespaceの分け方については英語ですが下記ブログにもヒントがあります。  
<a href="https://cloud.google.com/blog/products/gcp/kubernetes-best-practices-organizing-with-namespaces" target="_blank">Kubernetes best practices: Organizing with Namespaces</a>

## ネットワークセキュリティの観点
ネットワークセキュリティの観点からも考えることができます。  
Kubernetesには<a href="https://kubernetes.io/docs/concepts/services-networking/network-policies/" target="_blank">Network Policy</a>という、クラスタ内でPod同士が通信する際のトラフィックのルールを定義できるものがあります。
このNetwork Policyもまた、namespaceに設定のできるものです。

Network Policyを用いることで、特定のPodからのみ通信を許可したり、特定のnamespaceからのみ通信を許可するなどが可能になります。
アプリケーションや利用するコンポーネントの要件で通信制限をかけたい場合に、namespaceを分けることが考えられます。
例としては、とあるデータベースはセキュリティの要件から特定のアプリケーションからしかアクセスさせたくない、などです。
その場合に、namespaceレベルで分離することを検討しなければいけないこともあります。

## 管理上の観点
最後の、上で紹介したような小難しいことではなくシンプルに管理上の観点から分けることも考えられます。  
namespaceを分けたほうが、純粋にリソースを表示したときに見やすいわかりやすい。といったことです。
namespaceが異なると、同じ名前のリソースを作成できるようにもなります。同一namespace内では、hogeという名前のpodは1つしか作れませんが、異なるnamespaceであれば、hogeという名前のPodが作成ができます。
単純に管理上の問題でわけることもありです。

## さいごに
namespaceを作るという、とても基本的なところですが、いざ作ろうと思うと迷ってしまいがちな話題でした。
迷ってしまったときには、上のような観点そしてユースケースを参考にしてみてください。
ベストプラクティスを探すよりは、こういった考慮ポイントをもとに自らの組織・チームに合ったやり方を探ってみるといいです。

Namespaceしかり、Kubernetesを体系的に学ぶためには「Kubernetes完全ガイド」がおすすめです。
Kubernetesを正しく学んで、楽しく使っていきましょう。
<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://www.amazon.co.jp/Kubernetes%25E5%25AE%258C%25E5%2585%25A8%25E3%2582%25AC%25E3%2582%25A4%25E3%2583%2589-impress-top-gear-%25E9%259D%2592%25E5%25B1%25B1/dp/4295004804" data-iframely-url="//cdn.iframe.ly/UdUbVWh?iframe=card-small"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>