+++
categories = ["OpenShift"]
date = "2021-10-14T14:01:46+09:00"
description = ""
draft = true
image = ""
tags = ["Tech"]
title = "OpenShift GitOps(Argo CD)でテンプレートを使う方法"
author = "mosuke5"
archive = ["2021"]
+++

こんにちは、もーすけです。  
本日は、OpenShiftで提供するGitOps機能であるOpenShift GitOps（内部実装はArgo CD）で、OpenShiftテンプレートを使う方法を解説します。Argo CDでは、KustomizeやHelmといったアプリケーションをサポートしていますが、昔からのOpenShiftユーザであれば、OpenShiftテンプレートも使いたいユースケースがでてくるでしょう。
今回は、その設定方法を紹介します。
<!--more-->

## 環境
以下の環境で検証を行いました。

- OpenShift 4.8
- OpenShift GitOps 1.2.1 (Argo CD 2.0.5)

<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://access.redhat.com/documentation/ja-jp/openshift_container_platform/4.8/html/images/templates-writing_using-templates" target="_blank">
      <img class="belg-site-image" src="https://access.redhat.com/webassets/avalon/g/shadowman-200.png" />
    </a>
  </div>
  <div class="belg-right col-md-10">
  <div class="belg-title">
      <a href="https://access.redhat.com/documentation/ja-jp/openshift_container_platform/4.8/html/images/templates-writing_using-templates" target="_blank">10.7. テンプレートの作成 OpenShift Container Platform 4.8 | Red Hat Customer Portal</a>
    </div>
    <div class="belg-description">The Red Hat Customer Portal delivers the knowledge, expertise, and guidance available through your Red Hat subscription.</div>
    <div class="belg-site">
      <img src="https://access.redhat.com/webassets/avalon/g/favicon.ico" class="belg-site-icon">
      <span class="belg-site-name">Red Hat Customer Portal</span>
    </div>
  </div>
</div>

## Argo CDが対応するアプリケーション
Argo CDでは、現在以下の形式をサポートしています（{{< external_link url="https://argo-cd.readthedocs.io/en/stable/user-guide/application_sources/" title="公式ドキュメント" >}}）。
重要なことは、最終的に「Kubernetesマニフェストの形になる」ということです。
今回は、この最後の「Any custom config management tool configured as a config management plugin」を用いてOpenShiftテンプレートを使うということです。

- Kustomize applications
  - テンプレートエンジン（テンプレートエンジンというよりは、オーバライド型のマニフェスト生成ツールといったほうが正しい？）の一角のKustomizeを使ってデプロイできる形式ならデプロイ可能。
  - Kustomizeはいまとなっては、`kubectl`, `oc`にも統合されており、`oc apply -k xxxxx`で使える。
- Helm charts
  - テンプレートエンジンとしての色がつよいツールで、代表格的存在。
  - Argo CDに利用するValues File（パラメータファイル）を指定することで、商用・テスト・開発などの環境を分けられる。
- Ksonnet applications
  - Kubernetesマニフェストを生成するフレームワークだったが、今はプロジェクトが終了。利用は非推奨。
  - いままでKsonnetを使っていなかった人は無視してOK
- directory of YAML/JSON/Jsonnet manifests, including Jsonnet.
  - プレーンなYAML/JSON形式のマニフェストを配置しておいてもOK。まあプレーンなんで。
  - Jsonnetは、JSONを生成するためのデータテンプレートツール。最終的にJSON形式のマニフェストを作る。
- Any custom config management tool configured as a config management plugin
  - 上記以外でも、任意のツールを用いてマニフェストを生成できればプラグイン機能で対応可能。
  - シェルスクリプトでも、独自のツールでも最終的にマニフェストができあがれば利用できる。
  - ★<u>OpenShiftを利用の人でOpenShiftテンプレートを使いたい場合はこれ。</u>

## ocコマンドのインストール確認
Argo CDのプラグインでは、Argo CDの本体内に利用するコマンドが入っている必要があります。
コミュニティ版のArgo CDでは、ocコマンドは含まれないため独自で入れる必要がありますが、OpenShift GitOpsが提供するArgo CD内にはすでにocコマンドが含まれています。
実際にコマンドで確認してみましょう。

Argo CDの本体は`openshift-gitops-application-controller-X`のPodです。
このPod内にocコマンドが導入されていれば、とくに細工なくocテンプレートを利用できます。

```
$ oc get pod -n openshift-gitops
NAME                                                         READY   STATUS    RESTARTS   AGE
cluster-5df976c97b-rshn8                                     1/1     Running   3          2d
kam-7f748468cd-9845l                                         1/1     Running   3          2d
openshift-gitops-application-controller-0                    1/1     Running   3          2d
openshift-gitops-applicationset-controller-f696fd5d8-lnd8l   1/1     Running   3          2d
openshift-gitops-redis-7867d74fb4-fbft2                      1/1     Running   3          2d
openshift-gitops-repo-server-6db899d69b-hljg6                1/1     Running   3          2d

$ oc exec openshift-gitops-application-controller-0 -n openshift-gitops -- oc version
Client Version: 4.7.0-202109031319.p0.git.e6f2e9b.assembly.stream-e6f2e9b
Server Version: 4.8.13
Kubernetes Version: v1.21.1+a620f50
```

## Argo CDへのプラグイン設定
### ConfigMapは直接修正できない
次にプラグイン設定を行います。Argo CDの公式ドキュメントでは、`argocd-cm`というConfigMap内に次のような設定を書き込むように書かれています。

```yaml
data:
  configManagementPlugins: |
    - name: pluginName
      init:                          # Optional command to initialize application source directory
        command: ["sample command"]
        args: ["sample args"]
      generate:                      # Command to generate manifests YAML
        command: ["sample command"]
        args: ["sample args"]
```

最終的には、`argocd-cm`に上のように書き込めればいいのですが、`oc edit cm argocd-cm`で書き込んでも実はすぐに追加した設定が消されます。
それは、OpenShift GitOpsではArgo CDがOperatorによって管理されているためです。
Operator側で設定を書き換えない限り、適切にConfigMapを修正することができません。

### Argo CD Operator
OpenShift GitOpsは、Argo CD Operatorによって動きます。
Argo CD Operatorのドキュメントをみると、`Config Management Plugins`を修正するパラメータが用意されていることが確認できます。

<div class="belg-link row">
  <div class="belg-right col-md-12">
  <div class="belg-title">
      <a href="https://argocd-operator.readthedocs.io/en/latest/reference/argocd/#config-management-plugins" target="_blank">ArgoCD - Argo CD Operator (Config Management Plugins)</a>
    </div>
    <div class="belg-description">Configuration to add a config management plugin. This property maps directly to the configManagementPlugins field in the argocd-cm ConfigMap.</div>
    <div class="belg-site">
      <img src="https://argocd-operator.readthedocs.io/en/latest/assets/images/favicon.png" class="belg-site-icon">
      <span class="belg-site-name">argocd-operator.readthedocs.io</span>
    </div>
  </div>
</div>



## テンプレート生成

## パラメータ設定
