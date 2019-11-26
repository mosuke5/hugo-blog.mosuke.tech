+++
categories = ["kubernetes", "alibaba cloud", "コンテナ", "クラウド技術"]
date = "2019-04-29T09:59:29+09:00"
description = "Alibaba CloudのServerless kubernetesを検証し、機能や仕組み、他のサービスとの関連性についてまとめました。virtual-kubeletなどが絡んできます。"
draft = false
image = ""
tags = ["Tech"]
title = "Serverless Kubernetes 徹底解説"
author = "mosuke5"
archive = ["2019"]
+++

こんにちは。社会復帰しました[@mosuke5](https://twitter.com/mosuke5)です。

2019年5月15日に[AliEaters Toyko #11](https://alibabacloud.connpass.com/event/126777/)があります。  
登壇予定だったので、その準備をしていたら案外おもしろいことに気付いてしまって、少し早いですが資料つくりました。

資料はSlideShareに掲載しました。  
基本的にはAlibaba CloudのServerless Kubernetesの機能や仕組みについて説明しています。その仕組みには、以前に自分が調べたVirtual Kubeletなどが関連してくるのがおもしろいです。
<!--more-->

<iframe src="//www.slideshare.net/slideshow/embed_code/key/7YPxzJxZzDfOlL" width="595" height="485" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px; max-width: 100%;" allowfullscreen> </iframe> <div style="margin-bottom:5px"> <strong> <a href="//www.slideshare.net/mosuke5/alibaba-cloud-serverless-kubernetes" title="Alibaba Cloud Serverless Kubernetes 徹底解説" target="_blank">Alibaba Cloud Serverless Kubernetes 徹底解説</a> </strong> from <strong><a href="https://www.slideshare.net/mosuke5" target="_blank">Shinya Mori (@mosuke5)</a></strong> </div>

## 関連資料
- [Virtual Kubeletとは何か。Alibaba Cloud上で実際に動かして検証する](/entry/2019/02/03/virtual-kubelet/)
- [Fargateの動き、Amazon ECSへのデプロイフローなどを確認する](/entry/2019/04/13/aws-ecs-deploy/)
- [alibaba cloud serverless kubernetes sample code](https://gist.github.com/mosuke5/75738227c81f09994a66f607a5545bf6)