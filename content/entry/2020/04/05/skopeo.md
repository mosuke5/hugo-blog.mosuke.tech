+++
categories = ["Kubernetes", "コンテナ"]
date = "2020-04-05T17:35:48+09:00"
description = "コンテナイメージの別レジストリへのコピーについてSkopeoを例に紹介します。dockerで行う際の課題や簡単な使い方などお伝えしていきます。"
draft = false
image = ""
tags = ["Tech"]
title = "Skopeoを利用したコンテナイメージのレジストリ間コピー"
author = "mosuke5"
archive = ["2020"]
+++

こんにちは。もーすけです。  
コロナでの在宅に非常にしんどくなってきました。  
ブログを書いて気を紛らわしていきたいと思います。
今回は軽めの話題でSkopeoを利用したコンテナイメージのレジストリ間のコピーについてです。
<!--more-->

## 課題感
コンテナレジストリにあるイメージを別のレジストリにコピーしたいと思ったことはないでしょうか。  
よくあるシチュエーションとしては、開発環境のKubernetesクラスタで生成したコンテナイメージをプロダクション環境などのほかのレジストリへ移したい。
あるいは、DockerHubにあるイメージを自分たちの管理するレジストリに保管して管理しておきたい。
などがあるかなと思っています。実際にあります。  
さらに、このようなコンテナイメージの別レジストリへのコピーをCIパイプラインの中に組み込みたいといったことがあります。

## Dockerではだめなのか
まず真っ先にレジストリ間のコピーを考えるとDockerでやろうと思いつくかもしれません。  
`docker pull docker.io/xxx/xxx:tag`でローカルにダウンロードしたイメージを、`docker push myrepository/xxx/xxx:tag`でアップロードすることでレジストリ間のコピーすることは実際に可能です。

しかしDockerで行うには、Docker特有の問題に立ち向かわなければいけません。  
Docker daemonの起動が必要であるということです。
Docker CLIはDocker daemonを通じてイメージやコンテナの操作を行います。
CI環境で実装する場合、CIプロセスのなかでDockerの起動が必要になります。
CIプロセスは、最近のものだとおおくがコンテナで動作するため、コンテナinコンテナ（Docker in Docker）といったことをしなければなりません。
非常に複雑にもなりますし、よりシンプルにしていきたいですよね。

また、DockerのイメージのフォーマットはOCIによって定められたコンテナイメージフォーマットとは異なります。  
現状では、この差によって困ることは少ないと思いますが、Dockerというベンダー規格ではなく、[OCI Image Format](https://github.com/opencontainers/image-spec)で扱いたいケースにおいては、他のツールを用いたことがいいことがあります。

## skopeoというツール
そこでskopeoというツールの出番です。  
skopeoは、コンテナのイメージ・レポジトリに対して様々な操作をおこなうためのコマンドラインツールです。
上で課題にあげたような、なんらかのデーモンの起動が不要で、Dockerといったベンダー規格に縛られずに利用できることが特徴です。
コンテナイメージの操作に特化した分、細かいところで気が利くツールです。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://github.com/containers/skopeo" data-iframely-url="//cdn.iframe.ly/dzHPPff"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

## レジストリー間コピーをする
ではさっそくskopeoを使ってイメージのコピーをやってみます。  
みなさんも簡単にためせるように、docker hubからgitlabのプライベートレジストリへのコピーを試してみることにします。
gitlabは、Gitレポジトリでありながらプライベートのコンテナレジストリの機能も提供してくれています。

### 環境
本ブログでは、Skopeo v1.0かv0.2.0 にての動作を確認しました。  
0.1系をお使いの方は一部オプションが異なります。ポイントについては該当箇所で説明します。

### 認証
プライベートなレジストリを参照したり、コピー先のレジストリにコピーするには当然ながら認証が必要になります。
今回もGitlabのプライベートレジストリを使うのでイメージを書き込むには認証が必要です。
認証するには、コマンドのオプションでレジストリのユーザIDとパスワードを指定するか、認証のファイルを指定するなどで可能です。

以下は、`--dest-creds` オプションでコマンドにIDとパスワードを引数にした場合です。
```
$ skopeo copy --dest-creds="mosuke5:xxxxxx" docker://centos:8 docker://registry.gitlab.com/mosuke5/skopeo-test:v1
```

コマンドラインにIDとパスワードを直接記述することを嫌うケースもあるでしょう。  
認証用のjsonファイルを引数に渡すことで認証することもできます。
dockerを利用している人は`docker login`
フォーマットについてあまり情報がなかったのですが、`user:password`をbase64でエンコードした文字列が必要です。
以下はサンプルです。

```
$ echo -n "user:password" | base64
dXNlcjpwYXNzd29yZA==

$ vim gitlab-auth.json
{
    "auths": {
        "registry.gitlab.com": {
            "auth": "dXNlcjpwYXNzd29yZA=="
        }
    }
}
```

### イメージのコピー、同期
認証方法がわかったところで実際にコピーをしてみます。
以下は、`--dest-authfile`で上で作成した`gitlab-auth.json`を指定しています。

```
$ skopeo copy --dest-authfile="./gitlab-auth.json" docker://centos:8 docker://registry.gitlab.com/mosuke5/skopeo-test:v1
Getting image source signatures
Copying blob 8a29a15cefae done  
Copying config 470671670c done  
Writing manifest to image destination
Storing signatures
```

gitlab側を確認すると期待通りイメージがアップロードされています。

![skopeo-copy](/image/skopeo-copy.png)

skopeoでは、１つ１つのイメージをコピーするだけでなく、すべてのタグをまとめて他のレジストリに同期することも可能です。
centosの場合、39のタグがあり、時間かかりますが以下のように同期できます。

```
$ skopeo sync --dest-authfile="./gitlab-auth.json" --src docker --dest docker docker.io/centos registry.gitlab.com/mosuke5/skopeo-test
INFO[0000] Tag presence check                            imagename=docker.io/centos tagged=false
INFO[0000] Getting tags                                  image=docker.io/library/centos
INFO[0003] Copying image tag 1/39                        from="docker://centos:5.11" to="docker://registry.gitlab.com/mosuke5/skopeo-test/centos:5.11"
Getting image source signatures
Copying blob 2068b24f564b done  
Copying config b424fba011 done  
Writing manifest to image destination
Storing signatures
INFO[0042] Copying image tag 2/39                        from="docker://centos:5" to="docker://registry.gitlab.com/mosuke5/skopeo-test/centos:5"
Getting image source signatures
Copying blob 38892065247a [===============>----------------------] 34.6MiB / 83.3Mi
...
```

### v0.1系でのオプション
v0.1系では`--src-authfile`と`--dest-authfile` のオプションがありません。  
認証の設定ファイルを参照したい場合は `--authfile` を利用しましょう。
srcとdestで異なるファイルを利用することはできませんが、１つの設定フィアルに複数のレジストリ情報を記入することは可能ですので、おそらく実現したいことはできるのではないかと思います。

## oc image mirror
OpenShiftをお使いの方は、ocコマンドを使って`oc image mirror`でもイメージのコピーが可能です。
このコマンドでは、上でいうと認証ファイルを使った認証が可能です。
レジストリ間のイメージのコピーという観点では、変わりはほぼないですが、`oc image mirror`ではS3へのコピーができる点などが特徴的です。
しかし、コンテナイメージの操作という観点では、skopeoのほうが幅をきかせている（イメージのinspectやdelete, syncなどができる）ことを考えると、CIに組み込む際にはskopeoを使ったほうが実装の幅も広がると思います。

## さいごに
というわけで、今回は軽め目の話題でしたが、コンテナイメージのレジストリ間のコピーについてみてきました。
レジストリ間のコピーではありますが、なぜskopeoが生まれたのかやOCIのイメージ仕様など調べていくと奥が深くて楽しいです。
コロナで在宅の時間が長いので、しばらくはブログの執筆頻度を高めていきたいと思っています。