+++
archive = ["2017"]
author = "mosuke5"
categories = ["Hugo","Wercker", "ブログ", "CI/CD", "Github Pages", "デプロイ"]
date = "2017-06-04T14:47:15+09:00"
description = "Werckerを使ったHugo+Github Pages運用のサイトのCICDを紹介する。デプロイだけでなく、CloudFlareやSlack通知など周辺処理も紹介。"
draft = false
image = ""
tags = ["Tech"]
title = "Werckerを使ってHugo+Github PagesのCI/CD環境を整備する"
+++

以前、はてなブログからHugoを使ったサイトに移行したことを書いた。  
こちら参照：[はてなブログからHugoに移行。その際に行ったあれこれ。](https://blog.mosuke.tech/entry/2017/05/28/blog_migration/)

今回、Hugoで記事を更新してからデプロイまでの流れをWerckerを使って自動化したので紹介する。

<!--more-->

# 概要
今までは下記のフローでデプロイを行っていた。  
一部シェルスクリプトにして自動化していたが、hugoファイルを管理するレポジトリとGithub Pages用の  
２つのレポジトリへのコミットが必要で手間がかかっていた。

1. hugoファイル側で記事更新、デザイン変更
1. 更新のコミット、プッシュ
1. `hugo`コマンドでビルド
1. `/public`以下のファイルをgithub pages用のレポジトリへコピー
1. github pages用レポジトリーへ移動してコミット、プッシュ
1. CloudFlareのキャッシュ削除

このフローをWerckerを利用して下記のように変更した。

1. hugoファイル側で記事更新、デザイン変更
1. 更新のコミット、プッシュ
1. Werckerでビルド
1. Werckerでビルド結果をGithub pages用レポジトリへプッシュ
1. WerckerでCloudFlareのキャッシュ削除やSlack通知

Werckerを使っていわゆるCI/CDのフローを組むことで、  
hugo側のファイル・レポジトリ管理をするだけでよくなった。

# werckerの設定
## wercker.yml
まず、`wercker.yml`から記述する。  
Werckerを利用するには自分のレポジトリに`wercker.yml`を配置する必要があり、  
このファイルに記述のとおりに自動化処理を行わせる。  
本記事ではWerckerの細かい話は割愛するが、以下が`wercker.yml`だ。

```yml
box: debian
build:
  steps:
    - install-packages:
        packages: git
    - script:
        name: download theme
        code: |
            $(git clone https://github.com/dplesca/purehugo ./themes/purehugo)
    - arjen/hugo-build:
        version: "0.20"
        theme: purehugo
        flags: --buildDrafts=false
  after-steps:
    - slack-notifier:
      channel: $SLACK_CHANNEL
      url: $SLACK_URL
      username: wercker_bot

deploy:
  steps:
    - install-packages:
        packages: git ssh-client curl
    - leipert/git-push:
        gh_oauth: $GIT_TOKEN
        repo: mosuke5-lab/mosuke5-lab.github.io
        branch: master
        basedir: public
        gh_pages_domain: blog.mosuke.tech
  after-steps:
    - script:
      name: delete cloudflare cache
      code: |
        sh ./scripts/delete_cache_all.sh ${CF_ZONE_ID} ${CF_EMAIL} ${CF_KEY}
    - slack-notifier:
      channel: $SLACK_CHANNEL
      url: $SLACK_URL
      username: wercker_bot
```

## ビルド時のhugoバージョンはきちんと書く
`wercker.yml`を書く際に注意する点の１つがhugoバージョンの明記だ。  
以下部分の`version`は、自分のローカルの環境のHugoバージョンときちんと合わせるとよい。  
公式ドキュメントを参考にしてこの環境を作ったが、はじめドキュメントのままコピペで行っていたので、一部ビルド結果が本番環境だけ異なることがあり、はまった。  
[Automated deployments with Wercker](https://gohugo.io/tutorials/automated-deployments/#using-hugo-build)

```
    - arjen/hugo-build:
        version: "0.20"
        theme: purehugo
        flags: --buildDrafts=false
```

## デプロイは'leipert/git-push'を使った
公式ドキュメントでは`lukevivier/gh-pages`の利用を紹介している。  
しかし、現状Github pagesは`master`ブランチのコードをビルドするようにできている。  
このツールではどうしても`gh-page`ブランチにデプロイするため、用途と合わなかった。
（自分がなにか間違っているだけな気もするが。。。）

あと、`lukevivier/gh-pages`ではデプロイのコミットログが残らない。  
その点でも[leipert/git-push](https://github.com/leipert/step-git-push)はかなりおすすめ。

## CloudFlareのキャッシュ削除
Github Pagesの前段にCloudFlareを利用している。  
CloudFlareのキャッシュ削除は、以前に作ったシェルスクリプトをそのまま実行する形をとった。  
参考：[CloudFlare APIを使ってキャッシュを削除する](https://blog.mosuke.tech/entry/2017/05/29/how_to_use_cloudflare_api/)

## werckerの設定
`wercker.yml`を配置しただけでは適切にCI/CDプロセスを実行することは実はできない。  
wercker側でワークフローを定義する必要がある。  
今回は、`build`と`deploy`の2つに分けてワークフローを定義した。

1. build: デプロイする静的ファイルの生成
1. deploy: 生成したファイルの本番環境へのデプロイ
    1. masterブランチに変更があった時だけ実行
    1. deploy後の後処理も実行

![wercker_hugo-blog.mosuke.tech_workflow](/image/wercker_hugo-blog.mosuke.tech_workflow.png)
