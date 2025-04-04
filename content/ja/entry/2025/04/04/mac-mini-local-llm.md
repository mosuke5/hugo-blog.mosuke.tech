+++
categories = ["AI"]
date = "2025-04-04T11:23:27+09:00"
description = ""
draft = true
image = "/image/mac-mini-with-ai.png"
tags = ["Tech"]
title = "Mac mini M4 Pro (64GB) はローカルLLMの夢を見るか？ パフォーマンス検証とAIエージェント連携の現実 "
author = "mosuke5"
archive = ["2025"]
+++

こんにちは、もーすけです。  
昨今は、LLMの話題は尽きません。claudeやGeminiなどのクラウドLLMがすごいのはわかっていますが、 ローカルLLMがどこまでいけるのか、気軽に用意できるレベルでどこまでいけるのか、、、 とても気になっています。

というわけで、新しいMac mini (M4 Pro, 64GBメモリ) を購入してみました！ Apple Silicon搭載Macは、その高い電力効率とユニファイドメモリによって、ローカル環境でのAI/機械学習タスク、特に大規模言語モデル（LLM）の実行において注目されています。

今回は、この新しいMac miniでローカルLLMがどの程度実用的に動作するのか、いくつかのモデルサイズや量子化方式を比較しながら検証してみました。さらに、ローカルLLMをAIエージェント（Cline）と連携させて、少し複雑なタスクを実行できるかも試してみました。
<!--more-->

## 検証環境

- **マシン:** Mac mini
  - Apple M4 Pro 14コアCPU、20コアGPU
  - 64GB ユニファイドメモリ
  - 10GB Ethernet port
  - SSD 1TB
  - 38万円くらい！！
- **ツール:** LM Studio (Runtime: llama.cpp)

## LM Studioでのモデル起動とパフォーマンス比較

まずはLM Studioを使って、どの程度のサイズのモデルまで快適に動作するのか、代表的なモデルであるQwen 2.5シリーズで試してみました。特にmacOS上で最適化されているとされるMLX形式のモデルを中心に検証しています。

### テスト結果 (モデルサイズ別)

以下の表は、異なるサイズのモデルを実行した際のパフォーマンスを示しています。

| モデル (形式, 量子化)                 | トークン生成速度 (tok/sec) | 初回トークン生成までの時間 (秒) | 使用メモリ (GB) |
| :------------------------------------ | :------------------------- | :------------------------------ | :-------------- |
| `qwen2.5-72b-instruct` (MLX, 4bit)  | 5.76                       | 0.94                            | 約 36           |
| `qwen2.5-coder-32b-instruct` (MLX, 4bit) | 12.82                      | 0.44                            | 約 18           |
| `qwen2.5-coder-14b-instruct` (MLX, 4bit) | 28.13                      | 0.23                            | 約 8.7          |


#### 各モデルのデモ動画
<iframe width="560" height="315" src="https://www.youtube.com/embed/ok_ddwE6Q9k?si=q0Hu0Cc7JBv3IU7I" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

### 結果からの考察 (モデルサイズ)

表からわかるように、64GBのメモリを搭載したM4 Pro Mac miniでは、**72Bクラスのモデルも起動・実行は可能**です。しかし、トークン生成速度は5.76 tok/secと、他のモデルと比較して遅めです。チャット形式での対話なら我慢できるかもしれませんが、コーディング支援などでリアルタイム性を求めると少し厳しいかもしれません。

一方で、**32Bモデルでは12.82 tok/sec、14Bモデルでは28.13 tok/sec**と、快適な速度で動作しました。特に14Bモデルは使用メモリも10GB以下に収まっており、他の作業と並行しても余裕がありそうです。

**現実的な利用ラインとしては、応答速度とメモリ使用量のバランスから32Bまたは14Bモデル**あたりがターゲットになりそうです。

## MLX形式 vs GGUF形式

macOS環境では、Apple Siliconに最適化されたMLXフレームワークを利用できます。これが従来のGGUF形式と比べてどの程度の差があるのか、同じ32Bモデルで比較してみました。

### テスト結果 (MLX vs GGUF)

| モデル (形式, 量子化)                   | トークン生成速度 (tok/sec) | 初回トークン生成までの時間 (秒) | 使用メモリ (GB) |
| :-------------------------------------- | :------------------------- | :------------------------------ | :-------------- |
| `qwen2.5-coder-32b-instruct` (MLX, 4bit) | 12.82                      | 0.44                            | 約 18           |
| `qwen2.5-coder-32b-instruct` (GGUF, Q4_K_M) | 9.70                       | 0.96                            | 約 27           |
### 結果からの考察 (MLX vs GGUF)

この比較結果は明らかです。**MLX形式の方がGGUF形式よりも高速（約1.3倍）かつ省メモリ（約9GB削減）** でした。初回トークン生成までの時間も半分以下に短縮されています。macOS上でLM Studioなどを使ってローカルLLMを動かす場合、**可能であればMLX形式のモデルを選択するのがベストプラクティス**と言えそうです。

## ローカルLLM + AIエージェント(Cline)連携の実用性は？

次に、パフォーマンスが比較的良好だった `qwen2.5-coder-32b-instruct` (MLX, 4bit) を使って、ClineのようなAIエージェントがどの程度実用になるかを試してみました。

お題として、以下のような少し複雑なタスクを依頼しました。

以下を実現するAnsible Playbookを作成してください。

1. kind を用いてKubernetesクラスタをローカルに起動する。
1. 作成したクラスタに foo namespaceを作成する。
1. foo namespaceにNginxをデプロイし、外部からアクセスできるようにする。Nginxは /hoge にアクセスすると "fuga" というメッセージを返すように設定する。
1. Nginxが期待通りに動作するか、curl などでHTTPアクセスを行ってテストするステップも含める。

これは、単一ツールの使い方だけでなく、kind (クラスタ構築) → Kubernetes (マニフェスト適用) → Nginx設定 → テスト、と複数のステップとツール知識を横断する必要があるお題です。

### 結果は…残念ながら

ローカルLLM (`qwen2.5-coder-32b-instruct`) とClineの組み合わせでは、**1時間以上試行錯誤を繰り返しましたが、最終的にタスクを完了させることはできませんでした**。途中で生成されるコードの誤りや、タスクの意図を正確に汲み取れない場面が多く、人間がかなり積極的に介入・修正しないとゴールにたどり着けない印象です。

### 比較: Claude 3.7 Sonnetの場合

比較対象として、同じお題をクラウドベースのLLMであるClaude 3.7 Sonnet (Anthropic API経由などを想定) に依頼したところ、**わずか5分程度でほぼ完璧なAnsible Playbookを生成し、タスクを完了**させることができました。

#### ローカルLLM vs Claude 3.7 Sonnet のCline連携比較動画
<iframe width="560" height="315" src="https://www.youtube.com/embed/Qg7PgKjT6WQ?si=TUmnC6-Lc0reouV4" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

### 結果からの考察 (AIエージェント連携)

現状のローカルLLM (少なくとも今回試した32Bクラス) では、このような**自律的に複数のステップを実行する必要がある複雑なタスクを、人間が満足できるレベルでこなすのはまだ難しい**ようです。基本的なコード生成や単純な質疑応答は可能ですが、AIエージェントとして「任せっぱなし」にするには力不足感が否めません。クラウドベースの高性能LLMとの差は、依然として大きいと言わざるを得ません。

## 推論高速化の試み：vLLM on Mac

72Bモデルも動作はするものの、推論速度が遅いのが気になります。推論を高速化するランタイムとして知られるvLLMがMacで使えないか確認してみました。

以前はLinux専用でしたが、現在では**CPUモードであればmacOS上でも動作する**ようになっています。しかし、当然ながらApple SiliconのGPU を活用することはできないため、**推論速度の向上という点では、残念ながら現状ではMac環境における解決策にはなりませんでした**。今後のGPU対応に期待したいところです。

## 将来的な可能性：クラスタリング

今回は試していませんが、複数のマシンを連携させてより大きなモデルを動かす「AIクラスタリング」というアプローチも存在します。[`exo-explore/exo`](https://github.com/exo-explore/exo) のようなプロジェクトがこれに該当します。

ただし、これは主に**推論速度の向上よりも、単一のマシンではメモリが足りずに動かせない、さらに巨大なモデル（数百Bクラスなど）を実行可能にすること**を目的としていると理解しています。

## まとめ

今回の検証から、Mac mini M4 Pro (64GB) 環境におけるローカルLLMについて以下の点が分かりました。

1.  **モデルサイズ:** 72Bモデルも動作はするが、推論速度はやや遅め。32Bや14Bモデルは非常に快適に動作し、実用的な選択肢となる（上記表参照）。
2.  **モデル形式:** macOS上では、**MLX形式のモデルがGGUF形式よりも高速・省メモリ**であり、利用可能ならMLXを選ぶべき（上記表参照）。
3.  **AIエージェント連携:** 現状のローカルLLM（32Bクラス）では、Cline等と連携して複雑な自律タスクを実行させるのはまだ難しく、クラウドLLMとの性能差は大きい。
4.  **高速化:** vLLMはMacではCPUモードのみ動作可能で、現状ではGPUアクセラレーションによる速度向上は期待できない。

Mac mini M4 ProはローカルLLMを試すには非常に優れた環境ですが、その能力にはまだ限界もあります。特にAIエージェントのような高度な応用を目指す場合は、現状ではクラウドベースの高性能LLMに頼るのが現実的かもしれません。とはいえ、技術の進歩は速いので、今後のソフトウェアやモデルの進化によって、ローカル環境でできることの幅がさらに広がることを期待しています！

最後に、今回試した内容には直接は関係ないですが、ローカルLLMを検証していくにあたって以下の本で学んでいます。
よかったら参考にしてください。
<div class="belg-link row">
  <div class="belg-title">
    <div class="belg-description"><a href="https://www.amazon.co.jp/%E3%81%A4%E3%81%8F%E3%82%8A%E3%81%AA%E3%81%8C%E3%82%89%E5%AD%A6%E3%81%B6%EF%BC%81LLM-Compass-Books%E3%82%B7%E3%83%AA%E3%83%BC%E3%82%BA-Sebastian-Raschka-ebook/dp/B0DSZV6BT2?crid=2SKWZWIRHDMO&amp;dib=eyJ2IjoiMSJ9.vH4RewQJDi2_W7A1HHx3B1IPwPv4JGJc-pfwcka9fAjie-1XTOBkiydXaFU4Jh4PKQ76Cv8vuXhqDHvNBcwEaBIQJ5dL2ZRbAAH4Zr1ov8XyWAyS6w_wVXFPbxSYXHlnL47IretGRZEUIZESnxhpRA.zWb_d9cLSEKu6uHgJUuDkSa01RbbuGZsSxo_w5I5p8I&amp;dib_tag=se&amp;keywords=llm&#43;%E8%87%AA%E4%BD%9C&#43;%E5%85%A5%E9%96%80&amp;qid=1743735402&amp;sprefix=llm&#43;%E8%87%AA%E4%BD%9C,aps,175&amp;sr=8-1&amp;linkCode=sl1&amp;tag=mosuke5-22&amp;linkId=5f3162bbb7328ebaf063c7ae2f02da1d&amp;language=ja_JP&amp;ref_=as_li_ss_tl" target="_blank">Amazon.co.jp: つくりながら学ぶ！LLM 自作入門 (Compass Booksシリーズ) eBook : Sebastian Raschka, 株式会社クイープ, 巣籠悠輔, 巣籠悠輔: Kindleストア</a></div>
    <div class="belg-site">
      <span class="belg-site-name">www.amazon.co.jp</span>
    </div>
  </div>
</div>