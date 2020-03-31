+++
categories = ["Kubernetes"]
date = "2020-03-31T09:56:21+09:00"
description = "Kubernetesのリソース関連(Requests,Limits,QoS class,LimitRange)の基本についてまとめました。曖昧に設定していたリソース設定について理解するとデバッグにも役立ちます。"
draft = true
image = ""
tags = ["Tech"]
title = "Kubernetesのリソースの基本を理解する"
author = "mosuke5"
archive = ["2020"]
+++

こんにちは。[もーすけ](https://twitter.com/mosuke5)です。  
コロナによる在宅勤務を行っている人も多いと思いますが、在宅は捗っていますか？
テレビからYouTubeなどを使って、カフェの雑音などを流しておくと家の中でも雰囲気はがらっと変わって集中できたりします。
イヤホンなどで流すよりも部屋全体に流れるようにテレビなどでやるとおすすめです。ぜひトライしてみてください。

今日は、Kubernetesのリソースの基本についてまとめました。  
自分自身が理解が不足していたこともありましたし、なんとなくでマニフェストのリソースを書いてハマってしまうことも多くあるなあと思ったからです。
今回書いたリソースは主に３点（コンテナのへのリソース割り当て, QoS Class, LimitRange）ですが、この他にも様々なトピックがあります。機会あれば別にご紹介したいともいます。
<!--more-->

## コンテナへのリソース割り当て

### RequestsとLimits
Kubernetesでは、コンテナ単位でリソース（CPUとメモリー）の割り当て、制限を行うことができます。
リソースの制限について、まずいちばんはじめに理解するべきはRequestsとLimitsです。
例えばPodマニフェストに次のように`spec.containers[].resources`に`requests`と`limits`を指定することでコンテナへのリソース割り当てが可能です。
`requests`と`limits`が意味することを理解しておくことが重要です。
`requests`は使用するリソースの「下限値」を指し、`limits`は使用するリソースの「上限値」を指します。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: frontend
spec:
  containers:
  - name: wp
    image: wordpress
    resources:
      requests:
        memory: "64Mi"
        cpu: "250m"
      limits:
        memory: "128Mi"
        cpu: "500m"
```


|  項目  |  説明  |
| ---- | ---- |
|  requests |  使用するリソースの「下限値」です  |
|  limits   |  使用するリソースの「上限値」です  |

### リソースとPodのスケジューリング
KubernetesがPodをノードにスケジュールするときは、`requests`の値を見ます。
下限値なので、下限値を確保できないノードにはスケジュールはもちろんされません。
requestsの値を大きくしすぎると当然ながらスケジュールできなくなる可能性が高まるので注意です。
だからといって`requests`を小さく設定し過ぎることも問題になりえるのでなんとなくで設定してはいけません。（後述します）

### requestsとlimitsの大きな差
`requests`を小さく設定することも問題になりえるのでなんとなくで設定してはいけません、と書きましたが、もし`requests`を小さくし、`limits`との大きな差が生まれるとどのようなことが起きるか考えてみましょう。
Podのスケジューリングは`requests`の値を基準に行われるので、多くのPodが１つのノードに集約されます。
そのため、下限値でノードのリソースを埋め尽くす結果となってしまいます。
つまり、`requests`と`limits`に差をつけすぎると、Podがすぐにノードのリソース上限に達してしまい利用したいリソース量が利用できなくなってしまう可能性が高まります。
後で紹介する、LimitRangeで`requests`と`limits`の比率に制限をかけることができるので、対策も可能です。

### 上限値を超えた場合
設定した`limits`の上限値を越えるとどうなるのでしょうか。  
メモリーが設定した`limits`を超えた場合、oom killerによってPodは強制的に停止します。
`limits.memory`はoom killerが発生しない程度に設定する必要があります。  
CPUが上限を超える場合は、メモリーの場合とは異なりPodの強制停止はされません。上限以上のCPUを利用できないです。


### resourceが未指定の場合
`resource`の値が未指定の場合は、基本的には利用できるだけリソースを利用する状態となります。
しかし、LimitRangeでデフォルト値が設定してある場合、未指定でも自動的に設定されます。
利用しているNamespaceにLimitRangeが設定されているかどうか確認しておくと良いです。
また、現実の設定値は`kubectl describe pod xxxx`で確認するのがよいでしょう。  
また、次に説明するQoS ClassでBestEffortとなるため、ノードのメモリーが不足した場合は最優先に停止対象のPodとして選ばれます。

## QoS class
上で説明した、`requests`と`limits`の設定によってKubernetesは、QoS Classという値をPodに設定します。
この値は、自動的に付与されるものでユーザ側で任意に設定するものではありません。
QoS Classは、ノードのリソースの上限などでKubernetesがPodを強制停止する際の対象を選定する際に利用されるものです。  :w
QoS Classは以下の条件によって決定します。

|  QoS Class  |  設定条件  |  優先度  |
| ---- | ---- | ---- |
|  BestEffort |  requests, limitsともに未指定のとき  | 3 |
|  Burstable  |  1つ以上のrequestsかlimitsが設定されているとき(Guaranteedではない)  | 2 |
|  Guaranteed |  requestsとlimitsが同じ値でCPU・メモリーともに設定されている  | 1 |

例えば、ノードのメモリー上限に達すると（コンテナのlimitsの上限ではなく）、KubernetesはPodを強制的に退去(Evicted)しリソースを確保します。その際に、QoS Classを参照します。BestEffortから順にPodを停止する動きを取ります。  
実際に設定されているQoS Classを確認するには稼働しているPodをdescribeで見てみるとわかります。

```
$ kubectl describe pod pod-name
...
Volumes:
  default-token-xcrmt:
    Type:        Secret (a volume populated by a Secret)
    SecretName:  default-token-xcrmt
    Optional:    false
QoS Class:       Burstable
Node-Selectors:  <none>
Tolerations:     node.kubernetes.io/memory-pressure:NoSchedule
                 node.kubernetes.io/not-ready:NoExecute for 300s
                 node.kubernetes.io/unreachable:NoExecute for 300s
Events:          <none>
```

### 同じクラスだった場合
メモリーがノードの上限に達し、oom killerによってPodを強制停止をする場合にQoS Classによって停止するPodの優先度が決定すると書きましたが、同じクラスだった場合はスコアによってきまります。
以下のKubernetesの公式ドキュメントに記載があるのですが、Busrstableの場合、Podのrequestしたメモリー量とノードのキャパシティの割合によってスコア付けされます。

<a href="https://kubernetes.io/docs/tasks/administer-cluster/out-of-resource/#node-oom-behavior" target="_blank">Configure Out of Resource Handling - Kubernetes</a>

### 使いみち
仕組みは理解できたとして、このQoSをどう使っていけばいいのでしょうか。  
すべてを十分なリソースでGuaranteedにできるに越したことはないですが、
確保した量と実際に使用する量に乖離がある場合もありますし、Podの収容効率もさがります。
Webサーバのように複数台で分散可能で、一部のPodが停止しても大きな影響がないものはBurstableで、JobやStatefulなアプリケーションなどはGuaranteedを検討すると良いのではないかと思います。
本番環境で動くアプリケーションではBusrstableはそもそもおすすめしません。

## LimitRange
LimitRangeというKubernetesリソースがあります。
こちらを利用することで以下が設定できます。  
(公式ドキュメント: <a href="https://kubernetes.io/docs/concepts/policy/limit-range/" target="_blank">Limit Ranges - Kubernetes</a>)

1. デフォルトのLimitsの設定
1. デフォルトのRequestsの設定
1. 最大のリソース使用量の設定
1. 最小のリソース使用量の設定
1. LimitsとRequestsの割合の設定

このLimitRangeを設定することで上で一部注意事項として書いたことの対策ができるようになります。  
具体的には以下のようなことが対策できるようになります。

1. BestEffortのQoS Classが設定されたPodを作らない
1. LimitsとRequestsの大幅な差をさくす
1. 過剰なリソースの要求をさせない

### 設定とデバッグ
LimitRangeはnamespace毎に設定できるものです。
また、PodとContainerに対して設定が可能です。  
設定方法は極めて簡単で、以下のようなマニフェストを適応するのみです。

```yaml
apiVersion: "v1"
kind: "LimitRange"
metadata:
  name: "core-resource-limits"
spec:
  limits:
    - type: "Pod"
      max:
        cpu: "2"
        memory: "1Gi"
      min:
        cpu: "200m"
        memory: "6Mi"
    - type: "Container"
      max:
        cpu: "2"
        memory: "1Gi"
      min:
        cpu: "100m"
        memory: "4Mi"
      default:
        cpu: "300m"
        memory: "200Mi"
      defaultRequest:
        cpu: "200m"
        memory: "100Mi"
      maxLimitRequestRatio:
        cpu: "2"
        memory: "2"
```

例えば、この場合`maxLimitRequestRatio.memory`が "2" に設定されており、メモリーのrequestsとlimitsの比率が２倍までとしています。この状態で、2倍以上の差のあるDeploymentをデプロイしてみます。

deploymentはできていますが、Podが起動してきません。
この場合、deploymentではなく、replicasetのeventを見ると良いです。
実際に見るとメモリーのrequestsとlimitsの比率が2までの制限がかかっているが実際には4ほどある、という旨のエラーメッセージを確認できました。

```
$ kubectl get deployment
NAME          READY   UP-TO-DATE   AVAILABLE   AGE
debug-nginx   0/1     0            0           2m11s

$ kubectl get replicaset
NAME                     DESIRED   CURRENT   READY   AGE
debug-nginx-6d7d6b87b9   1         0         0       93s

$ kubectl describe replicaset debug-nginx-6d7d6b87b9
...
Events:
  Type     Reason        Age                From                   Message
  ----     ------        ----               ----                   -------
  Warning  FailedCreate  31s                replicaset-controller  Error creating: pods "debug-nginx-6d7d6b87b9-qplmn" is forbidden: [maximum memory usage per Pod is 1Gi, but
limit is 2147483648, maximum memory usage per Container is 1Gi, but limit is 2Gi, memory max limit to request ratio per Container is 2, but provided ratio is 4.096000]
```

## まとめ
Kubernetesにおけるリソースの基本となる３つの項目について見てきました。  
最低限このくらいのことがわかっているとデバッグ作業に非常に役立つと感じています。
なんとなくで設定していた方は今日で卒業してもらえればと思います。

Kubernetesのリソースは、今日紹介したことの他にもNamespaceごとのリソースのクオータ制限をするResourceQuotaや、Podのオートスケーリング、スケジューリングなどなど非常に奥が深いです。
より体系的に深く学びたい方は、ぜひともKubernetes完全ガイドをおすすめします。我がバイブルです。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://www.amazon.co.jp/Kubernetes%25E5%25AE%258C%25E5%2585%25A8%25E3%2582%25AC%25E3%2582%25A4%25E3%2583%2589-impress-top-gear-%25E9%259D%2592%25E5%25B1%25B1/dp/4295004804" data-iframely-url="//cdn.iframe.ly/UdUbVWh?iframe=card-small"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>