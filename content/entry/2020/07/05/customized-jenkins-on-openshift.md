+++
categories = ["Kubernetes", "DevOps"]
date = "2020-07-05T23:00:50+09:00"
description = "OpenShift上でJenkinsを利用する際のプラグインの管理方法やカスタマイズの方法などをご紹介します。プラグインが消えてしまうなどの問題にどう対応したらよいかなどまとめています。"
draft = true
image = ""
tags = ["Tech"]
title = "カスタマイズしたJenkinsを作成する方法 on OpenShift"
author = "mosuke5"
archive = ["2020"]
+++

こんにちは。もーすけです。  
本日はRed Hatが提供しているKubernetesディストリビューションであるOpenShift上のJenkinsの管理に関するお話です。
OpenShift上でJenkinsを利用する際のプラグイン管理の方法やカスタマイズ方法などをご紹介します。
ハマリポイントもあり困っている方も見かけたのでお役に立てばと思います。

Jenkins本体ではなくJenkins agnetのカスタマイズに関しては以前に下記ブログを書いてますのでこちらをご参照ください。

<iframe src="https://hatenablog-parts.com/embed?url=https%3A%2F%2Frheb.hatenablog.com%2Fentry%2Fopenshift-custom-jenkins-agent" style="border: 0; width: 100%; height: 190px;" allowfullscreen scrolling="no"></iframe>

<!--more-->

## 課題
OpenShiftでは、Red Hatが作成したJenkinsイメージが内包されており、簡単にOpenShiftと連携したJenkinsをインストールすることが可能です。  
一番手っ取り早く試す方法としては下記のように`oc new-app`で、すでに用意されているテンプレートを用いて起動することです。

```
// OpenShift v4.4で用意されているイメージ
$ oc get is -n openshift | grep jenkins
jenkins                xxx.com/openshift/jenkins                2,latest       24 hours ago
jenkins-agent-maven    xxx.com/openshift/jenkins-agent-maven    latest,v4.0    24 hours ago
jenkins-agent-nodejs   xxx.com/openshift/jenkins-agent-nodejs   latest,v4.0    24 hours ago

// OpenShift v4.4で用意されているテンプレート
$ oc get template -n openshift | grep jenkins
jenkins-ephemeral               Jenkins service, without persistent storage....    8 (all set)     6
jenkins-ephemeral-monitored     Jenkins service, without persistent storage....    9 (all set)     7
jenkins-persistent              Jenkins service, with persistent storage....       10 (all set)    7
jenkins-persistent-monitored    Jenkins service, with persistent storage....       11 (all set)    8

// テンプレートを使って簡単に起動
$ oc new-app jenkins-persistent --param ENABLE_OAUTH=true --param MEMORY_LIMIT=2Gi --param VOLUME_CAPACITY=10Gi --param DISABLE_ADMINISTRATIVE_MONITORS=true
```

しかし、この状態のJenkinsを利用するにあたってはいくつかの問題があります。

1. デフォルトで入っているプラグインが古いことがある
1. 追加でプラグインをインストールしたい
1. ジョブの定義をはじめからしておきたい
1. Jenkinsを起動しているマニフェストを編集したい

## GUIからプラグインをインストール・アップデートするのではだめか？
プラグインのインストールやアップデートについて、Jenkinsの起動後にGUIから行うのでもいいのではないか？そう思われる方も多いかもしれません。
しかしいくつかの観点で、GUIから行うことに問題があります。

### 問題その１：Jenkinsの複製ができない
GUIからプラグインをインストール・アップデートした場合には、そのJenkinsには当然ながらプラグイン管理ができますが、Jenkinsの作り直しや複製をしようとした場合に同じ作業を繰り返し行わなければいけません。  
コンテナのメリットを活かした、再構築の容易性といったメリットを損なってしまいますのでイメージ化しておくことが重要です。

また、Jenkinsのプラグインのインストール・アップデートは、その後にJenkins自身の再起動が必要になりますので、正直かなり手間がかかるということです。

### 問題その２：特定の条件でインストールしたプラグインが消える
OpenShiftに内包されているJenkinsイメージには、ある特定の条件のときにイメージにもともと持っているプラグインに上書きするという処理があります。
Jenkinsのイメージのバージョンが上がった際などに、強制的に上書きするようになっています。
実際にあった例としては、OpenShiftのマイナーバージョンを上げたあとに、Jenkinsを再起動した際にforce_copy_pluginが実行されてアップデートしたプラグインなどがロールバックされてしまったなどです。

気になる方は、Jenkinsのイメージのコードを見てみるといいです。  
ソースコードの改変により行数が変わっている可能性がありますが、`force_copy_plugin`で検索すると見つかると思います。

<a href="https://github.com/openshift/jenkins/blob/release-4.4/2/contrib/s2i/run" target="_blank">Github: jenkins/run at release-4.4 · openshift/jenkins</a>

## Jenkinsのイメージをカスタマイズする
上で見てきたとおり、いくつかの理由でJenkins自身にプラグインをインストールしたりアップグレードしたい場合には、イメージ化しておくことが重要です。
Jenkinsのイメージのカスタマイズは非常に簡単です。環境変数で指定できる項目もありますが、以下のドキュメントの通りイメージレベルで作ってしまったほうが運用が楽ではないかと思います。まずは以下のドキュメントを確かめてください。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://access.redhat.com/documentation/ja-jp/openshift_container_platform/4.4/html/images/images-other-jenkins" data-iframely-url="//cdn.iframe.ly/ET99cFk"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

### サンプル実装
上のドキュメントを見ていただいて、すぐに理解できる方はよしなのですが、正直わかりづらい部分もあるかなと個人的に思います。
サンプル実装を以下においておきましたので合わせて参考にしてみてください。  
`plugins.txt`でプラグインの管理を`configuration/jobs/sample-job/config.xml`でジョブの設定を書いています。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://github.com/mosuke5/openshift-custom-jenkins" data-iframely-url="//cdn.iframe.ly/3eDTKnz"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

## おすすめのプラグインのアップデート
以下のプラグインはアップデートしておくことをおすすめします。（下の記述のバージョンは執筆時点のため確認の上修正してください）  
JenkinsのKubernetesプラグインでDecralative記法を利用するのにバージョンが古くうまく動かないなどがあったためです。
Gitも最新にしておくとパイプラインの記述でエラーに遭遇することが減ると思います。

```
kubernetes:1.19.3
pipeline-model-definition:1.6.0
git:4.2.2
git-client:3.2.1
```

## マニフェストをカスタマイズする
最後にマニフェストのカスタマイズについてです。  
OpenShiftでは、Jenkinsを起動するためのテンプレートが用意されています。
冒頭で`oc new-app`でJenkinsを簡単に起動できるのもこのテンプレートが存在するおかげです。
しかし、実際にこのテンプレートを使ってJenkinsを起動していると、リソースの都合上Jenkinsが遅くてしょうがないというケースがただありました。
用意されているJenkinsのテンプレートでは、メモリーのリミットは設定できるのですが、CPU・メモリーのリクエスト値を設定しておきたいことがただあったのでテンプレートをカスタマイズして使います。

元のテンプレートは参考にしつつ、自分でカスタマイズできるようにしておくと良いでしょう。

```
$ oc get template jenkins-persistent -o yaml > my-jenkins-template.yaml

// 任意に変更して管理する
$ vim my-jenkins-template.yaml
```

## まとめ
OpenShift上でJenkinsを使うときのプラグイン管理やカスタマイズなど注意すべき点を見てきました。
OpenShiftに内包されているJenkinsは、OpenShiftと連携しやすいようにカスタマイズされており、便利なのでぜひ使っていきたいのですが、そのままでみなさんのワークロードに合うとは正直思いません。  
利用できる部分は利用しつつ、カスタマイズしていけるように準備しておくことが非常に重要と思っています。

また、KubernetesにおけるCI/CDの実装の観点について深堀りして理解したい方はぜひ下記のブログもご参照ください。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2020/03/04/kubernetes-ci-cd/" data-iframely-url="//cdn.iframe.ly/AWtNlfG"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>