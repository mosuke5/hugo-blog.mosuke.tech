+++
categories = ["OpenShift", "DevOps"]
date = "2026-04-30T14:43:46+09:00"
description = "TektonのPipelines as Code（PAC）を使うと何が便利になるのか。従来のEventListener方式との違い、GitHub Apps連携、マルチテナント対応など、PACの利点と仕組みを整理しました。"
draft = false
image = "/image/tekton-pac-header.png"
tags = ["Tech"]
title = "TektonのPipelines as Code（PAC）で何が便利になるのかを整理する"
author = "mosuke5"
archive = ["2026"]
+++

こんにちは、もーすけです。  
Tektonでパイプラインを運用していると、EventListenerの設定やWebhookの管理がだんだん煩雑になってきませんか？
今回は、そうした課題を解決してくれる **Pipelines as Code（PAC）** について、何が便利になるのか・どういう場面で活きるのかを整理してみました。

以前にTekton学習シリーズをまとめているので、こちらも必要に応じて閲覧してください。

{{< tekton-series >}}
<!--more-->

## 従来のTektonパイプライン運用の課題

まずは、PACを使わない従来のTektonパイプライン運用を振り返ってみましょう。従来の方式では、以下のような作業が必要でした。

1. パイプラインを定義する（Task, Pipeline）
2. パイプラインを実行するための**EventListener**を設定する（TriggerTemplate, TriggerBinding, EventListener）
3. EventListenerでは、どのリポジトリのイベントでどのパイプラインを実行するかの**フィルタリング・マッチング条件**も書く必要がある（CEL式やInterceptorの設定など）
4. 各GitリポジトリにWebhookの設定を行う

リポジトリが増えるたびにEventListenerの条件式を追加・修正していく必要があり、チームやリポジトリが増えていくとその管理がどんどん煩雑になっていきますよね。
とくにGitHub/Gitlab側のステータス更新ができないのは、開発者体験としてもなかなか辛いところです。

## Pipelines as Code（PAC）とは

**Pipelines as Code（PAC）** は、Tektonのパイプライン定義をアプリケーションのGitリポジトリ内で管理できる仕組みです。
端的に言うと、アプリケーションリポジトリの `.tekton/` ディレクトリにパイプライン定義を置くだけで、Gitイベントに応じたパイプライン実行ができるようになります。

これから紹介することを総じてまとめたものは以下です。

![PACのアーキテクチャ概要。GitHub Apps経由でWebhookを受信し、Repository CRに基づいてパイプラインが実行される](/image/tekton-pac-overview.png)

### PACで何が便利になるのか

PACを導入すると、従来の課題が以下のように解決されます。

- **Webhookエンドポイントがひとつに集約される。** チームごとにEventListenerを準備する必要がなくなります。
- **パイプライン定義がアプリのリポジトリで完結する。** 共通定義のパイプラインを `.tekton/` に配置すれば、アプリケーションごとに細かなTektonの知識がなくても実行できます（カスタマイズしたい場合は当然Tektonの知識が必要ですが）。
- **Gitリポジトリ側のステータスが更新される。** GitHubの場合、コミット履歴にチェックマークが付くようになります。これは開発者としてはかなり嬉しいポイントです！ ただし、GitHubではこの機能は**GitHub Appsを利用した場合のみ**有効です。Webhook方式ではステータスの更新はできないので注意しましょう。

実際にGitHubのコミット履歴を見ると、パイプラインの実行結果がチェックマーク（成功）やバツマーク（失敗）で表示されます。

![GitHubのコミット履歴にPACの実行結果が表示される](/image/tekton-pac-commit-check.png)

さらに詳細を開くと、PipelineRunの各タスクのステータスや実行時間も確認できます。

![PACのチェック詳細画面。各タスクのステータスと実行時間が確認できる](/image/tekton-pac-commit-check-details.png)

## 認証方式：GitHub Appsの利用が推奨

PACがプライベートリポジトリを参照するためには認証情報が必要です。いくつかの選択肢がありますが、それぞれ注意点があります。

| 方式 | 注意点 |
|------|--------|
| SSH鍵 | 誰かの個人アカウントに紐づいてしまう。システムアカウントを作れれば別だが、管理が煩雑になりがち |
| Deploy Key | 基本的にリポジトリ単位の紐づけになるため、複数リポジトリへの対応ができない |
| **GitHub Apps** | **推奨。** Organization単位でインストールでき、各リポジトリへのWebhook設定も自動で行われる |

というわけで、**GitHubであればGitHub Appsの利用が推奨**されます。
GitHub AppsをOrganizationにインストールすると、各リポジトリで個別にWebhook設定をしなくても自動的にWebhookが構成されるのも大きなメリットです。

### パイプライン内でのソースコード取得と認証

GitHub Apps連携のもうひとつの嬉しいポイントが、**パイプライン内でソースコードを取得する際の認証が自動化される**ことです。

従来の方式では、プライベートリポジトリをCloneするために、OpenShift上にSSH鍵やアクセストークンのシークレットを事前に作成しておく必要がありました。これが地味に面倒で、鍵のローテーションや管理も運用負荷になりますよね。

PACでGitHub Appsを利用している場合、パイプライン実行のたびに**GitHub Appsのトークンが自動的にシークレットリソースとして作成**されます。シークレットは `pac-gitauth-<REPOSITORY_OWNER>-<REPOSITORY_NAME>-<RANDOM_STRING>` という形式で、ターゲットのNamespaceに自動生成されます。

しかも、このシークレット名は `{{ git_auth_secret }}` という変数で参照できるため、パイプライン定義にハードコードする必要がありません。以下のように `basic-auth` ワークスペースとして渡すだけでOKです。

```yaml
workspace:
  - name: basic-auth
    secret:
      secretName: "{{ git_auth_secret }}"
```

あとは、パイプライン側で `git-clone` タスクに `basic-auth` ワークスペースを渡せば、プライベートリポジトリのCloneが認証付きで実行されます。**事前にOpenShift内にSSH鍵や認証シークレットを配置しておく必要がない**のは、運用面でかなり楽になります。

詳細は{{< external_link url="https://docs.redhat.com/ja/documentation/red_hat_openshift_pipelines/1.19/html/pipelines_as_code/using-private-repositories-with-pipelines-as-code_using-pipelines-as-code-repos" title="Pipelines as Code でのプライベートリポジトリーの使用（Red Hat公式ドキュメント）" >}}を参照してください。

## Namespaceによるパイプライン実行の分離

どのリポジトリでパイプラインを実行するかは、OpenShift上の**Repositoryリソース**で管理されます。
Organizationにはパイプラインを実行する必要のないリポジトリも当然あるため、Repositoryリソースで明示的に対象を指定する仕組みになっています。

パイプラインの定義は共通であっても、**実行する場所（Namespace）は個別に設定**できます。
「`.tekton/` に任意のNamespaceを指定したら、他人のNamespaceでビルドが実行されてしまうのでは？」と心配になるかもしれませんが、そこは安心してください。パイプラインは**Repositoryリソースが存在するNamespaceでのみ実行される**ため、勝手に別のNamespaceで実行されることはありません。

開発者からすると、自分のアプリケーションがあるNamespaceでビルドが動くため、非常にわかりやすい構成になります。当然ながら自分の関心のあるパイプラインだけがそのNamespaceで動くので、PipelineRunの一覧も見やすく、運用時の見通しがよくなります。

## 複数GitHub Appsによるマルチテナント分離

デフォルトでは、PACコントローラーはひとつのGitHub Appsと通信します。
しかし、組織の規模やセキュリティ要件によっては、ひとつのGitHub Appsだけでは不十分なケースがあります。たとえば、パイプライン内で権限のないプロジェクトをCloneできてしまう可能性が考えられます。

このような場合は、**追加のPACコントローラーを設定し、別のGitHub Appsを紐づける**ことで対応できます。

OpenShift PipelinesのTektonConfig（`TektonConfig`リソース）で、以下のように追加コントローラーを定義します。

```yaml
platforms:
  openshift:
    pipelinesAsCode:
      additionalPACControllers:
        additional-pac-controller:
          configMapName: additional-pac-controller-pipelines-as-code-configmap
          enable: true
          secretName: additional-pac-secret
```

設定を適用すると、追加のPACコントローラーのPodとRouteが作成されます。

```text
$ oc get pod,route -n openshift-pipelines | grep additional
pod/additional-pac-controller-pac-controller-5db78459b8-v9h8h   1/1     Running   0                14s

route.route.openshift.io/additional-pac-controller-pac-controller   additional-pac-controller-pac-controller-openshift-pipelines.apps.cluster-9qtcm.9qtcm.sandbox1494.opentlc.com          additional-pac-controller-pac-controller   http-listener   edge/Redirect   None
```

追加コントローラーの場合は、GitHub Appsを手動で設定する必要がある点に注意しましょう。
詳細は{{< external_link url="https://docs.redhat.com/ja/documentation/red_hat_openshift_pipelines/1.19/html/pipelines_as_code/pac-additional-controller_install-config-pipelines-as-code" title="追加の Pipelines as Code コントローラー設定（Red Hat公式ドキュメント）" >}}を参照してください。

## どういうときにPACを採用すべきか

さて、ここまでPACの便利さを紹介してきましたが、すべてのTektonユーザが今すぐPACに移行すべきかというと、そうとも限りません。従来のEventListener方式とPACの使い分けについて、自分なりの見解を書いておきます。

**PACが向いているケース：**

- **アプリケーションチームにTektonをあまり意識させたくない場合。** プラットフォームチームが定義済みのパイプラインとPACの仕組みを用意しておけば、アプリケーションチームはリポジトリに決められた設定ファイルを置くだけでパイプラインを利用できます。Tektonの詳細を知らなくても使えるセルフサービス環境を実現できるのは大きな利点です。
- **リポジトリごとにパイプラインの定義を変えたい場合。** アプリケーションチームが自分たちのペースでパイプラインを修正・拡張できるのが最大のメリットです。プラットフォームチームに依頼しなくても `.tekton/` を変更するだけで済むのは大きいですよね。
- **開発者にパイプライン実行結果のフィードバックを返したい場合。** GitHub Appsと連携すれば、コミットステータスやPull Requestへのチェック結果が自動で反映されます。開発者体験を重視するならPAC一択です。
- **リポジトリ数が多く、Webhookやトリガー設定の管理が負担になっている場合。** EventListenerのCEL式やInterceptorの設定を何十個も管理しているなら、PACに移行する価値は十分あります。

**従来のEventListener方式のままでよいケース：**

- **Gitイベント以外のトリガーが主体の場合。** 手動トリガーや定期実行、外部システムからのWebhookなど、Gitリポジトリの操作に基づかないパイプラインにはPACは関係ありません。
- **パイプライン定義を中央集権的に管理したい場合。** セキュリティ要件やガバナンス上、開発者にパイプライン定義を自由に変えてほしくないケースでは、プラットフォームチーム側でEventListenerを管理するほうが合っています。
- **すでにEventListener方式でうまく回っている少数リポジトリの場合。** 動いているものを無理に移行する必要はないですよね。

要するに、**リポジトリ数が増えてきて運用負荷が上がっている**、あるいは**開発者にセルフサービスでパイプラインを使わせたい**という状況であれば、PACの導入を検討する価値があると思います。

## まとめ

TektonのPipelines as Code（PAC）について、従来の運用方式との違いや利点を整理しました。

- Webhookエンドポイントの一元化で運用負荷を軽減
- `.tekton/` によるパイプライン定義のリポジトリ内管理
- GitHub Appsとの連携による認証・Webhook設定の自動化、パイプライン実行時のトークン自動生成
- Repositoryリソースによる実行制御とマルチテナント対応
- 追加コントローラーでの複数GitHub Apps連携

PACを活用すれば、Tektonパイプラインの運用がかなりスッキリします。とくにOpenShift環境でTektonを使っている方にはぜひ検討してみてほしいです。それでは！
