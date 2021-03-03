+++
categories = ["Kubernetes"]
date = "2021-03-03T11:40:54+09:00"
description = "RedisをKubernetesで利用する際のポイントをまとめました。またReidisをHAとして利用する場合に有力候補となるHelm chartについて解説します。"
draft = false
image = ""
tags = ["Tech"]
title = "Redis on Kubernetesの検討ポイントとredis-ha Helm chart"
author = "mosuke5"
archive = ["2021"]
+++

もーすけです。最近は、お金の勉強ばかりしてます。  
住宅ローンをきっかけに、いままでやってきた株や投資信託のポートフォリオを見直して、確定申告やら、税金やら。。これまた学びがいのあるジャンルで楽しくて勉強しています。

今回は、インメモリDBである[Redis](https://redis.io/)をKubernetesにデプロイ・運用するための方針や方法にについてまとめます。  
いまとなってはRedisを検討することはめずらしくなくなりましたよね。セッションやキャッシュの保管先、ランキングデータの管理などさまざまなところで利用されているかと思います。そんなRedisをKubernetesで使う場合に考えるポイントを簡単に説明します。
<!--more-->

## デプロイパターン
### シングル構成
- Redisをシングル構成として利用するパターン（イメージ図参照）。
- シングル構成はやりたくないな、、と思いだが、Kubernetes環境であることを考慮すると許容される可能性もあるので一応検討しておくといい。
- 具体的には、LivenessProbeによるヘルスチェック、ノード障害やプロセスが落ちた場合もDeploymentによってPodを別ノードに移動させることですばやい復旧が見込める。Redisのプロセス自身も軽いので起動が早い。読み込み、書き込みともに負荷分散が必要ない場合、充分に検討可能。
- シングル構成の採用可否は、Redisの用途やパフォーマンスにほぼ関連する。
  - Redisのパフォーマンスが、システムにどの程度影響をあたえるか？
  - キャッシュとしてのみ使っているのか？消えても問題ないのか？
  - 障害発生でオフラインの際に処理を止めないか？
  - など
- ある程度のデータの永続化が必要な場合は、特定の時点のスナップショットをRDBファイルとして保存可能なため合わせて検討する。

![redis-single](/image/redis-single.png)

### レプリケーション構成
- 公式ドキュメント: https://redis.io/topics/replication
- Redisが標準的に備える、Primary/Secondaryのレプリケーション。
- Redis自身は、Primaryの障害時のフェイルオーバー機能をもたない。
- Secondaryも読み込みリクエストは受け付けることができるため、Readの負荷分散が可能。書き込みの負荷分散はできない。アプリケーションで利用する場合は、書き込みがボトルネックになるかどうかが重要。
- Kubernetes環境では、Podのヘルスチェックによるオートヒーリング（LivenessProbeによるヘルスチェック）がある程度設定できるため、書き込みの負荷分散が必要ないケースであれば、Replicationの採用も充分に検討可能。
- レプリカ数は、読み込みの負荷次第で決定できる。

![redis-replication](/image/redis-replication.png)

### Sentinel構成
- 公式ドキュメント: https://redis.io/topics/sentinel
- Redis sentinelという、Primary/Secondaryの状態を監視する別プロセスを起動することで、Redis自身が備えていないフェイルオーバー機能をもたせる。
- Sentinelプロセスは3台以上必要
- Kubernetes上で実装する場合、sentinelはKubernetesのServiceの切り替えまで行わないため、その点を実装を検討する必要がある。あるいは、アプリケーション側にフェイルオーバー後の新しいPrimaryのService名を伝える必要がある。
  - 後述するHelmを利用する or 実装を参考にするのが賢そう
- sentinelの実装も書き込みの負荷分散はできない。
- [DandyDeveloper/charts のHelm Chart](https://github.com/DandyDeveloper/charts/tree/master/charts/redis-ha)でデプロイできる。
  - HAProxyによるMasterの検出を含む構成。詳しくは後述。

![redis-sentinel](/image/redis-sentinel.png)

### Cluster構成
- 公式ドキュメント: https://redis.io/topics/cluster-spec
- シャーディングを活用してマルチPrimary構成を実現する方式。マルチPrimary構成のため、ReplicationおよびSentinelの方式と異なり書き込みの分散が可能。唯一の書き込みの分散ができる構成。
- 格納するデータのキーのハッシュによって、書き込まれるパーティションが決定する。
- データの永続性を持たせるために、シャーディングとレプリケーションとを併用する方式をとることがある。その場合、最低6台から構成されることになる。
- Kubernetesで構成する場合、RedisLabsが提供する、Redis Enterprise Operatorの採用が検討できる。

![redis-cluster](/image/redis-cluster.png)

### 構成に興味を持ってしまった人へ
データのレプリケーションやシャーディングなど、分散システムにおけるデータの基礎について興味を持ってしまった人はぜひO'Reillyからでている「[データ指向アプリケーションデザイン](https://amzn.to/3rcWl3o)」という本を手に取るといいと思います。以前に、輪読会したときのブログは以下です。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2021/01/24/designing-data-intensive-applications/" data-iframely-url="//cdn.iframe.ly/Tu7Fr2P"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

## Redis HAのHelm Chartの検証
DandyDeveloper/charts のHelm ChartによるHA構成のRedisを検証したところ、かなりいい感触だったので紹介します。

### バージョン
利用バージョンは4.12.9です。Githubでいうと[このコミット](https://github.com/DandyDeveloper/charts/tree/9575536d1c16558ea97f635090c605f193cba052)のものです。
ちなみにKubernetesは1.17で検証しています。

```
$ cat Chart.yaml | grep version
version: 4.12.9
```

### 設定
`values.yaml`をみていただければわかりますが、かなり多くの設定が可能です。
今回は、このHelmの魅力を紹介するために下記3つの設定を変更してデプロイします。

```yaml
haproxy:
  enabled: true
...
  metrics:
    enabled: true
...
exporter:
  enabled: true
```

### デプロイ
対象のディレクトリを確認して、HelmでRedisをデプロイしてみます。

```
$ ls -l
ls -l
total 152
-rw-r--r--   1 shinyamori  staff    677  3  3 13:36 Chart.yaml
-rw-r--r--   1 shinyamori  staff  52801  3  3 13:36 README.md
drwxr-xr-x   3 shinyamori  staff     96  2  9 22:39 ci
drwxr-xr-x  29 shinyamori  staff    928  3  3 13:36 templates
-rw-r--r--   1 shinyamori  staff  17542  3  3 14:05 values.yaml

$ helm version
version.BuildInfo{Version:"v3.4.2", GitCommit:"23dd3af5e19a02d4f4baa5b2f242645a1a3af629", GitTreeState:"dirty", GoVersion:"go1.15.5"}

$ helm install my-redis .
NAME: my-redis
LAST DEPLOYED: Wed Mar  3 14:05:50 2021
NAMESPACE: redis
STATUS: deployed
REVISION: 1
NOTES:
Redis can be accessed via port 6379   and Sentinel can be accessed via port 26379    on the following DNS name from within your cluster:
my-redis-redis-ha.redis.svc.cluster.local

To connect to your Redis server:
1. Run a Redis pod that you can use as a client:

   kubectl exec -it my-redis-redis-ha-server-0 sh -n redis

2. Connect using the Redis CLI:

  redis-cli -h my-redis-redis-ha.redis.svc.cluster.local
```

デプロイされた内容を確認するために、読者のために全体像をまず図示します。
以下のような構成でデプロイされています。

![redis-ha-overview](/image/redis-ha-overview.png)

```
## ha-proxyがdeploymentで3台構成でデプロイ
$ kubectl get deploy
NAME                        READY   UP-TO-DATE   AVAILABLE   AGE
my-redis-redis-ha-haproxy   3/3     3            3           18m

## redisがstatefulsetで3台構成でデプロイ
$ kubectl get statefulset
NAME                       READY   AGE
my-redis-redis-ha-server   3/3     18m

## ha-proxyとredisで合計6台のPod
## Redisは3つのコンテナを含む（redis本体とsentinel, prometheus exporter）
$ kubectl get pod
NAME                                         READY   STATUS    RESTARTS   AGE
my-redis-redis-ha-haproxy-8467fd9649-2skzr   1/1     Running   0          18m
my-redis-redis-ha-haproxy-8467fd9649-5twtv   1/1     Running   1          18m
my-redis-redis-ha-haproxy-8467fd9649-xpp2p   1/1     Running   0          18m
my-redis-redis-ha-server-0                   3/3     Running   0          17m
my-redis-redis-ha-server-1                   3/3     Running   0          15m
my-redis-redis-ha-server-2                   3/3     Running   0          14m

$ kubectl get service
NAME                           TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)                       AGE
my-redis-redis-ha              ClusterIP   None            <none>        6379/TCP,26379/TCP,9121/TCP   18m
my-redis-redis-ha-announce-0   ClusterIP   172.30.21.68    <none>        6379/TCP,26379/TCP,9121/TCP   18m
my-redis-redis-ha-announce-1   ClusterIP   172.30.23.131   <none>        6379/TCP,26379/TCP,9121/TCP   18m
my-redis-redis-ha-announce-2   ClusterIP   172.30.127.86   <none>        6379/TCP,26379/TCP,9121/TCP   18m
my-redis-redis-ha-haproxy      ClusterIP   172.30.126.45   <none>        6379/TCP,9101/TCP             18m
```

### ha-proxyの役割
この構成におけるha-proxyの役割とはなんでしょうか？
本ブログの前半の「デプロイパターン」のSentinel構成を見直してみてください。
Sentinelは、どのRedisがPrimary(Master)かを判断しフェイルオーバする機能を与えてくれました。一方で、それはRedis内部での話で、Redisの外から見たときにどのRedisがPrimaryかはわかりません。PrimaryのRedisしか書き込みができませんので、Redisを利用するアプリケーションサイドからはPrimaryへ接続する必要があります。
では、アプリケーションサイドにフェイルオーバするごと、Redisの名前を教えるべきでしょうか？まずやめたほうがいいですよね。
そこで活用されるのがha-proxyです。このha-proxyは、redisをバックエンドサーバとして、ヘルスチェックを通してどのRedisがPrimaryか判断してくれています。アプリケーションは、ha-proxyにさえ接続できればあとはha-proxyがPrimaryのRedisまでプロキシしてくれるというわけです。

実際にha-proxyのconfigをみてみるとわかりやすいかもしれません。

```
$ kubectl exec <ha-proxy-pod> -- cat /usr/local/etc/haproxy/haproxy.cfg
...
# Check all redis servers to see if they think they are master
backend bk_redis_master
  mode tcp
  option tcp-check
  tcp-check connect
  tcp-check send PING\r\n
  tcp-check expect string +PONG
  tcp-check send info\ replication\r\n
  tcp-check expect string role:master
  tcp-check send QUIT\r\n
  tcp-check expect string +OK
  use-server R0 if { srv_is_up(R0) } { nbsrv(check_if_redis_is_master_0) ge 2 }
  server R0 my-redis-redis-ha-announce-0:6379 check inter 1s fall 1 rise 1
  use-server R1 if { srv_is_up(R1) } { nbsrv(check_if_redis_is_master_1) ge 2 }
  server R1 my-redis-redis-ha-announce-1:6379 check inter 1s fall 1 rise 1
  use-server R2 if { srv_is_up(R2) } { nbsrv(check_if_redis_is_master_2) ge 2 }
  server R2 my-redis-redis-ha-announce-2:6379 check inter 1s fall 1 rise 1
...
```

### モニタリング
また、Prometheusで監視できるように、Metricsを吐き出すことも可能です。デプロイ時にmetricsやexporterを`enabled: true`にしたのはそのためです。こちらの設定を有効にするとprometheus形式のメトリクスを吐き出せます。これで簡単に監視も設定できますね。

実際にデバッグ用のコンテナをデプロイして、コンテナ内からcurlを用いてmetricsにアクセスしてみます。

```
$ kubectl run debug --image registry.gitlab.com/mosuke5/debug-container:latest -it /bin/bash
container # curl http://my-redis-redis-ha-haproxy:9101/metrics | head
#TYPE haproxy_process_nbthread gauge
haproxy_process_nbthread 8
#HELP haproxy_process_nbproc Configured number of processes.
#TYPE haproxy_process_nbproc gauge
haproxy_process_nbproc 1
#HELP haproxy_process_relative_process_id Relative process id, starting at 1.
#TYPE haproxy_process_relative_process_id gauge
haproxy_process_relative_process_id 1
...

container #
container # curl http://my-redis-redis-ha-announce-0:9121/metrics | head
# TYPE go_gc_duration_seconds summary
go_gc_duration_seconds{quantile="0"} 2.787e-05
go_gc_duration_seconds{quantile="0.25"} 6.3521e-05
go_gc_duration_seconds{quantile="0.5"} 7.13e-05
go_gc_duration_seconds{quantile="0.75"} 9.7421e-05
go_gc_duration_seconds{quantile="1"} 0.000249122
go_gc_duration_seconds_sum 0.008624228
...
```

関連するトピックとして、Kubernetesの監視をZabbixでやりたいよという方に書き紹介しておきます。
<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2020/08/27/zabbix-for-kubernetes/" data-iframely-url="//cdn.iframe.ly/yqygRki"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>