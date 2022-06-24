+++
categories = ["kubernetes"]
date = "2022-06-24T14:13:25+09:00"
description = "Kubernetesを使っていて、Namespaceの削除ができずにTerminatingのままになってしまったことはありますか？なぜ消せないのか、finalizerについてかんたんに実験してみましょう。"
draft = false
image = ""
tags = ["Tech"]
title = "Kubernetesで、NamespaceがTerminatingのまま消せない理由についての実験(finalizer)"
author = "mosuke5"
archive = ["2022"]
+++

こんにちは、もーすけです。  
本日は、Kubernetesのfinalizerについて確認したことをまとめようと思います。
Kubernetesを使っている方であれば、リソースを削除したのにTerminatingのまま止まってしまって困ったということがあるんではないでしょうか？あるいは、困っていまこのブログにたどり着いたかもしれません。

すでに世の中にはいくつか関連の記事は出ていますが、
自分の整理のためにいくつか書き残していきます。
<!--more-->

## NamespaceがTerminatingのまま止まってしまう
正確には、この事象はNamespaceだけに起こるわけではないですが（後述します）、よくあるケースとしてNamespaceを削除したが、Statusが `Terminating` のまま止まってしまうことです。

```
% kubectl get ns finalizer-test
NAME             STATUS        AGE
finalizer-test   Terminating   67m
```

## finalizer
デフォルトで、Namespaceを作成したときにKubernetesは、`.spec.finalizers`に`kubernetes`を書き込みます。（{{< external_link url="https://github.com/kubernetes/design-proposals-archive/blob/main/architecture/namespaces.md#finalizers" title="関連リンク">}}）

```
$ kubectl get ns finalizer-test -o yaml
apiVersion: v1
kind: Namespace
metadata:
  name: finalizer-test
  ...
spec:
  finalizers:
  - kubernetes
...
```

Kubernetesは、対象のNamespace内に `metadata.finalizers` フィールドをもつリソースがいないか確認します。`metadata.finalizers` フィールドをもつリソースがある場合、KubernetesはNamespaceを勝手に消すことはなくなります。

Namespaceの `status` を確認すると、なにを待っているか確認できるはずです。

```
$ kubectl get ns finalizer-test -o yaml
...
status:
  conditions:
  ...
  - lastTransitionTime: "2022-06-24T05:27:24Z"
    message: 'Some resources are remaining: serviceaccounts. has 1 resource instances'
    reason: SomeResourcesRemain
    status: "True"
    type: NamespaceContentRemaining
  - lastTransitionTime: "2022-06-24T05:27:24Z"
    message: 'Some content in the namespace has finalizers remaining: mosuke5/finalizer
      in 1 resource instances'
    reason: SomeFinalizersRemain
    status: "True"
    type: NamespaceFinalizersRemaining
  phase: Terminating
```

うえの場合では、 `'Some content in the namespace has finalizers remaining: mosuke5/finalizer in 1 resource instances'` と記述されていて、`mosuke5/finalizer`のfinalizerフィールドを持つリソースを待っていることがわかります。

finalizerは、Kubernetesのコントローラが、リソースを削除する場合に、リソースの依存関係を考慮して削除できるようにするための仕組みです。
たとえば、ある自作のカスタムコントローラは、AとBとCというリソースを展開するとします。しかし、Aというリソースを消す前には、依存するBとCを先に削除してからAを消したいということがあります。

Kubernetes側で勝手にAを消されないようにするために、finalizerをAリソースにつけておき、自作カスタムコントローラがBとCを消した後にAリソースのfinalizerフィールを消すことで、KubernetesにAを削除させるということが可能になります。

## どういうときに起こりえる？
NamespaceがTerminatingのまま消せなくなってしまうケースについてです。
次の図のように、コントローラが、`.metadata.finalizer` を持つリソースを作るとして、それらのリソースを消すより前にコントローラを先に消してしまった場合です。
`.metadata.finalizer`は、そこに記述されたリストのコントローラが責任を持ってそのリソースを管理することを意味するので、先にコントローラがいなくなると、削除できなくなってしまいます。

![](/image/finalizer-situation.png)

## 対処方法
対処方法としては、大きくふたつあると思います。  
ひとつは強制的に消す方法です。Namespaceの `.spec.finalizers` の指定がなければ、Kubernetesは待つことなくリソースを削除します。

以下のブログに記載があるように、Kubernetes APIからNamespaceのfinalizerの処理を消してアップデートしてあげれば対処できます。

<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://www.redhat.com/sysadmin/troubleshooting-terminating-namespaces" target="_blank">
      <img class="belg-site-image" src="https://www.redhat.com/sysadmin/sites/default/files/styles/google_discover/public/2022-02/frustration-troubleshooting.jpg?itok=l0i2CHO2" />
    </a>
  </div>
  <div class="belg-right col-md-10">
  <div class="belg-title">
      <a href="https://www.redhat.com/sysadmin/troubleshooting-terminating-namespaces" target="_blank">How to fix Kubernetes namespaces stuck in the terminating state</a>
    </div>
    <div class="belg-description">Sometimes the process to delete Kubernetes namespaces gets hung up, and the command never completes. Here&#39;s how to troubleshoot terminating namespaces</div>
    <div class="belg-site">
      <img src="https://www.redhat.com/sysadmin/themes/custom/sysadmin/assets/favicon/favicon-16x16.png" class="belg-site-icon">
      <span class="belg-site-name">Enable Sysadmin</span>
    </div>
  </div>
</div>

もうひとつは、finalizerが削除待ちしているリソースを見つけて、`.metadata.finalizers`フィールドを消してあげることです。
本来、コントローラがやるべき処理ですが、何らかの理由でそれができていないためにこのような事象になっているので、手動で消してあげてもいいです。

## 実験してみよう
では、かんたんに手元で実験してみましょう。  
まず、`finalizer-test`というnamespaceを作成し、`.spec.finalizers`を確認します。

```
$ kubectl create ns finalizer-test
namespace/finalizer-test created

$ kubectl get ns finalizer-test -o jsonpath="{.spec}"
{"finalizers":["kubernetes"]}
```

以下の作業はすべて`finalizer-test` namespace内での操作です。  
`hoge`というServiceAccountを作成し、`.metadata.finalizers`に`mosuke5/finalizer`を書き込みます。
これで、`hoge` ServiceAccountは、`mosuke5/finalizer`が処理する対象のものとなりました。存在しないんですけど。

```
$ kubectk create sa hoge
serviceaccount/hoge created

$ kubectl patch sa hoge -p '{"metadata":{"finalizers": ["mosuke5/finalizer"]}}'
serviceaccount/hoge patched

$ kubectl get sa hoge -o yaml -o jsonpath="{.metadata.finalizers}"
["mosuke5/finalizer"]
```

作ったServiceAccountを消してみましょう。
結果は消えないです。ただし、Kubernetesは消そうとして`deletionTimestamp`は書き込みました。

```
$ kubectl delete sa hoge --force
warning: Immediate deletion does not wait for confirmation that the running resource has been terminated. The resource may continue to run on the cluster indefinitely.
serviceaccount "hoge" force deleted

$ kubectl get sa hoge
NAME   SECRETS   AGE
hoge   2         64s

$ kubectl get sa hoge -o yaml | grep deletion
  deletionGracePeriodSeconds: 0
  deletionTimestamp: "2022-06-24T06:43:16Z"
```

ServiceAccountが消えないので、Namespaceごと消してやろうとします。
こちらも結果は消えないです。Namespace内の `.status.conditions`を確認すると、`Some content in the namespace has finalizers remaining: mosuke5/finalizer in 1 resource instances`と理由がわかります。

```
$ kubectl delete ns finalizer-test --force
warning: Immediate deletion does not wait for confirmation that the running resource has been terminated. The resource may continue to run on the cluster indefinitely.
namespace "finalizer-test" force deleted

$ kubectl get ns finalizer-test
NAME             STATUS        AGE
finalizer-test   Terminating   8m4s

$ kubectl get ns finalizer-test -o jsonapath="{.status.conditions}"
kubectl get ns finalizer-test -o jsonpath="{.status.conditions}" | jq .
[
  {
    "lastTransitionTime": "2022-06-24T06:46:09Z",
    "message": "All resources successfully discovered",
    "reason": "ResourcesDiscovered",
    "status": "False",
    "type": "NamespaceDeletionDiscoveryFailure"
  },
  {
    "lastTransitionTime": "2022-06-24T06:46:09Z",
    "message": "All legacy kube types successfully parsed",
    "reason": "ParsedGroupVersions",
    "status": "False",
    "type": "NamespaceDeletionGroupVersionParsingFailure"
  },
  {
    "lastTransitionTime": "2022-06-24T06:46:09Z",
    "message": "All content successfully deleted, may be waiting on finalization",
    "reason": "ContentDeleted",
    "status": "False",
    "type": "NamespaceDeletionContentFailure"
  },
  {
    "lastTransitionTime": "2022-06-24T06:46:09Z",
    "message": "Some resources are remaining: serviceaccounts. has 1 resource instances",
    "reason": "SomeResourcesRemain",
    "status": "True",
    "type": "NamespaceContentRemaining"
  },
  {
    "lastTransitionTime": "2022-06-24T06:46:09Z",
    "message": "Some content in the namespace has finalizers remaining: mosuke5/finalizer in 1 resource instances",
    "reason": "SomeFinalizersRemain",
    "status": "True",
    "type": "NamespaceFinalizersRemaining"
  }
]
```

最後に、手動でServiceAccountの `.metadata.finalizers`を消してあげましょう。
Namespaceも一緒に消えたはずです。

```
$ kubectl patch sa hoge -p '{"metadata":{"finalizers": []}}' --type='merge'
serviceaccount/hoge patched

$ kubectl get ns finalizer-test
Error from server (NotFound): namespaces "finalizer-test" not found
```

## 参考文献
- {{< external_link url="https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/#finalizers" title="Extend the Kubernetes API with CustomResourceDefinitions" >}}
  - Kubernetesの公式ドキュメントです。
  - finalizerは結局コントローラを作るときに活用していくものなので、CRDのセクションに記述があります
- {{< external_link url="https://book.kubebuilder.io/reference/using-finalizers.html" title="Kubebuilder: Using Finalizers">}}
  - カスタムコントローラ作成のためのフレームワークであるKubebuilderの公式ドキュメントです。
  - どういうときに使うかや、具体的な実装方法が書いてあります。