+++
categories = ["Kubernetes", "OpenShift"]
date = "2022-02-08T14:16:45+09:00"
description = "Argo CDを用いて外部クラスタへアプリケーションをデプロイするときの認証情報まわりについて確認しました。"
draft = true
image = ""
tags = ["Tech"]
title = "Argo CD、外部クラスタへのデプロイと認証の仕組み"
author = "mosuke5"
archive = ["2022"]
+++

{{< argocd-series >}}

こんにちは、もーすけです。  
今回はArgo CDを用いて、外部のKubernetesクラスタへアプリケーションをデプロイすることについて動きを確認します。
<!--more-->

## やりたいこと
今回やっていくのは、Argo CDが存在するクラスタの外（外部クラスタ）へのデプロイです。
これまでのブログでは、Argo CDが起動しているクラスタ内での作業でしたが、外部クラスタへのデプロイに挑戦します。

用途としては、ひとつのArgo CDで、検証環境用クラスタと本番環境用クラスタの両方のアプリケーション管理などです。原理的には、それほど難しいものではないのですが、実際どんな動きをするのか確かめていきます。

![argocd-deploy-to-external-cluster](/image/argocd-deploy-to-external-cluster.png)

## 検証環境
本記事は以下で確認しています。OpenShift以外のKubernetesを利用してる場合でも問題ないはずです。

- Kubernetes: OpenShift 4.9 (Kubernetes 1.22) x 2クラスタ
- Argo CD: 2.2.2
- Argo CD CLI: 2.2.5

```
% argocd version
argocd: v2.2.5+8f981cc.dirty
  BuildDate: 2022-02-05T05:20:39Z
  GitCommit: 8f981ccfcf942a9eb00bc466649f8499ba0455f5
  GitTreeState: dirty
  GoVersion: go1.17.6
  Compiler: gc
  Platform: darwin/amd64
argocd-server: v2.2.2+unknown
  BuildDate: 2022-01-26T02:18:29Z
  GitTreeState: clean
  GoVersion: go1.16.12
  Compiler: gc
  Platform: linux/amd64
  Ksonnet Version: unable to determine ksonnet version: exec: "ks": executable file not found in $PATH
  Kustomize Version: v4.2.0 1970-01-01T00:00:00Z
  Helm Version: v3.7.1+gbf78984
  Kubectl Version: v0.22.2
  Jsonnet Version: v0.17.0
```

## これまでのDestination設定
Argo CDでアプリケーションを作成するときに `Destination` 設定がありました。
アプリケーションをデプロイする対象のクラスタとそのNamespaceを指定します。
これまでの学習では、Argo CDが起動しているクラスタ内でのデプロイだったため、`https://kubernetes.default.svc` と自身のkubernetes api service向けのURLを指定していました。

![argocd-destination-setting](/image/argocd-destination-setting.png)

端的にここに外部クラスタを指定できればいいのですが、当然外部クラスタを制御するための認証情報が必要になります。`argocd` コマンドを用いてクラスタ情報とその認証情報を追加可能です。

## クラスタ情報の追加
`argocd`コマンドを用いて、クラスタ情報を追加できます。
コマンドは `argocd cluster add CONTEXT` と書かれていますが、この「CONTEXT」は、kubeconfigのCONTEXTのことです。

```
% argocd cluster add -h
argocd cluster add CONTEXT

Usage:
  argocd cluster add CONTEXT [flags]

Flags:
  ...
```

いま手元では、ふたつのcontextがあるとします。
ひとつは検証用(staging)クラスタのものと、もうひとつが本番用（production）クラスタのものです。

```
% kubectl config get-contexts
CURRENT   NAME                                         CLUSTER                        AUTHINFO                             NAMESPACE
*         default/api-cluster-staging:6443/admin       api-cluster-staging:6443       admin/api-cluster-staging:6443       default
          default/api-cluster-production:6443/admin    api-cluster-production:6443    admin/api-cluster-production:6443    default
```

Argo CDが起動していない方の外部のクラスタのContextを指定して、`argocd cluster add` を実行します。
そうすると、`argocd-manager`というアドミン権限のもったService Accountを作るけどよいか？ときかれます。Yesと答えれば、Argo CDがデプロイするのに利用するService Accountの作成と権限付与が行われます。

```
% argocd cluster add default/api-cluster-production:6443/admin
WARNING: This will create a service account `argocd-manager` on the cluster referenced by context `default/api-cluster-production:6443/admin` with full cluster level admin privileges. Do you want to continue [y/N]? y
INFO[0017] ServiceAccount "argocd-manager" created in namespace "kube-system"
INFO[0017] ClusterRole "argocd-manager-role" created
INFO[0017] ClusterRoleBinding "argocd-manager-role-binding" created
Cluster 'https://api.cluster.production:6443' added
```

作られたリソースを実際確認します。
`argocd-manager-role`の権限がフル権限なので、ここは用途に応じて絞ってもいいかもしれません。
とくに、これらのリソースはArgo CDによって管理されているわけではないので、任意で変更しても問題ないはずです。

```
% kubectl get sa argocd-manager -n kube-system
NAME             SECRETS   AGE
argocd-manager   2         8h

% kubectl get clusterrole argocd-manager-role
NAME                  CREATED AT
argocd-manager-role   2022-02-08T05:58:54Z

% kubectl get clusterrolebinding argocd-manager-role-binding
NAME                          ROLE                              AGE
argocd-manager-role-binding   ClusterRole/argocd-manager-role   8h

% kubectl get clusterrole argocd-manager-role -o yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  creationTimestamp: "2022-02-08T05:58:54Z"
  name: argocd-manager-role
  resourceVersion: "141171"
  uid: 009bef0c-2a22-4518-9b97-1ebdee62b34d
rules:
- apiGroups:
  - '*'
  resources:
  - '*'
  verbs:
  - '*'
- nonResourceURLs:
  - '*'
  verbs:
  - '*'
```

## 設定はどこに？
上の作業が終わると、Argo CDのUI画面からCluster管理をみると、新しくClusterが追加されています。
この設定情報は、Secretとして管理されています。

![argocd-external-cluster-setting](/image/argocd-external-cluster-setting.png)

`openshift-gitops`というnamespaceはArgo CDが起動しているものと考えてください。
この中のSecretで、登録したクラスタのSecretがあります。実際に中身を確認してみましょう。
Secret内に、対象のClusterの名前やAPIエンドポイント、トークン情報が入っているのがわかります。

```
% kubectl get secret -n openshift-gitops
NAME                                       TYPE                                  DATA   AGE
argocd-secret                              Opaque                                5      9h
builder-dockercfg-dd62q                    kubernetes.io/dockercfg               1      9h
builder-token-7wxz7                        kubernetes.io/service-account-token   4      9h
builder-token-cvlgr                        kubernetes.io/service-account-token   4      9h
cluster                                    kubernetes.io/tls                     2      9h
cluster-api.cluster.production-358811194   Opaque                                3      8h
...

% kubectl describe secret -n openshift-gitops cluster-api.cluster.production-358811194
Name:         cluster-api.cluster.production-358811194
Namespace:    openshift-gitops
Labels:       argocd.argoproj.io/secret-type=cluster
Annotations:  managed-by: argocd.argoproj.io

Type:  Opaque

Data
====
config:  1333 bytes
name:    70 bytes
server:  58 bytes

% kubectl get secret -n openshift-gitops cluster-api.cluster.production-358811194 -o jsonpath="{.data.config}" | base64 -d
{"bearerToken":"xxxxxxxxxxxxx","tlsClientConfig":{"insecure":true}}

% kubectl get secret -n openshift-gitops cluster-api.cluster.production-358811194 -o jsonpath="{.data.name}" | base64 -d
default/api-cluster-production:6443/admin

% kubectl get secret -n openshift-gitops cluster-api.cluster.production-358811194 -o jsonpath="{.data.server}" | base64 -d
https://api.cluster.production:6443
```

上の `bearerToken` は、本番用クラスタ側の`argocd-manager`のトークンの値と一致することも確認できました。

```
## 本番用クラスタ側
% kubectl get secret -n kube-system | grep argocd
argocd-manager-dockercfg-bdtdd                       kubernetes.io/dockercfg               1      8h
argocd-manager-token-7csz2                           kubernetes.io/service-account-token   4      8h
argocd-manager-token-vzvsf                           kubernetes.io/service-account-token   4      8h

% kubectl get secret -n kube-system argocd-manager-token-vzvsf -o jsonpath="{.data.token}" | base64 -d
xxxxxxxxxxxxx
```

## さいごに
ここまで、Argo CDで外部クラスタを管理するときの動きについて確認しました。
正直予想通りなのでとくに面白い点はありませんでしたが、外部クラスタ側にArgo CD用のService Accountを作り（`argocd-manager`）、そのトークン情報をArgo CDのSecretとして管理しているということがよくわかりました。ここまでわかれば、デバッグ等ももう怖くないですね。