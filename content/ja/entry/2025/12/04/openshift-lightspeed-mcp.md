+++
categories = ["OpenShift", "AI"]
date = "2025-12-04T16:09:50+09:00"
description = "OpenShift LightspeedにMCP (Model Context Protocol) サーバーを追加して、AIエージェント機能を拡張する方法を解説します。Claude Codeでのローカル実行からOpenShift Lightspeedへの統合まで。"
draft = false
image = ""
tags = ["Tech"]
title = "OpenShift LightspeedにMCPサーバーを追加して、AIエージェント機能を強化する"
author = "mosuke5"
archive = ["2025"]
+++

こんにちは、もーすけです。
この記事は、{{< external_link url="https://qiita.com/advent-calendar/2025/openshift" title="OpenShift Advent Calendar 2025" >}} の記事です。

OpenShift LightspeedにMCP (Model Context Protocol) をインストールできる（まだDeveloper Previewですが）と知ったので、さっそく試してみました。

MCPについては、以下のRed Hatの記事でも紹介されています。

<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://developers.redhat.com/articles/2025/10/09/integrate-incident-detection-openshift-lightspeed-mcp" target="_blank">
      <img class="belg-site-image" src="https://developers.redhat.com/sites/default/files/styles/article_floated/public/figure2_26.png" />
    </a>
  </div>
  <div class="belg-right col-md-10">
    <div class="belg-title">
      <a href="https://developers.redhat.com/articles/2025/10/09/integrate-incident-detection-openshift-lightspeed-mcp" target="_blank">Integrate incident detection with OpenShift Lightspeed via MCP | Red Hat Developer</a>
    </div>
    <div class="belg-description">Learn how to integrate incident detection with OpenShift Lightspeed, the AI-powered virtual assistant for Red Hat OpenShift</div>
    <div class="belg-site">
      <span class="belg-site-name">developers.redhat.com</span>
    </div>
  </div>
</div>

今回は、記事のまま試すだけでは面白くないので、違うMCPサーバーを入れてみたいと思います。
利用するのは `kubernetes-mcp-server` です。

<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://github.com/containers/kubernetes-mcp-server" target="_blank">
      <img class="belg-site-image" src="https://github.githubassets.com/favicons/favicon.svg" />
    </a>
  </div>
  <div class="belg-right col-md-10">
    <div class="belg-title">
      <a href="https://github.com/containers/kubernetes-mcp-server" target="_blank">GitHub - containers/kubernetes-mcp-server: Model Context Protocol (MCP) server for Kubernetes and OpenShift</a>
    </div>
    <div class="belg-description">Model Context Protocol (MCP) server for Kubernetes and OpenShift - containers/kubernetes-mcp-server</div>
    <div class="belg-site">
      <img src="https://github.githubassets.com/favicons/favicon.svg" class="belg-site-icon">
      <span class="belg-site-name">GitHub</span>
    </div>
  </div>
</div>

<!--more-->

## まずは普通にMCPを試してみる

OpenShift Lightspeedに組み込む前に、まずは手元の環境でMCPサーバーの動作を確認してみます。
環境は OpenShift 4.19 に対して、Claude Code (claude cli) から実行します。

インストールは以下のコマンドで行います。

```bash
$ claude mcp add kubernetes -- npx -y kubernetes-mcp-server@latest
$ claude mcp list
Checking MCP server health...

kubernetes: npx -y kubernetes-mcp-server@latest - ✓ Connected
```

`npx` は、Node.jsのパッケージをインストールせずに一時的にダウンロードして実行するためのコマンドです。
MCPサーバーがコンテナやバックグラウンドサービスとして常駐するのではなく、必要なときにローカルマシン上のプロセスとして直接起動されることを意味します。手元でサクッと動作確認したい場合に非常に便利です。

実行は `claude` CLIから行います。
プロンプトから明示的にMCPを指定する必要はありません。文脈から利用するMCPを推測してくれます。

例えば、「openshift-lightspeed namespaceにあるPodを一覧表示して。そのときに、Pod名とステータス、起動しているノードの3つを表示して」と依頼すれば、自動的に `kubernetes-mcp-server` のツールを呼び出して実行してくれます。

```bash
$ claude
> openshift-lightspeed namespaceにあるPodを一覧表示して。そのときに、Pod名とステータス、起動しているノードの3つを表示して 
openshift-lightspeed namespaceのPod一覧です：

  | Pod名                                                  | ステータス  | ノード                     |
  |--------------------------------------------------------|-----------|---------------------------|
  | kubernetes-mcp-server-1-build                          | Completed | worker3.ocp.mosuke5.local |
  | kubernetes-mcp-server-6dd44bd84c-glrd6                 | Running   | worker3.ocp.mosuke5.local |
  | lightspeed-app-server-76f7578674-wkl6n                 | Running   | worker2.ocp.mosuke5.local |
  | lightspeed-console-plugin-67df8f7675-fv8xh             | Running   | worker2.ocp.mosuke5.local |
  | lightspeed-operator-controller-manager-5fb96b455-vxnwl | Running   | worker1.ocp.mosuke5.local |
  | lightspeed-postgres-server-6d59f9b488-79mb7            | Running   | worker2.ocp.mosuke5.local |

  計6つのPodがあり、1つはビルド完了状態（Completed）、残り5つは実行中（Running）です。ワークロードは worker1, worker2, worker3 の3つのノードに分散配置されています。
```

## OpenShift Lightspeedから実行する

動作確認ができたので、次は本題のOpenShift Lightspeedからの実行です。

### MCPサーバーのデプロイ

まずは、`kubernetes-mcp-server` をコンテナとしてOpenShift上にデプロイします。
Dockerfileが用意されているので、`oc new-app` で簡単に立ち上げることができます。

```bash
$ oc project openshift-lightspeed
$ oc new-app https://github.com/containers/kubernetes-mcp-server
...
$ oc get pod,service
NAME                                                         READY   STATUS      RESTARTS       AGE
pod/kubernetes-mcp-server-1-build                            0/1     Completed   0              103m
pod/kubernetes-mcp-server-6dd44bd84c-glrd6                   1/1     Running     0              92m
...

NAME                                                     TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
service/kubernetes-mcp-server                            ClusterIP   172.30.96.169    <none>        8080/TCP   92m
...
```

### 権限の付与

MCPサーバーがOpenShiftのリソース情報を読み取るために、Service Accountに適切な権限を付与する必要があります。
今回は `cluster-reader` 権限を付与します。

```bash
$ oc adm policy add-cluster-role-to-user cluster-reader -z default -n openshift-lightspeed
```

### OpenShift Lightspeedの設定

次に、OpenShift Lightspeed側でMCPサーバーを利用するための設定を入れます。
`OLSConfig` リソース（または適切な設定リソース）に以下のような設定を追加します。

```yaml
apiVersion: ols.openshift.io/v1alpha1
kind: OLSConfig
metadata:
  name: cluster
spec:
  # まだPreview機能
  featureGates:
  - MCPServer

  # MCPサーバの設定
  mcpServers:
  - name: kubernetes-mcp-server
    streamableHTTP:
      enableSSE: true
      headers:
        kubernetes-authorization: kubernetes
      sseReadTimeout: 10
      timeout: 5
      url: http://kubernetes-mcp-server.openshift-lightspeed.svc.cluster.local:8080/sse
  #...
```

ここで、設定項目にある **SSE (Server-Sent Events)** について少し触れておきます。
SSEは、サーバーからクライアントへプッシュ型でデータを送信するための仕組みです。MCPにおいては、サーバー側で発生したイベントやログ、長い処理の経過などを、クライアント（この場合はOpenShift Lightspeed）に対してリアルタイムに通知するために利用されます。今回の設定では `enableSSE: true` としています。`kubernetes-mcp-server` はSSEをサポートしており、これを有効にすることで、実行状況のリアルタイムなフィードバックなど、よりインタラクティブな体験が可能になります。

## 実際に利用したユースケース

設定が完了したので、実際にOpenShift Lightspeedのチャット画面から利用してみました。

**「openshift-lightspeed namespaceにあるPodを一覧表示して。そのときに、Pod名とステータス、起動しているノードの3つを表示して 」**

Podを出力するだけなら、正直 oc コマンドを直接うったほうが速いですが、そのデータの加工までするとなると、MCPサーバーを利用することで、より便利な体験が可能になります。
日頃から使っていないと、細かいオプション忘れちゃいますので。。。

```bash
openshift-lightspeed のPod一覧（名前 / ステータス / ノード）:

kubernetes-mcp-server-1-build / Completed / worker3.ocp.mosuke5.local
kubernetes-mcp-server-6dd44bd84c-glrd6 / Running / worker3.ocp.mosuke5.local
lightspeed-app-server-56bbbbf5f5-bth4v / Running / worker2.ocp.mosuke5.local
lightspeed-console-plugin-67df8f7675-fv8xh / Running / worker2.ocp.mosuke5.local
lightspeed-operator-controller-manager-5fb96b455-vxnwl / Running / worker1.ocp.mosuke5.local
lightspeed-postgres-server-6d59f9b488-79mb7 / Running / worker2.ocp.mosuke5.local
```


## 削除のユースケースとHuman in the loop

次のユースケースとして、リソースの削除をやってみます。
**「openshift-lightspeed namespaceにあるLabelがapp=testのPodを削除して」** というプロンプトを利用します。

注意点として、先ほど付与した `cluster-reader` 権限では削除はできません。試す場合は、一時的に `cluster-admin` などの強い権限を付与する必要があります（権限を広く与えると怖いですが…）。

プロンプトに打ち込むと削除してくれたのですが、デフォルトだと削除に人間の確認がありませんでした。
AIエージェントに強い権限を与えている場合、これは非常に危険です。

そこで、事前に **「なにかリソースを削除したり変更する場合には必ず人に確認を求めてください」** と指示しておくと、次のように確認をしてくれるようになりました。

```text
わたし）「openshift-lightspeed namespaceにあるLabelがapp=testのPodを削除して」
AI）
削除系は要確認のため、実行前に確認します。

対象Pod（1件、label app=test）:

test-676c79db58-qd62f / Running / worker3.ocp.mosuke5.local 所有者: ReplicaSet test-676c79db58（配下のため削除しても再作成される可能性あり）
どうしますか？

1. このPodを削除する
2. 先に Deployment test を replicas=0 にスケールダウンしてから Pod を削除する
3. 中止する
```

このように、危険な操作の前にワンクッション置く（Human in the loop）ことで、AIエージェントをより安全に利用できるようになります。

## まとめ

OpenShift LightspeedにMCPサーバーを追加することで、標準の機能だけでは手が届かない操作や、独自のツールとの連携が可能になることがわかりました。
今回は `kubernetes-mcp-server` を使いましたが、他にも様々なMCPサーバーを組み合わせることで、運用の自動化や効率化がさらに進みそうです。

ぜひみなさんも試してみてください。
