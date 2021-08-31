+++
categories = ["OpenShift"]
date = "2021-08-31T14:46:13+09:00"
description = "OpenShiftのノードへスタティックルート（ルーティング設定）を追加する方法と関連する確認事項をまとめました。"
draft = false
image = ""
tags = ["Tech"]
title = "OpenShift、スタティックルートの追加方法と確認事項について"
author = "mosuke5"
archive = ["2021"]
+++

こんにちは。もーすけです。  
あまりここのブログネタにしないようなトピックですが、ちょっと機会があって軽くまとめておこうと思います。
OpenShiftのノードへスタティックルート（static route、ルーティング設定）を追加する方法と関連することがらについてです。

解決方法だけいえば、以下のSolutionがそのまま活用できますが、それに伴ってなにがおこるのか？なにを確認したらよいのか？と関連付けたかったためにこのメモを残します。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://access.redhat.com/solutions/5876771" data-iframely-url="//cdn.iframe.ly/jgnYE23"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>
<!--more-->

## モチベーション
OpenShiftでは、ノードのOSに[Red Hat CoreOS](https://access.redhat.com/documentation/ja-jp/openshift_container_platform/4.1/html/architecture/architecture-rhcos)(以下、RHCOS)が利用されます（RHELも採用可能ですがデフォルトでRHCOS）。
RHCOSというのは、RHELをベースにしたコンテナ用オペレーティングシステムです。2018年にRed HatがCoreOSを買収して、OpenShiftの中に取り込んでいます。

コンテナ用オペレーティングシステムでいうと、AWSは[Bottlerocket](https://github.com/bottlerocket-os/bottlerocket)を、Googleは[Container-Optimized OS](https://cloud.google.com/container-optimized-os/docs/concepts/features-and-benefits?hl=ja)を展開しています。
Kubernetesのようなコンテナの実行環境として考えると、コンテナランタイムを実行できることやKubernetesの構成要素のひとつであるKubeletが起動できることなど要件が限られてくるので、従来のようなOSを使う必要がなくなってきているといえます。

話はそれましたが、OpenShiftでは、OpenShiftを構成するノード自身もOpenShiftが管理します（正確にはOpenShift内部のMachineConfig Operatorにって管理）。  
これが何を意味するかというと、ノードもPodと同じようにイミュータブルなものと捉え、ノードの設定もマニフェストで記述して管理するということです。
ノードにSSHをしてなにか直接に設定をしても、MachineConfig Operatorによって上書きされたり、あるいは競合してしまいノードのアップグレードを止めてしまいます。

ノード側の設定を追加する場合は、MachineConfigから行っていく必要があること意味しています。  
そんなノード側の設定のひとつに、スタティックルートを追加したいというユースケースがぼちぼちあります。

## 解決方法
詳細はこちらの「[Create static routes post cluster installation for a specific worker pool](https://access.redhat.com/solutions/5876771)」を参照いただことにしますが、次のようなMachineConfigを作成することで対応できます。

以下の例では、systemdのserviceをノード上に追加し、nmcliを用いてルーティング設定を追加するというものです。
`192.168.1.0/24`向きの通信を`172.18.0.1`にルーティングする設定です。

```yaml
# staticroute.yaml
apiVersion: machineconfiguration.openshift.io/v1
kind: MachineConfig
metadata:
  labels:
    machineconfiguration.openshift.io/role: worker
  name: worker-custom-route-configuration
spec:
  config:
    ignition:
      config: {}
      security:
        tls: {}
      timeouts: {}
      version: 3.1.0
    networkd: {}
    passwd: {}
    storage: {}
    systemd:
      units:
      - contents: |
             [Unit]
             Description=nmcli-dev-modify
             After=network-online.target

             [Service]
             Type=oneshot
             ExecStart=nmcli dev modify ens5 +ipv4.routes "192.168.1.0/24 172.18.0.1"
             [Install]
             WantedBy=multi-user.target
        enabled: true
        name: nmcli-dev-modify.service
  osImageURL: ""
```

## 設定する際に知っておくといいこと
こちらの設定をするにあたっていくつかのことをしっておくと、トラブルシューティングなどがしやすくなります。

### MachineConfigを作成すると起こること
OpenShiftには、MachineConfigPool（以下、mcp）というリソースがあり、WorkerノードやMasterノードが読み込むべきMachineConfigの設定が管理されます。
以下はworkerノードのmcpですが、Machine Config Selectorで `machineconfiguration.openshift.io/role:  worker` のラベルが付いたMachineConfigを読み込むように記述されています。前項で作ってたMachineConfigに付与したラベルと一致させることで読み込ませることができます。

```
$ oc describe mcp worker
...
Spec:
 Configuration:
    Name:  rendered-worker-d09292d26d2a2e82ca510904af053627
...
  Machine Config Selector:
    Match Labels:
      machineconfiguration.openshift.io/role:  worker
...
```

ノードに適用される設定は、上の`spec.configuration.name`に記載のある名前のMachineConfig(`rendered-worker-d09292d26d2a2e82ca510904af053627`)となります。
こちらは、`rendered-xxx`と名前がついていることから推測ができるように自動生成されたものです。
該当のMachineConfigの中身を見ると、作成したスタティックルート追加の設定なども含まれていることが確認できます。
そのほか、Kubeletの設定やレジストリの設定などさまざまな設定が書かれます。

```
$ oc get machineconfig rendered-worker-d09292d26d2a2e82ca510904af053627 -o yaml
...
    - contents: |
          [Unit]
          Description=nmcli-dev-modify
          After=network-online.target

          [Service]
          Type=oneshot
          ExecStart=nmcli dev modify ens5 +ipv4.routes "192.168.1.0/24 172.18.0.1"
          [Install]
          WantedBy=multi-user.target
        enabled: true
        name: nmcli-dev-modify.service
...
```

### ノードへの反映
MachineConfigOperatorが、MachineConfigの設定の変更を検知すると、各ノードに順次展開（ローリングアップデート）して反映させます。
MachineConfigを作成・編集した後に `oc get node -w` でノードの状態を確認してみましょう。
ノードへのスケジューリングを止めて反映作用をして、ノードへのスケジューリングを再開する、を繰り返して、各ノードへ順次反映する様子が確認できるはずです。

### ノード内の設定確認
設定の反映が完了後、ノードに入って設定を確認してみてください。  
systemdのserviceファイルの確認と動作状況、およびルーティング設定を確認しましょう。

```
# cat /etc/systemd/system/nmcli-dev-modify.service
[Unit]
Description=nmcli-dev-modify
After=network-online.target

[Service]
Type=oneshot
ExecStart=nmcli dev modify ens5 +ipv4.routes "192.168.1.0/24 172.18.0.1"
[Install]
WantedBy=multi-user.target

# systemctl status nmcli-dev-modify.service
● nmcli-dev-modify.service - nmcli-dev-modify
   Loaded: loaded (/etc/systemd/system/nmcli-dev-modify.service; enabled; vendor preset: disabled)
   Active: inactive (dead) since Tue 2021-08-31 02:28:12 UTC; 13min ago
  Process: 1774 ExecStart=/usr/bin/nmcli dev modify ens5 +ipv4.routes 192.168.1.0/24 172.18.0.1 (code=exited, status=0/SUCCESS)
 Main PID: 1774 (code=exited, status=0/SUCCESS)
      CPU: 15ms

Aug 31 02:28:12 ip-10-0-134-38 systemd[1]: Starting nmcli-dev-modify...
Aug 31 02:28:12 ip-10-0-134-38 nmcli[1774]: Connection successfully reapplied to device 'ens5'.
Aug 31 02:28:12 ip-10-0-134-38 systemd[1]: nmcli-dev-modify.service: Succeeded.
Aug 31 02:28:12 ip-10-0-134-38 systemd[1]: Started nmcli-dev-modify.
Aug 31 02:28:12 ip-10-0-134-38 systemd[1]: nmcli-dev-modify.service: Consumed 15ms CPU time

# ip route show
default via 10.0.128.1 dev ens5 proto dhcp metric 100
10.0.128.0/19 dev ens5 proto kernel scope link src 10.0.134.38 metric 100
10.128.0.0/14 dev tun0 scope link
172.18.0.1 dev ens5 proto static scope link metric 100
192.168.1.0/24 via 172.18.0.1 dev ens5 proto static metric 100
172.30.0.0/16 dev tun0
```