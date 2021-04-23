+++
categories = ["OpenShift"]
date = "2021-04-23T14:05:54+09:00"
description = ""
draft = true
image = ""
tags = ["Tech"]
title = "OpenShiftの新機能、ユーザ定義プロジェクトの監視ってどこまでできる？"
author = "mosuke5"
archive = ["2021"]
+++

こんにちは、もーすけです。  
本日は、OpenShift 4.6から新規に追加された「ユーザ定義プロジェクトの監視機能 (Monitoring for user-defined project)」ってなんなのか？どこまでできるのか？と気になってので検証してみます。正式な機能名があるわけではなさそうなので、本ブログでは「ユーザ定義プロジェクトの監視」ということにしておきます。
<!--more-->

## Cluster Monitoringとは
OpenShiftは、インストール時点にデフォルトでCluster MonitoringというPrometheusやGrafanaで構成された機能が起動します。実態としては、[Cluster Monitoring Operator](https://github.com/openshift/cluster-monitoring-operator) というOperatorがインストールされることで、OpenShiftクラスタを監視するのに必要な、以下のようなソフトウェアを起動しています。

- Prometheus Operator
- Prometheus
- Alertmanager cluster for cluster and application level alerting
- kube-state-metrics
- node_exporter
- prometheus-adapter

4.5以前では、このCluster Monitoringは名前の通り「クラスタのためのモニタリング」機能の提供であり、OpenShiftの上でアプリケーションを動かすユーザ側の監視はスコープ外となっていました。
4.6にて、ユーザ定義プロジェクトの監視機能がついたことで、<u>ユーザ側の監視もいくぶんかできるようになった</u>というわけです。（[リリースノート](https://access.redhat.com/documentation/ja-jp/openshift_container_platform/4.6/html/release_notes/ocp-4-6-new-features-and-enhancements#ocp-4-6-monitoring)はこちら）

OpenShiftを触っている人は、Cluster Monitoringでもユーザ定義のプロジェクトの監視できるのでは！？と思う方もいるかなと思いますので現時点の状況を説明します。
従来のCluster Monitoringでも、たしかにユーザが作ったプロジェクト内のPodのメトリクスなどを確認することはできます。しかし、いくつかの課題がありました。

ひとつめは、Cluster Monitoringに搭載のGrafanaには権限分離する機能がなく、Cluster MonitoringのGrafanaにアクセスできる人は、**すべてのNamespace**の状況が見えてしまいます。
ひとつのシステムのためだけにOpenShiftを利用していれば問題ないかもしれませんが、マルチテナントとして利用する場合は不適切です。

ふたつめは、カスタマイズができないということです。OpenShiftのプリセットの設定が入っており、こちらを編集してカスタマイズすることができないということです。そのため、ユーザがデプロイしたアプリケーションの監視設定・アラート設定を追加することはできません。

という背景があり、この新機能であるユーザ定義プロジェクトの監視に注目していたというわけです！
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
デフォルトでは無効化されているため、有効化します。有効化の公式ドキュメントの手順は[こちら](https://access.redhat.com/documentation/ja-jp/openshift_container_platform/4.7/html/monitoring/enabling-monitoring-for-user-defined-projects#enabling-monitoring-for-user-defined-projects_enabling-monitoring-for-user-defined-projects)です。
ちなみに、こちらの有効化作業は**クラスタ管理者の作業**です。cluster-admin権限がないとできないそうさで、ユーザはこの作業について気にする必要はないです。

また、このユーザ定義プロジェクトの監視もCluster Monitoring Operatorの拡張機能として備わっているものになります。

公式ドキュメントの手順にしたがって行うのですが、デフォルトの設定のままだとしょっぱなからつまづきます。`cluster-monitoring-config` というConfigMapはデフォルトで存在しないため、ない人は作成する必要があります。

```
$ oc -n openshift-monitoring edit configmap cluster-monitoring-config
Error from server (NotFound): configmaps "cluster-monitoring-config" not found
```

気を取り直して設定を追加します。

```
$  oc -n openshift-monitoring create configmap cluster-monitoring-config
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
具体例でいうと、ユーザが監視設定を追加するためには `ServiceMonitor` といったリソースの作成が必要です。OpenShiftでは、いくつかのRoleを用意しているので、適切なものをユーザに付与しましょう。詳しくはこちらの[ドキュメント](https://access.redhat.com/documentation/ja-jp/openshift_container_platform/4.7/html/monitoring/granting-users-permission-to-monitor-user-defined-projects_enabling-monitoring-for-user-defined-projects#granting-user-permissions-using-the-cli_enabling-monitoring-for-user-defined-projects)を参照ください。
監視設定もユーザ側で操作することが多いかと思うので、`monitoring-edit`の利用頻度が高そうですね。

本ブログでは`user1`をユーザ（開発サイド）とみなして権限付与をしてみます。
`my-app`は、user1が利用しているnamespace名です。

```
$ oc policy add-role-to-user monitoring-edit user1 -n my-app
clusterrole.rbac.authorization.k8s.io/monitoring-edit added: "user1"
```

### Prometheus Operatorとの関係
さきにお伝えしておくと、これからでてくる`ServiceMonitor`や`PrometheusRule`といったリソースは[Prometheus Operator](https://github.com/prometheus-operator/prometheus-operator)のカスタムリソースです。
Prometheus Operatorであることをあまり意識させない作りにはなっていますが、ユーザ側はPrometheus Operatorを一度さわっておくといいでしょう。

本記事では、Prometheus Operatorについては解説しませんが、別記事でまた紹介していきたいと思います。

### アプリケーションのデプロイ
ここからは**ユーザ側の作業**になります。
ユーザは任意のアプリケーションをデプロイしますが、そのアプリケーションはPrometheus形式のメトリクスを出力できる必要があります。
Prometheusのメトリクスを出力する方法にPrometheus exporterを用いることができます。

Prometheus exporterとは、簡易なHTTPサーバで、HTTPのリクエストがきたときにPrometheus形式のメトリクスを出力するツールです。オープンソースで、さまざまな種類のexporterがすでに開発されています。Kubernetesの世界で言えば、ノードのメトリクスを監視するために[node exporter](https://github.com/prometheus/node_exporter)はよく使われます。実際、OpenShift内でも利用されています。その他、[Nginx exporter](https://github.com/nginxinc/nginx-prometheus-exporter)や[JMX exporter](https://github.com/prometheus/jmx_exporter)などさまざまです。

![prometheus-exporter](/image/prometheus-exporter.png)

本検証では、Nginx exporterを搭載したNginxを使って挙動を確認してみます。
つぎのマニフェスト（`nginx.yaml`）を用います。コメントをいれました。

```yaml
---
# NginxのDeployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-nginx
spec:
  replicas: 1
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

```
% oc apply -f nginx.yaml
deployment.apps/test-nginx created
service/nginx-service created
service/nginx-exporter-service created
configmap/nginx-conf created

% oc get pod,service,configmap
NAME                              READY   STATUS    RESTARTS   AGE
pod/test-nginx-6c46668b79-r4wzn   2/2     Running   0          8s

NAME                             TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
service/nginx-exporter-service   ClusterIP   172.30.255.65   <none>        9113/TCP   7s
service/nginx-service            ClusterIP   172.30.151.21   <none>        8080/TCP   7s

NAME                   DATA   AGE
configmap/nginx-conf   1      6s
```

```
% oc run debug -it --image=fedora:33 -- /bin/bash
If you don't see a command prompt, try pressing enter.
bash-5.0$
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

```
% oc apply -f servicemonitor.yaml
servicemonitor.monitoring.coreos.com/nginx-monitor created

mosuke5@MacBook-Pro work % oc get servicemonitor
NAME            AGE
nginx-monitor   9s
```