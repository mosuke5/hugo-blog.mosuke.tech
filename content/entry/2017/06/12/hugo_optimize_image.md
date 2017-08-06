+++
archive = ["2017"]
author = "mosuke5"
categories = ["Hugo","PageSpeed", "最適化", "wercker"]
date = "2017-06-12T23:33:12+09:00"
description = "Hugoを利用したブログ運用環境で、GoogleのPageSpeed対策で画像を自動で圧縮する環境を整えた。optipngとjpegtranを利用。"
draft = false
image = ""
tags = ["Tech"]
title = "Hugo、PageSpeed対策で自動で画像を圧縮する"
+++

最近Hugoを使ったブログに移転した。  
「[はてなブログからHugoに移行。その際に行ったあれこれ。](https://blog.mosuke.tech/entry/2017/05/28/blog_migration/)」

せっかくブログを運営するからにはSEOも少しがんばりたい。  
PageSpeedで画像を最適化できるよっていわれたので、画像を圧縮させようと思った。  
しかし、気がつくと忘れてしまったりするので、  
Werckerを使って自動で最適化させることにした。

<!--more-->

# WerckerでのCI/CD環境
まず、Werckerを使ったCI/CD環境だが、こちらを参考にしてほしい。  
「[Werckerを使ってHugo+Github PagesのCI/CD環境を整備する](https://blog.mosuke.tech/entry/2017/06/04/hugo_deployment_with_wercker/)」

# 画像圧縮処理
ブログの中で使う画像は、JPEGとPNGが混じっている。  
そのため、両方に対応して画像を圧縮する必要があった。

画像の圧縮ツールはPageSpeedが推奨してきた、  
`optipng`と`jpegtran`を利用することにした。

- [OptiPNG: Advanced PNG Optimizer](http://optipng.sourceforge.net/)
- [jpegtran](http://jpegclub.org/jpegtran/)

処理自体はいたってシンプル。  
次のシェル(`optimize_image.sh`)を用意した。

```
#!/bin/sh
find ./static/image/ -name "*.png" | xargs optipng -o5
find ./static/image/ -name "*.jpg" -type f -exec jpegtran -copy none -optimize -outfile {} {} \;
```

# Werckerに組み込む
`wercker.yml`のbuildの段階で最適化を仕込めばおわり。  
ただし、すべての画像ファイルをデプロイのたびに最適化すると時間がかかる。  
定期的にローカルで圧縮してgitに更新しておいたほうがいいだろう。  
あくまで、忘れてしまった時のためにCIでまかなってくれるというスタンスで利用している。

```
- script:
  name: optimize image size
  code: |
    sh ./scripts/optimize_image.sh
```