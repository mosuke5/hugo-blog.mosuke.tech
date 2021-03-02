+++
categories = ["Kubernetes", "OpenShift"]
date = "2021-03-01T18:47:31+09:00"
description = "OpenShiftに独自のCA証明書を追加する方法や、追加時に行われることについて検証したことをまとめました。インターネットにでるのにプロキシを利用する場合などにご活用ください。"
draft = true
image = ""
tags = ["Tech"]
title = "OpenShiftでCA証明書を追加することについての検証"
author = "mosuke5"
archive = ["2021"]
+++

こんにちは、もーすけです。  
最近検証したOpenShiftへのCA証明書を追加することについてです。
どういうケースでCA証明書の追加が必要かというと、自己証明書で運用されているレジストリとかプロキシに接続しなければいけないケースなどです。
たとえば以下のようなケースでしょうか。

1. 非インターネット環境でのOpenShiftのインストールでミラーレジストリを構築した場合（ミラーレジストリの証明書が必要なケース）
1. OpenShift外にプライベートのコンテナレジストリを構築していて使っている場合（上とほぼ同義）
1. インターネットに出るのにプロキシを経由する必要があり、その証明書が必要な場合
1. 社内のセキュリティでTLS復号化装置（SSL可視化ソリューションとかよばれるもの）を導入しており、その機器の証明書をインストールしなければならない場合

このときの証明書の追加の動きについて確認したので見ていきたいと思います。

<!--more-->

## cluster-wide proxyのtrustedCAの追加
インターネットにでるのにプロキシを経由しなければならないケースなどで利用するcluster-wide proxy（日本語だとクラスタ全体プロキシ）があります。設定方法に関する[ドキュメントはこちらを参照](https://access.redhat.com/documentation/ja-jp/openshift_container_platform/4.6/html/networking/nw-proxy-configure-object_config-cluster-wide-proxy)してください。

cluster-wide proxyの設定は、`oc edit proxy/cluster`でできるのですが、以下のように`trustedCA`を指定できます。
ここに、追加したい証明書のConfigMap名を指定することで追加できます。どのような動きをするのかも含めて確認します。
ちなみに、`trustedCA`で指定するConfigMapは`openshift-config`というnamespaceにある必要があるのでご注意ください。

```yaml
apiVersion: config.openshift.io/v1
kind: Proxy
metadata:
  name: cluster
spec:
  trustedCA:
    name: ""
```

追加したい証明書を以下のようなConfigMapにして登録します。

```yaml
# user-ca.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: user-ca-bundle
  namespace: openshift-config
data:
  ca-bundle.crt: |
    -----BEGIN CERTIFICATE-----
    <追加した証明書の中身>
    -----END CERTIFICATE-----
```

ではさっそく作成したConfigMapをapplyして、`proxy/cluster`の`spec.trustedCA.name`に`user-ca-bundle`の値を入れて保存します。
ここまでは、プロキシサーバの設定はしていませんが、ドキュメント操作どうりです。

```
$ oc apply -f user-ca.yaml
configmap/user-ca-bundle created

$ oc get cm user-ca-bundle -n openshift-config
NAME             DATA   AGE
user-ca-bundle   1      31s

$ oc edit proxy/cluster
apiVersion: config.openshift.io/v1
kind: Proxy
metadata:
  name: cluster
  ...
spec:
  trustedCA:
    name: user-ca-bundle
status: {}
```

この設定をいれるとなにがかわるのでしょうか。  
`openshift-config-managed`というnamespace内に`trusted-ca-bundle`というConfigMapがあります。`proxy/cluster`の設定を行ったあとこのConfigMap内の値が変更されています。中身をみてみると、上で追加した、`user-ca-bundle`の証明書の中身が入っていることがわかります。
これは、[Cluster Network Operator](https://github.com/openshift/cluster-network-operator)が設定を行っています。該当のソースコードは[このへん](https://github.com/openshift/cluster-network-operator/blob/release-4.6/pkg/controller/proxyconfig/controller.go#L361-L398)でしょうか？

```
$ oc get cm trusted-ca-bundle -n openshift-config-managed
NAME                DATA   AGE
trusted-ca-bundle   1      31h

$ oc get cm trusted-ca-bundle -n openshift-config-managed -o yaml
apiVersion: v1
data:
  ca-bundle.crt: |
    -----BEGIN CERTIFICATE-----
    <追加した証明書の中身>
    -----END CERTIFICATE-----
...
```

## Operatorを使用した証明書の挿入
さて次に「Operatorを使用した証明書の挿入」という項目についてみていきたいと思います。
OpenShiftのドキュメントには、「[Operatorを使用した証明書の挿入](https://access.redhat.com/documentation/ja-jp/openshift_container_platform/4.6/html/networking/certificate-injection-using-operators_configuring-a-custom-pki)」というセクションがあり、CA証明書を自動で挿入する仕組みについて解説されています。
このOperatorと言っているのは、前の章で説明したCluster Network Operatorです。

`config.openshift.io/inject-trusted-cabundle="true"`のラベルがついているConfigMapを作成すると自動でCA証明書を挿入してくれるものです。では実際にやってみましょう。次のマニフェストを用意して、適当なnamespaceに作成してみます。

```yaml
# inject-ca-to-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  creationTimestamp: null
  name: inject-ca-to-cm
  labels:
    config.openshift.io/inject-trusted-cabundle: "true"
```

ConfigMapを作成して、中身を確認してみると、ひとつ前の章で追加した証明書がはいっているではないかー。そうです、このなかみは`openshift-config-managed`のnamespace内にあった`trusted-ca-bundle`のConfigMapの中身です。
Cluster Network Operatorは、`trusted-ca-bundle`の内容を挿入してくれるというわけです。

```
$ oc apply -f inject-ca-to-cm.yaml
configmap/inject-trusted-cm created

$ oc get cm inject-trusted-cm -o yaml
apiVersion: v1
data:
  ca-bundle.crt: |
    -----BEGIN CERTIFICATE-----
    <追加した証明書の中身>
    -----END CERTIFICATE-----
...
```

## trusted-ca-bundleはどこで使われる？
### Node
上で`trusted-ca-bundle`が作られるまでの流れをみました。  
では、このConfigMapはどのように利用されているのかみていきましょう。

まずノードです。あるWorkerノードに入ってみます。
`/etc/pki/ca-trust/source/anchors/openshift-config-user-ca-bundle.crt`をみると追加した証明書が追加されています。
ノード側に配布されることで、kubeletがイメージを取得する際にも証明書が利用できるということでしょうか。

```
$ oc debug node/worker-1
# chroot /host
# cat /etc/pki/ca-trust/source/anchors/openshift-config-user-ca-bundle.crt
-----BEGIN CERTIFICATE-----
<追加した証明書の中身>
-----END CERTIFICATE-----
```

### OpenShiftのコアコンポーネント
つぎに、`openshift-apiserver`のnamespaceを見てみます。
ConfigMapを確認すると`trusted-ca-bundle`と見覚えのある名前のものがあります。

```
$ oc get cm -n openshift-apiserver
NAME                DATA   AGE
config              1      31h
etcd-serving-ca     1      31h
image-import-ca     2      31h
trusted-ca-bundle   1      31h
```

中身を確認すると案の定ではあります。追加した証明書の中身もありますし、labelには`config.openshift.io/inject-trusted-cabundle: "true"`があります。
これは、まさしく上で紹介したCluster Network Operatorによる証明書の挿入によって作られたものです。

```
apiVersion: v1
data:
  ca-bundle.crt: |
    -----BEGIN CERTIFICATE-----
    <追加した証明書の中身>
    -----END CERTIFICATE-----
...
kind: ConfigMap
metadata:
  creationTimestamp: "2021-03-01T07:23:30Z"
  labels:
    config.openshift.io/inject-trusted-cabundle: "true"
  name: trusted-ca-bundle
...
```

apiserverのPodの定義を見てみると、`trusted-ca-bundle`をマウントして内部で利用していることがわかる。
Pod内からCA証明書を利用する必要のあるコンポーネントについてはこのように読み込んでいることがわかる。

```
$ oc get pod -n openshift-apiserver
NAME                         READY   STATUS    RESTARTS   AGE
apiserver-58bbdff9b9-2c92j   1/1     Running   0          40m
apiserver-58bbdff9b9-2nmrh   1/1     Running   0          40m
apiserver-58bbdff9b9-whdgt   1/1     Running   0          41m

$ oc get pod apiserver-58bbdff9b9-2c92j -n openshift-apiserver -o yaml
...
  - configMap:
      defaultMode: 420
      items:
      - key: ca-bundle.crt
        path: tls-ca-bundle.pem
      name: trusted-ca-bundle
      optional: true
...
```

### BuildConfig
BuildConfigでイメージをビルドするときはどうでしょうか？BuildConfigを実行するとBuild Podが作成され、そのPod内でイメージをビルドします。
コンテナイメージを自己証明書を使ったレジストリを使っていたり、プロキシ経由で外部のイメージをとってくる場合です。

BuildConfigを実行すると、ConfigMapがいくつか作成されます。
`test-build-4-global-ca`の中身をみてみましょう。
（私の環境で実行が4回目なので4になっています。）  
結果は予想通りですね。

```
$ oc start-build test-build
build.build.openshift.io/test-build-4 started

$ oc get cm
NAME                      DATA   AGE
inject-trusted-cm         1      37m
test-build-4-ca           1      81s
test-build-4-global-ca    1      81s
test-build-4-sys-config   0      81s

$ oc get cm test-build-4-global-ca -o yaml
apiVersion: v1
data:
  ca-bundle.crt: |
    -----BEGIN CERTIFICATE-----
    <追加した証明書の中身>
    -----END CERTIFICATE-----
...
```

また、当然ですが、Build Podは上のConfigMapをマウントします。
Build Pod内で、コンテナイメージを取得する際に証明書を利用できることがわかります。

```
$ oc get pod test-build-4-build -o yaml
...
  - configMap:
      defaultMode: 420
      items:
      - key: ca-bundle.crt
        path: tls-ca-bundle.pem
      name: test-build-4-global-ca
    name: build-proxy-ca-bundles
...
```

本方法ではなく、BuildConfig用に認証局の証明書を追加する方法もあるのでこちらも合わせて確認してみてください。
公式ドキュメント「[第14章 ビルドの信頼される認証局の追加設定](https://access.redhat.com/documentation/ja-jp/openshift_container_platform/4.6/html/builds/setting-up-trusted-ca)」
