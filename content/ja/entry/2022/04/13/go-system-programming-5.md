+++
categories = ["サーバ技術"]
date = "2022-03-01T23:39:40+09:00"
description = "「Goならわかるシステムプログラミング」を読みすすめる中で独自に実験したことなどをまとめています。今回は第5章のシステムコールです。問題にもチャレンジしているのでサンプル解答としても使ってください。"
draft = false
image = ""
tags = ["Tech"]
title = "Goならわかるシステムプログラミング：第5章 システムコール"
author = "mosuke5"
archive = ["2022"]
+++

こんにちは、もーすけです。  
「Goならわかるシステムプログラミング」を読み進めています。とてもいい本です。
読み進めながら実験していることを書いていきます。同じ本を読んでいる人の参考（寄り道？）になればと思います。
今回は「システムコール」です。

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

### Q5.1 システムコールの確認
システムコールの確認は、すでに[第2章 io.Writer](/entry/2022/04/13/go-system-programming-2/) でもネットワーク通信関連で行っているので確認してみてください。

せっかくなので他のネタでシステムコールを確認してみます。  
Q2.2で実践したcsvデータのファイルへの書き込みでシステムコールをトレースしてみます。

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

環境は、RHEL8.5です。

```text
$ uname -a
Linux mosuke5-station 4.18.0-348.7.1.el8_5.x86_64 #1 SMP Wed Dec 8 21:51:17 EST 2021 x86_64 x86_64 x86_64 GNU/Linux

$ cat /etc/redhat-release
Red Hat Enterprise Linux release 8.5 (Ootpa)
```

Goのプログラムのビルドはトレースする必要がないので事前にビルドしておきます。
straceには `-y`, `-f`, `-e openat,read,write,clone,close`, `-o output` のオプションを付けていますが、それぞれ簡単に説明しておきます。

- `-y` は、ファイルディスクリプタに関連のあるパスを表示します。どのファイルに対しての操作かわかりやすくなります。
- `-f` は、フォークされたプロセスもトレースします。
- `-e` は、表示するシステムコールを絞り込みます。これは、全システムコールだと表示がながくなりわかりづらくなるので、説明用に絞っているだけです。
- `-o` は、ファイルに結果をアウトプットしています。

```text
$ go build main.go
$ ls -l main
-rwxrwxr-x. 1 mosuke5 mosuke5 1789722  4月 14 20:17 main

$ strace -y -f -e openat,read,write,clone,close -o output ./main
$ cat output
1127332 openat(AT_FDCWD, "/sys/kernel/mm/transparent_hugepage/hpage_pmd_size", O_RDONLY) = 3</sys/kernel/mm/transparent_hugepage/hpage_pmd_size>
1127332 read(3</sys/kernel/mm/transparent_hugepage/hpage_pmd_size>, "2097152\n", 20) = 8
1127332 close(3</sys/kernel/mm/transparent_hugepage/hpage_pmd_size>) = 0
1127332 clone(child_stack=0xc000096000, flags=CLONE_VM|CLONE_FS|CLONE_FILES|CLONE_SIGHAND|CLONE_THREAD|CLONE_SYSVSEM|CLONE_SETTLS, tls=0xc00007c090) = 1127333
1127332 clone(child_stack=0xc000098000, flags=CLONE_VM|CLONE_FS|CLONE_FILES|CLONE_SIGHAND|CLONE_THREAD|CLONE_SYSVSEM|CLONE_SETTLS, tls=0xc00007c490) = 1127334
1127332 clone(child_stack=0xc000092000, flags=CLONE_VM|CLONE_FS|CLONE_FILES|CLONE_SIGHAND|CLONE_THREAD|CLONE_SYSVSEM|CLONE_SETTLS, tls=0xc00007c890) = 1127335
1127334 clone(child_stack=0xc000112000, flags=CLONE_VM|CLONE_FS|CLONE_FILES|CLONE_SIGHAND|CLONE_THREAD|CLONE_SYSVSEM|CLONE_SETTLS, tls=0xc000100090) = 1127336
1127332 openat(AT_FDCWD, "tmp.txt", O_RDWR|O_CREAT|O_TRUNC|O_CLOEXEC, 0666) = 3</home/mosuke5/work/tmp/tmp.txt>
1127332 write(3</home/mosuke5/work/tmp/tmp.txt>, "foo,bar,hoge\nkuu,kaa,joe\n", 25) = 25
1127332 close(3</home/mosuke5/work/tmp/tmp.txt>) = 0
1127332 exit_group(0)                   = ?
1127336 +++ exited with 0 +++
1127335 +++ exited with 0 +++
1127334 +++ exited with 0 +++
1127333 +++ exited with 0 +++
1127332 +++ exited with 0 +++
```

いくつかの気になったポイントを紹介します。

- straceの結果で一番左に記載の番号は、実行したプロセスのPIDになります。
- `clone` で、スレッドを作っています。今回はあまり活躍の場はなさそうですが、いくつかスレッドを起動して処理してます
- `openat` で、書き込み用の`tmp.txt`をオープンしています
- `write` で、書き込みを行っています。コード上では、2回に分けてCSVレコードを記述していますが、どうやらLinux上では一度に書き込みを行うようですね。
- `close` で、対象のファイルをしっかりクローズしています。
- 最後に `exit_group` で、すべてのスレッドを終了しています。

システムコールについては、こちらの本「Linuxシステムコール基本リファレンス」をよく参考にしていますので、一緒に学ぶとよいです。
<div class="belg-link row">
  <div class="belg-right col-md-12">
  <div class="belg-title">
      <a href="https://www.amazon.co.jp/Linux%E3%82%B7%E3%82%B9%E3%83%86%E3%83%A0%E3%82%B3%E3%83%BC%E3%83%AB%E5%9F%BA%E6%9C%AC%E3%83%AA%E3%83%95%E3%82%A1%E3%83%AC%E3%83%B3%E3%82%B9-%E2%94%80%E2%94%80OS%E3%82%92%E7%9F%A5%E3%82%8B%E7%AA%81%E7%A0%B4%E5%8F%A3-WEB-PRESS-plus/dp/4774195553?__mk_ja_JP=%E3%82%AB%E3%82%BF%E3%82%AB%E3%83%8A&amp;crid=29VBZ9GD6CH3&amp;keywords=%E3%82%B7%E3%82%B9%E3%83%86%E3%83%A0%E3%82%B3%E3%83%BC%E3%83%AB%E3%83%AA%E3%83%95%E3%82%A1%E3%83%AC%E3%83%B3%E3%82%B9&amp;qid=1649943648&amp;sprefix=%E3%82%B7%E3%82%B9%E3%83%86%E3%83%A0%E3%82%B3%E3%83%BC%E3%83%AB%E3%83%AA%E3%83%95%E3%82%A1%E3%83%AC%E3%83%B3%E3%82%B9,aps,343&amp;sr=8-1&amp;linkCode=sl1&amp;tag=mosuke5-22&amp;linkId=4edcbee08465347c8b47c318fb7f02eb&amp;language=ja_JP&amp;ref_=as_li_ss_tl" target="_blank">Linuxシステムコール基本リファレンス ──OSを知る突破口 (WEB&#43;DB PRESS plus) | 山森 丈範 |本 | 通販 | Amazon</a>
    </div>
    <div class="belg-description">Amazonで山森 丈範のLinuxシステムコール基本リファレンス ──OSを知る突破口 (WEB&#43;DB PRESS plus)。アマゾンならポイント還元本が多数。山森 丈範作品ほか、お急ぎ便対象商品は当日お届けも可能。またLinuxシステムコール基本リファレンス ──OSを知る突破口 (WEB&#43;DB PRESS plus)もアマゾン配送商品なら通常配送無料。</div>
    <div class="belg-site">
      <span class="belg-site-name">www.amazon.co.jp</span>
    </div>
  </div>
</div>