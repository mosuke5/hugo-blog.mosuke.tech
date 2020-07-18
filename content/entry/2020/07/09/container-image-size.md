+++
categories = ["コンテナ", "Kubernetes"]
date = "2020-07-09T18:50:01+09:00"
description = "コンテナイメージは軽いほうがいいといわれますが、どうしたら軽量化できるのか？その仕組みや考え方をまとめました。なぜイメージが軽量であるべきか考えると、コンテナのメリット自身にも気づいてくると考えます。"
draft = false
image = ""
tags = ["Tech"]
title = "コンテナイメージを軽くする方法と、その原理原則を考える"
author = "mosuke5"
archive = ["2020"]
+++

こんにちは。もーすけです。  
先日、はじめてラーメン作りに挑戦しました。非常に美味しくできました。
ラーメン作りにも興味ある方はこちらのブログ（[初心者のための、家系ラーメン自作 徹底ガイド！](https://note.com/morisan_life/n/n2f855f8e5a46)）をご参照ください（笑）

さて本題ですが、はじめてコンテナアプリケーションの開発に挑戦していると覚えることがたくさんあり、楽しさ反面大変さもおそらく感じるかと思います。
そんな覚えることがたくさんの中には、コンテナイメージは軽くしたほうがいいというものも含まれるかもしれません。
軽くしないと動かないわけではないので、はじめてコンテナ環境に挑戦している人はどうしても忘れがち、見落としがちなことかもしれません。
しかし、実際の運用を見据えると、軽量であるほうが断然よいです。  
その理由を理解すると、みなさんが「なぜコンテナに挑戦しているのか」思い出してくるのではないかと思います。
<!--more-->

## なぜ軽いほうがいいのか
「コンテナイメージは軽いほうがいい」そう聞くことも多いかと思います。
VM上動かすアプリケーションだってサイズが大きいよりは小さいに越したことはないです。
では、なぜコンテナ環境でコンテナイメージは軽量であることが望ましいと、とくにいわれているのでしょうか？
ぱっと答えられる人は、そっとブラウザを閉じてもらってOKです。

それは、なぜコンテナを使いたいと思っているか、に立ち返ると見えてくるものがあるのではないでしょうか。
もし、ただ単に流行っているという理由だけでやっているとしたら、コンテナを使う理由の発見にもつながるかもしれません。  
代表的なものに下記がありますが、ぜひ他の視点も考えてみてくだだい。

1. ポータビリティが向上する
1. ノード障害等でコンテナが別ノードに移動する際により早く起動できる
1. これらは、サービスの復旧の速度を早めることがつながる

## 軽くする方法
### その1: ベースイメージを見直す
より軽量なベースイメージを利用するという方法があります。  
みなさんは日頃どのようにベースイメージを選択していますか？
Dockerhubからイメージを選ぶ際もその種類の多さに迷ってしまったことがある人もいるかもしれません。

以下は例としてDockerhubにホストされているRubyのイメージで利用できるタグの一覧の一部をスクリーンショットにとったものです。
Rubyの場合は `<ruby-version>-<base-os>` の命名規則でイメージのタグ名が作られています。
`2.7.1` などは見れば一目瞭然ですが、この後ろについている`buster`や`slim-buster`, `alpine`, `stretch`, `slim-stretch` などがこのイメージを作成するのに使っているベースイメージとなります。

![ruby-dockerhub-tags](/image/ruby-dockerhub-tags.png)

Dockerhubでイメージを見ていてよく遭遇するものをまとめました。

| 名称 | 概要 |
| :--- | :--- |
| buster | Linuxディストリビューションの1つであるDebian 10.0のコードネームがbuster。`slim-buster` とついているのは名前の通り余分なパッケージが削られた軽量版。 |
| stretch | Linuxディストリビューションの1つであるDebian 9.0のコードネームがstretch。`slim-stretch` とついているのは名前の通り余分なパッケージが削られた軽量版。 |
| alpine | Linuxディストリビューションの1つで、軽量でセキュアであることを目指しているもの。とにかく軽量なため、コンテナ環境でも用いられることが多い。パッケージマネージャー`apk`を採用。 |

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
UBIは現状RHEL7or8がベースであり、minimalバージョンも用意しています。イメージの軽量化を試みる場合は、minimalバージョンの利用も検討してください。

<a href="https://catalog.redhat.com/software/containers/ubi8/ubi-minimal/5c359a62bed8bd75a2c3fba8" target="_blank">Red Hat Universal Base Image 8 Minimal</a>

### その2: レイヤーを少なく、同一箇所の変更はまとめる
コンテナイメージはレイヤー構造によって管理されています。
このレイヤーは少ないほうがサイズは小さくできる可能性が高いです。
しかし、レイヤーはキャッシュにも活用されるため、レイヤーを少なくすることがあらゆるワークロードにおいて効率的というわけではありません。
その点注意をして使ってください。

たとえば以下2つのDockerfileを比べてみましょう。
やっていることはどちらも同じで、`debian:buster-slim`イメージに対して、git, vim, rubyをインストールし、
以下2つのDockerfileで比較して確認します。

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

上の2つのDockerfileをビルドしてサイズを確認してします。  
約18MBの差がありますが、`/bin/sh -c apt-get update` で差が出ています。
これは、`apt-get update` によって更新されたファイルを同じレイヤーで削除（`rm -rf /var/lib/apt/lists/*`）したかどうかによって差が出ています。
もう少し平易にいえば、同じディレクトリの変更はひとつのレイヤーで行ってしまったほうが効率的ということでもあります。

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
`chown`や`chmod`といったファイルの権限変更やオーナー・グループの変更でもコンテナイメージのサイズは大きくなってしまうことがありますので注意しましょう。原理は上と一緒ですが、仕組みを理解した上で適切に利用しましょう。
たとえば、`/usr/local/myapp` 内に50MBの独自のアプリケーションのソースコードなどを格納していたとします。
独自のアプリケーションを管理するフォルダのため、`chmod`で権限を絞りたいと考えDockerfile内に`RUN chmod -R 750 /usr/local/myapp` を追加したとします。
さてどうなるか予想してみましょう。

次のDockerfileを使って検証します。  
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

ではビルドしてサイズを確認します。  
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

### その3: 不要なパッケージを含まない
#### ビルド
たとえばDockerfileを利用したコンテナイメージのビルドを行う際に、アプリケーションのビルドとビルド成果物の配置の療法を行うことがあります。
それでは、ビルドに利用したライブラリなどは、アプリケーションを動かすことに必要か考えてみてください。
おそらくNoと考えるのではないでしょうか。
アプリケーションのビルド時には必要だが、アプリケーションを動作させることに必要のないライブラリはコンテナイメージに含めたくないわけです。
そこで利用できるのがマルチステージやCIパイプライン内での工夫です。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://docs.docker.com/develop/develop-images/multistage-build/" data-iframely-url="//cdn.iframe.ly/JIzASiI?iframe=card-small"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

コンテナイメージをCIパイプライン内で作成することも多いかと思います。
その場合、アプリケーションのビルドをイメージ作成とは別ステージにて作ることで同様に回避することも可能です。
たとえば、以下のようなステップでパイプラインが進んでいるとして、"Image Build"にてアプリケーションのビルドをするのではなく、別のステージでビルドしておき、"Image Build"では、前のステップで作成したビルド成果物を使ってコンテナイメージを作るというイメージです。

1. Git push
1. Application Build
1. Application Test
1. Image Build
    - 2の"Application Build"で生成した成果物を用いてイメージ作成

#### 環境毎に異なるパッケージ
上は、アプリケーションのビルドという観点での不要パッケージでしたが、アプリケーションに不要なパッケージを含まないということも必要です。
アプリケーションは、開発・テスト・本番などの環境毎で、異なるパッケージを利用することがあります。
たとえばユニットテストに必要なパッケージ、ライブラリは本番環境で必要でしょうか。
開発用のデバッグツールは本番環境に必要でしょうか。
おそらく必要ないのではないかと思います。

以下はRubyでのGemの例ですが、環境毎に必要なライブラリを分けてインストールしておくことができます。
コンテナとして動かす必要のあるもののみをインストールできるようにしておくといいです。

```
gem 'rails', '5.2.4.2'

## 略

group :development do
  gem 'yard'
end

group :test do
  gem 'rubocop', '~> 0.81.0'
  gem 'rubocop-performance', '~> 1.5.0'
  gem 'rubocop-rails', '~> 2.5.0'
  gem 'selenium-webdriver'
  gem 'simplecov', :require => false
end
```

#### 環境毎にイメージをビルドし直すべきか
CI/CDパイプラインの実装において、「環境毎にビルドし直さない。同じビルド成果物を利用したほうがいい」と言われることがあります。
具体例をだすと、ステージング環境用にイメージをビルドし、ステージング環境にデプロイしたとします。
その後、ステージング環境でのテストが無事にパスし、本番環境向けにデプロイするとなったとき、本番環境用にイメージビルドし直すべきかということです。

イメージを作り直すことで、ステージング環境でテストした時と異なる状態のイメージができ上がるかもしれません。
これは、本番環境へのリリース後に想定外のエラーを発生させる可能性を高めてしまうともいえます。

一方で、上でみてきたように、環境毎に必要なパッケージが異なることもあります。
環境毎に必要なパッケージを変更することで、イメージの軽量化にもつながる可能性があります。
この相反することをどのように捉えたらよいでしょうか？

この問題に明確な答えはないと考えます。
しかし、コンテナイメージの再作成したときにどの程度の再現性があるのか、違いが発生しうるのかを考えるとその環境での選択がみえてくると思います。  
まずは、タイミングです。ステージング環境用にビルドしたときから、本番環境用にビルドするまでの期間が短ければ短いほどそのリスクは減ります。
はじめてビルドしたときから、リリースまで数ヶ月とか数年の単位がかかるようなプロジェクトでは注意が必要かもしれません。

次にどのパッケージがバージョン指定できるかも重要なポイントといえます。
たとえば、多くのアプリケーションのライブラリ管理（Bundlerやnpm, pipなど）はバージョン指定が可能です。
一方で、Linux OSへのパッケージインストールはバージョン固定が難しいです。
対策として、バージョン固定が難しい部分はベースイメージ化しておくなどが考えられます。

この様に、リスクがどこにあるのかと、バージョン固定ができるものできないものを検討していけば、「環境毎にビルドし直さない」を文字通り受け取る必要もないです。

## まとめ
今回は、コンテナイメージが軽量であるべき理由とその対策などについて考えてみました。  
最後の環境毎にビルドし直すかどうかの問題は、自分で書きながらも非常に興味深いトピックだなと思っています。
このような問題は他の場面でもよくあります。答えはないですが、リスクがどこにあるのか、そのリスクは小さくできるか？考えていくとより自分たちにあった運用がきっと見つかると思います。  
みなさんのコンテナ運用がよりスマートになっていくことを願っています。


そういえば、われらがバイブルの「Kubernetes完全ガイド」の第2版の発売が2020/08/07に決定しましたね。非常にうれしいです。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://www.amazon.co.jp/Kubernetes%25E5%25AE%258C%25E5%2585%25A8%25E3%2582%25AC%25E3%2582%25A4%25E3%2583%2589-%25E7%25AC%25AC2%25E7%2589%2588-Top-Gear-%25E2%25BB%2598%25E2%25BC%25AD%25E7%259C%259F%25E4%25B9%259F/dp/4295009792" data-iframely-url="//cdn.iframe.ly/oGj41Jx?iframe=card-small"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>