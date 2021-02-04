+++
categories = ["", ""]
date = "2021-01-31T12:10:51+09:00"
description = ""
draft = true
image = ""
tags = ["Tech"]
title = "tcpdump on container"
author = "mosuke5"
archive = ["2021"]
+++

こんにちは、もーすけです。休日はもっぱら住宅購入の検討で忙しいマンです。  
さて、本日は、Kubernetesのアプリケーションのデバッグに関して書きます。

Kubernetesで運用中のアプリケーションの障害対応で、ネットワーク関連のデバッグをしたいことはよくあります。
このブログでは具体的にtcpdumpを取得したいという場面を想定して書きます。
コンテナアプリケーションの開発・運用をしていると、**イメージのサイズを小さく保っておきたい**と思うはずです。
その理由についてはいろいろとありますが、イメージの展開のスピードを高めることで、デプロイや障害時の復旧を早めるなどが代表的なところです。（関連するトピックとして「[コンテナイメージを軽くする方法と、その原理原則を考える](https://blog.mosuke.tech/entry/2020/07/09/container-image-size/)」も読んでみてください。）

それゆえに、アプリケーションの動作に必要なライブラリ以外は入れないことが多く、デバッグツールを除外しておくことが多いでしょう。
しかし、障害発生時にいざtcpdumpやstrace, ping ,digなどを打ちたいと思ってもインストールされておらず困ることがあります。
そんな場面に遭遇しても焦らないようにあらかじめ対応策を頭に入れて練習しておきましょう。
<!--more-->

## はじめに
いくつかのアプローチ

## Sidecarでデバッグコンテナを起動する
いくつかのアプローチはありますが、既存のアプリケーションに影響を与えることなく実施できる方法として、Sidecar（サイドカー）でデバッグ用のコンテナを起動する、があります。
デバッグ用のコンテナイメージを事前に準備しておくことで手軽に実現できます。

### Pod内のコンテナはNetwork Namespaceを共有する

### Sidecarを起動して実行する
実例でわかりやすくするため、Nginxを起動しておき、Nginxコンテナにたいしてtcpdumpを実行したいとします。
まずは、以下のNginxコンテナを起動しておきます。また、起動したNginxのイメージにはtcpdumpがインストールされておらず、実行しても当然エラーで弾かれます。

```
$ kubectl create deployment my-nginx --image=nginxinc/nginx-unprivileged:latest
deployment.apps/my-nginx created

$ kubectl get deploy,pod
NAME                       READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/my-nginx   1/1     1            1           9s

NAME                            READY   STATUS    RESTARTS   AGE
pod/my-nginx-65c459cdc6-g2gdg   1/1     Running   0          9s

$ kubectl exec -it pod/my-nginx-65c459cdc6-g2gdg -- tcpdump
ERRO[0000] exec failed: container_linux.go:349: starting container process caused "exec: \"tcpdump\": executable file not found in $PATH"
exec failed: container_linux.go:349: starting container process caused "exec: \"tcpdump\": executable file not found in $PATH"
command terminated with exit code 1
```

ではこのNginxに対してtcpdumpがインストールされたデバッグ用のコンテナをサイドカーとして起動します。
この場で利用するのは、[nicolaka/netshoot](https://hub.docker.com/r/nicolaka/netshoot) というパブリックのコンテナイメージです。
ネットワークデバッグに必要なコマンドがあらかじめインストールされています。
のちほど後述しますが、自分たちの運用のしやすいよう自作しておくのもいいでしょう。

```
$ kubectl edit deploy my-nginx
spec:
  template:
    spec:
      containers:
        # ここを追加
        - image: nicolaka/netshoot
          name: debug
          command:
            - /bin/sh
            - -c
            - sleep 3600
...

Podが2/2と2つ目のコンテナが追加されている
$ kubectl get pod
NAME                       READY   STATUS    RESTARTS   AGE
my-nginx-894b94fbb-5qcwb   2/2     Running   0          2m15s

tcpdumpを確認
$ kubectl exec my-nginx-894b94fbb-5qcwb -c debug -- which tcpdump
/usr/bin/tcpdump
```

### runasuser, capability?

### デバッグ用コンテナイメージの準備しておく

## まとめ