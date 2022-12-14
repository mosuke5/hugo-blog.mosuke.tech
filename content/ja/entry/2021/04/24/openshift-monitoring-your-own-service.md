+++
categories = ["OpenShift"]
date = "2021-04-24T14:05:54+09:00"
lastmod = "2022-12-14T9:14:26+09:00"
description = "OpenShift 4.6から正式に追加されたユーザ定義プロジェクトの監視機能について、どこまで使えるのか？実戦投入できそうかなどの観点で検証していきます。Prometheusを独自で構築することなく監視できる新機能を紹介します。"
draft = false
image = ""
tags = ["Tech"]
title = "OpenShiftの新機能、ユーザ定義プロジェクトの監視ってどこまでできる？"
author = "mosuke5"
archive = ["2021"]
+++

こんにちは、もーすけです。  
本日は、OpenShift 4.6から新規に追加された「ユーザ定義プロジェクトの監視機能 (Monitoring for user-defined project)」ってなんなのか？どこまでできるのか？と気になってので検証してみます。正式な機能名があるわけではなさそうなので、本ブログでは「ユーザ定義プロジェクトの監視」ということにしておきます。

ちなみに本ブログを読みすすめる上で、`$ コマンド` はクラスタ管理者の操作、`% コマンド` はユーザ（開発者）の操作として記述しているので注意してください。

<!--more-->

## Cluster Monitoringとは
OpenShiftは、インストール時点にデフォルトでCluster MonitoringというPrometheusやGrafanaで構成された機能が起動します。実態としては、[Cluster Monitoring Operator](https://github.com/openshift/cluster-monitoring-operator) というOperatorがインストールされており、OpenShiftクラスタを監視するのに必要な、以下のようなソフトウェアを起動しています。

- Prometheus Operator
- Prometheus
- Alertmanager cluster for cluster and application level alerting
- kube-state-metrics
- node_exporter
- prometheus-adapter

4.5以前では、このCluster Monitoringは名前の通り「クラスタのためのモニタリング」機能の提供であり、OpenShift上でアプリケーションを動かすユーザ側の監視はスコープ外でした。
4.6にて、ユーザ定義プロジェクトの監視機能が追加されたことで、<u>ユーザ側の監視もできるようになった</u>というわけです。（[リリースノート](https://access.redhat.com/documentation/ja-jp/openshift_container_platform/4.6/html/release_notes/ocp-4-6-new-features-and-enhancements#ocp-4-6-monitoring)はこちら）

OpenShiftを触っている人は、「Cluster Monitoringでもユーザ定義プロジェクトの監視できるのでは！？」と思うはずなので、現時点の状況を説明します。
従来のCluster Monitoringでも、たしかにユーザが作ったプロジェクト内のPodのメトリクスなどを確認することはできます。しかし、いくつかの課題がありました。

ひとつめは、Cluster Monitoringに搭載のPrometheus/Grafanaには権限分離する機能がなく、Cluster Monitoringにアクセスできる人は、**すべてのNamespace**の状況が見えてしまいます。
ひとつのシステムのためだけにOpenShiftを利用していれば問題ないかもしれませんが、マルチテナントとして利用する場合は不適切です。

ふたつめは、カスタマイズができないということです。OpenShiftのプリセットの設定が入っており、こちらを編集してカスタマイズすることができないということです。そのため、ユーザがデプロイしたアプリケーションの監視設定・アラート設定を追加することはできません。

という背景があり、この新機能の「ユーザ定義プロジェクトの監視」に注目していたというわけです！
どのくらい現時点で使えるのか？制限事項は何なのか？そのあたりを確認していきたいと思います。

## 設定と検証
本ブログの検証で利用しているOpenShiftは`version 4.6.20`となります

```
$ oc version
Client Version: 4.6.18
Server Version: 4.6.20
Kubernetes Version: v1.19.0+2f3101c
```

### ユーザー定義プロジェクトの監視の有効化
デフォルトでは無効化されているため、有効化が必要です。  
有効化の公式ドキュメントの手順は[こちら](https://access.redhat.com/documentation/ja-jp/openshift_container_platform/4.7/html/monitoring/enabling-monitoring-for-user-defined-projects#enabling-monitoring-for-user-defined-projects_enabling-monitoring-for-user-defined-projects)です。
ちなみに、この有効化作業は**クラスタ管理者の作業**です。cluster-admin権限がないとできない操作で、ユーザ（開発者側）はこの作業について気にする必要はないです。

また、このユーザ定義プロジェクトの監視もCluster Monitoring Operatorの拡張機能として備わっているものになります。

公式ドキュメントの手順にしたがって行うのですが、デフォルトの設定のままだとしょっぱなからつまづきます。`cluster-monitoring-config` というConfigMapはデフォルトで存在しないため、ない人は作成する必要があります。

```
$ oc -n openshift-monitoring edit configmap cluster-monitoring-config
Error from server (NotFound): configmaps "cluster-monitoring-config" not found
```

気を取り直して設定を追加します。

```
$ oc -n openshift-monitoring create configmap cluster-monitoring-config
configmap/cluster-monitoring-config created

$ oc -n openshift-monitoring edit configmap cluster-monitoring-config
# 以下を追加
data:
  config.yaml: |
    enableUserWorkload: true
```

`openshift-user-workload-monitoring` namespaceにて、ユーザ定義プロジェクトの監視向けのPrometheusが作成されていることを確認できます。

```
$ oc get pod -n openshift-user-workload-monitoring
NAME                                   READY   STATUS    RESTARTS   AGE
prometheus-operator-6957669954-qq82t   2/2     Running   0          100s
prometheus-user-workload-0             4/4     Running   1          95s
prometheus-user-workload-1             4/4     Running   1          95s
thanos-ruler-user-workload-0           3/3     Running   0          93s
thanos-ruler-user-workload-1           3/3     Running   0          93s

$ oc get prometheus -n openshift-user-workload-monitoring
NAME            VERSION   REPLICAS   AGE
user-workload   v2.20.0   2          2m22s
```

### ユーザへの権限付与
この機能をユーザに利用してもらうためには、ユーザ側への権限付与が必要です。
具体例でいうと、ユーザが監視設定を追加するためには `ServiceMonitor` や `PromtheusRule` といったリソースの作成が必要です。OpenShiftでは、いくつかのRoleを用意しているので、適切なものをユーザに付与しましょう。詳しくはこちらの[ドキュメント](https://access.redhat.com/documentation/ja-jp/openshift_container_platform/4.7/html/monitoring/granting-users-permission-to-monitor-user-defined-projects_enabling-monitoring-for-user-defined-projects#granting-user-permissions-using-the-cli_enabling-monitoring-for-user-defined-projects)を参照ください。
監視設定もユーザ側で操作することが多いかと思うので、`monitoring-edit`の利用頻度が高そうですね。

本ブログでは`user1`をユーザ（開発サイド）とみなして権限付与をしてみます。
`my-app`は、user1が利用しているnamespace名です。

```
$ oc policy add-role-to-user monitoring-edit user1 -n my-app
clusterrole.rbac.authorization.k8s.io/monitoring-edit added: "user1"
```

### Prometheus Operatorとの関係
さきにお伝えしておくと、これからでてくる`ServiceMonitor`や`PrometheusRule`といったリソースは[Prometheus Operator](https://github.com/prometheus-operator/prometheus-operator)のカスタムリソースです。
Prometheus Operatorであることをユーザ側にあまり意識させない作りにはなっていますが、ユーザ側はPrometheus Operatorを一度さわっておくといいでしょう。

本記事では、Prometheus Operatorについては解説しませんが、別記事でまた紹介していきたいと思います。

### アプリケーションのデプロイ
ここからは**ユーザ側の作業**になります。
ユーザは任意のアプリケーションをデプロイしますが、そのアプリケーションはPrometheus形式のメトリクスを出力できる必要があります。
Prometheusのメトリクスを出力する方法にPrometheus exporterを用いることができます。

Prometheus exporterとは、簡易なHTTPサーバで、HTTPのリクエストがきたときにPrometheus形式のメトリクスを出力するツールです。オープンソースで、さまざまな種類のexporterがすでに開発されています。Kubernetesの世界で言えば、ノードのメトリクスを監視するために[node exporter](https://github.com/prometheus/node_exporter)はよく使われます。実際、OpenShift内でも利用されています。その他、[Nginx exporter](https://github.com/nginxinc/nginx-prometheus-exporter)や[JMX exporter](https://github.com/prometheus/jmx_exporter)などさまざまです。

![prometheus-exporter](/image/prometheus-exporter.png)

本検証では、Nginx exporterを搭載したNginxを使って挙動を確認してみます。
ドキュメント通りではつまらないので、ここは違うアプローチで解説していきたいと思います。
つぎのマニフェスト（`nginx.yaml`）を用います。コメントをいれました。

```yaml
---
# NginxのDeployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: test-nginx
  template:
    metadata:
      labels:
        app: test-nginx
    spec:
      containers:
        # Nginx本体
        - name: nginx
          image: nginxinc/nginx-unprivileged:1.20.0
          ports:
            - containerPort: 8080
          volumeMounts:
            - name: config-volume
              mountPath: /etc/nginx/conf.d
        # Nginx exporter
        # 9113ポートでリッスンし、Nginx本体の/stub_statusの情報をみて
        # Prometheus形式のメトリクスを出力する
        - name: nginx-exporter
          image: nginx/nginx-prometheus-exporter:0.9.0
          ports:
            - containerPort: 9113
          args:
            - -nginx.scrape-uri=http://localhost:8080/stub_status
      volumes:
        - name: config-volume
          configMap:
            name: nginx-conf
            items:
              - key: default.conf
                path: default.conf
---
# Nginx本体のService
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  type: ClusterIP
  ports:
    - name: "http-port"
      protocol: "TCP"
      port: 8080
      targetPort: 8080
  selector:
    app: test-nginx
---
# Nginx exporterのService
apiVersion: v1
kind: Service
metadata:
  name: nginx-exporter-service
  labels:
    app: test-nginx
spec:
  type: ClusterIP
  ports:
    - name: "exporter"
      protocol: "TCP"
      port: 9113
      targetPort: 9113
  selector:
    app: test-nginx
---
# Nginxのコンフィグ
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-conf
data:
  default.conf: |
    server {
        listen  8080;
        root    /usr/share/nginx/html;

        location /stub_status {
            stub_status;
        }
    }
```

Nginxを起動します。  
ポイントとしては、Pod内に2つのコンテナが存在していること、そしてexporter用のService(`nginx-exporter-service`)をあわせて作成したことです。

```
% oc apply -f nginx.yaml
deployment.apps/test-nginx created
service/nginx-service created
service/nginx-exporter-service created
configmap/nginx-conf created

% oc get pod,service,configmap
NAME                              READY   STATUS    RESTARTS   AGE
pod/test-nginx-6c46668b79-6d8b8   2/2     Running   0          8s
pod/test-nginx-6c46668b79-fhc44   2/2     Running   0          8s
pod/test-nginx-6c46668b79-r4wzn   2/2     Running   0          8s

NAME                             TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
service/nginx-exporter-service   ClusterIP   172.30.255.65   <none>        9113/TCP   7s
service/nginx-service            ClusterIP   172.30.151.21   <none>        8080/TCP   7s

NAME                   DATA   AGE
configmap/nginx-conf   1      6s
```

### メトリクスの収集
これから、exporterが公開したメトリクスを収集しますが、その前に生のメトリクス情報を確認しておきましょう。
`fedora:33`イメージでデバッグ用のコンテナを起動します。
コンテナ内から、`service/nginx-exporter-service`に接続してメトリクス情報を肉眼でも確認しておきましょう。

```
// デバッグ用コンテナの起動
% oc run debug -it --image=fedora:33 -- /bin/bash
If you don't see a command prompt, try pressing enter.
bash-5.0$
bash-5.0$ # まずはNginx本体へcurlしてレスポンスが返ってくることを確認
bash-5.0$ curl http://nginx-service:8080
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
    body {
        width: 35em;
        margin: 0 auto;
        font-family: Tahoma, Verdana, Arial, sans-serif;
    }
...

bash-5.0$ # 次にexporter側へcurlしてメトリクスを確認
bash-5.0$ curl http://nginx-exporter-service:9113/metrics
# HELP nginx_connections_accepted Accepted client connections
# TYPE nginx_connections_accepted counter
nginx_connections_accepted 3
# HELP nginx_connections_active Active client connections
# TYPE nginx_connections_active gauge
nginx_connections_active 1
# HELP nginx_connections_handled Handled client connections
# TYPE nginx_connections_handled counter
nginx_connections_handled 3
...
```

いよいよ、メトリクス収集するために、Prometheusに対して監視設定を投入します。
通常のPrometheusを利用している場合、Prometheusの監視設定は専用の設定ファイルに記述を行い読み込ませる必要があります（[公式ドキュメント](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)）。今回は、Prometheus Operatorを内部的に利用しているため、Prometheusの専用の設定ファイルを書く必要はなく、`ServiceMonitor`というKubernetesリソースを作成すると、Prometheus Operatorが設定をPrometheusに反映してくれます。

非常にシンプルですが、指定した条件に合うServiceを検出し監視を開始してくれます。
`ServiceMonitor`の設定内容について詳しく知りたい方は、[Prometheus OperatorのAPIドキュメント](https://github.com/prometheus-operator/prometheus-operator/blob/master/Documentation/api.md#servicemonitorspec)がオススメです。
```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: nginx-monitor
spec:
  # メトリクスのエンドポイントの設定
  # "exporter"という名前のService portを選択
  endpoints:
    - interval: 30s
      port: exporter
      scheme: http
  # 検出するServiceの条件設定
  # "app: test-nignx"のラベルを持つServiceを検出
  selector:
    matchLabels:
      app: test-nginx
```

ServiceMonitorをデプロイ後に、OpenShiftのWebコンソールから、"Monitoring" -> "Metrics" -> "Custom Query"にて、`nginx`などと入力するとNginx exporterから取得したメトリクスを確認できます。

```
% oc apply -f servicemonitor.yaml
servicemonitor.monitoring.coreos.com/nginx-monitor created

% oc get servicemonitor
NAME            AGE
nginx-monitor   9s
```

![openshift-user-defined-prometheus-metrics](/image/openshift-user-defined-prometheus-metrics.png)

![openshift-user-defined-prometheus-metrics-zoom](/image/openshift-user-defined-prometheus-metrics-zoom.png)

### アラート設定
続いてアラート設定です。
取得したメトリクスに対して条件を指定してアラートできます。
アラート設定は`PrometheusRule`というリソースで設定できます。
`PrometheusRule`の設定項目は[こちら](https://github.com/prometheus-operator/prometheus-operator/blob/master/Documentation/api.md#prometheusrulespec)を参照ください。

試しに、次のマニフェストを使ってみます。
`nginx_up`は、名前のとりNginxが起動しているかどうかのメトリクスです。
今回、Nginxはレプリカを3で起動していますから、何もなければ`sum(nginx_up) = 3` となるはずです。
ひとつ以上がダウンしていれば `NginxPartiallyDown` のアラートを、全部ダウンしていれば `NginxTotallyDown` のアラートを出すこととします。

```yaml
# alert.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: nginx-alert
spec:
  groups:
    - name: nginx-down
      rules:
        - alert: NginxPartiallyDown
          expr: sum(nginx_up) < 3
          for: 0m
          labels:
            severity: warning
        - alert: NginxTotallyDown
          expr: sum(nginx_up) < 1
          for: 0m
          labels:
            severity: critical
```

アラート設定をデプロイし、Webコンソールにアラートが反映したことを確認。

```
% oc apply -f alert.yaml
prometheusrule.monitoring.coreos.com/nginx-alert created

% oc get prometheusrole
NAME          AGE
nginx-alert   6h12m
```

![openshift-user-defined-prometheus-alert-normal](/image/openshift-user-defined-prometheus-alert-normal.png)

Nginxのレプリカ数を2にして、わざとアラート発報させてみます。
Webコンソール上でもアラートが`Firing`になっていることを確認しましょう。

```
% oc scale deploy test-nginx --replicas=2
deployment.apps/test-nginx scaled
```

![openshift-user-defined-prometheus-alert-error](/image/openshift-user-defined-prometheus-alert-error.png)

## 通知設定
最後に通知設定についてみていきます。  
ひとつまえの項目ではアラート設定を行いましたが、とくに通知の設定は行っていませんでした。
Prometheusでは `Alertmanager` というコンポーネントがアラートを管理します。
このユーザ定義プロジェクトの監視では、アラート設定はユーザ側に権限はなく**クラスタ管理者側**となります。
理由は、利用しているAlertManagerは、クラスタ管理用のものと併用しているためです。  
（※OpenShift 4.11からアラート機能は改善され、開発者側もセルフで設定できるようになりました。詳しくは「[OpenShift、開発者向けの監視機能（アラート通知）が進化しました](https://blog.mosuke.tech/entry/2022/12/14/openshift-user-alert-routing/)」を確認してください！）

OpenShiftのWebコンソールの"Administration" -> "Cluster Settings" -> "Global Configuration" -> "Alertmanager" -> "Create Receiver"から設定できます。公式ドキュメントの設定手順は[こちら](https://access.redhat.com/documentation/ja-jp/openshift_container_platform/4.6/html/monitoring/sending-notifications-to-external-systems_managing-alerts#configuring-alert-receivers_managing-alerts)です。

今回はSlackを通知先に選びました。  
設定で重要になるのは、`Routing Labels`です。
これは、発報したアラートと通知設定を紐付けるための設定です。いちばん簡易なのはNamespaceを指定することでしょう。
以下のスクリーンショットのように `namespace = my-app` とすることで、my-app namespace内で作成された`PrometheusRule`と紐づきNamespace毎に通知先を選べます。複数のチームがOpenShiftを利用していても通知先をある程度固定できます。
ただし、Namespaceごとではクラスタ管理者の管理も難しいので、チームごとに利用できるよう `team = <任意のID>` としてIDをチーム側に知らせることなど運用の工夫が考えられそうです。 

![openshift-user-defined-prometheus-alertmanager](/image/openshift-user-defined-prometheus-alertmanager.png)

`Routing Labels`に使用できるラベルは、`PrometheusRule`を記述したときに設定した`labels`と対応します。以下であれば、`severity=warning`, `type=hoge`, `foo=bar`のラベルと、`namespace=xxxx`が付きます。

```yaml
# alert.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: nginx-alert
spec:
  groups:
    - name: nginx-down
      rules:
        - alert: NginxPartiallyDown
          expr: sum(nginx_up) < 3
          for: 0m
          labels:
            severity: warning
            type: hoge
            foo: bar
```

## アーキテクチャ図
ここまでいろいろ検証してきて、ドキュメントに記載してあったアーキテクチャ図が理解できるようになってきました。
簡単ですが、ポイントを書き込んだので理解の深堀りに使ってください。

![openshift-user-defined-prometheus-architecture](/image/openshift-user-defined-prometheus-architecture.png)

## さいごに
長いブログでしたがお疲れさまでした。  
OpenShiftのCluster Monitoringの拡張機能を使ったユーザ定義プロジェクトの監視いかがでしたでしょうか。
個人的には非常に良い仕組みだなと思っています。
いままで、ユーザ側で監視のの仕組みを作るのにPrometheus Operator/Grafana Operatorを使って独自に立ててきました。
Operator化されているので簡単ではあるのですが、それでもある程度の運用の大変さがあったのは事実です。
もちろん、いくつかの制約はあるもののカスタムのメトリクスの収集とアラート・通知ができるので使える場面も多いのではないかなと思っています。

以下の点が制約として考えられるので注意して使っていきましょう。

1. ダッシュボードは作れない。Grafanaダッシュボードは含まない。OpenShiftのWebコンソール内で完結。
1. ~~アラートの通知先管理がクラスタ管理側権限となる。~~ （OpenShift 4.11で改善）
1. 大量のユーザで利用したときのスケーラビリティ（OpenShift 4.11でクラスタ監視とアプリケーション監視のAlertmanagerを分離できるように改善）

では、これからもOpenShift Lifeを楽しんでください！

本編の続報です。
<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://blog.mosuke.tech/entry/2022/12/14/openshift-user-alert-routing/" target="_blank">
      <img class="belg-site-image" src="https://blog.mosuke.tech/image/logo.png" />
    </a>
  </div>
  <div class="belg-right col-md-10">
  <div class="belg-title">
      <a href="https://blog.mosuke.tech/entry/2022/12/14/openshift-user-alert-routing/" target="_blank">OpenShift、開発者向けの監視機能（アラート通知）が進化しました · Goldstine研究所</a>
    </div>
    <div class="belg-description">OpenShiftの開発者向けの監視機能がありました。しかし、アラート通知に欠点があり、使いづらい部分がありましたが改善されたので紹介します。</div>
    <div class="belg-site">
      <img src="https://blog.mosuke.tech/image/favicon.ico" class="belg-site-icon">
      <span class="belg-site-name">Goldstine研究所</span>
    </div>
  </div>
</div>