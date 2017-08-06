+++
archive = ["2017"]
author = "mosuke5"
categories = ["CloudFlare","Hugo", "API", "キャッシュ"]
date = "2017-05-29T20:06:31+09:00"
description = "CloudFlareのAPIを利用してキャッシュを削除する方法を紹介。ブログをHugoに移行し、フロントにCloudFlareを利用している。"
draft = false
image = ""
tags = ["Tech"]
title = "CloudFlare APIを使ってキャッシュを削除する"

+++

最近ブログをはてなブログからHugoへ移行した。  
HugoのフロントにCloudFlareを利用している。  
ブログ移行についてはこちらを参照。  
「[はてなブログからHugoに移行。その際に行ったあれこれ。](https://blog.mosuke.tech/entry/2017/05/28/blog_migration/)」

コンテンツをアップロードした場合などにCloudFlareのキャッシュを削除したく、  
APIを利用して効率よく作業できる環境を整えた。

<!--more-->

# 使い方
CloudFlareのAPIドキュメントはかなり充実している。  
キャッシュの全削除については下記に記載がある。  
https://api.cloudflare.com/#zone-purge-all-files

利用方法をみると、`DELETE /zones/:identifier/purge_cache`とあるが、  
`:identifier`がなんのことかはじめわからずはじめ苦戦した。

## identifierの確認
`identifier`は下記APIで確認できる。  
このAPIで返ってくるはじめの`id`が`idenitifer`だ。

```
curl -X GET "https://api.cloudflare.com/client/v4/zones \
    ?name=<your site> \
    &status=active \
    &page=1 \
    &per_page=20 \
    &order=status \
    &direction=desc \
    &match=all" \
    -H "X-Auth-Email: <your email>" \
    -H "X-Auth-Key: <your api key>" \
    -H "Content-Type: application/json" 
```

```
{
  "result": [
    {
      "id": "xxxxxxxxxxxxxxxxxxxxxxx",
      "name": "mosuke.tech",
      "status": "active",
      "paused": false,
      "type": "full",
      "development_mode": 0,
      "name_servers": [
        "rudy.ns.cloudflare.com",
        "sofia.ns.cloudflare.com"
      ],
      ...
      (中略)
      ...
    }
  ]
}
```

## キャッシュの削除
うえで手に入れた`identifier`を使って、ドキュメント通り`purge_cache`を実行するだけだ。  
このAPIをデプロイの過程に組み込み効率よく運用できている。

```
curl -X DELETE "https://api.cloudflare.com/client/v4/zones/<identifier>/purge_cache" \
     -H "X-Auth-Email: <your email>" \
     -H "X-Auth-Key: <your api key>" \
     -H "Content-Type: application/json" \
     --data '{"purge_everything":true}'
```

## さいごに
最近のサービスではめずらしくないが、APIに対応しているのはやはりいい。  
毎度全キャッシュを消してしまっているのはどうかとは思うがそこは今後の改善点だ。  
本件とは関係ないがCloudFlareはterraformにも対応しているし、かなり運用には便利そう。