+++
categories = ["docker", "mysql"]
date = "2018-04-21T18:25:49+09:00"
description = "Dockerを使ってMySQLをセットアップする際の知見について。ユーザやデータベスの作成、テストデータのインポートなどの方法。"
draft = false
image = ""
tags = ["Tech"]
title = "Docker上でMySQLを利用する際のセットアップについて"
author = "mosuke5"
archive = ["2018"]
+++

個人で作っているサービスをDockerベースで動かしているのだが、MySQL使いたくなってきて導入することになった。
Docker上のMySQL利用ははじめてだったしたので、いろいろわからないところがあった。その知見をまとめる。

<!--more-->

アプリ部分はRuby on Railsを利用している。そのため、基本的に、アプリケーション側からDBマイグレーションの機能などを使って、テーブルの作成やテストデータのインポートは行う。コンテナ基盤側で行ってほしいのは、そもそもMySQLの起動はもちろん、データベース作成だったり、それを扱うためのユーザの設定などだ。

MySQLのDockerイメージがあるので動かすだけならば特に難しいことはなにもない。

```
$ docker run --name mysql -d -p 3306:3306 mysql
```

しかし、MySQLの基本設定や、そもそもrootユーザのパスワードなどどうすればいいのか。  
データベースやユーザはどうやって作ることができるのか。このあたりは当然ながら一番はじめに気になる部分である。

ドキュメント読むとすぐにわかるわけだが、
MySQLのDockerコンテナを起動するときに環境変数を設定することである程度は作成できることがわかる。
https://hub.docker.com/_/mysql/

- MYSQL_ROOT_PASSWORD: rootユーザパスワード
- MYSQL_DATABASE: 作成するデータベース名
- MYSQL_USER: 作成するユーザ名。上で作ったデータベースに関する操作権限を持つ
- MYSQL_PASSWORD: 上のユーザのパスワード

何よりも、MySQLのDockerイメージで立ち上げのときの実行される、`docker-entrypoint.sh`の中身を見ると理解しやすい。  
https://github.com/docker-library/mariadb/blob/master/docker-entrypoint.sh

次のように、環境変数が設定されている場合に、それにそってデータベースの作成やユーザ設定を行ってくれる。

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

しかし、環境変数で設定できる項目には限りがある。  
それ以上のことを行いたい場合には別の方法で行う必要がある。
鍵をにぎるのが同じく`docker-entrypoint.sh`の中に記述のある、`/docker-entrypoint-initdb.d/`だ。
このディレクトリにある、シェルスクリプトやsqlファイルが実行されるようになっている。
もし、セットアップで独自の処理を実行したい場合には、コンテナ起動時にこのディレクトリにファイルを置けばいい。一番簡単なのはボリュームをマウントすることだと思う。

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