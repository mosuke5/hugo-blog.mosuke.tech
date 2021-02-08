+++
categories = ["Kubernetes"]
date = "2021-02-08T17:04:05+09:00"
description = ""
draft = true
image = ""
tags = ["Tech"]
title = "jaeger testing"
author = "mosuke5"
archive = ["2021"]
+++

もーすけです。  
過去にDatadogでAPMを少し検証したり、トレーニングの中でJaegerを触ったりしましたが、正直ちゃんとわかっていなかったので、改めてJaegerというか分散トレーシングについて検証してみたいと思います。

今回はKubernetes上にJaegerを構築するので、[Jaeger Operatorをインストール](https://www.jaegertracing.io/docs/1.21/operator/)して利用します。
今回はOpenShiftにて検証していますが、他のKubernetesディストリビューションでも同じように利用可能です。`oc` は `kubectl` と置き換えて読んでください。
検証環境は下記のとおりです。

- OpenShift: 4.4
- Jaeger: 1.17
<!--more-->

## AllInOne deployment
まずは AllInOne というデプロイメントでJaegerのとっかかりを掴みます。
名前の通りなのですが、1つのPodのなかにJaegerが必要とするコンポーネントを全部詰め込んだものです。
データはインメモリに保存するので、揮発性であり永続性はありません。
完全にテスト用でもちいるデプロイメント方式です。

以下のJaeger CRでデプロイしてみます。  
`.spec`は何も記載していないので、すべてデフォルト値で、AllInOneでインストールします。

```yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger-all-in-one-inmemory
  namespace: default
```

生成されたものを確認してみます。
PodはAllInOneということだけあってひとつです。全部入り。

```
% oc get pod
NAME                                         READY   STATUS      RESTARTS   AGE
jaeger-all-in-one-inmemory-5b8dd55fc-lv4kh   2/2     Running     0          172m
```

Serviceは、大きくagent, collector, queryと作成されています。  
AllInOneは検証用に特化しているので、agentも含めています。アプリケーションサイドでclientだけ用意できればすぐに利用できるようになっています。後述するproductionのデプロイメント方式だとagentは作成されないので注目してみていきましょう。
それぞれがどんな役割を担っているかは、Jaegerのアーキテクチャ図と照らし合わせてみてみましょう。

```
% oc get service
NAME                                            TYPE           CLUSTER-IP       EXTERNAL-IP                            PORT(S)                                  AGE
jaeger-all-in-one-inmemory-agent                ClusterIP      None             <none>                                 5775/UDP,5778/TCP,6831/UDP,6832/UDP      172m
jaeger-all-in-one-inmemory-collector            ClusterIP      172.30.81.141    <none>                                 9411/TCP,14250/TCP,14267/TCP,14268/TCP   172m
jaeger-all-in-one-inmemory-collector-headless   ClusterIP      None             <none>                                 9411/TCP,14250/TCP,14267/TCP,14268/TCP   172m
jaeger-all-in-one-inmemory-query                ClusterIP      172.30.187.60    <none>                                 443/TCP                                  172m
```

Jaegerの全体像  
![jaeger-architecture](/image/jaeger-architecture.png)

JaegerのUIにアクセスしてみます。OpenShiftではない環境の方はIngressなどからアクセスしてください。jaeger-queryのサービスにアクセスできればUI画面にたどり着けます。

```
oc get route -n default
NAME                         HOST/PORT                                                                         PATH   SERVICES                           PORT    TERMINATION   WILDCARD
jaeger-all-in-one-inmemory   jaeger-all-in-one-inmemory-default.apps.my-k8s-cluster.com          jaeger-all-in-one-inmemory-query   <all>   reencrypt     None
```

![jaeger-query](/image/jaeger-query.png)

### Production deployment
AllInOneでは、とにかく簡単にJaegerを検証できることがわかりました。
実際の運用を見据えて、production用のデプロイメントを確認してみます。
まず、大きな違いとしては、データストアです。AllInOneでは、インメモリに保存していましたが、当然永続化、可用性の面から外出しされ、永続ボリュームを持ちます。
Jaegerでは、DBにCassandraかElasticSearchをサポートしています。OpenShift環境では、ElasticSearchがサポートされています。
その他の違いとしては、コンポーネントが分離されている点です。collector, query, databaseとPod毎に分離されています。

Production用のデプロイをするために、はじめに[ElasticSearch Operator](https://operatorhub.io/operator/elastic-cloud-eck)をインストールします。
バックエンドのデータストアにElasticSearchを利用しますが、Jaeger OperatorがJaegerを構築する際にElasticSearch Operatorを利用するためです。

```yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger-production
  namespace:
spec:
  strategy: production
  ingress:
    security: oauth-proxy
  storage:
    type: elasticsearch
    elasticsearch:
      nodeCount: 3
      redundancyPolicy: SingleRedundancy
      storage: 
        storageClassName: gp2
        size: 50Gi
    esIndexCleaner:
      enabled: true
      numberOfDays: 7
      schedule: 55 23 * * *
    esRollover:
      schedule: '*/30 * * * *'
```

```
% oc get pod
NAME                                                              READY   STATUS    RESTARTS   AGE
elasticsearch-cdm-jaegerproductionjaegerproduction-1-75d6cwghmg   2/2     Running   0          9m34s
elasticsearch-cdm-jaegerproductionjaegerproduction-2-78958d46ml   2/2     Running   0          9m30s
elasticsearch-cdm-jaegerproductionjaegerproduction-3-5fb4dr9k4l   2/2     Running   0          9m27s
jaeger-production-collector-cff65bd5d-j4mfh                       1/1     Running   0          7m36s
jaeger-production-query-5dcbb9b79f-kzqkb                          3/3     Running   0          7m36s
```

```
% oc get service
NAME                                   TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)                                  AGE
elasticsearch                          ClusterIP   172.30.141.84    <none>        9200/TCP                                 10m
elasticsearch-cluster                  ClusterIP   172.30.251.197   <none>        9300/TCP                                 10m
elasticsearch-metrics                  ClusterIP   172.30.221.210   <none>        60000/TCP                                10m
jaeger-production-collector            ClusterIP   172.30.196.153   <none>        9411/TCP,14250/TCP,14267/TCP,14268/TCP   8m2s
jaeger-production-collector-headless   ClusterIP   None             <none>        9411/TCP,14250/TCP,14267/TCP,14268/TCP   8m2s
jaeger-production-query                ClusterIP   172.30.209.29    <none>        443/TCP                                  8m2s
```

## sidecar inject

## hotrod
JaegerのインストールはAllInOneを用いてテスト用であれば、正直なにも考える必要なくできます。
トレーシングがどのようなものか理解するには、なにはともあれ確認してみないとですよね。
HotRodというちょうどいいサンプルがあるので取っ掛かりとしてはオススメです。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  creationTimestamp: null
  labels:
    app: hotrod
  name: hotrod
spec:
  replicas: 1
  selector:
    matchLabels:
      app: hotrod
  strategy: {}
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: hotrod
    spec:
      containers:
      - image: jaegertracing/example-hotrod:latest
        name: example-hotrod
        env:
          - name: JAEGER_AGENT_HOST
            value: "jaeger-all-in-one-inmemory-agent"
          - name: JAEGER_AGENT_PORT
            value: "6831"
        ports:
          - containerPort: 8080
        resources: {}
```

