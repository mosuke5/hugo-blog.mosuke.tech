+++
categories = ["Kubernetes", "DevOps"]
date = "2019-08-21T19:36:45+09:00"
description = "Ansibleを使ったKubernetes上のリソース管理について試してみました。manifestファイルの適応の選択肢として考えるきっかけになればと思います。"
draft = false
image = ""
tags = ["Tech"]
title = "Kubernetes上のリソースをAnsibleで管理する"
author = "mosuke5"
archive = ["2019"]
+++

お久しぶりです。@mosuke5です。  
Kubernetes上のリソースをどのように管理していますか？
`kubectl apply -f manifest-file.yml` のようにkubectlを使うことがまず多いのかなと思います。
自分もそのようにデプロイすることがおおいです。
今日はAnsibleを用いてKubernetes上のリソースを管理することを試してみたいと思います。
<!--more-->

## Kubernetesモジュール
AnsibleにはKubernetes上のリソースを操作するためのモジュールが用意されています。  
<a href="https://docs.ansible.com/ansible/latest/modules/k8s_module.html#k8s-raw-module" target="_blank">k8s – Manage Kubernetes (K8s) objects — Ansible Documentation</a>

似たモジュールに<a href="https://docs.ansible.com/ansible/latest/modules/kubernetes_module.html" target="_blank">kubernetes</a>というのがあるのですが、こちらはDepricatedになっており、Ansible2.9以降で削除される予定とのことなので、上のものを利用しましょう。

## AnsibleでKubernetes上のリソースを管理する
それでは早速`k8s`モジュールを使って行きたいと思います。まずは事前準備です。  
このモジュールではいくつかrequirementがあります。内部ではopenshiftのpythonライブラリを利用しているようなので忘れずインストールしましょう。

 ```
 $ pip install openshift
 ```


 認証の方法も一通り用意されています。  
 基本的にAnsibleを実行する端末でkubeconfigなりtokenを使ってkubectlが使える環境であれば問題ないです。
 内部的にはkubectlを使うわけではないですが、認証の方法は同じです。

### まずは試す
まずはスタンダードにansibleのtaskに直接リソース情報を書いてみます。  
基本的には`resource_definition`の部分にmanifestのyamlが入るイメージです。
この程度の量なら問題ないですが、行数が増えてくるとだいぶ辛いですね。

```yaml
- name: Create nginx deployment
  k8s:
    namespace: gillsearch-development
    resource_definition:
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        creationTimestamp: null
        labels:
          run: nginx
        name: nginx
      spec:
        replicas: 1
        selector:
          matchLabels:
            run: nginx
        strategy: {}
        template:
          metadata:
            creationTimestamp: null
            labels:
              run: nginx
          spec:
            containers:
            - image: nginx:latest
              name: nginx
              resources: {}
      status: {}
```

### 既存のmanifestファイルを利用する
上の方法では、辛いケースも多く出てくると思います。
また、すでに書いてあるmanifestもあることも多いと思いますので、既存のmanifestファイルから読みたいです。
このようにファイルから読み出すことももちろん可能です。  
`./templates/nginx-from-file.yml`は通常通りのmanifestファイルです。

```yaml
- name: Create nginx deployment
  k8s:
    namespace: gillsearch-development
    state: present
    src: ./templates/nginx-from-file.yml
```

### Templateを使ってmanifestを生成して利用する
manifestファイルをそのまま利用するのであればAnsibleを使うメリットは少なくなってしまうかなと思います。  
AnsibleではJinja2を使ったテンプレートの機能があるのでこれを活用しない手はありません。
例えば、Nginxのデプロイメントのレプリカ数を変数にしてmanifestファイルをテンプレート化して使ってみます。

```text
- name: Create nginx deployment
  k8s:
    namespace: gillsearch-development
    state: present
    resource_definition: "{{ lookup('template', './templates/nginx-from-template.yml.j2') }}"
```

`./templates/nginx-from-template.yml.j2`内で変数展開などが可能。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  creationTimestamp: null
  labels:
    run: nginx-from-template
  name: nginx-from-template
spec:
  replicas: {{ nginx_replicas }}  ## <--ここ
  selector:
    matchLabels:
      run: nginx-from-template
  strategy: {}
  template:
    metadata:
      creationTimestamp: null
      labels:
        run: nginx-from-template
    spec:
      containers:
      - image: nginx:latest
        name: nginx-from-template
        resources: {}
```

この例は簡単な例ですが、AnsibleのTemplateや他の機能を使うことで、
環境ごとでの（例えばProductionとTest環境）とで挙動や値を変えることももちろん可能です。

## Ansibleで管理するメリットについて考える
それではAnsibleを使ってKubernetesを管理するメリットについてもう少し考えてみたいと思います。  
基本的にAnsibleの機能をどう活かすかというところにつきるわけですが、どんな活用法があるでしょうか。

### 1. Template機能を利用できる
上の例でも見てきましたが、Template機能を使えることはまず１つメリットとして考えられると思います。  
もちろんHelmなど他のツールでもKubernetesのmanifestのテンプレート化などは可能ですが、Ansibleでも同様に可能です。
AnsibleではJinja2のテンプレートエンジンを利用していますが、変数展開はもちろんif文なども利用でき活用の幅は大きいと思います。

### 2. ansible-vaultを利用してシークレット情報の管理ができる
Ansibleにはシークレット情報を暗号化できる<a href="https://docs.ansible.com/ansible/latest/user_guide/vault.html" target="_blank">ansible-vault</a>という機能・コマンドがあります。  
こちらを使うことで、Kubernetesのsecretリソースの管理にも活用できる点は良いポイントかもしれません。  
例えば、credential情報をvar_fileとして記述しansible-vaultで暗号化して保存しておくとします。
そうするとKubernetesのSecretを作る際に下記のように展開して作成することも可能です。

```text
apiVersion: v1
data:
  password: {{ password | b64encode }}
kind: Secret
metadata:
  creationTimestamp: null
  name: mysecret
```

### 3. 他の作業の流れに組み込みやすい
Ansibleはもとはサーバのプロビジョニングツールとしての位置づけが強いツールですが、今となっては今回のKubernetesやクラウドサービスなど様々なツールのプロビジョニングに活用されています。
そのため、他のツールやサーバ上の管理の流れと一部としてKubernetesの制御しやすいのは特徴的なポイントです。

例えば、Kubernetes上にリソースをデプロイ後に、DNSの設定を追加・変更するなどのKubernetes以外の操作と組み合わせしやすいかと思います。

## まとめ
Ansibleを使って、Kubernetes上のリソースに対する操作をやってみました。
Ansibleという使い慣れているツールで、Templateやvaultの機能を利用できるのは良いポイントと感じました。
実際の運用に組み込めるか、採用するかどうかはいろいろ考えてみないとわかりませんが、選択肢の１つとしてありかなと現時点では思っています。

## 関連情報
過去に書いた関連情報を掲載しておきます。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2019/03/07/k8s-with-terraform/" data-iframely-url="//cdn.iframe.ly/al5KMSQ"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>