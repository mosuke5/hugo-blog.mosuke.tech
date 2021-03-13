+++
categories = ["", ""]
date = "2021-03-11T00:13:19+09:00"
description = ""
draft = true
image = ""
tags = ["Tech"]
title = "Kubernetesのノード障害時のPodの動きについて検証する"
author = "mosuke5"
archive = ["2021"]
+++

こんにちは、もーすけです。  
本日はKubernetesのノード障害が起きたときのPodの挙動について確認します。
いままで、ノード障害が起きたときのPodの挙動、スケジューリングについて誤った認識をしていました。
お恥ずかしい限りなのですが、同じような誤った認識をしているかたに向けて確認したことを解説します。
<!--more-->

## 概要
たとえば、以下のような状況です。Workerノード3台があって、アプリケーションが動作しているとします。
Worker#1がシャットダウンした、kubeletが停止した、ネットワーク的に疎通ができなくなったなどが起きたときに、その上で動いていてPodはどうなるの？という話です。
感覚的にいうと、レプリカ数を維持するために他のノードに移って起動するんでしょ！、と思いたいところなのですが、実際はそれほど単純でもありません。
どのような動きをしていくのか、Deploymentを使ったケース、StatefulSetを利用したケースなどで確認します。

![node-down-overview](/image/kubernetes-node-down-overview.png)

## ノードをシャットダウンしたときに起きたこと（事象）
ノードをシャットダウンしたり、kubeletを停止するとNodeのStatusは`NotReady`となります。
現在、Master x3, Worker x3で稼働しているクラスタですが。本ブログではMsterノードは気にしなくていいので、`kubectl get node`実行時にはWorkerのみ取り出すこととします。

```
$ kubectl get node --selector='node-role.kubernetes.io/worker'
NAME                                              STATUS   ROLES    AGE     VERSION
ip-10-0-163-234.ap-southeast-1.compute.internal   Ready    worker   9m6s    v1.19.0+8d12420
ip-10-0-168-85.ap-southeast-1.compute.internal    Ready    worker   18h     v1.19.0+8d12420
ip-10-0-184-189.ap-southeast-1.compute.internal   Ready    worker   9m28s   v1.19.0+8d12420
```

また、Nginx DeploymentをReplicas=3で起動しておきます。Podが起動しているノードが重要です。よく確認しておきましょう。
`ip-10-0-184-189.ap-southeast-1.compute.internal`（以後、`ip-10-0-184-189`と記載）に1Pod、`ip-10-0-163-234.ap-southeast-1.compute.internal`（以後、`ip-10-0-163-234`と記載）に2Podが起動しています。
```
$ kubectl create deployment nginx --image=nginxinc/nginx-unprivileged:1.19 --replicas=3
deployment.apps/nginx created

$ kubectl get pod -o wide
NAME                     READY   STATUS    RESTARTS   AGE   IP            NODE                                              NOMINATED NODE   READINESS GATES
nginx-5998485d44-44bsh   1/1     Running   0          32s   10.131.0.7    ip-10-0-184-189.ap-southeast-1.compute.internal   <none>           <none>
nginx-5998485d44-gg8h9   1/1     Running   0          32s   10.128.2.12   ip-10-0-163-234.ap-southeast-1.compute.internal   <none>           <none>
nginx-5998485d44-xcxpl   1/1     Running   0          32s   10.128.2.13   ip-10-0-163-234.ap-southeast-1.compute.internal   <none>           <none>

$ kubectl get deploy
NAME    READY   UP-TO-DATE   AVAILABLE   AGE
nginx   3/3     3            3           73s
```

それでは、Podがひとつ起動している`ip-10-0-184-189`のノードをシャットダウンします。
その後に、NodeのステータスおよびPodの動きに注目です。

```
$ ssh ip-10-0-184-189.ap-southeast-1.compute.internal
node# shutdown -h now

// 1分くらいたって ip-10-0-184-189 が NotReady になった
$ kubectl get node --selector='node-role.kubernetes.io/worker' -w
NAME                                              STATUS   ROLES    AGE   VERSION
ip-10-0-163-234.ap-southeast-1.compute.internal   Ready     worker   22m   v1.19.0+8d12420
ip-10-0-168-85.ap-southeast-1.compute.internal    Ready     worker   18h   v1.19.0+8d12420
ip-10-0-184-189.ap-southeast-1.compute.internal   NotReady  worker   23m   v1.19.0+8d12420
notready
```

このときのPodの状態を確認してみます。  
実は、Pod（nginx-5998485d44-44bsh）は変わらず`Running`のままです。
試しにこのPodへcurlでアクセスしてみますが当然だめです。

```
$ kubectl get pod -o wide
NAME                     READY   STATUS    RESTARTS   AGE   IP            NODE                                              NOMINATED NODE   READINESS GATES
nginx-5998485d44-44bsh   1/1     Running   0          10m   10.131.0.7    ip-10-0-184-189.ap-southeast-1.compute.internal   <none>           <none>
nginx-5998485d44-gg8h9   1/1     Running   0          10m   10.128.2.12   ip-10-0-163-234.ap-southeast-1.compute.internal   <none>           <none>
nginx-5998485d44-xcxpl   1/1     Running   0          10m   10.128.2.13   ip-10-0-163-234.ap-southeast-1.compute.internal   <none>           <none>

// IPで接続しているが、これはシャットダウンしたノードの上に稼働していたNginx
$ kubectl exec nginx-5998485d44-gg8h9 -- curl -I http://10.131.0.7:8080/
curl: (7) Failed to connect to 10.131.0.7 port 8080: No route to host
command terminated with exit code 7

// 他のPodへは疎通できることを確認
$ kubectl exec nginx-5998485d44-gg8h9 -- curl -I http://10.128.2.13:8080/
HTTP/1.1 200
Server: nginx/1.19.8
Date: Sat, 13 Mar 2021 05:29:51 GMT
Content-Type: text/html
Content-Length: 612
Last-Modified: Tue, 09 Mar 2021 15:27:51 GMT
Connection: keep-alive
ETag: "604793f7-264"
Accept-Ranges: bytes
```

詳しい説明はあとでするとして、先に進みます。  
5分経過後に変化がおきました。`ip-10-0-184-189`の上で動いていた`nginx-5998485d44-44bsh`が`Terminating`となり、あらたに`nginx-5998485d44-84zkg`が起動しました。  
ちなみに、この`Terminating`のノードはこのままになってしまいました。

```
$ kubectl get node -o wide
NAME                     READY   STATUS        RESTARTS   AGE   IP            NODE                                              NOMINATED NODE   READINESS GATES
nginx-5998485d44-44bsh   1/1     Terminating   0          14m   10.131.0.7    ip-10-0-184-189.ap-southeast-1.compute.internal   <none>      <none>
nginx-5998485d44-84zkg   1/1     Running       0          8s    10.128.2.24   ip-10-0-163-234.ap-southeast-1.compute.internal   <none>      <none>
nginx-5998485d44-gg8h9   1/1     Running       0          14m   10.128.2.12   ip-10-0-163-234.ap-southeast-1.compute.internal   <none>      <none>
nginx-5998485d44-xcxpl   1/1     Running       0          14m   10.128.2.13   ip-10-0-163-234.ap-southeast-1.compute.internal   <none>      <none>
```

## 起きたこと
そろそろ解説していきます。出来事としては理解できましたでしょうか。  
事象的には、ノードをシャットダウンしてもすぐに、上のPodは再スケジューリングされないということです。

ノードをシャットダウンした後、node_lifecycle_controller(Kubernetesのコントロールプレーンの機能のひとつ)は、KubeletがNode情報を更新しなくなったことを検知して、NodeのStatusを変更します。[node_licecycle_controller.go の monitorNodeHealth()](https://github.com/kubernetes/kubernetes/blob/release-1.19/pkg/controller/nodelifecycle/node_lifecycle_controller.go#L759) あたりが担当しています。
このときに、ノードに対して同時に `key: node.kubernetes.io/unreachable` のTaintを付与します。

Podは作成時に、自動的に付与されています。
この`tolerationSeconds`はデフォルトでは300秒に設定されており、300秒経ってもノードが復旧しない場合（Taintが外れない場合）、PodがEviction（強制退去）され別のノードにスケジュールされるという仕組みです。そのため、ノードのシャットダウン後5分間（300秒）Podが再スケジューリングされなかったのはそのためです。公式ドキュメントの「[TaintとToleration](https://kubernetes.io/ja/docs/concepts/scheduling-eviction/taint-and-toleration/)」を改めて確認しておきましょう。
ちなみに、`tolerationSeconds`はkube-apiserverの起動時にオプションとして指定することが可能です。`--default-not-ready-toleration-seconds`, `--default-unreachable-toleration-seconds` で設定できます。詳しくは[こちらのドキュメント](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/)をも確認しましょう。

```
$ kubectl get pod -o yaml anypod
...
  tolerations:
  - effect: NoExecute
    key: node.kubernetes.io/not-ready
    operator: Exists
    tolerationSeconds: 300
  - effect: NoExecute
    key: node.kubernetes.io/unreachable
    operator: Exists
    tolerationSeconds: 300
```

## しばらくPodがRunningであった理由
5分後に別のノードへと移りましたが、その間Podは`Running`のままでした。
PodにCurlでアクセスをしても応答が返ってきませんでしたが、なぜRunningだったのでしょうか。
これは、Kubeletが停止しているからかと思います。PodのステータスはKubeletが更新しますが、そもそもノードのシャットダウンによってKubeletが停止しているのでPodのステータスの更新もできずにスタックしてしまっていると思っています。もし間違えていたらご指摘ください。

## PodがTerminatingのままだが…
5分経過後、Podは`Terminating`に変移し、別のPodが起動しました。
しかし、Podは`Terminating`のままです。時間が経ってもPodが消えずに残ったままになります。
これもKubeletが起動していないからかと思います。Podの削除後、Kubeletがプロセスとして終了させますが、起動していないのでKubeletの確認待ちというステータスで止まっているということです。
解消する方法としては、Podの強制削除やNodeそのものを削除することなどがあります。

## Nodeが一定時間で復旧する場合
Nodeが一定時間で復旧する場合はどうでしょうか？
たとえば、シャットダウンではなく再起動です。`#shutdown -r now` と再起動させたときの動作について考えます。5分以内（`tolerationSeconds`以内）にノードが復旧すれば、`key: node.kubernetes.io/unreachable` のTaintが外れ、Podが強制退去されることなく再開します。同じノードで起動し続けるということですね。  
仮にですが、`tolerationSeconds`が極端に短かったとします。ノードの再起動や一時的なノード障害であっても、Podは別のノードに移動します。一方で、Podが一部のノードに偏ってしまう可能性が高まってしまうのでトレードオフです。十分に注意して起きましょう。

## StatefulSetを利用する場合の考慮
今までの例ではNginx Deploymentを使っていましたが、StatefulSetを利用している場合は、また別の考慮ポイントがあります。

## Podを削除する
### Deployment

### StatefulSet

## Nodeを削除する

## まとめ