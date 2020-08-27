+++
categories = ["kubernetes"]
date = "2020-08-13T18:40:35+09:00"
description = "Zabbixは使い慣れた監視ツールのひとつかと思います。Kuberntes環境でZabbixは活用できるのか？Prometheusとどうつかいわけていけばいいのか？そのヒントを探るために検証しました。"
draft = false
image = ""
tags = ["Tech"]
title = "ZabbixでKubernetesの監視を検討する（Prometheus exporter, Kubernetes API）"
author = "mosuke5"
archive = ["2020"]
+++

こんにちは、{{< external_link url="https://twitter.com/mosuke5" title="mosuke5" >}} です。
本日は、ZabbixでKubernetesの監視をどこまで頑張れるか考えてみたいと思います。
クラウドネイティブな環境ならPrometheusとそう単純に思うところですが、使い慣れたツールに統合したいことも当然ありますし、選択肢はいろいろあるべきですね。
どんな方法で実現できるのかみていきましょう。
<!--more-->

## 環境
まず本検証の環境ですが下記で行いました。  
GKEやEKS、バニラKubernetesなどでも当然同じ様に可能です。

- Kubernetes: OpenShift 4.4.8 (Kubernetes 1.17)
- Zabbix: 4.4.9
    - Kubernetesクラスタ上に立てました

下記の内容の中で `oc` というコマンドを利用していますが、`kubectl`と置き換えてお読みください。

## Prometheus exporterを利用する
Zabbixを用いてKubernetesの監視を行う場合に、まず重要になってくる機能が {{< external_link url="https://www.zabbix.com/documentation/4.4/manual/config/items/itemtypes/prometheus" title="Prometheus Check" >}} です。
ZabbixをもちいているのにPrometheus？と思うかもしれませんが、こちらはPrometheus本体とは関係なく、ZabbixがPrometheus exporterのフォーマットを解釈できる機能のことです。

Prometheus exporterとは、Prometheus本体がデータを取得する際に利用する、メトリクスを公開する方法です。Prometheus Checkの機能があることで、Prometheus向けに公開しているメトリクス情報をZabbixに取り込むことができてしまうのです。

### node_exporter
Prometheus exporterの代表例として{{< external_link url="https://github.com/prometheus/node_exporter" title="node_exporter" >}} があります。
node_exporterはKubernetesのノードの監視などでよく用いられるソフトウェアで、ハードウェアやOSのメトリクスを公開するためのexporterです。
わたしが試したOpenShiftの環境でも、デフォルトでインストールされています。

それでは早速node_exporterで取得できるメトリクスをZabbixに取り込んでみます。  
node_exporter自身は、`openshift-monitoring`というnamespace内に`9100`ポートで公開しています。
また、node_exporterの本体はDaemonSetを用いて各ノードで動作しています。

```
$ oc get service node-exporter -n openshift-monitoring
NAME            TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)    AGE
node-exporter   ClusterIP   None         <none>        9100/TCP   6d19h

$ oc get pod -n openshift-monitoring | grep node-exporter
node-exporter-4d7q4                            2/2     Running   0          6d19h
node-exporter-59x5k                            2/2     Running   0          6d19h
node-exporter-64vs2                            2/2     Running   0          6d19h
node-exporter-78976                            2/2     Running   0          5d17h
node-exporter-9xhws                            2/2     Running   0          6d19h
node-exporter-cdxlt                            2/2     Running   0          5d18h
node-exporter-mzk8r                            2/2     Running   0          6d19h
```

同一クラスタ内のPodからcurlでメトリクスを取得できることを確認しておきます。

```
$ curl https://node-exporter.openshift-monitoring.svc.cluster.local:9100/metrics -k --header "Authorization: Bearer $TOKEN"
# HELP go_gc_duration_seconds A summary of the GC invocation durations.
# TYPE go_gc_duration_seconds summary
go_gc_duration_seconds{quantile="0"} 7.871e-06
go_gc_duration_seconds{quantile="0.25"} 2.3049e-05
go_gc_duration_seconds{quantile="0.5"} 6.5209e-05
go_gc_duration_seconds{quantile="0.75"} 8.6643e-05
go_gc_duration_seconds{quantile="1"} 0.000362445
go_gc_duration_seconds_sum 0.064433758
go_gc_duration_seconds_count 886
...
```

ZabbixがPrometheusを取り込むプロセスは以下のとおりです。

1. 監視アイテムで、HTTPエージェントを選択しnode_exporterの値を取得する設定をします。
    - タイプ: `HTTPエージェント`
    - URL: `https://node-exporter.openshift-monitoring.svc.cluster.local:9100/metrics`
        - node_exporterまでのパスを指定
        - ZabbixがKubernetesクラスタ上にあるため内部パスを指定しましたが、外部のZabbixからの場合は疎通がとれるように設定する必要があります。
    - 認証はHTTP Headerに追加
        - `Authorization: Bearer YOUR-TOKEN`
    - データ型：`テキスト`
        - テキスト情報としてnode_exporterの情報を取得（すべてのメトリクスを一度テキストとして保存）
    - ヒストリの保存期間: `ヒストリを保存しない`
        - node_exporterの情報は非常に多いため、ここではヒストリ保存は行いません
1. 依存アイテムを用いて、上記のマスターアイテムから必要な情報のみを取り出す設定をする。
    - 保存前処理設定
        - 種類: `Prometheusパターン`
        - パラメータ: `node_cpu_guest_seconds_total{cpu="0",mode="user"}`
            - 取得したいパラメータを指定
    - 監視したい項目分だけ依存アイテムを作成する
    - {{< external_link url="https://www.zabbix.com/integrations/prometheus" title="node-exporterのTemplate" >}}が用意されているのでこちらを利用すると設定が容易です

下記は参考に設定のスクリーンショットを掲載します。

httpエージェントアイテムの作成  
![zabbix-item](/image/zabbix-item-httpagent.png)

依存アイテムの作成  
![zabbix-item-dependency](/image/zabbix-item-dependency.png)

Prometheusパターンの設定  
![zabbix-prometheus-pattern](/image/zabbix-prometheus-pattern.png)

## Kubernetes APIを利用する
次に、Kubernetesの監視においてすべてをexporterでまかなえるわけではありません。
たとえば、Kubernetes上の特定のPodのステータスを確認したいなどといった、Kubernetes APIの実行結果を監視したいこともあると思います。
こちらについても、原理的には上のPrometheus exporterと同様で実現することが可能です。
Prometheus exporterを利用する場合には保存前処理にPrometheusパターンを活用しましたが、JSONもパースできます。Kubernetes APIはJSONレスポンスを返すので当然活用できます。

実際に、特定のPodのステータスを取得してみます。  
`zabbix` namespace内にある`debug`Podの情報を取得します。

まずは、通常通りcurlでAPI実行できるか確認します。ついでにJSONフォーマットも確認しておきます。

```
$ curl https://your-api-server-endpoint:6443/api/v1/namespaces/zabbix/pods/debug -k --header "Authorization: Bearer $TOKEN"
{
  "kind": "Pod",
  "apiVersion": "v1",
  "metadata": {
    "name": "debug",
    "namespace": "zabbix"
  },
  ...
  "status": {
    "phase": "Running",
  ...
  }
}
```

1. 監視アイテムで、HTTPエージェントでnode_exporterを
    - タイプ: `HTTPエージェント`
    - URL: `https://your-api-server-endpoint:6443/api/v1/namespaces/zabbix/pods/debug`
        - 監視したいKubernetes APIのエンドポイントを指定
        - 上記は、namespceが `zabbix` の `debug`という名前のPod情報を取得する例です
    - 認証はHTTP Headerに追加
        - `Authorization: Bearer YOUR-TOKEN`
    - データ型：`テキスト`
        - テキスト情報としてnode_exporterの情報を取得（すべてのメトリクスを一度テキストとして保存）
    - ヒストリの保存期間: `ヒストリを保存しない`
1. 依存アイテムを用いて、上記のマスターアイテムから必要な情報のみを取り出し
    - 保存前処理で、jsonのフォーマットをパースできる
    - 特定のメトリクスのみ取り出して登録
    - 監視したい項目分だけ依存アイテムを作成
    - 保存前処理設定
        - 種類: `JSONPath`
        - パラメータ: `$.status.phase`
            - 取得したいパラメータを指定
    - 監視したい項目分だけ依存アイテムを作成する

PodのStatusを下記のように取得できました。  
![zabbix-pod-status](/image/zabbix-pod-status.png)

## Zabbixの弱いところ
上記のような形式で、Prometheus exporterから値を取得したり、Kubernetes APIを利用したKubernetes上のリソースの監視などができることが確認できました。
一方で、やはりPrometheusがKubernetes時代（よりダイナミックにリソースが変化する時代）に適していると思う理由として、サービスディスカバリの強さがあると感じています。
Zabbixはあくまで静的な環境における監視に特化していると感じています。特定の監視については十分にZabbixも活用できそうですが、Kubernetes上で動作するダイナミックなアプリケーションやPodへの適応はすこし難しいかもしれません。

## まとめ
Zabbixを使ったKubernetesの監視について少し検証してみました。
Prometheus exporterやKubernetes APIを駆使すれば実現できる幅も広がりそうです。
ここまでできることがわかったので、あとは「なにを監視すればいいか」をしっかり見定められればZabbixでも十分よい監視を実現できると考えます。