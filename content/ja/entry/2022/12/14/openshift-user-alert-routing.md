+++
categories = ["OpenShift"]
date = "2022-12-14T09:16:06+09:00"
description = "OpenShiftの開発者向けの監視機能がありました。しかし、アラート通知に欠点があり、使いづらい部分がありましたが改善されたので紹介します。"
draft = false
image = ""
tags = ["Tech"]
title = "OpenShift、開発者向けの監視機能（アラート通知）が進化しました"
author = "mosuke5"
archive = ["2022"]
+++


こんにちは、もーすけです。  
[OpenShiftアドベントカレンダー](https://qiita.com/advent-calendar/2022/openshift)14日目のゆるネタ投稿です。  
2022年、OpenShiftネタで一番PVを稼いだ記事が「[OpenShiftの新機能、ユーザ定義プロジェクトの監視ってどこまでできる？](https://blog.mosuke.tech/entry/2021/04/24/openshift-monitoring-your-own-service/)」でした。
OpenShiftをお使いのみなさんはだいぶ監視設定周りで困っているということがわかりますね笑
ちなみに余談ですが、この記事だけで2500PVくらいあったらしいです。

そこで今回は、そんなOpenShiftの監視機能の不足点であったアラート通知が進化したよってことを書いていこうと思います。

<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://blog.mosuke.tech/entry/2021/04/24/openshift-monitoring-your-own-service/" target="_blank">
      <img class="belg-site-image" src="https://blog.mosuke.tech/image/logo.png" />
    </a>
  </div>
  <div class="belg-right col-md-10">
  <div class="belg-title">
      <a href="https://blog.mosuke.tech/entry/2021/04/24/openshift-monitoring-your-own-service/" target="_blank">OpenShiftの新機能、ユーザ定義プロジェクトの監視ってどこまでできる？ · Goldstine研究所</a>
    </div>
    <div class="belg-description">OpenShift 4.6から正式に追加されたユーザ定義プロジェクトの監視機能について、どこまで使えるのか？実戦投入できそうかなどの観点で検証していきます。Prometheusを独自で構築することなく監視できる新機能を紹介します。</div>
    <div class="belg-site">
      <img src="https://blog.mosuke.tech/image/favicon.ico" class="belg-site-icon">
      <span class="belg-site-name">Goldstine研究所</span>
    </div>
  </div>
</div>
<!--more-->

## これまでの課題
ユーザ定義プロジェクトの監視では、開発者にPrometheus等を用意させずにOpenShift上で監視ができるということでニーズのある機能でした。  
一方で、<u>アラート通知先の設定がクラスタ管理者のみしかできず、マルチテナント的にOpenShiftを利用する組織では使いづらい</u>側面がありました。

OpenShift 4.11でついにこの点が解消され、より開発者にとって使いやすい監視機能を提供できるようになりました:clap::clap:  
公式ドキュメントは「{{< external_link title="第6章 ユーザー定義プロジェクトのアラートルーティングの有効化" url="https://access.redhat.com/documentation/ja-jp/openshift_container_platform/4.11/html/monitoring/enabling-alert-routing-for-user-defined-projects" >}}」です。

![](/image/openshift-monitoring-alert-before.png)


## 機能の概要
まず、ざっくりとした機能の概要を説明します。  
ユーザ定義プロジェクトの監視では、開発者が `ServiceMonitor`や`PrometheusRule`のリソースを作成することができ、開発者自身で監視設定およびアラート設定が可能でした。詳しくは、以前のブログ（[OpenShiftの新機能、ユーザ定義プロジェクトの監視ってどこまでできる？](https://blog.mosuke.tech/entry/2021/04/24/openshift-monitoring-your-own-service/)）を見てください。

さらに、`AlermanageConfig`リソースを開発者が作成できるようになり、Namespace単位にアラート通知先の管理ができるようになりました。
ユーザ側（開発者側）で `AlertmanagerConfig` を作成するとPrometheus OperatorがAlertmanagerにアラートルーティングの設定を追加するようになりました。

![](/image/openshift-monitoring-alert-after.png)

## ふたつの選択肢
おおよその概要はつかめましたでしょうか？
とりあえず、開発者にアラート通知先管理の権限移譲ができるようになりました。便利になることは間違いなしですね。

この機能を使うにあたって、ふたつのオプションを選択できます。
以下のふたつになりますが、なぜこのオプションが必要かというと、Alertmanagerの処理のオフロードになります。  
また、そもそもの話ですが、OpenShiftには、デフォルトでクラスタ監視のためのAlertmanagerが起動しています。

1. 既存のCluster MonitoringのAlertmanagerを共有する方法
1. ユーザ定義プロジェクトの監視向けに個別のAlertmanagerを作成して使用する方法

![](/image/openshift-user-workload-alertmanager.png)

## 設定するとどうなるか？
### 設定の有効化とインスタンス起動
まずはドキュメント通り、ユーザ定義アラートルーティングを有効にします。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: user-workload-monitoring-config
  namespace: openshift-user-workload-monitoring
data:
  config.yaml: |
    alertmanager:
      enabled: true
      enableAlertmanagerConfig: true
```

設定するとなにが起こるか確認してみましょう。  
まず、`openshift-user-workload-monitoring` プロジェクト内に新しくAlertmanagerのインスタンスが起動します。

```text
% oc get pod -n openshift-user-workload-monitoring | grep alert
alertmanager-user-workload-0           6/6     Running   0          8d
alertmanager-user-workload-1           6/6     Running   0          8d
```

### thanos rulerの設定ファイル
さらに、thanos rulerの設定ファイルを見てみましょう。  
thanos rulerは、`PrometheusRule`の設定内容をみて、アラート発報を担当しています。
その通知先のAlertmanagerの向き先が `dnssrv+_web._tcp.alertmanager-operated.openshift-user-workload-monitoring.svc` となっていて、`openshift-user-workload-monitoring`内に新しく起動したAlertmanagerインスタンスであることがわかります。

```text
% oc get -n openshift-user-workload-monitoring secret thanos-ruler-alertmanagers-config -o jsonpath="{.data.alertmanagers\.yaml}" | base64 -d
alertmanagers:
- scheme: https
  api_version: v2
  http_config:
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    tls_config:
      ca_file: /etc/prometheus/configmaps/serving-certs-ca-bundle/service-ca.crt
      server_name: alertmanager-user-workload.openshift-user-workload-monitoring.svc
  static_configs:
  - dnssrv+_web._tcp.alertmanager-operated.openshift-user-workload-monitoring.svc
```

ちなみに、既存のCluster MonitoringのAlertmanagerを共有する方法を採用した場合、向き先は変わり `dnssrv+_web._tcp.alertmanager-operated.openshift-monitoring.svc` となっています。

```text
% oc get -n openshift-user-workload-monitoring secret thanos-ruler-alertmanagers-config -o jsonpath="{.data.alertmanagers\.yaml}" | base64 -d
alertmanagers:
- scheme: https
  api_version: v2
  http_config:
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    tls_config:
      ca_file: /etc/prometheus/configmaps/serving-certs-ca-bundle/service-ca.crt
      server_name: alertmanager-main.openshift-monitoring.svc
  static_configs:
  - dnssrv+_web._tcp.alertmanager-operated.openshift-monitoring.svc
```

### AlertmanagerConfigの作成
Alertmanagerの起動ができたので、AlertmanagerConfigを作成して、アラートのルーティングルールを設定してみましょう。
今回は、Slackに対してアラートを通知してみます。

AlertmanagerConfigの設定できる項目については、以下のAPIドキュメントをみるといいです。サンプルが少ないので実現できる項目はOperatorのドキュメントが参考になります。

<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://github.com/prometheus-operator/prometheus-operator" target="_blank">
      <img class="belg-site-image" src="https://opengraph.githubassets.com/14c402a3e23e028ecb39bd809d50323f3a04483ff729c7a2f3790951e0be8a8a/prometheus-operator/prometheus-operator" />
    </a>
  </div>
  <div class="belg-right col-md-10">
  <div class="belg-title">
      <a href="https://github.com/prometheus-operator/prometheus-operator" target="_blank">prometheus-operator/api.md at main · prometheus-operator/prometheus-operator</a>
    </div>
    <div class="belg-description">Prometheus Operator creates/configures/manages Prometheus clusters atop Kubernetes - prometheus-operator/api.md at main · prometheus-operator/prometheus-operator</div>
    <div class="belg-site">
      <img src="https://github.githubassets.com/favicons/favicon.svg" class="belg-site-icon">
      <span class="belg-site-name">GitHub</span>
    </div>
  </div>
</div>

ドキュメントを確認すると、`SlackConfig`の`apiURL`は `Kubernetes core/v1.SecretKeySelector` で指定できることがわかります。
SlackへのWebhook URLにはシークレット情報が含まれるので、直接書かずにSecretから読み出せます。

というわけで、Slack URLを格納したシークレットを作成します。

```text
% oc create secret generic my-slack-secret --from-literal=url=https://hooks.slack.com/services/xxxxxxxxx
```

`AlertmanagerConfig`の設定はこんな感じです。

```yaml
apiVersion: monitoring.coreos.com/v1beta1
kind: AlertmanagerConfig
metadata:
  name: example-routing
  namespace: mosuke5-monitoring
spec:
  route:
    receiver: default
    groupBy: [job]
  receivers:
  - name: default
    slackConfigs:
    - apiURL:  ## KubernetesのSecretを指定
        name: my-slack-secret
        key: url
      channel: mosuke5-alert
      sendResolved: true
```

上の設定を反映後、実際にAlertmanagerにどのように設定されているか確認してみましょう。
もちろん、利用者サイドでは気にする必要はないですが、管理者目線では知っておくといいです。
`namespace="mosuke5-monitoring"` にマッチするラベルのアラートを`mosuke5-monitoring/example-routing/default`に飛ばす設定が入ってますね。
`mosuke5-monitoring/example-routing/default`の詳細設定には、SlackのURL等が書かれていました。

```text
% oc get secret -n openshift-user-workload-monitoring alertmanager-user-workload-generated -o jsonpath="{.data.alertmanager\.yaml}" | base64 -d
route:
  receiver: Default
  group_by:
  - namespace
  routes:
  - receiver: mosuke5-monitoring/example-routing/default
    group_by:
    - job
    matchers:
    - namespace="mosuke5-monitoring"
    continue: true
receivers:
- name: Default
- name: mosuke5-monitoring/example-routing/default
  slack_configs:
  - send_resolved: true
    api_url: https://hooks.slack.com/services/xxxxxxxxxxxxxxxx
    channel: mosuke5-alert
templates: []
```

### アラート通知
あとは、`ServiceMonitor`と`PrometheusRule`を設定して、アラート発報させてみましょう。
詳しくは、前回ブログで確認してください。
手元の環境では、しっかりSlackに通知されること確認できました。

![](/image/openshift-user-alert-routing-slack-notification.png)

## まとめ
2022年もっともPVを稼いだ（裏を返せばニーズのあった）記事は、アプリケーションの監視機能でした。
そのアプリケーションの監視機能の不足点であるアラート通知が改善されたため、その内容を紹介しました。

個人的な所感としては、この改善で運用環境への投入も十分視野に入れられる程度、良くなってきたと思っています。
運用まわりの機能は、ほかにもどんどん改善していっているので、目玉機能がまたでたら紹介したいと思います。