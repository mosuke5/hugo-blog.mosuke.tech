+++
categories = ["コンテナ", "インフラ構築"]
date = "2018-04-21T18:25:49+09:00"
description = "Dockerを使ってMySQLをセットアップする際の知見について。ユーザやデータベスの作成、テストデータのインポートなどの方法。"
draft = false
image = ""
tags = ["Tech"]
title = "DockerでのMySQLのセットアップ方法とその仕組みを理解する"
author = "mosuke5"
archive = ["2018"]
+++

こんにちは。もーすけです。  
個人で作っているサービスをDockerベースで動かしているのだが、MySQL使いたくなってきて導入することになった。
Docker上のMySQL利用ははじめてだったので、いろいろわからないところがあった。その知見をまとめる。

<!--more-->

## コンテナに期待すること
筆者の場合は、アプリ部分はRuby on Railsを利用している。
そのため、基本的に、アプリケーション側からDBマイグレーションの機能などを使って、テーブルの作成やテストデータのインポートは行うことを前提にしている。
おそらく、Ruby on Rails以外のWebアプリケーションフレームワークでも同様の利用の仕方をするはずだ。
そうなると、コンテナとして行ってほしいのは、そもそもMySQLの起動はもちろん、データベース作成と、それを操作するためのユーザの設定などだ。

## 起動と基本設定
MySQLのDockerイメージがあるので動かすだけならば特に難しいことはなにもない。

```
$ docker run --name mysql -d -p 3306:3306 mysql
```

しかし、MySQLの基本設定や、そもそもrootユーザのパスワードなどどうすればいいのか。  
データベースやユーザはどうやって作ることができるのか。このあたりは当然ながら一番はじめに気になる部分である。

ドキュメント読むとすぐにわかるが、
MySQLのDockerコンテナを起動するときに環境変数を設定することである程度は設定できることがわかる。（[公式ドキュメント](https://hub.docker.com/_/mysql/)）
下記は、よく利用するであろう基本的な設定ができる環境変数だ。

- `MYSQL_ROOT_PASSWORD`: rootユーザパスワード
- `MYSQL_DATABASE`: 作成するデータベース名
- `MYSQL_USER`: 作成するユーザ名。上で作ったデータベースに関する操作権限を持つ
- `MYSQL_PASSWORD`: 上のユーザのパスワード

例えば、rootパスワードを設定したい場合は以下のようにすればよい。

```
$ docker run --name mysql -e MYSQL_ROOT_PASSWORD=mysecret -d -p 3306:3306 mysql
```

## Dockerfileをのぞく
Dockerfileの中身を見ていくと、より仕組みが理解できる。
MySQLのDockerイメージで立ち上げのときの実行される、`docker-entrypoint.sh`の中身をみるよいい。 

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://github.com/docker-library/mariadb/blob/master/docker-entrypoint.sh" data-iframely-url="//cdn.iframe.ly/nNIVaxs"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

次のように、環境変数が設定されている場合に、それにそってデータベースの作成やユーザ設定を行ってくれることがわかる。

```shell
if [ "$MYSQL_DATABASE" ]; then
	echo "CREATE DATABASE IF NOT EXISTS \`$MYSQL_DATABASE\` ;" | "${mysql[@]}"
	mysql+=( "$MYSQL_DATABASE" )
fi
```

```shell
if [ "$MYSQL_USER" -a "$MYSQL_PASSWORD" ]; then
	echo "CREATE USER '$MYSQL_USER'@'%' IDENTIFIED BY '$MYSQL_PASSWORD' ;" | "${mysql[@]}"

	if [ "$MYSQL_DATABASE" ]; then
		echo "GRANT ALL ON \`$MYSQL_DATABASE\`.* TO '$MYSQL_USER'@'%' ;" | "${mysql[@]}"
	fi

	echo 'FLUSH PRIVILEGES ;' | "${mysql[@]}"
fi
```

## さらなる応用
しかし、環境変数で設定できる項目には限りがある。  
それ以上のことを行いたい場合には別の方法で行う必要がある。
鍵をにぎるのが同じく`docker-entrypoint.sh`の中に記述のある、`/docker-entrypoint-initdb.d/`だ。
このディレクトリにある、シェルスクリプトやsqlファイルが実行されるようになっている。
もし、セットアップで独自の処理を実行したい場合には、コンテナ起動時にこのディレクトリにファイルを置けばいい。一番簡単なのはボリュームをマウントすることだ。
例えば、テーブルの作成やテストデータのインポートなど任意の処理を実行させることができる。

```shell
for f in /docker-entrypoint-initdb.d/*; do
	case "$f" in
		*.sh)     echo "$0: running $f"; . "$f" ;;
		*.sql)    echo "$0: running $f"; "${mysql[@]}" < "$f"; echo ;;
		*.sql.gz) echo "$0: running $f"; gunzip -c "$f" | "${mysql[@]}"; echo ;;
		*)        echo "$0: ignoring $f" ;;
	esac
	echo
done
```

起動のタイミングだけはおさえておくとよい。  
これらの処理自体が下記IF文の中に記述されており、データベースのinitializeのタイミングに実行されることになっている。
もし、initialize後に`/docker-entrypoint-initdb.d/`にファイルを置いても実行されないので注意だ。

```shell
if [ ! -d "$DATADIR/mysql" ]; then
    ....
done
```

## さいごに
Dockerを使ったMySQLの実行方法と設定についてみてきた。  
このようにDockerfileを少しのぞいてみるだけでより多くのことがわかる。
勇気をもってDockerfileをのぞくと視野が広がること間違いなしだ。