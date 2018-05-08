+++
categories = ["Docker", "docker-compose", "Ruby", "Ruby on Rails", "デプロイ"]
date = "2018-05-02T23:14:44+09:00"
description = ""
draft = true
image = ""
tags = ["Tech"]
title = "RailsアプリケーションをDocker Composeで運用する"
author = "mosuke5"
archive = ["2018"]
+++

今年も早いものでGWが来てしまいました。  
長期の連休になるとだいたい自分は趣味のアプリケーション開発をよくすすめています（ふだんからやりたいけどなかなかできない）。
いま作っている趣味アプリケーションは自分の英語学習用のサービスなのですが、新しいインフラストラクチャ技術を実際に試す場としても利用しています。アプリケーションはRailsで書いているのですが、Railsの他にMySQLやNginx、ElasticSearchなど関連するコンポーネントも多かったので、Docker Composeを利用して動かすことにしています。実際やってみると、アプリケーションの動かし方についていろいろ問題があり試行錯誤することになりました。最終的にそこそこ良い開発フローに整えることができたので残します。
※もちろん、現時点でのやり方であり、日々改善しているので現状と異なることも多いと思います。
<!--more-->

## 課題
自分の勉強も兼ねて、最終的にアプリケーションはDockerで動かそうと考えていました。
結果的に、コンポーネントも多かったということでDocker Composeを使うことにしました。
本番環境をDocker Composeで動かすとなると、開発環境もcomposeで動かしたほうがいいと考えました。
理由はいくつかありますが、コンポーネントが多いので開発環境で別で立てることは手間がかかるというのと、運用になれるためにも開発環境で極力本番と同じフローを行うべきと考えています。

実際にはじめるといろいろな問題がでてきました。

その１
Railsのコードをどこでどうやって書くか。

その２
Railsアプリのコードをどうやってコンテナに配置するか
ボリュームマウントだと課題がいくつかある
依存パッケージのインストール。アプリのデプロイがコンテナとは別フロー

その３
どうやってRailsのコードをデプロイするか

## Docker Composeを使ったアプリケーションのデプロイフロー
結果的にどうなったか、まず図で示す。  
![development_flow](/image/rails_development_flow.png)

本構成のポイントはまず、DevelopmentとStagingとProductionの3ステージに分けたことだ。
個人の趣味アプリケーションにしてはやりすぎでは？と自分でも思ったが、結果的にこれで落ち着いた。
また、DevelopmentとStagingはステージは別れているが同一マシーン上の話だ。

Developmentの特徴は、Railsのアプリケーションはマシーンのローカル上に配置し動かしている点だ。（その理由は後述する。）そして、関連するコンポーネントであるMySQLとElasticSearchはDocker Compose上で動かしているもので、Railsアプリケーションからそこに接続する構成だ。実際にはNginxも動作しているが、この時点では使わないので無視。
なぜ、RailsアプリケーションだけDocker Composeではなくローカルにしたかというと、

## アプリケーションはコンテナのなかに組み込んだ

## 毎回依存パッケージインストールが走らないために

```
FROM ruby:2.3.1
RUN apt-get update && apt-get upgrade -y
RUN gem install bundler -v "1.15.4"
RUN mkdir /usr/local/src/app

# ----- ここから注目 -----
## ソースコードを入れる前にGemfileをコピーしbundle installしておく
ADD Gemfile /usr/local/src/app/Gemfile
ADD Gemfile.lock /usr/local/src/app/Gemfile.lock
WORKDIR /usr/local/src/app
RUN bundle install
# ----- ここまで注目 -----

ADD . /usr/local/src/app/
RUN bundle exec rake assets:precompile
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0", "-p", "3001"]
```

## Gitlab-ciで自動ビルド
```yml
image: docker:stable

services:
  - docker:dind

stages:
  - release

variables:
  CONTAINER_IMAGE: registry.gitlab.com/$CI_PROJECT_PATH
  DOCKER_DRIVER: overlay2

before_script:
  - docker login -u gitlab-ci-token -p $CI_JOB_TOKEN registry.gitlab.com

release-image:
  stage: release
  script:
    - docker pull $CONTAINER_IMAGE:latest || true
    - docker build --cache-from $CONTAINER_IMAGE:latest --tag $CONTAINER_IMAGE:$CI_BUILD_REF --tag $CONTAINER_IMAGE:latest .
    - docker push $CONTAINER_IMAGE:$CI_BUILD_REF
    - docker push $CONTAINER_IMAGE:latest
  only: 
    - master
```

## Dockerイメージのタグの付け方