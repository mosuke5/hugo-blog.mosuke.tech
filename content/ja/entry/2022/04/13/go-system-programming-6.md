+++
categories = ["サーバ技術"]
date = "2022-03-01T23:40:40+09:00"
description = "「Goならわかるシステムプログラミング」を読みすすめる中で独自に実験したことなどをまとめています。今回は第6章のTCPソケットとHTTPの実装です。"
draft = false
image = ""
tags = ["Tech"]
title = "Goならわかるシステムプログラミング：第6章 TCPソケットとHTTPの実装"
author = "mosuke5"
archive = ["2022"]
+++

こんにちは、もーすけです。  
「Goならわかるシステムプログラミング」を読み進めています。とてもいい本です。
読み進めながら実験したことなどを書いていきます。同じ本を読んでいる人の参考（寄り道？）になればと思います。
今回は「TCPソケットとHTTPの実装」です。

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

## 「6.4 ソケット通信の基本構造」
「6.4 ソケット通信の基本構造」では、TCPサーバの実装の解説がありますが、さらっと流されているのでせっかくなので手元で動かして理解を深めてから、「6.5 Go言語でのHTTPサーバを実装する」に移りたいと思います。

### Minimum TCPサーバ
本当に最小限のTCPサーバの実装。  
TCPリクエストがくると処理はしますが、プログラムが終了してしまうため一度しか応答できません。
書籍ではTCPのクライアントもGoで書いていますが、もっと手軽に `nc` コマンドでさくっと試してみましょう。

```go
package main

import (
	"io"
	"net"
)

func main() {
	ln, err := net.Listen("tcp", ":8080")
	if err != nil {
		panic(err)
	}
	conn, err := ln.Accept()
	if err != nil {
		panic(err)
	}

  // 2章 io.Writerで学んだことを復習
	io.WriteString(conn, "hello from my tcp server!")
}
```

`nc` コマンドでリクエスト送信後、リクエストは返ってきますが、2度目の送信ではレスポンスがなく、exitコードも1（エラー）であることが確認できました。

```
$ nc localhost 8080
hello from my tcp server!

$ nc localhost 8080
$ echo $?
1
```

### プログラムを終了させないTCPサーバ
次は、せめて何度でもリクエストに答えられるように `for` で繰り返しリクエストに応答します。
しかし、一度に1リクエストしか受け付けられません。その様子がわかるように処理にsleep処理を入れて、ふたつのクライアントから接続にいきます。

```go
package main

import (
	"fmt"
	"io"
	"net"
	"time"
)

func main() {
	ln, err := net.Listen("tcp", ":8080")
	fmt.Println("TCP server is running on localhost:8080")
	if err != nil {
		panic(err)
	}

	for {
		conn, err := ln.Accept()
		if err != nil {
			panic(err)
		}
		io.WriteString(conn, "processing...")
		time.Sleep(3 * time.Second)
		io.WriteString(conn, "done")
		conn.Close()
	}
}
```

片方の処理が終わってから、もう片方の処理が実行されることを確認できます。

![go-tcp-server-test](/image/go-tcp-server-test.gif)

### 複数リクエストを処理できるTCPサーバ
続いて、今度は複数リクエストを同時に処理できるように改良します。
実処理部分をgoroutineで別スレッド処理にすることで実現できるでしょう。

```go
package main

import (
	"fmt"
	"io"
	"net"
	"time"
)

func main() {
	ln, err := net.Listen("tcp", ":8080")
	fmt.Println("TCP server is running on localhost:8080")
	if err != nil {
		panic(err)
	}

	for {
		conn, err := ln.Accept()
		if err != nil {
			panic(err)
		}

		// goroutineでノンブロッキング処理
		go func() {
			io.WriteString(conn, "processing...")
			time.Sleep(3 * time.Second)
			io.WriteString(conn, "done")
			conn.Close()
		}()
	}
}
```

![go-tcp-server-test-2](/image/go-tcp-server-test-2.gif)