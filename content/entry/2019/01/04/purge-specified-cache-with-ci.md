+++
categories = ["Hugo", "CloudFlare", "Wercker"]
date = "2019-01-04T17:37:35+09:00"
description = "HugoのようなスタティックWebをCDNで配信している場合、過去記事の更新時のキャッシュの削除などが必要です。CIの過程で動的に更新したファイルのキャッシュを削除するようにしました。"
draft = false
image = ""
tags = ["Tech"]
title = "更新したファイルのCloudFlareキャッシュをCI過程で自動で削除する"
author = "mosuke5"
archive = ["2019"]
+++

明けましておめでとうございます。@mosuke5です。  
年末年始で少しだけ本ブログサイトの運用改善をしたのでその記録です。
CIの過程で更新したファイルのキャッシュを削除できるようにしました。
<!--more-->

## 背景
本ブログは現時点でHugoを使っているのですが、CloudFlareでエンドユーザー向けのコンテンツのキャッシュと配信を行っています。
詳しくはこちらの[スライドを参照](https://docs.google.com/presentation/d/1MJ8c7QkdYl5BIp9eS3Li2viq-V-CgdpnJKWylYa_dW0/edit#slide=id.g24396a60f1_1_0)してください。

![design-for-goldstine-lab](/image/design-for-goldstine-lab.png)

例えば記事の投稿や更新などを行った際に、キャッシュがきいているため変更を反映するためには、キャッシュを削除(Purge)する必要があります。
過去も以下のようにCI（Wercker）でキャッシュを削除することを行っていたのですが、トップページやRSS向けのfeedのみキャッシュ削除をしていました。

[CloudFlare APIを使ってキャッシュを削除する](https://blog.mosuke.tech/entry/2017/05/29/how_to_use_cloudflare_api/)

問題として、過去の記事の更新・修正を行った際に、いちいちキャッシュ削除の作業を手動でやらなければならず非常に面倒な思いをしていました。  
すべてのコンテンツのキャッシュを削除することもできるのですが、それではちょっと芸がないなと思い、更新した記事のキャッシュをきちんと消したいと思っていました。

## 解決
解決方法はいたって簡単です。  
いままで、トップページやfeedなど固定で設定していたpurge対象をダイナミックにするということです。
下のような簡単なシェルスクリプトで解決をはかりました。

```bash
#!/bin/bash

# Add array to uris to purge contents uri
uris=("/" "/sitemap.xml" "/index.xml")
files=`git diff --name-only HEAD^`
for i in $files
do
    if [[ ${i} =~ ^(content/).*(.md) ]]; then
        # "content/xxxx/aiueo.md" => "/xxxx/aiueo/"
        uris+=("${i:7:-3}/")
    elif [[ ${i} =~ ^(static/) ]]; then
        # "static/image/aiueo.png" => "/image/aiueo.png"
        uris+=("${i:6}")
    fi
done

# Create arg param
files_param=""
base_url="https://blog.mosuke.tech"
for uri in "${uris[@]}"
do
    echo "${base_url}${uri}"
    files_param+="\"${base_url}${uri}\","
done
files_param="${files_param:0:-1}" #delete last comma

# Exec CloudFlare API to purge cache
sleep 10
curl -X DELETE "https://api.cloudflare.com/client/v4/zones/$1/purge_cache" \
     -H "X-Auth-Email: $2" \
     -H "X-Auth-Key: $3" \
     -H "Content-Type: application/json" \
     --data "{\"files\": [${files_param}]}"
```

### 更新したファイルの特定は？
こちらは単純にgit diffを使ってひとつ前のコミットとの差分を取りました。
基本的にPR形式でマージするので、いまはこれでいいかなあと思いこうしています。

`uris=("/" "/sitemap.xml" "/index.xml")` は固定値として、必ずキャッシュクリアしたいものをいれています。

### 更新したファイルのURLの特定は？
CloudFlareではもちろんURLベースでキャッシュするので、ファイルを特定できてもキャッシュは削除できません。
ファイル名から簡単に正規表現を使ってHugoのURLに変換しています。

`/static`と`/content`のものしかキャッシュ削除にしていません。

### 結果は？
実際に2014年の記事を修正し、Werckerで実行結果をみてみると。  
きちんと2014年の過去記事のキャッシュを削除できているようでした。
```
※見やすくするため改行しています
files_param='
"https://blog.mosuke.tech/",
"https://blog.mosuke.tech/sitemap.xml",
"https://blog.mosuke.tech/index.xml",
"https://blog.mosuke.tech/entry/2014/12/31/170545/"'
```

## さいごに
年明け一発目の記事として、年末年始に改善したことを少し書きました。  
正直、かなり荒削りで実装しているので、本気でやるにはもっとキャッシュを削除するコンテンツを吟味する必要がありますが、
いままで困っていたことは取り急ぎこちらで解消できそうです。