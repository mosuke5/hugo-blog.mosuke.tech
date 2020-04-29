+++
categories = ["Kubernetes", "DevOps"]
date = "2020-04-28T17:17:54+09:00"
description = "Kubernetes利用時のコンテナイメージのプルに関する効率化について考えてみます。kubernetes-image-pullerを使ったイメージの事前プルする方法などについてご紹介します。"
draft = false
image = ""
tags = ["Tech"]
title = "イメージのプルの効率化を考える。kubernetes-image-puller の紹介"
author = "mosuke5"
archive = ["2020"]
+++

FF7リメイク、クリアしました。いまSwitchで原作のFF7をやり直しています。もーすけです。  
今日は<a href="https://github.com/che-incubator/kubernetes-image-puller" target="_blank">kubernetes-image-puller</a>というツールを発見し試してみたので、背景や課題感含めてご紹介していきます。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://github.com/che-incubator/kubernetes-image-puller" data-iframely-url="//cdn.iframe.ly/VbiFtNx"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>
<!--more-->

## 課題感
Kubernetesを利用していて、イメージのプル（ダウンロード）を効率化したいと考えたことはないでしょうか。
たとえば、イメージのプルの時間を短縮してデプロイを早くしたいや、ネットワーク帯域などの都合上で事前にノードにイメージをプルしておきたいといったことなどがあります。

## 対策
このような問題にどう立ち向かっていったらいいでしょうか。  

### イメージサイズを小さくする
一つは当然ながら、イメージのサイズを可能な限り小さくすることが考えられます。
イメージサイズを小さくすることで、イメージプルにかかる時間の削減やネットワークの有効活用が可能になります。
イメージのサイズを小さくするプラクティスについては、いろんなところで紹介されていますので、本記事では詳しくは割愛しますが、
マルチステージビルドやレイヤー数を少なくするなどがあります。

こちらのDockerfileのベストプラクティスをご参照ください。  
<a href="https://docs.docker.com/develop/develop-images/dockerfile_best-practices/" target="_blank">Best practices for writing Dockerfiles | Docker Documentation</a>

### レイヤーを意識してイメージを作成する
コンテナイメージはレイヤー構造で構成されています。  
簡単な例でいうと`docker pull`したときに表示されるハッシュ値のリストですが、これがレイヤーです。

```
% docker pull nginxinc/nginx-unprivileged:1.18
1.18: Pulling from nginxinc/nginx-unprivileged
54fec2fa59d0: Already exists
3a4d0e4b78ef: Downloading [=============>                                     ]  7.153MB/26.2MB
83b11c8c3a6e: Download complete
56e6a727dfef: Download complete
e575c5ee613a: Download complete
5073a53c326e: Download complete
```

このレイヤーを意識してコンテナイメージを作成することで、イメージの一部に変更があったとしても最小限のレイヤーのプルのみで済むなどの工夫ができます。プルする対象を減らすことができるので、結果的にイメージプルの効率が上がります。
よくある例としては、アプリケーションのコードに変更があった場合です。
以下はRailsを例にしていますが、アプリケーションを実行するために必要な依存関係のライブラリのインストール(`RUN bundle install部分`)をアプリケーションのコードを置く前に実施しています。
アプリケーションの変更の多くはソースコードであるため、変わらない部分を前に持ってくることで、そこまでのイメージレイヤーを使い回すことができるためです。

```
# Dockerfile
FROM ruby:2.6
RUN gem install bundler -v "1.15.4"
RUN mkdir /usr/local/src/app

# ----- 依存関係ライブラリのインストールを先に行う -----
## ソースコードを入れる前にGemfileをコピーしbundle installしておく
COPY Gemfile /usr/local/src/app/Gemfile
COPY Gemfile.lock /usr/local/src/app/Gemfile.lock
WORKDIR /usr/local/src/app
RUN bundle install
# ----- ここまで -----

# アプリケーション本体コードの配置
COPY . /usr/local/src/app/

CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0", "-p", "3000"]
```

### 事前にノードにイメージをプルしておく
うえ２つの方法については、Kubernetesを利用している多くの方が実践していることではないかなと思っています。
これらの対策をしたとしても、ベースイメージが変更になってしまうときにはプルするイメージのサイズが大きくなってしまいます。
よりコンテナのアップデートを早くするためにデプロイ時にそもそもプルさせたくないこともあると思います。
こういったニーズに応えるために、イメージを各ノードに事前にダウンロードさせておくといった方法もあります。

今日紹介する<a href="https://github.com/che-incubator/kubernetes-image-puller" target="_blank">kubernetes-image-puller</a>は、このような問題を解消する１つの手段です。

## kubernetes-image-puller
上の説明したような問題点を解決するため、事前にノードにイメージをプルさせておくことが１つの対策になるわけですが、それを実装したのがこのkubernetes-image-pullerです。
このソフトウェアはEclipse Cheのレポジトリで公開されているわけですが、もともとの課題を少し書いておきます。
Eclipse CheはKubernetes上で動作するオンラインのエディタです。利用者毎にコンテナとしてエディタ環境を提供します。
より速く開発環境の提供するためにはイメージのプルの効率化が必要だっとのことです。  
では、さっそく簡単に仕組みを見ていきましょう。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://github.com/che-incubator/kubernetes-image-puller" data-iframely-url="//cdn.iframe.ly/VbiFtNx"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

### 仕組み
全体像は以下のとおりです。  
![kubernetes-image-puller-overview](/image/kubernetes-image-puller-overview.png)

ImagePullerを理解する上で重要なポイントは下記のとおりです。

- ImagePullerを利用するためには、Deployment/ConfigMap/ServiceAccountの3つをデプロイする
    - デプロイ方法はHelmかOpenShift Templateで可能
- Deploymentは、ImagePullerの本体を動作させるためのもの。
- ImagePuller本体は、DaemonSetを作成し各ノードにPodをデプロイすることで、イメージをプルさせる
- ConfigMapは、主にDaemonSetに関する設定値
    - ノードにプルさせたいイメージ
    - 利用するNamespaceなど
    - 詳しい設定は<a href="https://github.com/che-incubator/kubernetes-image-puller#configuration" target="_blank">こちらを参照</a>
- ServiceAccountは、ImagePuller自身がDaemoSetなどKubernetesリソースを操作するために利用
    - DaemonSetの作成権限などを付与

### 使ってみる
筆者はOpenShift 4.3の環境で行いましたが、GKEやEKSなどKubernetes環境であれば問題なく動作します。  
以下、デプロイ部分以外は`oc xxxx`は`kubectl xxxx`と読み替えてもらってよいです。

#### 環境
本環境ではWorkerノードが3台ある状態です。

```
$ oc get node | grep worker
ip-10-0-129-134.ap-southeast-1.compute.internal   Ready    worker   75m   v1.16.2
ip-10-0-158-129.ap-southeast-1.compute.internal   Ready    worker   75m   v1.16.2
ip-10-0-175-177.ap-southeast-1.compute.internal   Ready    worker   50m   v1.16.2
```

#### デプロイ
OpenShift Templateを使ってデプロイします。OpenShift以外の環境の人はHelmをお使いください。
デプロイ方法は異なりますが、デプロイされるリソースや仕組み自体は変わりません。  
今回、各ノードに`centos:8`と`nginxinc/nginx-unprivileged:1.18`の2つを事前にプルしておきたいと考えた想定とします。

```
$ oc process -f deploy/openshift/serviceaccount.yaml | oc apply -f -
$ oc process -f deploy/openshift/configmap.yaml \
-p IMAGES="centos=centos:8;nginx=nginxinc/nginx-unprivileged:1.18" \
-p DAEMONSET_NAME="puller" \
| oc apply -f -
$ oc process -f deploy/openshift/app.yaml | oc apply -f -
```

#### 動作確認
デプロイしたので、どのようなリソースが作成されているかみていきます。  
ポイントは以下のとおりです。

- ImagePuller本体がdeploymentとしてデプロイ
    - Pod `pod/kubernetes-image-puller-b556c8bd4-p8shz`が作成されている
- Puller DaemonSetが作成され、`pod/puller-xxxxx` が3つ作成
    - 各ノード分
    - このDaemonSetは前の項目のデプロイ時にデプロイしたものではない。ImagePullerが作成したもの。
- `pod/puller-94tfv`内では2つのコンテナが起動。
    - centosとnginxのイメージを使った2つのコンテナ

```
$ oc get ds,deployment,pod
NAME                          DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
daemonset.extensions/puller   3         3         3       3            3           <none>          35m

NAME                                            READY   UP-TO-DATE   AVAILABLE   AGE
deployment.extensions/kubernetes-image-puller   1/1     1            1           36m

NAME                                          READY   STATUS    RESTARTS   AGE
pod/kubernetes-image-puller-b556c8bd4-p8shz   1/1     Running   0          36m
pod/puller-94tfv                              2/2     Running   0          35m
pod/puller-p9mcm                              2/2     Running   0          35m
pod/puller-tzd6n                              2/2     Running   0          35m
```

#### DaemonSet
DaemonSetの中の設定が気になるので見てみます。  
`spec.template.spec.containers`には、ConfigMapで指定したcentosとnginxの2つのイメージを利用したコンテナが起動しているのがわかります。
実行コマンドは`sleep 30d`となっています。`ImagePullPolicy: Always`となっていることから、30日後にこのPodは終了し、その際に最新となっているイメージをまたプルすることになります。
あまり好ましくないですがlatestタグで運用していても定期的にイメージをプルすることができるわけです。

```yaml
apiVersion: extensions/v1beta1
kind: DaemonSet
metadata:
  name: puller
  namespace: k8s-image-puller
spec:
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      test: daemonset-test
  template:
    metadata:
      creationTimestamp: null
      labels:
        test: daemonset-test
      name: test-po
    spec:
      containers:
      - args:
        - 30d
        command:
        - sleep
        image: centos:8
        imagePullPolicy: Always
        name: centos
        resources:
          limits:
            memory: 20Mi
          requests:
            memory: 10Mi
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
      - args:
        - 30d
        command:
        - sleep
        image: nginxinc/nginx-unprivileged:1.18
        imagePullPolicy: Always
        name: nginx
        resources:
          limits:
            memory: 20Mi
          requests:
            memory: 10Mi
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
      dnsPolicy: ClusterFirst
      restartPolicy: Always
      schedulerName: default-scheduler
      securityContext: {}
      terminationGracePeriodSeconds: 1
  templateGeneration: 1
  updateStrategy:
    rollingUpdate:
      maxUnavailable: 1
    type: RollingUpdate
```

## まとめ
kubernetes-image-pullerを参考に、Kubernetes環境におけるイメージの効率化について考えてみました。  
このソフトウェアをそのまま利用するかどうかは別にしても、DaemonSetを活用してイメージの事前のプルなどが実現でき活用できる場面もありそうです。

今後もKubernetesについて情報発信していきます。