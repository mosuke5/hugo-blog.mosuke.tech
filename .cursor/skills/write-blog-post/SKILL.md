---
name: write-blog-post
description: >-
  メモファイルをもとに新しいブログ記事を一気通貫で作成する。ファイル生成、フロントマター設定、
  本文ドラフト執筆を行う。ブログ記事の執筆、新しい記事の作成、記事を書く際に使用。
---

# ブログ記事執筆スキル

メモファイル（ラフな箇条書き）を受け取り、Hugo ブログ記事を完成させるワークフロー。

## 前提

- 文体は `.cursor/rules/writing-style.mdc` が `content/**/*.md` 編集時に自動適用される。本スキルでは文体の詳細を繰り返さない。
- フロントマターは **TOML** (`+++`) 形式。YAML や JSON に変換しない。
- 記事は日本語 (`content/ja/`) で作成する。

## ワークフロー

以下のチェックリストをコピーして進捗を管理する:

```
Task Progress:
- [ ] Step 1: メモ読解と提案
- [ ] Step 2: ファイル作成
- [ ] Step 3: フロントマター設定
- [ ] Step 4: 本文執筆
- [ ] Step 5: レビュー依頼
```

---

### Step 1: メモ読解と提案

ユーザーが渡したメモファイルを読み、以下を把握する:

- トピック・テーマ
- 著者の主張・意見・伝えたいこと
- 背景・動機
- 技術検証なら: 環境・手順・結果・気づき
- 書評なら: 刺さったポイント・自分の経験との重なり

把握した内容から、以下を **提案** してユーザーの承認を得る:

| 項目 | 例 |
|------|-----|
| slug | `kubernetes-hpa-custom-metrics` |
| タイトル | KubernetesのHPAでカスタムメトリクスを使ったオートスケールを試す |
| カテゴリ | `["kubernetes"]` |
| 記事タイプ | 技術検証 / 書評・紹介 / 振り返り / その他 |

承認を得てから次へ進む。

---

### Step 2: ファイル作成

```bash
bash scripts/hugo_new.sh <slug>
```

作成されるパス: `content/ja/entry/YYYY/MM/DD/<slug>.md`

---

### Step 3: フロントマター設定

作成されたファイルのフロントマターを全フィールド埋める:

```toml
+++
categories = ["Category1"]
date = "YYYY-MM-DDTHH:MM:SS+09:00"
description = "SEO・SNS共有用の要約（1-2文）"
draft = false
image = ""
tags = ["Tech"]
title = "記事タイトル"
author = "mosuke5"
archive = ["YYYY"]
+++
```

フィールドのルール:
- `author` は常に `"mosuke5"`
- `archive` は記事の年 (例: `["2026"]`)
- `date` は ISO 8601 + JST (`+09:00`)。`hugo new` が生成した値をそのまま使う
- `description` はメモの内容から SEO を意識した要約を書く
- `image` はヘッダー画像が未定なら空文字でよい（後から設定可能）
- `tags` は通常 `["Tech"]`。ライフ系記事なら `["Life"]` を追加

### よく使われるカテゴリ

| カテゴリ | 用途 |
|---------|------|
| OpenShift | OpenShift 関連 |
| kubernetes | Kubernetes 全般 |
| AI | AI・LLM 関連 |
| DevOps | DevOps プラクティス |
| Agile | アジャイル開発 |
| Management | マネジメント・組織論 |
| キャリア | キャリア・振り返り |
| アプリケーション開発 | アプリ開発全般 |
| インフラ構築 | インフラ・ネットワーク |
| 資格試験 | 資格取得 |

---

### Step 4: 本文執筆

#### 基本原則

1. **メモの思い・意見を忠実に反映する**。エージェントが勝手に意見を追加・改変しない。
2. メモに書かれていないが補足が必要と感じる箇所は `[TODO: ここに○○を補足]` と書き、著者に委ねる。
3. `.cursor/rules/writing-style.mdc` の文体ルールに従う（自動適用される）。

#### 記事タイプ別の構成

**技術検証記事:**

```markdown
挨拶 + 背景・動機（メモの「なぜ」を反映）

<!--more-->

## 環境・前提
（検証環境、バージョン情報など）

## メインコンテンツ
（手順、設定、コード例）

## 結果と考察
（検証結果、著者の解釈・意見）

## まとめ
（要点の整理 + 締めの一言）
```

**書評・紹介記事:**

```markdown
挨拶 + この本を読んだきっかけ

（belg-link で本の情報カードを挿入）

<!--more-->

## 本の概要
（どんな本か簡潔に）

## 印象に残ったポイント
（著者の感想・共感・反論をメモから反映）

## まとめ
（おすすめ度合い + 締めの一言）
```

**振り返り記事:**

```markdown
挨拶（「お久しぶりです！」パターン）

#### 過去の振り返りブログ
（過去記事へのリンクリスト）

<!--more-->

## トピック1
（メモの各トピックをセクション化）

## トピック2
...

## 来年に向けて
（抱負・展望）
```

#### 使用可能な HTML / ショートコード

**外部リンクカード (belg-link):**

```html
<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="URL" target="_blank">
      <img class="belg-site-image" src="IMAGE_URL" />
    </a>
  </div>
  <div class="belg-right col-md-10">
    <div class="belg-title">
      <a href="URL" target="_blank">タイトル</a>
    </div>
    <div class="belg-description">説明文</div>
    <div class="belg-site">
      <span class="belg-site-name">サイト名</span>
    </div>
  </div>
</div>
```

**外部リンク (ショートコード):**

```
{{< external_link url="https://example.com" title="リンクテキスト" >}}
```

**シリーズナビゲーション:**

シリーズ記事の場合のみ使用。既存のシリーズ: `admission-webhook-series`, `argocd-series`, `go-system-programming-series`, `tekton-series`

---

### Step 5: レビュー依頼

ドラフト完成後、ユーザーに以下を伝える:

1. 作成したファイルのパス
2. `[TODO]` マーカーが残っている場合はその一覧
3. `image` が未設定の場合はその旨

ユーザーのフィードバックに基づき修正を行う。
