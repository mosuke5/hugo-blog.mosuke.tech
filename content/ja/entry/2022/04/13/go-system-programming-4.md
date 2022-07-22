+++
categories = ["サーバ技術"]
date = "2022-03-01T23:38:40+09:00"
description = "「Goならわかるシステムプログラミング」を読みすすめる中で独自に実験したことなどをまとめています。今回は第4章のチャネルです。問題にもチャレンジしているのでサンプル解答としても使ってください。"
draft = false
image = ""
tags = ["Tech"]
title = "Goならわかるシステムプログラミング：第4章 チャネル"
author = "mosuke5"
archive = ["2022"]
+++

こんにちは、もーすけです。  
「Goならわかるシステムプログラミング」を読み進めています。とてもいい本です。
読み進めながら実験していることを書いていきます。同じ本を読んでいる人の参考（寄り道？）になればと思います。
今回は「低レベルアクセスへの入り口3：チャネル」です。

<div class="belg-link row">
  <div class="belg-right col-md-12">
  <div class="belg-title">
      <a href="https://www.amazon.co.jp/Go%E3%81%AA%E3%82%89%E3%82%8F%E3%81%8B%E3%82%8B%E3%82%B7%E3%82%B9%E3%83%86%E3%83%A0%E3%83%97%E3%83%AD%E3%82%B0%E3%83%A9%E3%83%9F%E3%83%B3%E3%82%B0-%E7%AC%AC2%E7%89%88-%E6%B8%8B%E5%B7%9D%E3%82%88%E3%81%97%E3%81%8D/dp/4908686122?keywords=go%E3%81%AA%E3%82%89%E3%82%8F%E3%81%8B%E3%82%8B%E3%82%B7%E3%82%B9%E3%83%86%E3%83%A0%E3%83%97%E3%83%AD%E3%82%B0%E3%83%A9%E3%83%9F%E3%83%B3%E3%82%B0&amp;qid=1649828170&amp;sprefix=go%E3%81%AA%E3%82%89,aps,295&amp;sr=8-1&amp;linkCode=sl1&amp;tag=mosuke5-22&amp;linkId=657574facc6fad628c327647d446818a&amp;language=ja_JP&amp;ref_=as_li_ss_tl" target="_blank">Goならわかるシステムプログラミング 第2版 | 渋川よしき, ごっちん |本 | 通販 | Amazon</a>
    </div>
    <div class="belg-description">Amazonで渋川よしき, ごっちんのGoならわかるシステムプログラミング 第2版。アマゾンならポイント還元本が多数。渋川よしき, ごっちん作品ほか、お急ぎ便対象商品は当日お届けも可能。またGoならわかるシステムプログラミング 第2版もアマゾン配送商品なら通常配送無料。</div>
    <div class="belg-site">
      <span class="belg-site-name">www.amazon.co.jp</span>
    </div>
  </div>
</div>

{{< go-system-programming-series >}}
<!--more-->

## goroutine と チャネル
本章では、goroutineとチャネルについて学びました。  
あまり慣れない概念なので試して遊びます。fooとbarのworkerを用意し、それぞれ1秒/3秒ごとにチャネルへ文字列を書き込みます。逐一その書き込んだ情報を出力する例です。

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	foo := make(chan string)
	bar := make(chan string)
	go worker("foo", foo, 1)
	go worker("bar", bar, 3)

	for {
		select {
		case msgFoo := <-foo:
			fmt.Println(msgFoo)
		case msgBar := <-bar:
			fmt.Println(msgBar)
		default:
			fmt.Println("-----")
			time.Sleep(300 * time.Millisecond)
		}
	}
}

func worker(name string, c chan string, size int) {
	for i := 1; true; i += 1 {
		c <- fmt.Sprint(name, " worker ", i)
		time.Sleep(time.Duration(size) * time.Second)
	}
}
```



## 問題への挑戦
本章は、問題に挑戦した結果だけまとめます。

### Q4.1 タイマー
実装だけみるひ非常にシンプルですが、この感覚になれるのには時間がかかりそうです。
`time.After()` は返り値に、チャネルを返してきます。10秒後にチャネルへ値を入れますが、チャネルにデータが入るまで処理はブロックされるので、結果的に10秒間待つことになります。
もちろん、その間に他の処理を行いたい場合は、goroutineでタイマーを実装するといいですかね。

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	<-time.After(10 * time.Second)
	fmt.Println("timed out")
}
```