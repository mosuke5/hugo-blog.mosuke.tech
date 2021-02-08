+++
categories = ["Kubernetes", "アプリケーション開発"]
date = "2021-02-08T17:04:05+09:00"
description = "jaegerを使った分散トレーシングをKubernetes上で検証していきます。Jaeger Operatorの利用、本番環境を見据えた設定、サイドカーでのagent注入あたりやります。"
draft = false
image = ""
tags = ["Tech"]
title = "Jaegerを使った分散トレーシングの検証 on Kubernetes (1)"
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

この検証では以下のJaeger CRを使ってみました。
ElasticSearchは3台でクラスタリング、各ElasticSearchに50GBのボリュームをつけて構築です。
その他、ElasticSearchのデータ削除の設定などを付与。

```yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger-production
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

Podをみてみると、AllInOneのときと違ってコンポーネント毎にPodがあることを確認できます。
また、上にもすこし書きましたがJager agentは含まれていません。Jaeger agentの準備は別で書きます。

```
% oc get pod
NAME                                                              READY   STATUS    RESTARTS   AGE
elasticsearch-cdm-jaegerproductionjaegerproduction-1-75d6cwghmg   2/2     Running   0          9m34s
elasticsearch-cdm-jaegerproductionjaegerproduction-2-78958d46ml   2/2     Running   0          9m30s
elasticsearch-cdm-jaegerproductionjaegerproduction-3-5fb4dr9k4l   2/2     Running   0          9m27s
jaeger-production-collector-cff65bd5d-j4mfh                       1/1     Running   0          7m36s
jaeger-production-query-5dcbb9b79f-kzqkb                          3/3     Running   0          7m36s
```

参考程度ですが、PVもできていると。
```
% oc get pvc
NAME                                                                 STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
elasticsearch-elasticsearch-cdm-jaegerproductionjaegerproduction-1   Bound    pvc-b2e0b560-3b29-42a3-93a4-59adc6dca872   50Gi       RWO            gp2            15m
elasticsearch-elasticsearch-cdm-jaegerproductionjaegerproduction-2   Bound    pvc-5b59197d-59b7-469a-800c-ecf7e9f70097   50Gi       RWO            gp2            15m
elasticsearch-elasticsearch-cdm-jaegerproductionjaegerproduction-3   Bound    pvc-a59e50fb-4eb4-4c34-9320-4fbe37c034a9   50Gi       RWO            gp2            15m
```

Serviceも同様です。jaeger agentのserviceは同様にありません。

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

## Jaeger agentのサイドカーとしての起動
Production deploymentで、Jaeger agentが含まれていないことを書きました。
実運用では、スケーリングなどの観点からアプリケーションPodのサイドカーとしてJaeger agentを起動することが望ましいです。Jaeger Operatorには、サイドカーでJager agentを埋め込む仕組み（[Auto-injecting Jaeger Agent Sidecars](https://www.jaegertracing.io/docs/1.21/operator/#auto-injecting-jaeger-agent-sidecars)）を持ちます。

試しにやってみましょう。NginxのDeploymentに特定のannotationを追加します。
Jaager Operatorは、このannotationを検知して、サイドカーを注入します。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  creationTimestamp: null
  annotations:
    sidecar.jaegertracing.io/inject: "jaeger-production" # このannotationを追加。値はJagerの名前
  labels:
    app: nginx
  name: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  strategy: {}
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: nginx
    spec:
      containers:
      - image: nginxinc/nginx-unprivileged
        name: nginx-unprivileged
        resources: {}
```

Nginx podを確認するとコンテナがふたつ起動していることがわかります。
また、Deploymentも書き換わっています。
あとは、アプリケーション側で、Jaeger angetに向けてデータを出力すればJaeger本体に記録されるわけです。

```
% oc get pod | grep nginx
nginx-557fc655c-zhprq      2/2     Running   0      28m

% oc get deploy nginx -o yaml 
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    deployment.kubernetes.io/revision: "4"
    prometheus.io/port: "14271"
    prometheus.io/scrape: "true"
    sidecar.jaegertracing.io/inject: jaeger-production
  creationTimestamp: "2021-02-08T08:38:21Z"
  generation: 6
  labels:
    app: nginx
    sidecar.jaegertracing.io/injected: jaeger-production
  name: nginx
  namespace: jaeger-production
  resourceVersion: "207651"
  selfLink: /apis/apps/v1/namespaces/jaeger-production/deployments/nginx
  uid: 75c63e00-0396-4d63-a5db-183084e826a7
spec:
  progressDeadlineSeconds: 600
  replicas: 1
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app: nginx
  strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
    type: RollingUpdate
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: nginx
    spec:
      containers:
      - env:
        - name: JAEGER_SERVICE_NAME
          value: nginx.jaeger-production
        - name: JAEGER_PROPAGATION
          value: jaeger,b3
        image: nginxinc/nginx-unprivileged
        imagePullPolicy: Always
        name: nginx-unprivileged
        resources: {}
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
      - args:
        - --jaeger.tags=cluster=undefined,deployment.name=nginx,pod.namespace=jaeger-production,pod.name=${POD_NAME:},host.ip=${HOST_IP:},container.name=nginx-unprivileged
        - --reporter.grpc.host-port=dns:///jaeger-production-collector-headless.jaeger-production.svc:14250
        - --reporter.grpc.tls.ca=/etc/pki/ca-trust/source/service-ca/service-ca.crt
        - --reporter.grpc.tls.enabled=true
        - --reporter.type=grpc
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: metadata.name
        - name: HOST_IP
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: status.hostIP
        image: registry.redhat.io/distributed-tracing/jaeger-agent-rhel8@sha256:ff3f61601ca4f799958f26be0525383339c1fa6ac29e16eec9d2c32dbe59407e
        imagePullPolicy: IfNotPresent
        name: jaeger-agent
        ports:
        - containerPort: 5775
          name: zk-compact-trft
          protocol: UDP
        - containerPort: 5778
          name: config-rest
          protocol: TCP
        - containerPort: 6831
          name: jg-compact-trft
          protocol: UDP
        - containerPort: 6832
          name: jg-binary-trft
          protocol: UDP
        - containerPort: 14271
          name: admin-http
          protocol: TCP
        resources: {}
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
        volumeMounts:
        - mountPath: /etc/pki/ca-trust/extracted/pem
          name: jaeger-production-trusted-ca
          readOnly: true
        - mountPath: /etc/pki/ca-trust/source/service-ca
          name: jaeger-production-service-ca
          readOnly: true
      dnsPolicy: ClusterFirst
      restartPolicy: Always
      schedulerName: default-scheduler
      securityContext: {}
      terminationGracePeriodSeconds: 30
      volumes:
      - configMap:
          defaultMode: 420
          items:
          - key: ca-bundle.crt
            path: tls-ca-bundle.pem
          name: jaeger-production-trusted-ca
        name: jaeger-production-trusted-ca
      - configMap:
          defaultMode: 420
          items:
          - key: service-ca.crt
            path: service-ca.crt
          name: jaeger-production-service-ca
        name: jaeger-production-service-ca
...
```

## サンプルアプリでトレーシング体験
JaegerのインストールはAllInOneを用いてテスト用であれば、正直なにも考える必要なくできます。
トレーシングがどのようなものか理解するには、なにはともあれ確認してみないとですよね。
[Hot R.O.D. - Rides on Demand](https://github.com/jaegertracing/jaeger/tree/master/examples/hotrod)というちょうどいいサンプルがあるので取っ掛かりとしてはオススメです。

こちらのREADMEには、Kubernetesへのデプロイは書かれていませんがコンテナイメージが用意されているので簡単にデプロイできます。以下サンプルです。
せっかくなので、`sidecar.jaegertracing.io/inject: "jaeger-production"`のannotationをつかってJaeger agentを起動します。
`env`の`JAEGER_AGENT_HOST`はこの場合、サイドカーで起動しているコンテナになるので`localhost`でOKです。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  creationTimestamp: null
  labels:
    app: hotrod
  name: hotrod
  annotations:
    sidecar.jaegertracing.io/inject: "jaeger-production"
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
            value: "localhost"
          - name: JAEGER_AGENT_PORT
            value: "6831"
        ports:
          - containerPort: 8080
        resources: {}
```

起動した、Podに対して接続し、アプリケーションを操作すれば、Jaegerにトレーシング情報が保存されていることを確認できました。今回はここまでとして、次回もう少し細かいところを見ていこうと思います。

![jaeger-hotrod](/image/jaeger-hotrod.png)

## 関連情報
<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2019/11/21/datadog-apm/" data-iframely-url="//cdn.iframe.ly/SQYbsuz"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2020/01/22/sockshop/" data-iframely-url="//cdn.iframe.ly/YDI2rVR"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

