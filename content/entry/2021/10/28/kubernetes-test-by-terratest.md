+++
categories = ["Kubernetes", "DevOps"]
date = "2021-10-28T23:11:43+09:00"
description = "Terratestを用いたKubernetesのテストについてのメモです。TDD的に使う方法やモジュール外のことをしようとしたときなど、実運用を想定してためしてみました。"
draft = false
image = ""
tags = ["Tech"]
title = "Kubernetes環境についてTerratestでテストを書く"
author = "mosuke5"
archive = ["2021"]
+++

こんにちは、もーすけです。  
今回は{{< external_link url="https://github.com/gruntwork-io/terratest" title="Terratest" >}} を用いたKubernetes環境のテストについて検討します。

TerratestはGruntwork.ioが作成しているインフラのテスティングソフトウェアです。
もともとは、Terraformで作成したクラウド環境のテストとして発達がしましたが、いまの時代となってKubernetes環境やコンテナイメージもテストできるようになっています。

Kubernetesマニフェストにより、宣言的にインフラ環境を表現できるようになってきているととはいえ、その結果が期待通りに動作しているのかは日々の悩みのタネであることはかわりません。
Terratestがこの悩みを解消するのにイケてそうなので調査してみます。

かつて仮想サーバでアプリケーションを運用している時代に、Serverspecを用いてテスト駆動のインフラ構築を行っていてとても気持ちがよかったので、そのレイヤーが移ってきているとも考えられます。
<!--more-->

## 環境
本検証を行ったGoとKubernetesのバージョンは下記のとおりです。

```
% go version
go version go1.17.2 darwin/amd64

% kubectl version --short
Client Version: v1.22.2
Server Version: v1.22.0-rc.0+894a78b
```

## Quick Start
なにごともはじめはあります。まずはドキュメントのサンプルをみながら試してみます。
参考にしたのは公式ドキュメントの{{< external_link url="https://terratest.gruntwork.io/docs/getting-started/quick-start/#example-4-kubernetes" title="Example #4: Kubernetes" >}}です。
最終的に以下のようなファイル構成で進めました。

```
% tree .
.
├── hello-world-deployment.yaml
└── test
    ├── go.mod
    ├── go.sum
    └── kubernetes_hello_world_example_test.go
```

### サンプルマニフェスト
まずは、サンプルのKubernetesマニフェストを理解しましょう。
このブログの読者であれば解説は不要かと思いますが、かんたんに残しておきます。

```yaml
---
# Pythonで動くかんたんなWebサーバです。ポート5000でリッスンすると"Hello, World!"を返します。
# コンテナイメージはすでに用意されているものです。
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-world-deployment
spec:
  selector:
    matchLabels:
      app: hello-world
  replicas: 1
  template:
    metadata:
      labels:
        app: hello-world
    spec:
      containers:
        - name: hello-world
          image: training/webapp:latest
          ports:
            - containerPort: 5000
---
# 上のアプリケーションを外部公開します。
# Kubernetesにおけるアプリケーションの公開方法はいくつかありますが、SeviceのType: LoadBalancerで公開します。
kind: Service
apiVersion: v1
metadata:
  name: hello-world-service
spec:
  selector:
    app: hello-world
  ports:
    - protocol: TCP
      targetPort: 5000
      port: 5000
  type: LoadBalancer
```

試した環境は、AWS上に構築したKubernetesクラスタであり、Type: LoadBalancerのServiceリソースを作成するとELBが作成されてエンドポイントとなります。

```
% kubectl apply -f hello-world-deployment.yaml
deployment.apps/hello-world-deployment created
service/hello-world-service created

% kubectl get pod,service
NAME                                          READY   STATUS    RESTARTS   AGE
pod/hello-world-deployment-698bfbc4fc-pcvfl   1/1     Running   0          24s

NAME                          TYPE           CLUSTER-IP      EXTERNAL-IP                              PORT(S)          AGE
service/hello-world-service   LoadBalancer   172.30.205.11   xxxxx.ap-southeast-1.elb.amazonaws.com   5000:30287/TCP   24s

% curl http://xxxxx.ap-southeast-1.elb.amazonaws.com:5000
Hello world!
```

### Terratestのテストコード
マニフェストが確認できたので、次にテストコードを確認していきましょう。
コメントアウトを日本語でいれてみました。

```go
package test

import (
  "fmt"
  "testing"
  "time"

  http_helper "github.com/gruntwork-io/terratest/modules/http-helper"
  "github.com/gruntwork-io/terratest/modules/k8s"
)

func TestKubernetesHelloWorldExample(t *testing.T) {
  t.Parallel()

  // Kubernetesマニフェストのパス。ディレクトリ構成に合わせて編集しましょう
  kubeResourcePath := "../hello-world-deployment.yaml"

  // Kubectlのオプション指定
  // 引数は左から順番に、"contextName, configPath, namespace"
  // この例だとdefault namespaceにKubernetesリソースが作られます
  // 仕様を確認したいときはドキュメントを見る https://pkg.go.dev/github.com/gruntwork-io/terratest@v0.38.2/modules/k8s#NewKubectlOptions
  options := k8s.NewKubectlOptions("", "", "default")

  // テストの終了後にリソースの削除を行う
  // deferは、上位ブロックの関数がreturnするまで遅延するもので、つまりテスト終了後に削除が走る
  defer k8s.KubectlDelete(t, options, kubeResourcePath)

  // `kubectl apply`の実行
  k8s.KubectlApply(t, options, kubeResourcePath)

  // Serviceが利用可能になるまで待つ
  k8s.WaitUntilServiceAvailable(t, options, "hello-world-service", 10, 1*time.Second)

  // Serviceリソースを取得
  service := k8s.GetService(t, options, "hello-world-service")

  // HTTPリクエストを投げる先のURLを取得
  url := fmt.Sprintf("http://%s", k8s.GetServiceEndpoint(t, options, service, 5000))

  // 取得したURLへリクエスを送付し、HTTPステータス200で"Hello world!"が返るまでリトライ
  // ドキュメントの記載のリトライ数ではタイムアウトすることがあったので調整しました。
  http_helper.HttpGetWithRetry(t, url, nil, 200, "Hello world!", 60, 3*time.Second)
}
```

### Terratestのモジュール
Terratestでは、KubernetesのリソースやHTTPリクエストをテストするためやの便利なモジュールを用意してくれています。
上のソースコードの例では `k8s.*`や`http_helper.HttpGetWithRetry`は、すべてTerratestライブラリが用意したものです。

Terratestが用意した関数の一覧や仕様はこちらのドキュメントから確認できます。

<div class="belg-link row">
  <div class="belg-right col-md-12">
  <div class="belg-title">
      <a href="https://pkg.go.dev/github.com/gruntwork-io/terratest@v0.38.2/modules/k8s" target="_blank">k8s package - github.com/gruntwork-io/terratest/modules/k8s - pkg.go.dev</a>
    </div>
    <div class="belg-description"></div>
    <div class="belg-site">
      <img src="https://pkg.go.dev/static/shared/icon/favicon.ico" class="belg-site-icon">
      <span class="belg-site-name">pkg.go.dev</span>
    </div>
  </div>
</div>

## applyとdeleteを行わないでテストだけしたい
前述の例では、テストを実行するたびにマニフェストをApplyして、テストして、テスト後に削除するというステップで行いました。
CI環境などではそのような実行ステップでまったく問題ないですが、個人的に望んでいるのはもうすこしTDD的な使い方です。
テストを書いてそれを満たすマニフェストを書いていく、というマニフェスト作成時にもっとカジュアルにテストしたいとも思っています。
その際には、時間がかからずすぐにテストできることが重要です。

ApplyやDeleteはせずに、テストだけ単純にするというケースについても考えてみます。  
次のようにかなりシンプルなコーディングができますね。

```go
package test

import (
  "fmt"
  "testing"
  "time"

  http_helper "github.com/gruntwork-io/terratest/modules/http-helper"
  "github.com/gruntwork-io/terratest/modules/k8s"
)

func TestKubernetesHelloWorldExampleNoApply(t *testing.T) {
  t.Parallel()

  options := k8s.NewKubectlOptions("", "", "default")
  service := k8s.GetService(t, options, "hello-world-service")
  url := fmt.Sprintf("http://%s", k8s.GetServiceEndpoint(t, options, service, 5000))

  http_helper.HttpGetWithRetry(t, url, nil, 200, "Hello world!", 60, 3*time.Second)
}
```

`go test`で実行するとわかりますが、1.973秒でテストが完了しています。
開発中においては、テストの都度にリソースの作成をする必要はないことが多いかなと思います。

```
% go test -v
=== RUN   TestKubernetesHelloWorldExample
=== PAUSE TestKubernetesHelloWorldExample
=== CONT  TestKubernetesHelloWorldExample
TestKubernetesHelloWorldExample 2021-10-30T18:44:31+09:00 client.go:42: Configuring Kubernetes client using config file /Users/shinyamori/.kube/config with context
TestKubernetesHelloWorldExample 2021-10-30T18:44:31+09:00 node.go:33: Getting list of nodes from Kubernetes
TestKubernetesHelloWorldExample 2021-10-30T18:44:31+09:00 client.go:42: Configuring Kubernetes client using config file /Users/shinyamori/.kube/config with context
TestKubernetesHelloWorldExample 2021-10-30T18:44:32+09:00 retry.go:91: HTTP GET to URL http://af5ba2bb2822c4c68a6d1b629a7d3178-1669677222.ap-southeast-1.elb.amazonaws.com:5000
TestKubernetesHelloWorldExample 2021-10-30T18:44:32+09:00 http_helper.go:32: Making an HTTP GET call to URL http://af5ba2bb2822c4c68a6d1b629a7d3178-1669677222.ap-southeast-1.elb.amazonaws.com:5000
--- PASS: TestKubernetesHelloWorldExample (1.37s)
PASS
ok    github.com/mosuke5/terratest-kubernetes-practice  1.973s
```

## assertion
Goのテスティングフレームワークの話になるのですが、assertionを書きたいことがあります。
Terratestが用意したモジュールのみでテスト可能であればいいのですが、取得したなんらかの値が期待通りかどうかを確認したいこともあります。その場合には、testifyをインストールして使いましょう。

<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://github.com/stretchr/testify" target="_blank">
      <img class="belg-site-image" src="https://opengraph.githubassets.com/f5798fdc3b09f020c310b902a1ed2b3f5ef5a96b6e23f99efa477d4ae306ac42/stretchr/testify" />
    </a>
  </div>
  <div class="belg-right col-md-10">
  <div class="belg-title">
      <a href="https://github.com/stretchr/testify" target="_blank">GitHub - stretchr/testify: A toolkit with common assertions and mocks that plays nicely with the standard library</a>
    </div>
    <div class="belg-description">A toolkit with common assertions and mocks that plays nicely with the standard library - GitHub - stretchr/testify: A toolkit with common assertions and mocks that plays nicely with the standard li...</div>
    <div class="belg-site">
      <img src="https://github.githubassets.com/favicons/favicon.svg" class="belg-site-icon">
      <span class="belg-site-name">GitHub</span>
    </div>
  </div>
</div>

## モジュール外のテストを検討する
Terratestのモジュールは便利ですが、実際のテストシナリオを考えるとTerratestのモジュールだけでは足りないことが出てくると思います。
ここからさきはGoのプログラミングとして考えていく必要がありますが、実際に遭遇したシナリオの例に簡単に実装してみます。

ふたつのシナリオを追加しました。※これらのシナリオが必要というわけではないです。  
ひとつめは、作成されたPodのQoSClassのテストです。LimitRangeを設定していて、Resource設定を行わなかった場合も`BestEffort`ではなく`Burstable`に設定されていることを確認したかったケースです。また、testifyを用いたAssertionでテストしています。

もうひとつが、作成したServiceをPod内から名前解決できるかどうかのテストです。
レアなケースかも知れませんが、KubernetesのDNS機能を外だししていて設定がうまくいっていないと名前解決できないことがあったため確認した例です。IPアドレスの妥当性というよりは、単純にレコードが登録されたかどうかだけのテストですが、デバッグ用のコンテナを用いて確認しました。

```go
package test

import (
  "fmt"
  "testing"
  "time"

  http_helper "github.com/gruntwork-io/terratest/modules/http-helper"
  "github.com/gruntwork-io/terratest/modules/k8s"
  "github.com/gruntwork-io/terratest/modules/shell"
  "github.com/stretchr/testify/assert"
  metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestKubernetesHelloWorldExampleAssertion(t *testing.T) {
  t.Parallel()

  // Kubectlのオプション指定
  options := k8s.NewKubectlOptions("", "", "mosuke5")

  // Serviceリソースを取得
  service := k8s.GetService(t, options, "hello-world-service")

  // HTTPリクエストを投げる先のURLを取得
  url := fmt.Sprintf("http://%s", k8s.GetServiceEndpoint(t, options, service, 5000))

  // 取得したURLへリクエスを送付し、HTTPステータス200で"Hello world!"が返るまでリトライ
  // ドキュメントの記載のリトライ数ではタイムアウトすることがあったので調整しました。
  http_helper.HttpGetWithRetry(t, url, nil, 200, "Hello world!", 60, 3*time.Second)


  // 作成されたPodのQoSClassをassertionで確認
  pods := k8s.ListPods(t, options, metav1.ListOptions{})
  for _, pod := range pods {
    assert.Equal(t, "Burstable", string(pod.Status.QOSClass))
  }

  // Pod内からServiceを名前解決できるか確認
  // 名前解決できないとexit 1で返すのでエラーでテストに失敗する
  command := shell.Command{
    Command: "bash",
    Args: []string{
      "-c",
      "kubectl run --restart=Never --rm -it debug --image registry.gitlab.com/mosuke5/debug-container:latest -- nslookup hello-world-service",
    },
  }
  shell.RunCommandAndGetStdOut(t, command)
}
```

## さいごに
Terratestでテストを書いていくともっともっと実践的なトピックはでてきますが、はじめの一歩ということで共有します。
なかなか書いている人が少ないネタでありながらも、Kubernetesのテストは非常に重要なトピックなので、新しい知見がでてき次第更新したいと思います。