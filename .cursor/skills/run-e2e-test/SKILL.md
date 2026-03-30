---
name: run-e2e-test
description: >-
  e2eテスト（Playwright）をHugoビルドから一括実行し、結果を報告する。
  e2eテスト、テスト実行、Playwrightテストの実行時に使用。
---

# e2eテスト実行スキル

Hugoサイトのビルドからe2eテスト実行・結果報告までを一括で行うワークフロー。

## 前提

- テストは `e2e-test/` ディレクトリの Playwright スイートで実行する。
- Playwright は `npx serve ../public -l 1314` を自動起動するため、手動でサーバーを立てる必要はない。
- 依存関係（`npm install`、`npx playwright install --with-deps chromium`）は devcontainer の `postCreateCommand` で導入済みの前提。

## ワークフロー

以下のチェックリストをコピーして進捗を管理する:

```
Task Progress:
- [ ] Step 1: Hugoビルド
- [ ] Step 2: テスト実行
- [ ] Step 3: 結果報告
```

---

### Step 1: Hugoビルド

リポジトリルートで Hugo ビルドを実行する:

```bash
hugo
```

- ビルドが成功したら次へ進む。
- エラーが出た場合はエラー内容をユーザーに報告し、ここで停止する。

---

### Step 2: テスト実行

`e2e-test/` ディレクトリでテストを実行する:

```bash
cd e2e-test && npm test
```

依存未インストール時のエラー（`Cannot find module`、`Executable doesn't exist` など）が出た場合は、以下を実行してからリトライする:

```bash
cd e2e-test && npm install && npx playwright install --with-deps chromium && npm test
```

---

### Step 3: 結果報告

テスト出力を読み取り、以下の形式で報告する。

**全テスト通過の場合:**

```
e2eテスト結果: 全 N 件パス

- build.spec.ts: N passed
- html-validation.spec.ts: N passed
- internal-links.spec.ts: N passed
```

**失敗ありの場合:**

```
e2eテスト結果: N 件パス / M 件失敗

失敗したテスト:
- [ファイル名] > [テスト名]: エラー内容の要約

考えられる原因:
- （下記テスト概要を参照し、失敗内容に応じた原因を記載）
```

---

## テストファイル概要

失敗時の原因特定に使用する。

### build.spec.ts（Hugoビルド検証）

トップページ・記事一覧・記事ページ・英語ページの HTTP 200 確認、404 ページ、sitemap.xml、RSS フィードの存在確認。

失敗時の典型原因: Hugo ビルドエラー、テンプレートの構文ミス、config.yaml の設定不備。

### html-validation.spec.ts（HTML検証）

lang 属性、head 必須要素（title, charset, viewport）、OGP・Twitter Card メタタグ、記事ページの h1・canonical リンク、英語ページの lang 属性。

失敗時の典型原因: テーマテンプレートの変更ミス、フロントマターの `description` や `image` 未設定。

### internal-links.spec.ts（内部リンク・画像チェック）

ナビゲーション・記事・サイドバーの内部リンク応答確認、記事内リンクのリンク切れ検出（タクソノミー URL は警告のみ）、画像読み込み確認。

失敗時の典型原因: 記事の削除・URL 変更によるリンク切れ、`static/image/` に画像ファイルが存在しない。
