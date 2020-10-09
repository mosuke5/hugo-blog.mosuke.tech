+++
categories = ["Kubernetes"]
date = "2020-10-10T14:06:03+09:00"
description = ""
draft = true
image = ""
tags = ["Tech"]
title = "OperatorSDK for Ansible を使って自作Operatorを作る"
author = "mosuke5"
archive = ["2020"]
+++

## 環境
- OpenShift
- macbook pro

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
$ pip install --user ansible
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
その他、ローカルで実行したり開発をするには下記が必要になります。
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
Copyright (C) 2006  Free Software Foundation, Inc.
This is free software; see the source for copying conditions.
There is NO warranty; not even for MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE.

This program built for i386-apple-darwin11.3.0
```

## Hello world
https://sdk.operatorframework.io/docs/building-operators/ansible/tutorial/

## Memcached Operatorに手を入れる 
### Operatorのコンテナイメージって？
開発したOperatorは `make docker-build docker-push xxxx` にてコンテナイメージを作成後、`make deploy` でKubernetesクラスタ上にデプロイすることが可能です。
このときに作成したコンテナイメージとは何なのかきになったので、どこを見ればいいか確認しておきます。

まず、`make docker-build` で作成するイメージは、プロジェクト内にあるDockerfileから確認できます。
やっていることは非常に簡単で、`quay.io/operator-framework/ansible-operator:v1.0.1` に開発したplaybookやrole, watches.yamlをコピーしているのみのようです。

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

このベースイメージの実体はどこにあるのかを探ってみます。  
operator-framework/operator-sdk 内の `hack/image/ansible/Dockerfile` が実体です。
https://github.com/operator-framework/operator-sdk/blob/master/hack/image/ansible/Dockerfile

### makeでできることを確認する
ドキュメントをいろいろ読んでいくと `make` でいろいろな作業を行います。  
操作については、`Makefile`の中身を必ず見ておきましょう。`Makefile`に慣れていない人は一度こちらのサイトを見ておくと良いです。慣れればただのシェルの実行なので難しくないです。

[Makefileの解説](http://omilab.naist.jp/~mukaigawa/misc/Makefile.html)

- make install
- make deploy
- make undeploy
- make run
- make docker-build

### make deployで行われること
operator deploy
- operator本体
- kube-rbac-proxy

### CRDの定義をカスタマイズしたい
サンプルで作成されるCRDは実は未完成です。  
とくになんの定義もされていない状態であり、何でも定義できてしまいます。
値のバリデーションや必須項目の入力をさせることができないです。
Ansible OperatorではこのCRDは自動生成されることなく自分で記述する必要があります。

たとえば、以下のような定義のMemcachedオブジェクトを作りたいとします。
`size`がPodの数で、`imagetag`が利用するイメージのタグ名です。
`size`については入力が必須であり、`imagetag`は未指定の場合のデフォルト値を設定したいという状態です。

```
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

この様にCRDを定義することで、CRを作成した際のバリデーションを実現できたり、`kubectl expain` で定義を確認することなどができるようになる。

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
ローカルでの実行方法を覚えておくと非常に便利です。
Operator自身は、ローカルで実行可能ですが、Kubernetesクラスタはないと動作確認ができないので、リモート上のKubernetesかDocker Desktopなどでローカル上のKubernetesが必要にはなります。
下記、イメージ図を図にしました。

<図が入る>

```
$ make install
$ make run
```

### playbookを実行したい
チュートリアルのサンプルでは、AnsibleのRoleのみを書いた例だった。
よりAnsibleらしくplaybookを書いて実行したいと思うはずです。
Ansible Operatorでは、`watches.yaml` に

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
Kubernetes内のリソースではなく、外部のリソースを監視した結果で

```
```

### APIバージョンが変わるとき

### molecureでテストしたい

### Operatorを監視したい