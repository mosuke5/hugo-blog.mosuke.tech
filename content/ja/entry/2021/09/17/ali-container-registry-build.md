+++
categories = ["Alibaba Cloud"]
date = "2021-09-17T17:21:43+09:00"
description = "Alibaba CloudのContainer Registryのビルド機能についてのナレッジです。中国国内で運用するアプリケーションのコンテナイメージはどこでビルドするべきでしょうか？その答えを実験します。"
draft = false
image = ""
tags = ["Tech"]
title = "Alibaba Cloud、Container Registryのビルドを中国外で行う意味"
author = "mosuke5"
archive = ["2021"]
+++

もーすけです。  
本日は、Alibaba CloudのContainer Registryのビルド機能についてのナレッジをためていきます。
前回も書きましたが、Serverless Kubernetesの構築を最近行っており関連のトピックについて書く頻度が増えそうです。
<!--more-->

## Container Registryのビルド機能
Alibaba Cloudの提供するContainer Registryのサービスは、[イメージビルドの機能](https://www.alibabacloud.com/help/doc-detail/60997.htm)を持ちます。  
レポジトリを作成する際に、ソースコードレポジトリと紐付けできます。
たとえば、GitHubやGitlabのレポジトリです。
こういった外部のGitレポジトリに格納されたDockerfileをもとに自動でビルドしてくれます。

この機能自体はとても便利なので積極的に使っていきたいところです。
CIパイプライン内でビルドしてもいいですが、CIパイプラインの要件に合わせてぜひ選択してください。

## 中国外でビルドする意味
このビルド機能を利用する場合、オプションで `Build With Servers Deployed Outside Mainland China` を有効にするかどうか求められます。
チェックをつけると中国外でイメージビルドを行い、ビルド完了後にイメージを対象のリージョンのレジストリにアップロードしてくれるという機能です。

このオプションがある意味を考えてみましょう。  
Alibaba Cloudを中国リージョン外で利用する人には正直関係がない話となります。

中国リージョンでアプリケーションを運用するとします。
コンテナの起動速度を考慮すると、当然ながらアプリケーションが動作するリージョンと同じリージョンにイメージを置いておきたいです。
また、同じリージョンであればVPCのインターナルエンドポイントも利用でき便利です。

しかし、イメージをビルドする際には、ビルドに必要な各種パッケージをダウンロードすることが多いです。たとえば、Linuxでのdnf/apt-get、Rubyのgem、Pythonのpip、Javaのmavenなどでさまざまあります。
中国から、これらのパッケージを取りにいくとどうしてもネットワークレイテンシでビルドが遅くなります。
そのため、中国外でビルドしてから持ち込んだほうが効率よいということですね。

しかし、これは本当でしょうか？  
実際に実験してみました。結果は下記の通り、中国外でビルドしたほうが全然早いということがわかります。
スクリーンショットの上のレコードが中国外でビルド、下のレコードが中国内でビルドです。
中国外が89秒、中国内が207秒でした。

![speed](/image/container-registry-build-speed.png)

利用したDockerfileは非常にシンプルで、それほど多くのパッケージをダウンロードしていませんが、それでもこれだけの差がでるので、実運用システムだとその差はもっと広がりそうです。

```text
# 利用したDockerfile
FROM redhat/ubi8:8.4
RUN dnf install -y https://dev.mysql.com/get/mysql80-community-release-el8-1.noarch.rpm
RUN dnf install -y python3-devel mysql
RUN mkdir /app
WORKDIR /app
ADD requirements.txt /app/
RUN pip3 install -r requirements.txt
ADD . /app/
CMD ["flask", "run"]
```

```text
# Dockerfile内で利用しているrequirements.txt
Flask==1.1.2
mysql-connector-python==8.0.21
SQLAlchemy==1.3.19
pyhumps==1.6.1
```

## さいごに
今回の検証でわかったように、中国国内で運用するアプリケーションのイメージをもしビルドする場合は、中国外でビルドして持ち込んだほうが効率がよさそうです。
もちろん、中国国内のレポジトリを利用できるなら別ですが。

中国内でのアプリケーション運用の参考にぜひしてください。