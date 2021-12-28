+++
categories = ["OpenShift"]
date = "2021-12-28T17:24:16+09:00"
description = "OpenShiftのRouterシャーディングを使って用途ごとにアクセス経路を分ける方法を検証した際のメモを残します。"
draft = true
image = ""
tags = ["Tech"]
title = "OpenShift、Routerシャーディングを使った用途ごとにアクセス経路を分ける"
author = "mosuke5"
archive = ["2021"]
+++

こんにちは、もーすけです。  
本日もOpenShift関連のTipsについてアウトプットします。
Ingress Controller(Router)のシャーディング（分割）についてです。
半分は自分の備忘録ではありますが、同じような境遇の方の参考になればと思います。

本ブログでは、OpenShift 4.9 on AWSの環境を用いていますが、オンプレミスなど他の環境でも活用できます。もちろんAWS環境とオンプレミス環境では若干Ingressの実装に差はでますが、大きくは変わらないと思います。

※いろいろまだ書き残したことがあるので随時更新します。
<!--more-->

## どんな時に使うの
まず、Routerのシャーディングとはなにか？から説明します。
OpenShiftでは、クラスタの外部からのアクセスにRouteを使うことができます。OpenShift独自のリソースですが、KubernetesのIngress ControllerをHAProxyで実装したものです。
インストール時にデフォルトで、Ingress Controllerが起動します。

![openshift-ingress](/image/openshift-ingress.png)

このクラスタ外部からアクセスする仕組みを複数作る仕組みがRouterのシャーディングです。  
多くのケースでは、シャーディングする必要は少ないと思いますが、OpenShift内のアプリケーションにアクセスする来る経路が複数ある場合（たとえば社内用・社外用でネットワークが違うやセキュリティレベルによって異なるなど）に利用します。
ひとつのRouterでも、論理的には分けることができるので、シャーディングを利用したい場合は物理的に経路を分けたい場合に使うことが一般的と考えます。

![openshift-ingress-sharding](/image/openshift-ingress-sharding.png)

## 実機検証
### 概要
このブログの検証では次の図のような構成を取ることとします。
一般ユーザ用と管理者用のアプリケーションがクラスタ内で動作しているとします。
管理者用のアプリケーションは、セキュリティレベルが高いため一般ユーザとは物理的にネットワーク経路も動作するノードも分けます。Wokerノードは4台用意しますが、そのうちの2台は管理者用アプリケーションのためのノードとします。

![openshift-ingress-test-overview](/image/openshift-ingress-test-overview.png)

### 専用ノードの準備
ノードの状態を確認します。
Workerノードは4台ですが、IPの末尾が`123`と`130`となっているものが管理者用ノードだと思ってください。

```
$ oc get node -l node-role.kubernetes.io/worker
NAME                                               STATUS   ROLES    AGE    VERSION
ip-192-168-1-222.ap-northeast-1.compute.internal   Ready    worker   5d4h   v1.22.2+5e38c72
ip-192-168-1-239.ap-northeast-1.compute.internal   Ready    worker   5d4h   v1.22.2+5e38c72
ip-192-168-3-123.ap-northeast-1.compute.internal   Ready    worker   5d     v1.22.2+5e38c72
ip-192-168-3-130.ap-northeast-1.compute.internal   Ready    worker   5d     v1.22.2+5e38c72
```

管理者用ノードには、専用のラベル(`mosuke5.com/type=admin`とします)を付与しておきます。
また、一般用のアプリケーションがスケジューリングされないようにTaintsもつけておきます。

```
$ oc get node -l mosuke5.com/type=admin
NAME                                               STATUS   ROLES    AGE   VERSION
ip-192-168-3-123.ap-northeast-1.compute.internal   Ready    worker   5d    v1.22.2+5e38c72
ip-192-168-3-130.ap-northeast-1.compute.internal   Ready    worker   5d    v1.22.2+5e38c72

$ oc describe node ip-192-168-3-123.ap-northeast-1.compute.internal | grep Taints
Taints:             type=admin:NoSchedule
```

### Router(Ingress Controller)の追加
次のマニフェストを使って管理者用のIngress Controllerを追加します。
ポイントはいくつかありますが、ひとつは`nodePlacement`の設定で、管理者用ノードにRouterを配置するようにしています。

また、`namespaceSelector`でこのRouterが処理する対象を選択しています。
この設定では `type=admin`のラベルが付与されたNamespace内のRouteリソースのみをこのRouterに取り込むことを意味しています。

```yaml
# admin-ingress.yaml
apiVersion: operator.openshift.io/v1
kind: IngressController
metadata:
  name: admin
  namespace: openshift-ingress-operator
spec:
  domain: "admin-apps.cluster-domain"
  endpointPublishingStrategy:
    type: "LoadBalancerService"
  nodePlacement:
    nodeSelector:
      matchLabels:
        mosuke5.com/type: "admin"
    tolerations:
      - key: "type"
        operator: "Equal"
        value: "admin"
        effect: "NoSchedule"
  namespaceSelector:
    matchLabels:
      type: admin
```

```
$ oc apply -f admin-ingress.yaml
$ oc get pod -n openshift-ingress
NAME                               READY   STATUS    RESTARTS   AGE
router-default-84ff4f4f49-4bhgs    1/1     Running   0          161m
router-default-84ff4f4f49-9znzf    1/1     Running   0          161m
router-admin-65f4f9799f-jlc59      1/1     Running   0          4h2m
router-admin-65f4f9799f-mc6fj      1/1     Running   0          4h2m

// router-adminが期待するノード上で動いていることを確認
$ oc get pod -n openshift-ingress -o wide
NAME                               READY   STATUS    RESTARTS   AGE    IP            NODE                                               NOMINATED NODE   READINESS GATES
router-default-84ff4f4f49-4bhgs    1/1     Running   0          161m   10.128.2.88   ip-192-168-1-239.ap-northeast-1.compute.internal   <none>           <none>
router-default-84ff4f4f49-9znzf    1/1     Running   0          161m   10.129.2.24   ip-192-168-1-222.ap-northeast-1.compute.internal   <none>           <none>
router-admin-65f4f9799f-jlc59      1/1     Running   0          4h3m   10.129.4.6    ip-192-168-3-130.ap-northeast-1.compute.internal   <none>           <none>
router-admin-65f4f9799f-mc6fj      1/1     Running   0          4h3m   10.130.4.5    ip-192-168-3-123.ap-northeast-1.compute.internal   <none>           <none>
```

### LB、DNS確認
本環境は、AWS上にIPIでインストールしたため、この時点で管理者用のIngress Controller向けにELBが作成されています。また、その`*.admin-apps.cluster-domain`を名前解決すると、作成されたELBのIPを返すようにRoute53に設定が入ります。

オンプレミス環境などで行っている方は、追加したIngress Controller向けにL4 LBを用意すること、およびDNS設定を追加で行うことを忘れずに行ってください。

```
$ oc get service -n openshift-ingress
NAME                       TYPE           CLUSTER-IP       EXTERNAL-IP                              PORT(S)                      AGE
router-default             LoadBalancer   172.30.146.16    xxxxx.ap-northeast-1.elb.amazonaws.com   80:30262/TCP,443:30761/TCP   5d6h
router-internal-default    ClusterIP      172.30.205.210   <none>                                   80/TCP,443/TCP,1936/TCP      5d6h
router-internal-admin      ClusterIP      172.30.58.18     <none>                                   80/TCP,443/TCP,1936/TCP      6h3m
router-admin               LoadBalancer   172.30.195.215   yyyyy.ap-northeast-1.elb.amazonaws.com   80:32226/TCP,443:32305/TCP   6h3m
```

```
$ dig a.admin-apps.cluster-domain

; <<>> DiG 9.10.6 <<>> a.admin-apps.cluster-domain
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 48598
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
;; QUESTION SECTION:
;a.admin-apps.cluster-domain. IN A

;; ANSWER SECTION:
a.admin-apps.cluter-domain. 60 IN	A 54.249.57.126

;; Query time: 109 msec
;; SERVER: 2404:1a8:7f01:b::3#53(2404:1a8:7f01:b::3)
;; WHEN: Tue Dec 28 23:07:24 JST 2021
;; MSG SIZE  rcvd: 85
```

### route公開、しかし2つのIngress Controllerへ
では、さっそく以下のマニフェストを使って管理者用アプリケーションをデプロイしていきましょう。
先に断っておくが、今の状態だと、デフォルトのIngress Controllerと管理者用に追加したIngress Controllerの両方に認識されてしまう。

```yaml
# admin-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: admin-nginx
  name: admin-nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: admin-nginx
  template:
    metadata:
      labels:
        app: admin-nginx
    spec:
      containers:
        - image: nginxinc/nginx-unprivileged:latest
          name: admin-nginx
      tolerations:
        - key: "type"
          operator: "Equal"
          value: "admin"
          effect: "NoSchedule"
---
kind: Service
apiVersion: v1
metadata:
  name: admin-nginx
spec:
  ports:
  - name: web
    port: 8080
    targetPort: 8080
  selector:
    app: admin-nginx
---
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: admin-nginx
spec:
  host: admin-nginx-admin.admin-apps.cluster-domain
  port:
    targetPort: web
  to:
    kind: Service
    name: admin-nginx
    weight: 100
  wildcardPolicy: None
```

```
$ oc new-project admin
$ oc apply -f admin-app.yaml
deployment.apps/admin-nginx unchanged
service/admin-nginx unchanged
route.route.openshift.io/admin-nginx created
```

`exposed on router admin`と`exposed on router default`とふたつのRouterで公開されていることがわかる。
この結果は仕組みがわかれば当然であることがすぐに理解できる。それはデフォルトのIngress Controllerは、すべてのNamespaceのすべてのRouteの設定を反映するからです。
もし管理者用のIngress Controllerにのみ反映させたい場合は、デフォルトのIngress Controller側になんらかの除外設定を入れる必要があります。

```
$ oc describe route admin-nginx
Name:			admin-nginx
Namespace:		admin
Created:		18 seconds ago
Labels:			<none>
Annotations:		kubectl.kubernetes.io/last-applied-configuration={"apiVersion":"route.openshift.io/v1","kind":"Route","metadata":{"annotations":{},"name":"admin-nginx","namespace":"admin"},"spec":{"host":"admin-nginx-admin.admin-apps.cluster-domain","port":{"targetPort":"web"},"to":{"kind":"Service","name":"admin-nginx","weight":100},"wildcardPolicy":"None"}}

Requested Host:		admin-nginx-admin.admin-apps.cluster-domain
			   exposed on router admin (host router-admin.admin-apps.cluster-domain) 18 seconds ago
			   exposed on router default (host router-default.apps.cluster-domain) 18 seconds ago
Path:			<none>
TLS Termination:	<none>
Insecure Policy:	<none>
Endpoint Port:		web

Service:	admin-nginx
Weight:		100 (100%)
Endpoints:	10.129.4.4:8080

$ oc get route admin-nginx -o yaml
...
status:
  ingress:
  - conditions:
    - lastTransitionTime: "2021-12-28T14:14:52Z"
      status: "True"
      type: Admitted
    host: admin-nginx-admin.admin-apps.cluster-domain
    routerCanonicalHostname: router-admin.admin-apps.cluster-domain
    routerName: admin
    wildcardPolicy: None
  - conditions:
    - lastTransitionTime: "2021-12-28T14:14:52Z"
      status: "True"
      type: Admitted
    host: admin-nginx-admin.admin-apps.cluster-domain
    routerCanonicalHostname: router-default.apps.cluster-domain
    routerName: default
    wildcardPolicy: None
```

### HAproxyの設定
ちなみに、Routeを作成すると、Routerはそれに合わせてHAProxyの設定ファイルを更新します。
このブログの内容には直接関係ないですが、HAProxyからみたバックエンドにはKubernetesのServiceではなく、PodのIPが直接書き込まれます。つまり、HAProxyからPodへは直接にトラフィックがいくということです。

`openshift-ingress`内のRouterの`haproxy.config`をのぞいてみましょう。
バックエンドの設定に`10.129.4.4:8080`が記述されていますが、これはPodの直接のIPアドレスです。

```
$ oc exec -n openshift-ingress router-admin-65f4f9799f-jlc59 -- cat haproxy.config
...
backend be_http:admin:admin-nginx
  mode http
  option redispatch
  option forwardfor
  balance leastconn

  timeout check 5000ms
  http-request add-header X-Forwarded-Host %[req.hdr(host)]
  http-request add-header X-Forwarded-Port %[dst_port]
  http-request add-header X-Forwarded-Proto http if !{ ssl_fc }
  http-request add-header X-Forwarded-Proto https if { ssl_fc }
  http-request add-header X-Forwarded-Proto-Version h2 if { ssl_fc_alpn -i h2 }
  http-request add-header Forwarded for=%[src];host=%[req.hdr(host)];proto=%[req.hdr(X-Forwarded-Proto)]
  cookie 5bb6622d94a0f30d5d8ae316516d8cfb insert indirect nocache httponly
  server pod:admin-nginx-8545c9d85-7j2gs:admin-nginx:web:10.129.4.4:8080 10.129.4.4:8080 cookie 756f8f916ccfb16e2b7524d2fa0e7ee7 weight 256
```

### デフォルトのIngress Controllerに除外設定を
Routeを作成すると、デフォルトのIngress Controllerと新しく追加した管理者用のIngress Controllerの両方に設定が入ってしまっていました。
この状況を回避するためには、デフォルトのIngress Controllerに特定条件の除外設定を入れるといいでしょう。

たとえば、namespaceラベルで`type=admin`を含まないもののみをデフォルトのIngress Controllerで処理するようにするなどです。`namespaceSelector`の`matchExpressions`でいくらかコントロール可能です。

```
$ oc edit ingresscontroller default -n openshift-ingress-operator
...
spec:
  clientTLS:
    clientCA:
      name: ""
    clientCertificatePolicy: ""
  httpEmptyRequestsPolicy: Respond
  httpErrorCodePages:
    name: ""
  replicas: 2
  tuningOptions: {}
  unsupportedConfigOverrides: null
  # これを追加
  namespaceSelector:
    matchExpressions:
    - key: type
      operator: NotIn
      values:
      - admin
```
