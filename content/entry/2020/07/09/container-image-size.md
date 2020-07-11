+++
categories = ["コンテナ", "Kubernetes"]
date = "2020-07-09T18:50:01+09:00"
description = ""
draft = true
image = ""
tags = ["Tech"]
title = "コンテナイメージが軽いほうがいい理由と実現方法を考える"
author = "mosuke5"
archive = ["2020"]
+++

## コンテナイメージとはなんなのか

## なぜ軽いほうがいいのか
「コンテナイメージは軽いほうがいい」そう聞くことも多いかと思います。
VM上動かすアプリケーションだってサイズが大きいよりは小さいに越したことはないです。
では、なぜコンテナ環境でコンテナイメージが軽いほうがいいと特にいわれているのでしょうか？
ぱっと答えられる人は、そっとブラウザを閉じてもらってOKです。

1. 

## 軽くする方法

### ベースイメージ
より軽量なベースイメージを利用するという方法があります。  
みなさんは日頃どのようにベースイメージを選択していますか？
Dockerhubからイメージを選ぶ際もその種類の多さに迷ってしまったことがある人もいるかもしれません。

以下は例としてDockerhubにホストされているRubyのイメージで利用できるタグの一覧の一部をスクリーンショットにとったものです。
Rubyの場合は `<ruby-version>-<base-os>` の命名規則でイメージのタグ名が作られています。
`2.7.1` などは見れば一目瞭然ですが、この後ろについている`buster`や`slim-buster`, `alpine`, `stretch`, `slim-stretch` などがこのイメージを作成するのに使っているベースイメージとなります。

![ruby-dockerhub-tags](/image/ruby-dockerhub-tags.png)

Dockerhubでイメージを見ていると遭遇するものをまとめました。

| 名称 | 概要 |
| :--- | :--- |
| buster | Linuxディストリビューションの1つであるDebian 10.0 のコードネームが buster。`slim-buster` とついているのは名前の通り余分なパッケージが削られた軽量版。 |
| stretch | Linuxディストリビューションの1つであるDebian 9.0 のコードネームが stretch。`slim-stretch` とついているのは名前の通り余分なパッケージが削られた軽量版。 |
| alpine | Linuxディストリビューションの1つで、軽量でセキュアであることを目指しているもの。とにかく軽量なため、コンテナ環境でも用いられることが多い。パッケージマネージャ`apk`を採用。 |

試しに`2.7.1-buster`, `2.7.1-slim-buster`, `alipne3.12`をそれぞれダウンロードしてみました。
イメージサイズに大きな違いがあります。Debianといえども軽量版でないものはイメージサイズが大きすぎますね。

```
$ docker images | grep ruby
ruby    2.7.1-alpine3.12       b46ea0bc5984     2 weeks ago     52.3MB
ruby    2.7.1-slim-buster      8ce8b58afe19     2 weeks ago     149MB
ruby    2.7.1-buster           9b840f43471e     2 weeks ago     842MB
```

#### OpenShiftやRHEL上でコンテナを動かす場合
OpenShiftやRHEL上でコンテナを動かすことを検討している場合は、Red Hatが提供しているUBI (Universal Base Image) の利用も検討してみてください。
ここではUBIの詳細には触れませんが、RHEL(Red Hat Enterprise Linux)をベースにした自由に再配布可能なコンテナ用OSイメージです。
OpenShiftかRHEL上で利用した場合、UBIもRed Hatのサポート対象になります。
このUBIは、現状RHEL7or8ベースがあり、minimalバージョンも用意しているので、イメージの軽量化を試みる場合は、minimalバージョンの利用も検討してください。

<a href="https://catalog.redhat.com/software/containers/ubi8/ubi-minimal/5c359a62bed8bd75a2c3fba8" target="_blank">Red Hat Universal Base Image 8 Minimal</a>

### レイヤーを少なく、同一箇所の変更はまとめる
冒頭のところでご紹介したとおり、コンテナイメージはレイヤー構造によって管理されています。
このレイヤーが少ないほうがサイズは小さくできる可能性が高いです。
ですが、レイヤーはキャッシュにも活用されるため、レイヤーが少ないことがあらゆるワークロードにおいて効率的というわけではないので注意が必要です。

例えば以下2つのDockerfileを比べてみましょう。
やっていることはどちらも同じで、`debian:buster-slim`イメージに対して、git, vim, rubyをインストールし、
以下2つのDockerfileで比較して確認していきます。

```
# Dockerfile-1
FROM debian:buster-slim
RUN apt-get update && \
        apt-get install -y git vim ruby && \
        rm -rf /var/lib/apt/lists/*
```

```
# Dockerfile-2
FROM debian:buster-slim
RUN apt-get update
RUN apt-get install -y git vim ruby
RUN rm -rf /var/lib/apt/lists/*
```

```
$ docker build . -f Dockerfile-1 -t my-ruby:v1
$ docker build . -f Dockerfile-2 -t my-ruby:v2

$ docker images | grep ruby
my-ruby    1-layers    2449e0eeb439    8 minutes ago     224MB
my-ruby    2-layers    b5f389081e02    17 minutes ago    242MB

$ docker history my-ruby:1-layers
IMAGE               CREATED             CREATED BY                                      SIZE                COMMENT
2449e0eeb439        9 minutes ago       /bin/sh -c apt-get update &&         apt-get…   155MB
43e3995ee54a        4 weeks ago         /bin/sh -c #(nop)  CMD ["bash"]                 0B
<missing>           4 weeks ago         /bin/sh -c #(nop) ADD file:4d35f6c8bbbe6801c…   69.2MB

$ docker history my-ruby:2-layers
IMAGE               CREATED             CREATED BY                                      SIZE                COMMENT
b5f389081e02        17 minutes ago      /bin/sh -c rm -rf /var/lib/apt/lists/*          0B
0623ec74ec5f        20 minutes ago      /bin/sh -c apt-get install -y git vim ruby      155MB
5d6295328e90        20 minutes ago      /bin/sh -c apt-get update                       17.4MB
43e3995ee54a        4 weeks ago         /bin/sh -c #(nop)  CMD ["bash"]                 0B
<missing>           4 weeks ago         /bin/sh -c #(nop) ADD file:4d35f6c8bbbe6801c…   69.2MB
```

#### 闇雲な権限変更、オーナー変更は注意
`chown`や`chmod`といったファイルの権限変更やオーナー・グループの変更でもコンテナイメージのサイズは大きくなってしまうことがありますので注意しましょう。利用する際は、仕組みを理解した上で適切に利用しましょう。
例えば、`/usr/local/myapp` 内に50MBの独自のアプリケーションのソースコードなどを格納していたとします。
独自のアプリケーションを管理するフォルダのため、`chmod`で権限を絞りたいと考えDockerfile内に`RUN chmod -R 750 /usr/local/myapp` を追加したとします。
さてどうなるか予想してみましょう。

次のDockerfileを使って検証していきます。  
途中までは、上で使ったものと一緒ですが、ダミーですが50MBのファイルを生成し、その権限を変更するを行っています。

```
# Dockerfile_chmod
FROM debian:buster-slim
RUN apt-get update && \
        apt-get install -y git vim ruby && \
        rm -rf /var/lib/apt/lists/*
RUN mkdir /usr/local/myapp
RUN dd if=/dev/zero of=/usr/local/myapp/50M.dummy bs=1M count=50
RUN chmod -R 750 /usr/local/myapp
```

ではビルドしてサイズを確認していきます。  
気になるのは`docker history my-ruby:chmod`の出力結果で出てきた、`be0adfccccf6`と`951c58f26d5f`の2行です。
下の方については、50MBのファイルを作ったので、サイズが増えるのは素直に納得できますが、上の方では権限の変更を行ったのみですが52.4MBのサイズがあります。
これはまさにコンテナイメージがレイヤー構造となっているがゆえです。
`be0adfccccf6` では権限が変更となったことで、権限が変更された `/usr/local/myapp` を保持していますし、`951c58f26d5f`では権限が変更される前の`/usr/local/myapp`のデータを持っているということです。

```
$ docker build . -f Dockerfile_chmod -t my-ruby:chmod
$ docker images | grep ruby
my-ruby    chmod       be0adfccccf6    18 seconds ago      329MB
my-ruby    1-layers    2449e0eeb439    About an hour ago   224MB
my-ruby    2-layers    b5f389081e02    About an hour ago   242MB

$ docker history my-ruby:chmod
IMAGE               CREATED              CREATED BY                                      SIZE                COMMENT
be0adfccccf6        About a minute ago   /bin/sh -c chmod -R 750 /usr/local/myapp        52.4MB
951c58f26d5f        About a minute ago   /bin/sh -c dd if=/dev/zero of=/usr/local/mya…   52.4MB
806c689e6993        About a minute ago   /bin/sh -c mkdir /usr/local/myapp               0B
2449e0eeb439        About an hour ago    /bin/sh -c apt-get update &&         apt-get…   155MB
43e3995ee54a        4 weeks ago          /bin/sh -c #(nop)  CMD ["bash"]                 0B
<missing>           4 weeks ago          /bin/sh -c #(nop) ADD file:4d35f6c8bbbe6801c…   69.2MB
```

### マルチステージビルド

### 不要なパッケージ
最後にアプリケーションに不要なパッケージを含まないということです。
これはコンテナイメージのビルドに限った話ではないと思いますが、イメージを
アプリケーションは、開発・テスト・本番などの環境毎に利用したいパッケージが異なることがあると思います。