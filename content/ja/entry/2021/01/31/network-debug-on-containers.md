+++
categories = ["Kubernetes"]
date = "2021-01-31T12:10:51+09:00"
description = "Kubernetes上で運用しているアプリケーションのデバッグでtcpdumpなどネットワーク関連コマンドを打ちたいときがあります。イメージを小さく保つことをするとデバッグツールが入っておらず慌てることがあるのでその対処法について紹介します。"
draft = false
image = ""
tags = ["Tech"]
title = "Kubernetes上のアプリケーションをtcpdumpでデバッグする"
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
Kubernetes上で動いているアプリケーションのデバッグ方法に対するアプローチはいくつかあります。
以下のブログに、他のパターンも含めて紹介されていたので合わせて読むとよさそうです。
本ブログでは、その中のサイドカーでデバッグコンテナを起動する方法に焦点を当てています。既存のアプリケーションに影響を与えることなく実現できる点としてよく使う方法ではないかと思っています。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://qiita.com/tkusumi/items/a62c209972bd0d4913fc" data-iframely-url="//cdn.iframe.ly/9u1xfhJ?iframe=card-small"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

## Sidecarでデバッグコンテナを起動する
いくつかのアプローチはありますが、既存のアプリケーションに影響を与えることなく実施できる方法として、Sidecar（サイドカー）でデバッグ用のコンテナを起動する、があります。
デバッグ用のコンテナイメージを事前に準備しておくことで手軽に実現できます。

### Pod内のコンテナはNetwork Namespaceを共有する
Kubernetesの世界では、PodがWorkloadの最小単位ですが、Pod内に複数のコンテナを起動することが可能です。同じPod内のコンテナはネットワーク的には分離されておらず、IPアドレスを共有します。下の図のように、Network Namespaceを共有しておりNICも同一です。
つまり、アプリケーション向けのパケットに対して、サイドカーコンテナ（Pod内の別のコンテナ）からパケットをキャプチャできます。

![share-network-namespace](/image/share-network-namespace.png)

試しにfedoraとbusyboxを同一のPod内に起動した`my-pod`があります。
それぞれのコンテナで`ifconfig -a`をうってインターフェイス情報を確認してみます。同じIPアドレスのeth0を保有しているのがわかります。ぜひためしてみてください。

```text
$ kubectl get pod
NAME                         READY   STATUS    RESTARTS   AGE
my-pod   2/2     Running   0          4m22s

$ kubectl exec  my-pod -c busybox -- ifconfig -a
eth0      Link encap:Ethernet  HWaddr 0A:58:0A:80:02:28
          inet addr:10.128.2.40  Bcast:10.128.3.255  Mask:255.255.254.0
          inet6 addr: fe80::85f:20ff:fe4c:314a/64 Scope:Link
          UP BROADCAST RUNNING MULTICAST  MTU:8951  Metric:1
          RX packets:13900 errors:0 dropped:0 overruns:0 frame:0
          TX packets:7949 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:0
          RX bytes:118417427 (112.9 MiB)  TX bytes:570079 (556.7 KiB)

lo        Link encap:Local Loopback
          inet addr:127.0.0.1  Mask:255.0.0.0
          inet6 addr: ::1/128 Scope:Host
          UP LOOPBACK RUNNING  MTU:65536  Metric:1
          RX packets:0 errors:0 dropped:0 overruns:0 frame:0
          TX packets:0 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:1000
          RX bytes:0 (0.0 B)  TX bytes:0 (0.0 B)

$ kubectl exec  my-pod -c fedora -- ifconfig -a
eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 8951
        inet 10.128.2.40  netmask 255.255.254.0  broadcast 10.128.3.255
        inet6 fe80::85f:20ff:fe4c:314a  prefixlen 64  scopeid 0x20<link>
        ether 0a:58:0a:80:02:28  txqueuelen 0  (Ethernet)
        RX packets 13900  bytes 118417427 (112.9 MiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 7949  bytes 570079 (556.7 KiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)
        RX packets 0  bytes 0 (0.0 B)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 0  bytes 0 (0.0 B)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```

### Sidecarを起動して実行する
実例でわかりやすくするため、Nginxを起動しておき、Nginxコンテナにたいしてtcpdumpを実行したいとします。
まずは、以下のNginxコンテナを起動しておきます。また、起動したNginxのイメージにはtcpdumpがインストールされておらず、実行しても当然エラーで弾かれます。

```text
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

```text
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

### Ephemeral containers(エフェメラルコンテナ)を使う
前のセクションでは直接Deploymentのマニフェストを編集しましたが、こんなときはEphemeral containersを使うのもいいでしょう。
Ephemeral containersは、Kubernetes 1.20現在ではまだGAされていないので、その点は注意が必要です。
詳しくは、こちらの[公式ドキュメント](https://kubernetes.io/ja/docs/concepts/workloads/pods/ephemeral-containers/)を確認しましょう。

### runAsUserを確認しておく
tcpdumpのような実行にroot権限が必要なコマンドを使いたい場合は、コンテナの起動ユーザ（`runAsUser`）にも注意しましょう。
サイドカーでデバッグコンテナを起動しても、デバッグコンテナ自身のプロセスがrootで動いていない場合、以下のように実行に失敗します。

```text
$ kubectl exec -it my-nginx-664cc58c8c-k4vjp -c debug -- tcpdump
tcpdump: eth0: You don't have permission to capture on that device
(socket: Operation not permitted)
command terminated with exit code 1
```

OpenShiftを使っていている場合、SCCの設定によっては、自動で`runAsUser`が設定されます。
その場合は、管理者に連絡し、一時的にでもSCCの設定を緩めてもらうなどで対応が必要です。

### デバッグ用コンテナイメージの準備しておく
上の例では、nicolaka/netshootのパブリックイメージを利用しましたが、アプリケーションによってデバッグに使いたいツールは異なるでしょう。
場合によってはデータベースへの接続のクライアントや使い慣れているプログラミング言語などが必要です。
自分たちが使いやすいデバッグ用のコンテナイメージを準備しておくといざというときにすばやく行動できます。
サンプルですが、自分はGitlabにデバッグ用のコンテナイメージをビルドするためのDockerfileとGitlab CIを用いたビルドの環境を用意しています。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://gitlab.com/mosuke5/debug-container" data-iframely-url="//cdn.iframe.ly/bSnGj1z"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>
