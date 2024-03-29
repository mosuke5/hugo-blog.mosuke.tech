+++
categories = ["Kubernetes"]
date = "2021-04-18T14:44:58+09:00"
description = "Kubernetes上で運用するアプリケーションのロギングをどのように行うか悩むポイントです。それぞれの特徴と採用すべき点を理解しておくことでよりスムーズな意思決定ができるかと思います。"
draft = false
image = ""
tags = ["Tech"]
title = "Kubernetesのロギングパターンは結局どれを採用したらいいの？"
author = "mosuke5"
archive = ["2021"]
+++

こんにちは、もーすけです。  
本日は、Kubernetes上で動くアプリケーションのロギングについて考えていきたいと思います。
以前に[「Sidecar方式のFluentdでCloudWatch logsへログを集約することについての検討」](/entry/2019/07/12/sidecar-fluentd-to-cloudwatchlogs/)という記事を書いたのですが、この記事では、ロギングパターンのひとつであるSidecar方式（サイドカー方式）の検討についてのみ触れており、「で、結局どうしたらいいの？」という部分がたりなかったためです。  
本記事では、その他の方式も含めて、どれを採用したらいいのか？という考え方についてまとめていきたいとおもいます。
<!--more-->

## 考えるステップ
まず前提として、Kubernetesの公式ガイドにも[ロギングパターンがいくつか紹介](https://kubernetes.io/docs/concepts/cluster-administration/logging/)されています。
アプリケーションのロギングの観点だと3つの方式が紹介されています。英語では分かりづらいので、日本語でパターンに名称をつけておきます。

1. Using a node logging agent
    - 本記事内での名称：**ノードロギング方式**
    - DaemonSetで各ノードにログコレクタを配置し、各Podが標準出力したログを収集する方式。
2. Using a sidecar container with the logging agent
    - 本記事内での名称：**サイドカー方式**
    - アプリケーションのPodのサイドカーコンテナとしてログコレクタを配置してログを収集する方式。
3. Exposing logs directly from the application
    - 本記事内での名称：**直接送付方式**
    - アプリケーションから直接ロギングバックエンドに送付する方式・

個人的な意見になるのですが、以下のステップで採用を決めるといいのかなと考えています。
2をすっとばして、3を検討するのは可能な限りやめといたほうがいいと考えています。
また、**「どれかひとつをだけを選択するものでもない」** という点は理解しておきましょう。もちろん、ひとつのPod単位でみたらどれにするか？という判断が必要ですが、全体で見るとノードロギング方式は採用しつつ、一部のアプリケーションのみサイドカー方式を採用する、となります。

1. まずはノードロギング方式の実現を確立する。
2. アプリケーションは、ノードロギング方式を採用できないかを最優先で検討する。
3. アプリケーションがノードロギング方式の要件に合わなかった際、サイドカー方式か直接送付方式を検討する。（アプリケーションの特性次第でもあるが、サイドカー方式が優先かな）

## 方式の特徴の比較

{{< table class="table" >}}
|方式  |主な責任 (*1)  |リソース消費 (*2)  |出力先  |備考 |
|---|---|---|---|---|
|ノードロギング方式  |プラットフォーム|少ない|ひとつ（標準出力）|*3参照  |
|サイドカー方式  |アプリケーション|多い|複数可能|*4参照  |
|直接送付方式  |アプリケーション|とても少ない|複数可能|*5参照  |
{{</ table >}}

##### *1 主な責任について
なにを示しているかというと、ロギングの仕組みの責任が主にどこにあるのか？ということです。
前提として、Kubernetesクラスタを提供するプラットフォームチームと、その上でアプリケーションを運用するアプリケーションチーム、このふたつのチームがあるとしています。
ノードロギング方式の場合、プラットフォームチームが特定のアプリケーションやNamespaceによらずロギング手法を確立します。アプリケーションチームの視点では、独自にロギングの仕組みを作ることなく、プラットフォームの提供する機能にのっかることができる、そんなふうに考えることができます。

##### *2 リソース消費
実現するのにひつようなリソース消費についてです。ノードロギング方式について「少ない」と書きましたが、サイドカー方式と比べて相対的に少ないと捉えてください。各ノードに対してログコレクタを配置する必要があるので、絶対値として少ないかといわれるとそんなことはないです。
サイドカー方式では、アプリケーションごとにログコレクタが必要なのでそれと比べると明らかでしょう。
直接送付方式では、極端な話、ログコレクタをデプロイする必要なくログを転送できるので、この3つでは一番リソース消費が少ないとも考えられます。

##### *3 ノードロギング方式について補足
多くの場合、サイドカー方式と直接送付方式のみ採用する、ということはないはずです。ノードロギング方式を採用しつつ、特定のアプリケーションにおいて他の方式を採用することを考える、となります。

##### *4 サイドカー方式について補足
サイドカー方式の細かな話は、以下のブログにまとめているのでこちらを参照ください。
採用を検討する場面としては、アプリケーションが複数のファイルを出力しなければならないケースが多いと考えます。単一の標準出力のみではどうしても運用できない場合です。ログごとに転送先が異なる場合なども該当すると考えられます。  
また、サイドカー方式の場合、kubeletがコンテナのログを管理しないため、`kubectl logs`でログを確認できないのでその点も要注意です。  

ログローテーションについても検討しておく必要がありそうです。  
サイドカー方式の場合、emptyDirないしはPersistentVolumeにログを保管しておくので、ボリュームの使用率については注意を払っておく必要がありますね。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2019/07/12/sidecar-fluentd-to-cloudwatchlogs/" data-iframely-url="//cdn.iframe.ly/0OoUJRq"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

##### *5 直接送付方式について補足
実は、わたしはこの方式を採用したことがないです。  
プログラム内の処理とログを送付する処理が同期的になるので、あまり採用する場面はないかなと考えます。小さなプログラムで、特定のイベントのみを通知したい、そんなときに使えそうと考えています。

## さいごに
それぞれの方式で実際に試してみるまでは、体感が湧きづらいトピックですが、ロギング方式を決めるひとつの参考になればと思います。

また、Kubeletがどのようにノード側でログを管理するかについては以下を参考にしてください。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2021/09/08/kubelet-log-management/" data-iframely-url="//cdn.iframe.ly/GwbXWR0"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>