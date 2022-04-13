+++
categories = ["サーバ技術"]
date = "2022-03-01T18:37:40+09:00"
description = "「Goならわかるシステムプログラミング」を読みすすめる中で独自に実験したことなどをまとめています。今回は第2章の io.Writerです。"
draft = false
image = ""
tags = ["Tech"]
title = "Goならわかるシステムプログラミング：第2章 io.Writer"
author = "mosuke5"
archive = ["2022"]
+++

こんにちは、もーすけです。  
「Goならわかるシステムプログラミング」を読み進めています。とてもいい本です。
読み進めながら実験していることを書いていきます。同じ本を読んでいる人の参考（寄り道？）になればと思います。
今回は第2章の「低レベルアクセスへの入り口1：io.Writer」です。

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
<!--more-->

## io.WriterでHTTPリクエストする
第2章では、io.Writerを使った「出力の抽象化」について学びました。
Linuxのシステムコール `Write()` は、ファイルのみならず、ソケットや標準出力などファイルではないものもファイルと同じように扱ええます。Write() は、第一引数にファイルディスクリプタをとり、ソケットや標準出力もファイルディスクリプタが割り当てられるため利用できる。

Linuxの{{< external_link url="https://linuxjm.osdn.jp/html/LDP_man-pages/man2/write.2.html" title="writeシステムコールのmanページ" >}}も確認しておくとよいです。Writeシステムコールの冒頭の説明にも、以下のように書かれています。
> write - ファイルディスクリプター (file descriptor) に書き込む

また、本書の中では例として、io.WriteStringを使ってHTTPリクエストを送る実験を行いました。
それを、straceを使って内部のシステムコールの呼び出しを確認してみます。

使ったプログラムは以下で、単純に`blog.mosuke.tech`に対してHTTPのGETリクエストを送信します。
レスポンスとしては、HTTPSにリダイレクトするように301が返ってきますが、レスポンスは重要でないのでよいでしょう。

```go
// main.go
package main

import (
	"io"
	"net"
	"os"
)

func main() {
	conn, err := net.Dial("tcp", "blog.mosuke.tech:80")
	if err != nil {
		panic(err)
	}
	io.WriteString(conn, "GET / HTTP/1.1\r\nHost: blog.mosuke.tech\r\n\r\n")
	io.Copy(os.Stdout, conn)
}
```

まず普通に動きをみます。

```
$ go build main.go
$ ./main
HTTP/1.1 301 Moved Permanently
Date: Wed, 13 Apr 2022 03:36:17 GMT
Transfer-Encoding: chunked
Connection: keep-alive
Cache-Control: max-age=3600
Expires: Wed, 13 Apr 2022 04:36:17 GMT
Location: https://blog.mosuke.tech/
Report-To: {"endpoints":[{"url":"https:\/\/a.nel.cloudflare.com\/report\/v3?s=s%2FAV4oq5Iwd5vBwL5CNvbVuEnigkDo8Ejf7Wk2zH5RqFrx6OgPSmSqFMqDhvMON0GcBLvo%2F9xgJvf9EZ5SKqBqB5uOlQDS90h9qV5R6sGKRog%2B6U5WnCf9a9C0RX9Ua3yTLZ"}],"group":"cf-nel","max_age":604800}
NEL: {"success_fraction":0,"report_to":"cf-nel","max_age":604800}
X-Content-Type-Options: nosniff
Server: cloudflare
CF-RAY: 6fb12813bede3445-NRT
alt-svc: h3=":443"; ma=86400, h3-29=":443"; ma=86400

0
```

次にstraceでmainを観察します。  
writeシステムコールを用いて、HTTPリクエストを送っていることをちゃんと確認できました。

```
$ strace -f -e write=all -o output ./main
$ cat output
...
714591 write(3, "GET /foo HTTP/1.1\r\nHost: blog.mo"..., 45 <unfinished ...>
714588 nanosleep({tv_sec=0, tv_nsec=20000},  <unfinished ...>
714591 <... write resumed>)             = 45
 | 00000  47 45 54 20 2f 66 6f 6f  20 48 54 54 50 2f 31 2e  GET /foo HTTP/1. |
 | 00010  31 0d 0a 48 6f 73 74 3a  20 62 6c 6f 67 2e 6d 6f  1..Host: blog.mo |
 | 00020  73 75 6b 65 2e 74 65 63  68 0d 0a 0d 0a           suke.tech....    |
...
```


## curlの動きを観察する
ということは、curlも同じように実装しているのかとstraceで観察してみました。
結果からいうと、原理は一緒ですがwriteシステムコールは使っておらず、sendtoシステムコールを使っていることを確認できました。

```
$ strace -f -e write=all curl http://blog.mosuke.tech
...
716742 sendto(3, "GET / HTTP/1.1\r\nHost: blog.mosuk"..., 80, MSG_NOSIGNAL, NULL, 0) = 80
 | 00000  47 45 54 20 2f 20 48 54  54 50 2f 31 2e 31 0d 0a  GET / HTTP/1.1.. |
 | 00010  48 6f 73 74 3a 20 62 6c  6f 67 2e 6d 6f 73 75 6b  Host: blog.mosuk |
 | 00020  65 2e 74 65 63 68 0d 0a  55 73 65 72 2d 41 67 65  e.tech..User-Age |
 | 00030  6e 74 3a 20 63 75 72 6c  2f 37 2e 36 31 2e 31 0d  nt: curl/7.61.1. |
 | 00040  0a 41 63 63 65 70 74 3a  20 2a 2f 2a 0d 0a 0d 0a  .Accept: */*.... |
```

{{< external_link url="https://linuxjm.osdn.jp/html/LDP_man-pages/man2/send.2.html" title="sendtoシステムコール" >}} のmanpageを確認するとwriteと同等であることもわかります。

> システムコール send(), sendto(), sendmsg() は、もう一方のソケットへメッセージを転送するのに使用される。
> send() は、ソケットが 接続された (connected) 状態にある場合にのみ使用できる (つまり、どの相手に送信するかは既知である)。 send() と write(2) の違いは、引数に flags があるかどうかだけである。 引数 flags にフラグが指定されない場合、 send() は write(2) と等価である。

## ログの全貌
上で記載したログは、一部の抜粋です。全ログは以下Gistに記載しました。
https://gist.github.com/mosuke5/8fbdfada7150f832a44248c16ed06a7a

## 問題への挑戦
### Q2.1 ファイルに対するフォーマット出力

```go
package main

import (
	"fmt"
	"os"
	"time"
)

func main() {
	file, err := os.Create("tmp.txt")
	if err != nil {
		panic(err)
	}
	defer file.Close()

	fmt.Fprintf(file, "write time %v\n", time.Now())
	fmt.Fprintf(file, "write int %d\n", 1)
	fmt.Fprintf(file, "write string %s\n", "hello")
	fmt.Fprintf(file, "write floot %f\n", 1.234)
}
```

### Q2.2 CSV出力
`csv.Write` は、1レコードを書き込むことができますが、`csv.WriteAll`は複数レコードを同時に書き込めるとともにFlushも内部的に実行してくれるため、こちらを使って実装するのも良さそうです。({{< external_link url="https://pkg.go.dev/encoding/csv@go1.18.1#Writer.WriteAll" tittle="func (*Writer) WriteAll" >}})

```go
package main

import (
	"encoding/csv"
	"os"
)

func main() {
	file, err := os.Create("tmp.txt")
	if err != nil {
		panic(err)
	}
	defer file.Close()

	w := csv.NewWriter(file)
	w.Write([]string{"foo", "bar", "hoge"})
	w.Write([]string{"kuu", "kaa", "joe"})
	w.Flush()
}
```

### Q2.3 gzipされたJSON出力をしながら、標準出力にログを出力
```go
package main

import (
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

func handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Encoding", "gzip")
	w.Header().Set("Content-Type", "application/json")
	source := map[string]string{
		"hello": "world",
	}

	jsonBytes, err := json.Marshal(source)
	if err != nil {
		fmt.Println("JSON marshal error: ", err)
		return 1
	}

	gzipWriter := gzip.NewWriter(w)
	multiWriter := io.MultiWriter(gzipWriter, os.Stdout)
	io.WriteString(multiWriter, string(jsonBytes))
	gzipWriter.Close()
}

func main() {
	http.HandleFunc("/", handler)
	http.ListenAndServe(":8080", nil)
}
```

動作を確認するにはcurlのいくつかのオプションを知っておくと便利です。  
Request/Response headerを確認できるように `-v`オプションを、gzipで圧縮されたなかみを確認するために`--compressed`オプションを使います。

```
$ curl -v --compressed localhost:8080
*   Trying 127.0.0.1:8080...
* Connected to localhost (127.0.0.1) port 8080 (#0)
> GET / HTTP/1.1
> Host: localhost:8080
> User-Agent: curl/7.79.1
> Accept: */*
> Accept-Encoding: deflate, gzip
>
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
< Content-Encoding: gzip
< Content-Type: application/json
< Date: Wed, 13 Apr 2022 08:01:26 GMT
< Content-Length: 41
<
* Connection #0 to host localhost left intact
{"hello":"world"}
```

圧縮されたデータを解凍して確認する。
```
$ curl -s -v --compressed --raw -o result.gz localhost:8080
*   Trying 127.0.0.1:8080...
* Connected to localhost (127.0.0.1) port 8080 (#0)
> GET / HTTP/1.1
> Host: localhost:8080
> User-Agent: curl/7.79.1
> Accept: */*
> Accept-Encoding: deflate, gzip
>
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
< Content-Encoding: gzip
< Content-Type: application/json
< Date: Wed, 13 Apr 2022 08:03:29 GMT
< Content-Length: 41
<
{ [41 bytes data]
* Connection #0 to host localhost left intact

$ ls result.gz
result.gz

$ cat result.gz
��V�H���W�R*�/�IQ����A	�%

$ gunzip -c result.gz
{"hello":"world"}
```