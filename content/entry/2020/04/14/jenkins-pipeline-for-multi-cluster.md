+++
categories = ["Kubernetes", "DevOps"]
date = "2020-04-14T17:05:07+09:00"
description = "Jenkins pipelineで複数のOpenShiftクラスタを扱う方法について共有します。OpenShift Jenkins Pipeline Pluginを使ったマルチクラスタの扱いを紹介します。"
draft = false
image = ""
tags = ["Tech"]
title = "Jenkins pipelineで複数のOpenShiftクラスタを扱う"
author = "mosuke5"
archive = ["2020"]
+++

もーすけです。今日はJenkinsを使ったKubernetes(OpenShift)環境でのデプロイ関連についてです。  
Jenkins pipelineで複数クラスタ（マルチクラスタ）を扱いたい場合の設定方法について確認したので共有します。

## 背景
以前にskopeoを用いたコンテナイメージの別レジストリへのコピーする方法について書きました。
イメージを別レジストリへコピーする目的は、イメージをビルドしたクラスタと本番環境が別クラスタの場合などがあります。
必然的に、Jenkins pipelineで複数のOpenShiftのクラスタに対して操作したいということになります。
やることは単純で、複数のクラスタの認証情報を用意して操作することになるわけですが、JenkinsのOpenShift Client Pluginを用いた方法についてメモしていきます。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2020/04/05/skopeo/" data-iframely-url="//cdn.iframe.ly/SsqYHwS"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

本ブログでは下記状況を想定します。  

- OpenShiftを利用している
- OpenShift上のクラスタAでJenkinsを動作させている
- クラスタAはステージング環境として利用している
- クラスタBはプロダクション環境であり、上のJenkinsからアプリケーションをデプロイしたいと考えている
- Jenkins pipelineを使っており、OpenShiftの操作は<a href="https://github.com/openshift/jenkins-client-plugin" target="_blank">OpenShift Jenkins Pipeline Plugin</a>を用いている

![jenkins-pipeline-multi-cluster-overview](/image/jenkins-pipeline-multi-cluster-overview.png)

## 実装方法
### ServiceAccountの用意
複数クラスタを扱うということは、Jenkinsが起動するクラスタとは異なるクラスタの操作をする必要があるということです。
OpenShiftクラスタへの外部からの認証方法を検討しなければいけません。
一般的にKubernetesへの認証方法はいくつかありますが、ここではServiceAccountを利用します。
ServiceAccountはもともとは、Podで実行されるプロセスに割り当てるためのものですが、認証にも利用できます。
ServiceAccountを削除すれば認証のTokenも削除できるので比較的便利です。

環境B側にServiceAccountを作成しましょう（ここでは`jenkins-deploy`というServiceAccountを作ります）。  
ServiceAccountは作成されると、Secret(Tokenなど)が自動的に作成されます。
そのTokenを使って認証することができます。

```
$ oc create serviceaccount jenkins-deploy
serviceaccount/jenkins-deploy created

$ oc get secret
NAME                             TYPE                                  DATA   AGE
...
jenkins-deploy-dockercfg-pjwrj   kubernetes.io/dockercfg               1      3m35s
jenkins-deploy-token-bvf8p       kubernetes.io/service-account-token   4      3m35s
jenkins-deploy-token-c5fhl       kubernetes.io/service-account-token   4      3m35s
```

自動で作成されたSecretの中には、Tokenの他に証明書、Namespaceの情報が保存されています。  
次のステップでこのTokenと証明書を利用していきます。

```
$ oc describe secrets jenkins-deploy-token-bvf8p
Name:         jenkins-deploy-token-bvf8p
Namespace:    mosuke5
Labels:       <none>
Annotations:  kubernetes.io/service-account.name: jenkins-deploy
              kubernetes.io/service-account.uid: fa79ec6f-c055-4d2e-a369-e3d4b5dae2bd

Type:  kubernetes.io/service-account-token

Data
====
ca.crt:          5932 bytes
namespace:       7 bytes
service-ca.crt:  7133 bytes
token:           xxxxxxxxxxxxxxxxxxxxxx
```

次に操作できる権限についてです。  
上で作成されたTokenを使って認証するわけですが、目的はJenkins pipelineからクラスタBにKubernetesリソースを作成したりのデプロイ操作です。
そのため、ServiceAccountに対して権限設定（RBAC）をしてあげる必要があります。
この権限設定は十分に注意しましょう。強い権限を与えすぎると、Jenkins Pipelineから必要以上の操作ができてしまいます。  
下はeditのcluster roleを与えますが、プロジェクトに合わせて適切なロールを作成して割り当てるようにしてください。

```
$ oc policy add-role-to-user edit system:serviceaccount:production:jenkins-deploy -n production
clusterrole.rbac.authorization.k8s.io/edit added: "system:serviceaccount:mosuke5:jenkins-deploy"
```

### Jenkins設定
続いてJenkins側の設定を確認していきます。  
のちに行うパイプランの設定次第では、この設定はなくても動くのですが、
クラスタ固有の情報をJenkinsパイプランに記述することは望ましくありませんので、こちらに設定することをおすすめします。

[Manage Jenkins -> Configure System -> OpenShift Client Plugin]からクラスタ追加の設定ができます。
以下が設定例の画面です。
設定のために用意するものは最低２つ、できれば３つあります。
クラスタのAPIのエンドポイントと上で作成したToken(画面でいうCredentials)は必須です。クラスタのAPIエンドポイントは、Routerエンドポイントではないので注意してください。
`Server Certificate Authority` は`Disable TLS Verify`にチェックを入れれば任意ですが、本番環境では設定することをおすすめします。

![jenkins-other-openshift-cluster](/image/jenkins-other-openshift-cluster.png)

TokenはJenkinsのCredential Providerに保存して利用できます。

![jenkins-credential-provider-openshift-client](/image/jenkins-credential-provider-openshift-client.png)

### Pipeline
さて、最後にJenkinsfileによるパイプランの設定を確認していきます。  
`openshift.withCluster()`で利用するクラスタを切り替えることができます。
`openshift.withCluster('your-cluster')`の `'your-cluster'`には、一つ前のJenkins側の設定で記述した`Cluster Name`がはいります。

```
pipeline {
  agent {
    kubernetes {
      cloud 'openshift'
      label 'maven'
    }
  }

  stages {
    stage('deploy to cluster A') {
      steps {
        script {
          openshift.withCluster() {
            openshift.withProject("staging") {
              echo "Hello from ${openshift.cluster()}. Project: ${openshift.project()}"
              // 任意のデプロイ処理
            }
          }
        }
      }
    }

    stage('deploy to cluster B') {
      steps {
        script {
          openshift.withCluster( 'prod-openshift' ) {
            openshift.withProject('production') {
              echo "Hello from ${openshift.cluster()}. Project: ${openshift.project()}"
              // 任意のデプロイ処理
            }
          }
        }
      }
    }
  }
}
```

## さいごに
特に難しいこともなく、GithubのREADMEをきちんと読めばできることだったのですが、
いくつか設定してハマったところもあったので書き残しました。
Jenkinsはもう古いと思いつつも、JenkinsXやJenkins Opratorもでてきているので、まだまだお世話になりそうです。
OpenShift x OpenShiftをガンガン使いこなしておきましょう。