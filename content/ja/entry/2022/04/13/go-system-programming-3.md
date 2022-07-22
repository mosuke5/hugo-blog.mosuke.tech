+++
categories = ["サーバ技術"]
date = "2022-03-01T23:37:40+09:00"
description = "「Goならわかるシステムプログラミング」を読みすすめる中で独自に実験したことなどをまとめています。今回は第3章の io.Readerです。問題にもチャレンジしているのでサンプル解答としても使ってください。"
draft = false
image = ""
tags = ["Tech"]
title = "Goならわかるシステムプログラミング：第3章 io.Reader"
author = "mosuke5"
archive = ["2022"]
+++

こんにちは、もーすけです。  
「Goならわかるシステムプログラミング」を読み進めています。とてもいい本です。
読み進めながら実験していることを書いていきます。同じ本を読んでいる人の参考（寄り道？）になればと思います。
今回は「低レベルアクセスへの入り口2：io.Reader」です。

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

## 問題への挑戦
本章は、問題に挑戦した結果だけまとめます。

### Q3.1 ファイルのコピー
これはシンプルですね。`os.Args`で引数とってCLI的に使えるようにしてみました。

```go
package main

import (
	"io"
	"os"
)

func main() {
	oldFile, err := os.Open(os.Args[1])
	if err != nil {
		panic(err)
	}
	defer oldFile.Close()

	newFile, err := os.Create(os.Args[2])
	if err != nil {
		panic(err)
	}
	defer newFile.Close()

	io.Copy(newFile, oldFile)
}
```

### Q3.2 テスト用の適当なサイズのファイルを作成
`io.CopyN`など補助関数使うともっとシンプルにできると思います。

```go
package main

import (
	"crypto/rand"
	"io"
	"os"
)

func main() {
	buffer := make([]byte, 1024)
	_, err := rand.Read(buffer)

	if err != nil {
		panic(err)
	}

	file, err := os.Create("tmp.txt")

	if err != nil {
		panic(err)
	}

	defer file.Close()

	io.WriteString(file, string(buffer))
}
```

でき上がったファイルのサイズもしっかり期待通りです。

```
$ go run main.go
$ ls -l tmp.txt
-rw-r--r--  1 mosuke5  staff  1024  4 13 17:31 tmp.txt
```

### Q3.3 Zipファイルの書き込み
```go
package main

import (
	"archive/zip"
	"io"
	"os"
	"strings"
)

func main() {
	file, err := os.Create("result.zip")
	if err != nil {
		panic(err)
	}

	zipWriter := zip.NewWriter(file)
	defer zipWriter.Close()

	aWriter, err := zipWriter.Create("a.txt")
	if err != nil {
		panic(err)
	}
	io.Copy(aWriter, strings.NewReader("aaaaa"))

	bWriter, err := zipWriter.Create("b.txt")
	if err != nil {
		panic(err)
	}
	io.Copy(bWriter, strings.NewReader("bbbbb"))
}
```

```
$ go run main.go
$ ls -l
total 16
-rw-r--r--  1 shinyamori  staff  457  4 13 21:33 main.go
-rw-r--r--  1 shinyamori  staff  244  4 13 21:34 result.zip

$ unzip result.zip 
Archive:  result.zip
  inflating: a.txt                   
  inflating: b.txt                   

$ ls -l
total 32
-rw-r--r--  1 shinyamori  staff    5 12 31  1979 a.txt
-rw-r--r--  1 shinyamori  staff    5 12 31  1979 b.txt
-rw-r--r--  1 shinyamori  staff  457  4 13 21:33 main.go
-rw-r--r--  1 shinyamori  staff  244  4 13 21:34 result.zip

$ cat a.txt 
aaaaa

$ cat b.txt 
bbbbb              
```

### Q3.4 ZipファイルをWebサーバからダウンロード
```go
package main

import (
	"archive/zip"
	"io"
	"net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", "attachment; filename=result.zip")

	zipWriter := zip.NewWriter(w)
	defer zipWriter.Close()

	httpWriter, err := zipWriter.Create("a.txt")
	if err != nil {
		panic(err)
	}
	io.WriteString(httpWriter, "aaaaa")
}

func main() {
	http.HandleFunc("/", handler)
	http.ListenAndServe(":8080", nil)
}
```

### Q3.5 CopyN
```go
package main

import (
	"io"
	"os"
	"strconv"
	"strings"
)

func main() {
	writer := os.Stdout
	reader := strings.NewReader("123456789012345678901234567890")
	size, err := strconv.Atoi(os.Args[1])
	if err != nil {
		panic(err)
	}

	myCopyN(writer, reader, size)
}

func myCopyN(w io.Writer, r io.Reader, size int) {
	buffer := make([]byte, size)
	_, err := io.ReadFull(r, buffer)
	if err != nil {
		panic(err)
	}
	io.WriteString(w, string(buffer))
}
```
```
% go run main.go 0

% go run main.go 3
123

% go run main.go 10
1234567890
```

### Q3.6 ストリーム総集編
```go
package main

import (
	"io"
	"os"
	"strings"
)

var (
	computer    = strings.NewReader("COMPUTER")
	system      = strings.NewReader("SYSTEM")
	programming = strings.NewReader("PROGRAMMING")
)

func main() {
	var stream io.Reader
	charA := io.NewSectionReader(programming, 5, 1)
	charS := io.NewSectionReader(system, 0, 1)
	charC := io.NewSectionReader(computer, 0, 1)
	charI1 := io.NewSectionReader(programming, 8, 1)
	charI2 := io.NewSectionReader(programming, 8, 1)
	stream = io.MultiReader(charA, charS, charC, charI1, charI2)

	io.Copy(os.Stdout, stream)
}
```