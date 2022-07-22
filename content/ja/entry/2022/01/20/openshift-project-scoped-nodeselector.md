+++
categories = ["OpenShift"]
date = "2022-01-20T15:07:28+09:00"
description = "OpenShiftで、特定のプロジェクトのみで利用させたいノードがあるときに使えそうな機能「プロジェクトスコープのノードセレクター」について挙動確認をしました。"
draft = false
image = ""
tags = ["Tech"]
title = "OpenShift、プロジェクトスコープのノードセレクターの挙動確認"
author = "mosuke5"
archive = ["2022"]
+++

あけましておめでとうございます。もーすけです。  
今年もよろしくおねがいします。  

OpenShiftのプロジェクトスコープのノードセレクターに関する雑多なメモです。
<!--more-->

## やりたいこと
特定のプロジェクト（namespace）のみで利用できるノードを作りたい。  
具体的なユースケースとしては、次のようなものです。

1. GPUなどの特殊なハードウェアをWorkerノードとして登録しているが、特定のプロジェクトのみで利用させたい。
1. ネットワーク的に離れたエリアやセキュリティレベルの高いエリアにWorkerノードを設置し、特定のプロジェクトのみで利用させたい。

こちらを実現させるためのアプローチはいろいろありますが、OpenShiftには「プロジェクトスコープのノードセレクター」という機能があり、これがどのように動作し、上のユースケースに対して活用できるのかを確認しようと思いました。

<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://access.redhat.com/documentation/ja-jp/openshift_container_platform/4.9/html/nodes/nodes-scheduler-node-selectors-project_nodes-scheduler-node-selectors" target="_blank">
      <img class="belg-site-image" src="https://access.redhat.com/webassets/avalon/g/shadowman-200.png" />
    </a>
  </div>
  <div class="belg-right col-md-10">
  <div class="belg-title">
      <a href="https://access.redhat.com/documentation/ja-jp/openshift_container_platform/4.9/html/nodes/nodes-scheduler-node-selectors-project_nodes-scheduler-node-selectors" target="_blank">3.8.4. プロジェクトスコープのノードセレクターの作成 OpenShift Container Platform 4.9 | Red Hat Customer Portal</a>
    </div>
    <div class="belg-description">The Red Hat Customer Portal delivers the knowledge, expertise, and guidance available through your Red Hat subscription.</div>
    <div class="belg-site">
      <img src="https://access.redhat.com/webassets/avalon/g/favicon.ico" class="belg-site-icon">
      <span class="belg-site-name">Red Hat Customer Portal</span>
    </div>
  </div>
</div>

イメージ図としては下記のようなものです。

![overview](/image/openshift-project-scoped-nodeselector-overview.png)

## 確認した環境
検証した環境はOpenShift 4.8です。

```
% oc version
Client Version: 4.9.0-202109302317.p0.git.96e95ce.assembly.stream-96e95ce
Server Version: 4.8.26
Kubernetes Version: v1.21.6+bb8d50a
```

## 事前準備
### Workerノード
事前準備として、Workerノードを4台準備しました。2台は通常用途のノードを想定し、もう2台は特定プロジェクトのみで利用したい特殊なノードという前提です。通常ノードには `type=normal` ラベルを、特殊ノードには `type=special` ラベルを付与しました。

```
% oc get node -l node-role.kubernetes.io/worker=
NAME                                              STATUS   ROLES    AGE   VERSION
ip-10-0-161-140.ap-southeast-1.compute.internal   Ready    worker   20m   v1.21.6+bb8d50a
ip-10-0-191-34.ap-southeast-1.compute.internal    Ready    worker   19m   v1.21.6+bb8d50a
ip-10-0-201-112.ap-southeast-1.compute.internal   Ready    worker   25m   v1.21.6+bb8d50a
ip-10-0-223-185.ap-southeast-1.compute.internal   Ready    worker   25m   v1.21.6+bb8d50a

% oc get node -l type=normal
NAME                                              STATUS   ROLES    AGE   VERSION
ip-10-0-161-140.ap-southeast-1.compute.internal   Ready    worker   20m   v1.21.6+bb8d50a
ip-10-0-191-34.ap-southeast-1.compute.internal    Ready    worker   19m   v1.21.6+bb8d50a

% oc get node -l type=special
NAME                                              STATUS   ROLES    AGE   VERSION
ip-10-0-201-112.ap-southeast-1.compute.internal   Ready    worker   25m   v1.21.6+bb8d50a
ip-10-0-223-185.ap-southeast-1.compute.internal   Ready    worker   26m   v1.21.6+bb8d50a
```

### プロジェクト（namespace）
プロジェクトは `my-normal-pj` と `my-special-pj` の2つを用意し、`my-special-pj` については、`openshift.io/node-selector: type=special` を付与しました。

このブログ内では、`my-normal-pj`を「通常プロジェクト」、 `my-special-pj`を「特殊プロジェクト」と日本語では書くことにします。

プロジェクトへの設定については、ドキュメントのとおりです。

```
% oc projects | grep my-
    my-normal-pj
  * my-special-pj

% oc get ns my-special-pj -o yaml
apiVersion: v1
kind: Namespace
metadata:
  annotations:
    openshift.io/description: ""
    openshift.io/display-name: ""
    openshift.io/node-selector: type=special   ## これです！
    openshift.io/requester: opentlc-mgr
    openshift.io/sa.scc.mcs: s0:c25,c15
    openshift.io/sa.scc.supplemental-groups: 1000630000/10000
    openshift.io/sa.scc.uid-range: 1000630000/10000
  creationTimestamp: "2022-01-20T15:13:23Z"
  labels:
    kubernetes.io/metadata.name: my-special-pj
  name: my-special-pj
  resourceVersion: "179340"
  uid: 8f8674b6-fe72-4b7d-839b-825e5595d322
spec:
  finalizers:
  - kubernetes
status:
  phase: Active
```

## 挙動確認
### 特殊プロジェクトへのPodデプロイ
特殊プロジェクト内にPodを起動します。  
Podがどこのノードにスケジューリングされるか見てみます。

特殊ノードの名前はこのふたつです。
- `ip-10-0-201-112.ap-southeast-1.compute.internal`
- `ip-10-0-223-185.ap-southeast-1.compute.internal`


デプロイしたPodはどうやら、期待通りに特殊ノード上で動いていそうです。

```
% oc create deployment nginx --image=nginxinc/nginx-unprivileged:latest --replicas=3
deployment.apps/nginx created

% oc get pod -o wide
NAME                     READY   STATUS    RESTARTS   AGE   IP            NODE                                              NOMINATED NODE   READINESS GATES
nginx-79979db8cb-2q585   1/1     Running   0          18s   10.129.2.16   ip-10-0-223-185.ap-southeast-1.compute.internal   <none>           <none>
nginx-79979db8cb-9xblb   1/1     Running   0          18s   10.130.2.25   ip-10-0-201-112.ap-southeast-1.compute.internal   <none>           <none>
nginx-79979db8cb-hc8mz   1/1     Running   0          18s   10.130.2.24   ip-10-0-201-112.ap-southeast-1.compute.internal   <none>           <none>
```

PodのNodeSelectorを確認すると、`Node-Selectors: type=special` が付与されています。

```
% oc describe pod nginx-79979db8cb-2q585
Name:         nginx-79979db8cb-2q585
Namespace:    my-special-pj
Priority:     0
Node:         ip-10-0-223-185.ap-southeast-1.compute.internal/10.0.223.185
Start Time:   Fri, 21 Jan 2022 16:59:20 +0900
...
Node-Selectors:              type=special
Tolerations:                 node.kubernetes.io/memory-pressure:NoSchedule op=Exists
                             node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
...
```

ちなみにDeploymentの設定をみても、nodeSelectorの設定はないため、Podを生成するタイミングで、nodeSelectorを付与していると考えられます。また、利用されるスケジューラーもデフォルトのものが利用されています。

```
% oc get deploy nginx -o yaml | grep nodeSelector
<結果なし>

% oc get pod nginx-79979db8cb-2q585 -o yaml | grep schedulerName
  schedulerName: default-scheduler
```

### 通常ノードを指定して特殊プロジェクトにPodをデプロイ
特殊プロジェクト内で、通常ノードを意図的に設定した場合はどうでしょう。

```yaml
## nginx-on-noraml-node.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: nginx-on-normal-node
  name: nginx-on-normal-node
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx-on-normal-node
  template:
    metadata:
      labels:
        app: nginx-on-normal-node
    spec:
      containers:
        - image: nginxinc/nginx-unprivileged:latest
          name: nginx-on-normal-node
      nodeSelector:
        type: normal
```

nodeSelectorで、`type: normal`を意図的に選択した場合、Podの生成に失敗しました。
Podに、NodeSelectorを付与しようとしたタイミングで、競合してしまいエラーと見受けられます。

```
% oc apply -f nginx-on-noraml-node.yaml
% oc get deploy
NAME                   READY   UP-TO-DATE   AVAILABLE   AGE
nginx                  3/3     3            3           34m
nginx-on-normal-node   0/1     0            0           3s

% oc get replicaset
NAME                              DESIRED   CURRENT   READY   AGE
nginx-5998485d44                  3         3         3       34m
nginx-on-normal-node-7b6b95cd8f   1         0         0       17s

% oc describe replicaset nginx-on-normal-node-7b6b95cd8f
...
Events:
  Type     Reason        Age                From                   Message
  ----     ------        ----               ----                   -------
  Warning  FailedCreate  7s (x13 over 27s)  replicaset-controller  Error creating: pods is forbidden: pod node label selector conflicts with its project node label selector
```

### 通常プロジェクトにPodをデプロイ
通常プロジェクトにPodをデプロイしたときに、特殊ノードへPodはスケジューリングされるんでしょうか？
やってみるとわかりますが、特殊ノードへもPodが展開されます。

```
% oc project my-normal-project
% oc create deployment nginx --image=nginxinc/nginx-unprivileged:latest --replicas=5
% oc get pod -o wide
NAME                     READY   STATUS    RESTARTS   AGE    IP            NODE                                              NOMINATED NODE   READINESS GATES
nginx-5998485d44-6tkj8   1/1     Running   0          124m   10.131.2.14   ip-10-0-161-140.ap-southeast-1.compute.internal   <none>           <none>
nginx-5998485d44-6vg6c   1/1     Running   0          124m   10.130.2.12   ip-10-0-201-112.ap-southeast-1.compute.internal   <none>           <none>
nginx-5998485d44-b85p9   1/1     Running   0          126m   10.131.2.6    ip-10-0-161-140.ap-southeast-1.compute.internal   <none>           <none>
nginx-5998485d44-czxwc   1/1     Running   0          126m   10.128.4.6    ip-10-0-191-34.ap-southeast-1.compute.internal    <none>           <none>
nginx-5998485d44-fkqjn   1/1     Running   0          124m   10.129.2.14   ip-10-0-223-185.ap-southeast-1.compute.internal   <none>           <none>
```

### 動きとしての結論
上の挙動確認でみてきたように、プロジェクトスコープのノードセレクターという機能自体は非常にシンプルなものでした。
`openshift.io/node-selector`のアノテーションがついたプロジェクトに対して、Pod作成時にnodeSelectorの設定を付与するもの、というのがざっくりとしたサマリーになるかなと思います。

![summary](/image/openshift-project-scoped-nodeselector-summary.png)

## 通常プロジェクトからの特殊ノードへのデプロイを防ぎたい
機能としては上で書いたとおりなのですが、通常プロジェクトから特殊ノードへのデプロイを防ぎたい場合にはどんなアイディアがあるでしょうか？

ぱっと思いつく案としては、taint/tolerationです。  
特殊ノード側にtaintをつければ、意図的にtolerationを付与しない限りは特殊ノードへのデプロイは防げます。

しかし、taint/tolerationには、認証認可を持たいないため、tolerationを付与さえすれば特殊ノードへのデプロイが可能です。
わたしの知る限りRBAC等でもここまでは制御できないはずです。
もし、通常プロジェクト側から特殊ノードの利用を禁止したいとなると別のアプローチが必要になります。
Admission Webhookを利用して、特定のユーザやnamespace以外からのスケジュールを禁止するなどの対策が考えられるかなと思います。