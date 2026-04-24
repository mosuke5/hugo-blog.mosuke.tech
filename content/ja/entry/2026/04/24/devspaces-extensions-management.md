+++
categories = ["OpenShift"]
date = "2026-04-24T18:02:27+09:00"
description = "OpenShift Dev SpacesでVS Code Extensionを標準化・管理する方法を整理しました。リポジトリ配置、ConfigMap配布、独自レジストリ構築、ポリシー制御など複数のアプローチを比較します。"
draft = false
image = "/image/devspaces-extensions-header.png"
tags = ["Tech"]
title = "OpenShift Dev SpacesでVS Code Extensionの標準化・管理する方法を整理する"
author = "mosuke5"
archive = ["2026"]
+++

こんにちは、もーすけです。  
エンタープライズの開発現場で「開発環境の標準化」に取り組んでいる方は多いのではないでしょうか。Web IDEであるOpenShift Dev SpacesやDevcontainerなどがそのソリューションとして挙がりますが、**VS Code Extensionレベルの標準化**をどう実現するかは意外と悩みどころです。今回はDev Spacesを前提に、Extensionを管理・標準化する方法をいくつか調べたので整理しておきます。

<!--more-->

## 環境・前提
- Red Hat OpenShift Dev Spaces 3.27
- VS Code互換のブラウザIDEが前提

## Extensionsの自動インストール
まずは、開発者のWorkspaceに必要なExtensionを自動でインストールさせる方法を見ていきます。プロジェクト単位で設定する方法と、組織全体に配布する方法があります。

### 方法1: リポジトリに `.vscode/extensions.json` を配置する
もっとも王道なアプローチです。アプリケーションのリポジトリに `.vscode/extensions.json` を置けば、Workspaceが起動したタイミングで自動インストールしてくれます。

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "redhat.vscode-yaml"
  ]
}
```

ファイル上は `recommendations`（推奨）という表記ですが、**Dev Spacesでは自動的にインストールされます**。プロジェクトごとに必要なExtensionが異なる場合は、この方法がもっともシンプルで管理しやすいです。

### 方法2: ConfigMapで全体配布する
特定のプロジェクトではなく、**組織全体で統一したいExtension**がある場合は、ConfigMapで全体配布できます。

Operatorがインストールされている Namespace に、以下のようなConfigMapを作成します。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vscode-editor-configurations
  namespace: dev-spaces-operator
  labels:
    app.kubernetes.io/part-of: che.eclipse.org
    app.kubernetes.io/component: workspaces-config
data:
  extensions.json: |
    {
      "recommendations": [
          "dbaeumer.vscode-eslint",
          "Anthropic.claude-code"
      ]
    }
```

ドキュメントには「openshift-devspaces Namespaceにある ConfigMap をコピーする」と書いてありますが、ここで言っている Namespace は**Operatorがインストールされている Namespace**のことです。環境によって名前が異なるので注意しましょう。

このConfigMapをApplyすると、各WorkspaceがあるNamespaceに自動でコピーされ、Workspaceにマウントされます。具体的には `/projects/.code-workspace` に配置され、Extensionが自動インストールされる仕組みです。

なお、**ConfigMapを更新すると稼働中のWorkspaceへ再マウントが行われ、Workspaceが一時的に中断します**。開発者が多く利用している時間帯に変更すると影響範囲が大きくなるため、更新タイミングには十分注意しましょう。

### 方法3: devfileのattributesに記述する（非推奨）
アプリケーションのソースコードにExtension設定を入れなくても済む方法として、devfileの `attributes` に `.vscode/extensions.json` を記述する方法がありますが、**こちらは機能しませんでした**。

```yaml
schemaVersion: 2.2.0
metadata:
  name: hugo-blog-dev
components:
  - name: runtime
    container:
      image: registry.redhat.io/devspaces/udi-base-rhel10:3.27
      cpuLimit: "1000m"
      cpuRequest: "600m"
      memoryLimit: "3Gi"
      memoryRequest: "2Gi"
      mountSources: true
# 中略
attributes:
  .vscode/extensions.json: |
    {
      "recommendations": [
        "redhat.vscode-openshift-connector",
        "redhat.vscode-yaml"
      ]
    }
```

devfileでExtension管理ができればアプリケーションリポジトリとの依存を切り離せて便利なのですが、現時点では期待通りに動作しないので注意してください。

## Extensionsの安全性・ガバナンス
次に、インストールできるExtensionを管理者側で制御し、安全性やガバナンスを確保する方法です。パブリックなレジストリには玉石混交のExtensionがあるため、エンタープライズ環境では「何をインストールさせるか」のコントロールが求められることがあります。

### 方法4: 独自のExtensionsレジストリを構築する
デフォルトでは有効化されていませんが、{{< external_link url="https://open-vsx.org/" title="Open VSX Registry" >}}を参照先に設定してExtensionをインストールできます。

しかし、パブリックなレジストリには玉石混交のExtensionがあるため、管理者側でインストールできるものを絞りたいケースがあります。そこで、**独自のExtensionsレジストリ（Plugin Registry）を立てる**というアプローチがあります。

#### embedded vs Open VSX
独自レジストリを立てる方法は大きく2つあります。

1. **Embedded Plugin Registry** — 必要なプラグインをすべてコンテナイメージに入れてデプロイする方式。ドキュメントにも記載されている通り、現在は**推奨されていません**
2. **Eclipse Open VSX Extension Registry** — Open VSXを自前でホストする方式

Embedded方式は実際に試しましたが、すべてのプラグインをイメージに含めてビルドするため**30分程度**はかかりました。メンテナンスコストも高いので避けたほうがよいでしょう。

#### Open VSXレジストリの構築手順と注意点
Open VSX方式の手順はドキュメントに記載があります。

{{< external_link url="https://docs.redhat.com/ja/documentation/red_hat_openshift_dev_spaces/3.27/html/administration_guide/assembly_managing-ide-extensions_administration_guide#proc_running-open-vsx-using-workspace_administration_guide" title="Red Hat OpenShift Dev Spaces 3.27 - Managing IDE extensions" >}}

ただし、**現時点のドキュメントには不備があります**。「2.5. Add OpenVSX user with PAT to the DB」のタスクを実行すると、DBのスキーマ定義が異なるというエラーが発生します。わたしが調査した限りでは、`registry.redhat.io/devspaces/openvsx-rhel9:3.27` のイメージが最新のソースコードでビルドされていないため、DBスキーマの不一致が起きているようです。

**回避策としては、insert文から `notified` カラムを削除すれば動作します。** この問題はサポートに報告済みなので、将来的には解消されるかもしれません。

### 方法5: ポリシーで制御する
独自のExtensionsレジストリを構築してメンテナンスし続けるのはなかなか大変です。そこで、**パブリックなレジストリを参照しつつ、許可するExtensionをポリシーで制御する**というアプローチもあります。

以下のようなConfigMapを作成します。

```yaml
kind: ConfigMap
apiVersion: v1
metadata:
  name: vscode-editor-configurations
  namespace: openshift-devspaces
  labels:
    app.kubernetes.io/component: workspaces-config
    app.kubernetes.io/part-of: che.eclipse.org
  annotations:
    controller.devfile.io/mount-as: subpath
    controller.devfile.io/mount-path: /checode-config
    controller.devfile.io/read-only: 'true'
data:
  policy.json: |
    {
      "BlockCliExtensionsInstallation": true,
      "BlockDefaultExtensionsInstallation": false,
      "BlockInstallFromVSIXCommandExtensionsInstallation": true,
      "AllowedExtensions": {
        "*": false,
        "redhat.vscode-yaml": true,
        "redhat.vscode-openshift-connector": true,
        "dbaeumer.vscode-eslint": true,
        "ms-python.python": true
      }
    }
```

ポイントは以下の通りです。

- `"*": false` でデフォルトはすべてのExtensionを**ブロック**する
- 許可したいExtensionだけ個別に `true` を設定する
- CLIやVSIXからのインストールもブロックできる

独自レジストリを持たなくても、パブリックレジストリの恩恵を受けつつガバナンスを効かせられるので、**運用コストとのバランスが良い方法**ではないでしょうか。

## まとめ
OpenShift Dev SpacesでVS Code Extensionを標準化・管理する方法を整理しました。

| 方法 | スコープ | 運用コスト | 備考 |
|------|----------|-----------|------|
| `.vscode/extensions.json` | プロジェクト単位 | 低 | 王道。リポジトリに入れるだけ |
| ConfigMap配布 | 組織全体 | 低 | 全Workspaceに自動配布 |
| devfile attributes | — | — | 現時点では機能しない |
| 独自レジストリ | 組織全体 | 高 | ビルド・メンテナンスコストが大きい |
| ポリシー制御 | 組織全体 | 中 | パブリックレジストリ＋ホワイトリスト |

プロジェクト単位なら `.vscode/extensions.json`、組織全体のガバナンスを効かせたいならConfigMap配布やポリシー制御を組み合わせるのがよいと思います。独自レジストリは運用負荷が高いので、本当に必要かどうかはよく検討してから導入しましょう。

ぜひ皆さんも自分の環境に合ったアプローチを試してみてください。それでは！
