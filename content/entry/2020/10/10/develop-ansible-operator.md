+++
categories = ["Kubernetes"]
date = "2020-10-10T14:06:03+09:00"
description = "OperatorSDKを用いてAnsible Operatorを開発する際のTipsをまとめまています。チュートリアルのあとにやったほうがいいことを中心に紹介します。"
draft = false
image = ""
tags = ["Tech"]
title = "OperatorSDK for Ansible の開発。チュートリアルの次の一歩"
author = "mosuke5"
archive = ["2020"]
+++

こんにちは、もーすけです。  
本日は、Kubernetes Operatorの開発に関する情報提供をしたいと思います。
Operatorってなに？ってかたやより内部実装を学びたい方はぜひこちらの書籍（[実践入門 Kubernetesカスタムコントローラーへの道](https://amzn.to/34SwsvS)）を参考にしてください。

Operator開発にはOperatorSDKを利用するのが非常に便利です。Go, Ansible, Helmなどを用いて開発できるのですが、今回はAnsibleを使ったOperatorについて書きます。
OperatorSDKは便利ですが、まだまだ情報が少なく、ドキュメントのチュートリアルを実施したあとに何をすればいいのか？とっつきにくいさもあります。
というわけで、このブログでは、チュートリアル後に何をすればいいか？どんなことを確認していけばいいのか？という観点でまとめてみましたので、ぜひ参考にしてOperator開発を楽しんでください。

まだチュートリアルをやっていないよ、というかたはこちらから済ましてみましょう。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://sdk.operatorframework.io/docs/building-operators/ansible/tutorial/" data-iframely-url="//cdn.iframe.ly/2QAR3qE"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>
<!--more-->

## 環境
まず環境について書いておきます。
チュートリアルを終えられている想定のため細かいことは不要かと思いますが、記載しておきます。

- 作業環境: MacBook Pro (13-inch, 2017), macOS Catalina 10.15.7
- Kubernetes環境: OpenShift 4.4.8
  - minikubeなででも当然大丈夫です

### OperatorSDK
macOSの環境だったため、`brew` でインストールしました。
[公式ドキュメント](https://sdk.operatorframework.io/docs/installation/install-operator-sdk/)を見ながら各自の環境でインストールしてください。
OperatorSDKは、v1.0を前提としています。それ以前のバージョンとは大きく仕様が変更になっているため気をつけてください。

```
$ brew install operator-sdk
$ operator-sdk version
operator-sdk version: "v1.0.1", commit: "4169b318b578156ed56530f373d328276d040a1b", kubernetes version: "v1.18.2", go version: "go1.15.2 darwin/amd64", GOOS: "darwin", GOARCH: "amd64"
```

### Ansible
Operator開発に必ずしもAnsibleは必要ありません。
もし、Kubernetesクラスタ上でしか動作させないというのであれば開発端末へのAnsibleのインストールは不要ですが、やはり動作確認のために開発端末上で確認できたほうが当然よいです。
開発端末にAnsibleをインストールしておくことを推奨します。自分は `pip` でインストールしました。

```
$ pip3 install --user ansible
...
$ ansible --version
ansible 2.10.2
  config file = None
  configured module search path = ['/Users/shinyamori/.ansible/plugins/modules', '/usr/share/ansible/plugins/modules']
  ansible python module location = /Users/shinyamori/Library/Python/3.8/lib/python/site-packages/ansible
  executable location = /Users/shinyamori/Library/Python/3.8/bin//ansible
  python version = 3.8.5 (default, Jul 21 2020, 10:48:26) [Clang 11.0.3 (clang-1103.0.32.62)]
```

### その他のツール
その他、ローカルでの実行・開発をするには下記が必要になります。
- ansible-runner
- ansible-runner-http
- docker
- make

```
$ pip3 install --user ansible-runner
$ ansible-runner --version
1.4.6

$ pip3 install --user ansible-runner-http
$ pip3 list | grep ansible-runner-http
ansible-runner-http 1.0.0
```

Operatorは最終的にコンテナとして動作させます。
コンテナイメージのビルドや後述するOperatorのテストでDockerを使うのでインストールしておきます。
mac環境ではDocker Desktopを入れておけばいいでしょう。

```
$ docker version
Client: Docker Engine - Community
 Cloud integration  0.1.18
 Version:           19.03.13
 API version:       1.40
 Go version:        go1.13.15
 Git commit:        4484c46d9d
 Built:             Wed Sep 16 16:58:31 2020
 OS/Arch:           darwin/amd64
 Experimental:      true

Server: Docker Engine - Community
 Engine:
  Version:          19.03.13
  API version:      1.40 (minimum version 1.12)
  Go version:       go1.13.15
  Git commit:       4484c46d9d
  Built:            Wed Sep 16 17:07:04 2020
  OS/Arch:          linux/amd64
  Experimental:     true
 containerd:
  Version:          v1.3.7
  GitCommit:        8fba4e9a7d01810a393d5d25a3621dc101981175
 runc:
  Version:          1.0.0-rc10
  GitCommit:        dc9208a3303feef5b3839f4323d9beb36df0a9dd
 docker-init:
  Version:          0.18.0
  GitCommit:        fec3683
```

Operator開発時にはMakefileを用いた操作を多用します。`make` の有無も確認しておきましょう。

```
$ make --version
GNU Make 3.81
...
```

## チュートリアルの次の一歩
それでは本題に入っていきます。  
チュートリアルを終えたあとにどんなことを確認しておけばいいか？という観点でいくつかまとめました。
最終的なサンプルコードとしては追って公開する予定です。

### Operatorのコンテナイメージの実体を知りたい
開発したOperatorは `make docker-build docker-push xxxx` にてコンテナイメージを作成後、`make deploy` でKubernetesクラスタ上にデプロイすることが可能です。
このときに作成したコンテナイメージとは何なのか気になったので、どこを確認すればいいかみておきます。

まず、`make docker-build` で作成するイメージは、プロジェクト内にあるDockerfileを用いてビルドされます。
やっていることは非常に簡単で、`quay.io/operator-framework/ansible-operator:v1.0.1` に開発したplaybookやrole, watches.yamlをコピーしているのみです。

```
$ cat Dockerfile
FROM quay.io/operator-framework/ansible-operator:v1.0.1

COPY requirements.yml ${HOME}/requirements.yml
RUN ansible-galaxy collection install -r ${HOME}/requirements.yml \
 && chmod -R ug+rwx ${HOME}/.ansible

COPY watches.yaml ${HOME}/watches.yaml
COPY roles/ ${HOME}/roles/
COPY playbooks/ ${HOME}/playbooks/
```

では、このベースイメージとなっている `quay.io/operator-framework/ansible-operator:v1.0.1` の実体はどこにあるのかを探ってみます。  
operator-framework/operator-sdk 内の `hack/image/ansible/Dockerfile` が実体です。
https://github.com/operator-framework/operator-sdk/blob/master/hack/image/ansible/Dockerfile

ベースイメージも非常にシンプルで、Ansibleなど必要なライブラリを基本的にインストールしているのみです。動かしている実体はGoで実装された `ansible-operator` というコマンドです。
こちらの動作を追うにはGitHubで [operator-sdk/internal/ansible](https://github.com/operator-framework/operator-sdk/tree/master/internal/ansible) をのぞくといいでしょう。

### makeでできることを確認したい
ドキュメントをいろいろ読んでいくと `make` でいろいろな作業を行います。  
操作については、`Makefile`の中身を必ず見ておきましょう。`Makefile`に慣れていない人は一度こちらのサイトを見ておくと良いです。慣れればただのシェルの実行なので難しくないです。

[Makefileの解説](http://omilab.naist.jp/~mukaigawa/misc/Makefile.html)

|  コマンド  |  内容  |
| ---- | ---- |
|  make install  |  CRDのみをクラスタにインストールする。ローカル開発時に利用する。  |
|  make uninstall  |  CRDをクラスタから削除する。 |
|  make deploy  |  CRDやOperatorのDeployment、RoleなどOperatorを動作させるために必要な一式をクラスタにデプロイする。  |
|  make undeploy  |  Operatorを動作させるために必要な一式をクラスタから削除する。  |
|  make docker-build  |  Operatorのコンテナイメージをビルドする。  |
|  make docker-push  |  OperatorのコンテナイメージをレジストリにPushする。  |
|  make run  |  ローカル上でOperatorを実行する。  |

### CRDの定義をカスタマイズしたい
サンプルで作成されるCRDは実は未完成です。  
とくになんの定義もされていない状態であり、何でも定義できてしまいます。
値のバリデーションや必須項目の入力をさせることができないです。
Ansible OperatorではこのCRDは自動生成されることなく自分で記述する必要があります。

たとえば、以下のような定義のMemcachedオブジェクトを作りたいとします。
`size`がPodの数で、`imagetag`が利用するイメージのタグ名です。
`size`については入力が必須であり、`imagetag`は未指定の場合のデフォルト値を設定したいという状態です。

```yaml
apiVersion: cache.example.com/v1
kind: Memcached
metadata:
  name: memcached-sample
spec:
  size: 3  # <- 必須項目
  imagetag: hogehogetag  # <- オプション項目
```

このような定義を作るためには、下記のようにCRDファイルを修正する必要があります。（途中、省略しています）

```yaml
$ cat config/crd/bases/cache.example.com_memcacheds.yaml
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: memcacheds.cache.example.com
spec:
  ...
    schema:
      openAPIV3Schema:
        description: Memcached is the Schema for the memcacheds API
        properties:
          apiVersion:
            description: 'APIVersion defines the versioned schema of this representation
              of an object. Servers should convert recognized schemas to the latest
              internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources'
            type: string
          kind:
            description: 'Kind is a string value representing the REST resource this
              object represents. Servers may infer this from the endpoint the client
              submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds'
            type: string
          metadata:
            type: object
          spec:
            description: MemcachedSpec defines the desired state of Memcached
            properties:
              size:
                description: Size is the size of the memcached deployment
                format: int32
                type: integer
              imagetag:
                description: Image Tag is the name of image tag
                type: string
                default: "latest"
            required:
              - size
            type: object
          status:
            ...
```

このようにCRDを定義することで、CRを作成する際のバリデーションを実現できたり、`kubectl expain` で定義を確認することなどができるようになります。

```
$ kubectl explain memcached.spec
KIND:     Memcached
VERSION:  cache.example.com/v1

RESOURCE: spec <Object>

DESCRIPTION:
     MemcachedSpec defines the desired state of Memcached

FIELDS:
   imagetag	<string>
     Image Tag is the name of image tag

   size	<integer> -required-
     Size is the size of the memcached deployment
```

### ローカルで実行したい
OperatorをいちいちKubernetesクラスタにデプロイして検証するには結構手間がかかりたいへんです。Operatorもローカル（開発端末上）で検証できるに越したことはありません。
ローカルでの実行方法を覚えておくと非常に便利です。上で紹介しましたが、`make run` でansible-operatorをローカル環境で実行が可能です。
Operator自身はローカルで実行可能ですが、Kubernetesクラスタはないと動作確認ができないので、リモート上のKubernetesかDocker Desktopなどでローカル上のKubernetesが必要にはなります。
下記、イメージを図にしました。

![ansible-operator-on-laptop](/image/ansible-operator-on-laptop.png)

### playbookを実行したい
チュートリアルのサンプルでは、AnsibleのRoleのみを書いた例でした。
より凝った処理を行おうと思うと、Ansibleらしくplaybookを調整ループ（reconciliation loop）の中で実行したいと思うはずです。
Ansible Operatorでは、`watches.yaml` に、playbookのファイルのパスを指定することでansible playbookを実行できます。

```yaml
---
# Use the 'create api' subcommand to add watches to this file.
- version: v1
  group: cache.example.com
  kind: Memcached
  role: memcached
- version: v1alpha1
  group: cache.example.com
  kind: MyDeployment
  playbook: playbooks/mydeployment.yaml
# +kubebuilder:scaffold:watch
```

### 外部リソースを監視したい
Kubernetes内のリソースではなく、外部のリソースを監視した結果でKubernetesリソースを変更したいこともあるでしょう。
実際にこの例では、あるWebサーバの返すレスポンスの値に応じてPod数を変更したいと考えていたとします。
こういう場合は、`reconcilePeriod` を設定するといいです。以下の場合、10秒ごとに調整ループを実行することになり、Kubernetes外のイベントへの調整が可能になります。

```yaml
---
- version: v1
  group: cache.example.com
  kind: MyExternalDeployment
  playbook: playbooks/myexternaldeployment.yml
  reconcilePeriod: 10s
  watchDependentResources: False
```

### APIバージョンを追加したい
Operatorを開発し運用していくと、途中のバージョンからCRDのスキーマレベルで変更したいなどの大きな変更をしたいということは訪れるはずです。
APIバージョンを新しく追加したい場合はどうすればいいか調べてみました。

本来であれば、同じリソース名でapiVersionのみを変更し対応したいところですが、現状のansible-operaotorでは複数APIバージョンには対応していません。
今後のバージョンアップに期待です。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://github.com/operator-framework/operator-sdk/issues/2950" data-iframely-url="//cdn.iframe.ly/Su69ApK"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

### 利用できる変数を確認したい
playbookを書いていると、KubernetesのCRで定義した情報を変数として利用したいことがでてきます。その変数をどの様にとりだしたらいいかわからなくなることがあるので、変数をダンプするすべを覚えておくといいです。
APIのグループとkind名で一定の命名規則で変数が格納されます。下の例だと `group = cache.example.com` で `kind = MyExternalDeployment` の場合、`_cache_example_com_myexternaldeployment` という名前で生成されます。

```
- name: "dump variables vars"
  debug: var=vars

TASK [dump variables vars] ********************************
ok: [localhost] => {
    "vars": {
        "_cache_example_com_myexternaldeployment": {
            "apiVersion": "cache.example.com/v1",
            "kind": "MyExternalDeployment",
            "metadata": {
                "annotations": {
                    "ansible.sdk.operatorframework.io/verbosity": "5",
                    "kubectl.kubernetes.io/last-applied-configuration": "{\"apiVersion\":\"cache.example.com/v1\",\"kind\":\"MyExternalDeployment\",\"metadata\":{\"annota
tions\":{\"ansible.sdk.operatorframework.io/verbosity\":\"5\"},\"name\":\"myexternaldeployment-sample\",\"namespace\":\"default\"},\"spec\":{\"imagetag\":\"latest\",\"mon
itoringUrl\":\"https://raw.githubusercontent.com/mosuke5/ansible-operator-practice/master/config/testdata/sample.json\"}}\n"
                },
                "creationTimestamp": "2020-10-14T04:30:15Z",
                "generation": 1,
                "name": "myexternaldeployment-sample",
                "namespace": "default",
                "resourceVersion": "591896",
                "selfLink": "/apis/cache.example.com/v1/namespaces/default/myexternaldeployments/myexternaldeployment-sample/status",
                "uid": "cae902e5-05d9-40ea-93b5-1896c53eab59"
            },
            "spec": {
                "imagetag": "latest",
                "monitoringUrl": "https://raw.githubusercontent.com/mosuke5/ansible-operator-practice/master/config/testdata/sample.json"
            },
```

### Operatorの挙動をテストしたい
ソフトウェア開発でテストコードを書くのと同じ様に、Operator開発でも（しかもAnsibleを使った開発でも）テストが書けます。
Ansibleのテストツールで有名な[molecule](https://molecule.readthedocs.io/en/latest/)を用いることができます。

最新版のOperatorSDKでは、[kind](https://github.com/kubernetes-sigs/kind)(kubernetes in docker)を用いて、ローカル内でテストができるように設計されています。
ローカル環境でテストしたい場合は、Dockerとmoleculeのインストールを忘れず行いましょう。
`molecule/verify.yml`内に`molecule/default/tasks/*_test.yml`のテストが実行されるように定義されています。
独自のテストシナリオは、`molecule/default/tasks/*_test.yml`に書いていけば問題ありません。

```
molecule
├── default
│   ├── converge.yml
│   ├── create.yml
│   ├── destroy.yml
│   ├── kustomize.yml
│   ├── molecule.yml
│   ├── prepare.yml
│   ├── tasks
│   │   ├── memcached_test.yml
│   │   ├── mydeployment_test.yml
│   │   └── myexternaldeployment_test.yml
│   └── verify.yml
└── kind
    ├── converge.yml
    ├── create.yml
    ├── destroy.yml
    └── molecule.yml
```

Operator開発でのテストは、基本的に`アクションする`→`Kubernetes APIを実行する`→`結果を確認する`の3ステップで実施できます。
たとえば、`CRのreplicasを変更する`→`Kubernetes APIで特定のPodの情報を取る`→`期待する数に変動したか確認する`などです。
下記にサンプルを書いてみましたので参照ください。（随時ブラッシュアップ中）

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://github.com/mosuke5/ansible-operator-practice/blob/master/molecule/default/tasks/memcached_test.yml" data-iframely-url="//cdn.iframe.ly/6t2BdTo"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

### Operatorを監視したい
OperatorSDKで実行されるプロセスには、Prometheus形式のメトリクスを出力するエンドポイントが内包されています。
OperatorSDKを用いて起動したOperatorのメトリクスをPrometheusで取得することは非常に容易です。
一番簡単に確認する方法としては、`make run` で起動したあとに、`localhost:8888/metrics` にブラウザから接続することです。下記のようなメトリクスが出力されていることが確認できるはずです。

```
# HELP aggregator_openapi_v2_regeneration_count [ALPHA] Counter of OpenAPI v2 spec regeneration count broken down by causing APIService name and reason.
# TYPE aggregator_openapi_v2_regeneration_count counter
aggregator_openapi_v2_regeneration_count{apiservice="*",reason="startup"} 0
aggregator_openapi_v2_regeneration_count{apiservice="k8s_internal_local_delegation_chain_0000000002",reason="update"} 0
aggregator_openapi_v2_regeneration_count{apiservice="v1.apps.openshift.io",reason="add"} 0
aggregator_openapi_v2_regeneration_count{apiservice="v1.apps.openshift.io",reason="update"} 0
aggregator_openapi_v2_regeneration_count{apiservice="v1.authorization.openshift.io",reason="add"} 0
aggregator_openapi_v2_regeneration_count{apiservice="v1.authorization.openshift.io",reason="update"} 0
aggregator_openapi_v2_regeneration_count{apiservice="v1.build.openshift.io",reason="add"} 0
aggregator_openapi_v2_regeneration_count{apiservice="v1.build.openshift.io",reason="update"} 0
aggregator_openapi_v2_regeneration_count{apiservice="v1.image.openshift.io",reason="add"} 0
...
```

## さいごに
Operatorの自作はまだまだ情報もすくなく難しく感じるかもしれません。
しかし、OperatorSDKはかなり優秀で、Operatorのロジック部分に集中できるフレームワークです。ちょっとした仕組みとなにをすればいいかわかればおそらくみなさんもOperator開発をガンガン進められるのではないかと思います。