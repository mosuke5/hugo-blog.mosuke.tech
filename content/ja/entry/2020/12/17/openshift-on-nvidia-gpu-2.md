+++
categories = ["Kubernetes", "OpenShift"]
date = "2020-12-17T22:01:20+09:00"
description = "OpenShiftにGPUのノードを追加して利用する方法（導入編）です。インストールして運用する上での知っておくと良いポイントなどを解説します。"
draft = false
image = ""
tags = ["Tech"]
title = "OpenShift on NVIDIA GPU（導入編）"
author = "mosuke5"
archive = ["2020"]
+++

こんにちは、もーすけです。  
今回は前回に続き、OpenShiftにGPUのノードを追加して利用する方法（導入編）として書いていきます。
インストールの細かな方法については英語ですが公式ドキュメントに譲るとして、実行していくにあたってのポイントなどを経験者としてまとめておきます。
概要編につきましては以下をご覧ください。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2020/12/16/openshift-on-nvidia-gpu/" data-iframely-url="//cdn.iframe.ly/PbejT6X"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>
<!--more-->

## 環境
本記事の検証環境は下記です。

- OpenShift 4.6.8 on AWS
- GPU Node: ec2 g4dn.xlarge ×2台
- NVIDIA GPU Operator 1.3.1 provided by NVIDIA Corporation
- Node Feature Discovery 4.6.0-202012050130.p0 provided by Red Hat

## インストール
インストールについてはNVIDIAの出している公式ドキュメントを参照ください。
本記事ではドキュメントに書かれていない部分やハマリポイントなどを補足します。

公式ドキュメント: [OpenShift on NVIDIA GPU Accelerated Clusters](https://docs.nvidia.com/datacenter/kubernetes/openshift-on-gpu-install-guide/index.html)

### GPUノードの追加
まずはじめにGPUノードをOpenShiftクラスタへ追加する必要があります。
ノードの追加時点ではとくに通常のノードの手順と変わりがありません。お使いの環境のインストール方法に合わせてGPUノードを追加してください。
筆者環境はOpenShift on AWSのため、GPUノード用の[MachineSetを用意してノードの追加](https://access.redhat.com/documentation/ja-jp/openshift_container_platform/4.6/html/machine_management/creating-machinesets#creating-machineset-aws)をしました。

### cluster-wide entitlement
概要編でご紹介した、Node Feature DiscoveryやNVIDIA GPU Operatorをインストールする前にやっておくことがあります。
OpenShiftクラスタにcluster-wide entitlementの設定をしておくことです。
本手順は、公式ドキュメントのHelmでのインストール時には書いてあるのですが、**OperatorHubからインストールする手順には書かれていませんが、同様に必要な作業**です。改善のリクエストをNVIDIAにお送りはしたのですが、2020/12/17現在は修正されていませんので注意してください。
"[4.3. Installing GPU Operator via Helm](https://docs.nvidia.com/datacenter/kubernetes/openshift-on-gpu-install-guide/index.html#openshift-gpu-install-gpu-operator-via-helmv3)" の1,2の手順をこなしてください。

なぜcluster-wide entitlementの設定作業が必要か説明します。  
nvidia-driverは、起動時にelfutils-libelfなどのパッケージをインストールしてビルドを行います。（コンテナ起動時にビルドするのがいいかどうかは。。？）ベースイメージにUBI(Universal Base Image)を利用しており、Red Hatのレポジトリを参照しにいきます。そのため、コンテナが対象のレポジトリを参照できるように、エンタイトルメントの設定が必要になります。
この設定がないとnvidia-driver podの起動時にエラーが発生し起動に失敗します。  
OpenShiftをご利用であればサブスクリプションをお持ちかと思いますが、
検証用で個人のサブスクリプションを使いたい場合には、1年間無料で利用できる [Red Hat Developer Subscription](https://developers.redhat.com/articles/getting-red-hat-developer-subscription-what-rhel-users-need-know#)の利用でも可能です。

cluster-wide entitlementを設定すると（実態は`MachineConfig`）、Machine Config Operator（MCO）は各ノードに設定内容を反映しに行きます。ノードへの設定変更時は、ノードのスケジューリングを無効化した上で順次ローリングアップデートするため、でノード台数が多い場合は時間がかかります。MachineConfigPoolの設定で、Workerノードが同時に何台までアップデート作業を実行していいかも決めることができます。お使いのクラスタの状況に応じて、ノード更新のスピードを上げたい場合は`MachineConfigPool`の`spec.maxUnavailable`の値の変更を検討できます（[ドキュメント](https://docs.openshift.com/container-platform/4.6/scalability_and_performance/recommended-host-practices.html#create-a-kubeletconfig-crd-to-edit-kubelet-parameters_)）。

```text
$ oc apply -f 0003-cluster-wide-machineconfigs.yaml
machineconfig.machineconfiguration.openshift.io/50-rhsm-conf created
machineconfig.machineconfiguration.openshift.io/50-entitlement-pem created
machineconfig.machineconfiguration.openshift.io/50-entitlement-key-pem created

$ oc get node
NAME                                              STATUS                        ROLES    AGE    VERSION
ip-10-0-140-40.ap-southeast-1.compute.internal    Ready                         master   4d7h   v1.19.0+7070803
ip-10-0-150-64.ap-southeast-1.compute.internal    Ready                         worker   4d7h   v1.19.0+7070803
ip-10-0-168-154.ap-southeast-1.compute.internal   Ready                         master   4d7h   v1.19.0+7070803
ip-10-0-174-241.ap-southeast-1.compute.internal   Ready                         worker   4d7h   v1.19.0+7070803
ip-10-0-214-88.ap-southeast-1.compute.internal    Ready                         master   4d7h   v1.19.0+7070803
ip-10-0-217-247.ap-southeast-1.compute.internal   Ready                         worker   25h    v1.19.0+7070803
ip-10-0-220-29.ap-southeast-1.compute.internal    NotReady,SchedulingDisabled   worker   25h    v1.19.0+7070803
```

作業ミスなどで、cluster-wide entitlementを何度も変更するのは大変手間がかかります。
OpenShiftのcluster-wide entitlementとして導入する前に、手元のPCのDockerかPodmanを用いてエンタイトルメントの状態を確認しておくことをオススメします。以下の記事の「Entitled Builds on non-RHEL hosts」を参照してください。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://www.openshift.com/blog/how-to-use-entitled-image-builds-to-build-drivercontainers-with-ubi-on-openshift" data-iframely-url="//cdn.iframe.ly/Z5fvQVI?iframe=card-small"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>


### Node Feature Discovery
Node Feature Discovery(以下、nfd)は、OpertorHubからインストールが可能です。
Red HatがOpenShift向けに管理している[nfdのレポジトリ](https://catalog.redhat.com/software/containers/openshift4/ose-cluster-nfd-operator/5d9e23f1bed8bd2245d9378c)はこちらから確認できます。

OpenShift 4.6でインストールできるnfdは、まだnfd-master, nfd-workerともにDaemonSetで動作します。
実際にWorkerノードのラベルを見てみるとたくさんのハードウェア情報が付与されていることが確認できます。
今回のケースで言うと`feature.node.kubernetes.io/pci-10de.present: "true"`のラベルが付いているノードがNVIDIAのGPU搭載の証となります。
PCIではベンダーIDというのがふられており、`10de`が[NVIDIAのベンダーID](https://devicehunt.com/view/type/pci/vendor/10DE)となるようです。

```text
$ oc get pod | grep nfd
nfd-master-frnxf                           1/1     Running     0          26h
nfd-master-hmzb6                           1/1     Running     0          26h
nfd-master-nk8mj                           1/1     Running     0          26h
nfd-operator-94db9c6b7-j6qrz               1/1     Running     0          26h
nfd-worker-7bx2f                           1/1     Running     0          25h
nfd-worker-fkvjc                           1/1     Running     0          26h
nfd-worker-tvhnl                           1/1     Running     0          25h
nfd-worker-wxcgn                           1/1     Running     0          26h

$ oc get node xxxxx -o yaml | grep feature.node.kubernetes.io
    feature.node.kubernetes.io/cpu-cpuid.ADX: "true"
    feature.node.kubernetes.io/cpu-cpuid.AESNI: "true"
    feature.node.kubernetes.io/cpu-cpuid.AVX: "true"
    feature.node.kubernetes.io/cpu-cpuid.AVX2: "true"
    feature.node.kubernetes.io/cpu-cpuid.AVX512BW: "true"
    feature.node.kubernetes.io/cpu-cpuid.AVX512CD: "true"
    feature.node.kubernetes.io/cpu-cpuid.AVX512DQ: "true"
    feature.node.kubernetes.io/cpu-cpuid.AVX512F: "true"
    feature.node.kubernetes.io/cpu-cpuid.AVX512VL: "true"
    feature.node.kubernetes.io/cpu-cpuid.AVX512VNNI: "true"
    feature.node.kubernetes.io/cpu-cpuid.FMA3: "true"
    feature.node.kubernetes.io/cpu-cpuid.MPX: "true"
    feature.node.kubernetes.io/cpu-hardware_multithreading: "true"
    feature.node.kubernetes.io/custom-rdma.available: "true"
    feature.node.kubernetes.io/kernel-selinux.enabled: "true"
    feature.node.kubernetes.io/kernel-version.full: 4.18.0-193.29.1.el8_2.x86_64
    feature.node.kubernetes.io/kernel-version.major: "4"
    feature.node.kubernetes.io/kernel-version.minor: "18"
    feature.node.kubernetes.io/kernel-version.revision: "0"
    feature.node.kubernetes.io/pci-10de.present: "true"
    feature.node.kubernetes.io/pci-1d0f.present: "true"
    feature.node.kubernetes.io/storage-nonrotationaldisk: "true"
    feature.node.kubernetes.io/system-os_release.ID: rhcos
    feature.node.kubernetes.io/system-os_release.VERSION_ID: "4.6"
    feature.node.kubernetes.io/system-os_release.VERSION_ID.major: "4"
    feature.node.kubernetes.io/system-os_release.VERSION_ID.minor: "6"

$ oc get node xxxxx -o yaml | grep feature.node.kubernetes.io
    feature.node.kubernetes.io/pci-10de.present: "true"
```

### NVIDIA GPU Operator
NVIDIA GPU Operatorのインストールは、cluster-wide entitlementのインストールさえ適切にできていればそれほど詰まる部分はないと思います。
すべてが起動するまで少し時間がかかるので見守りましょう。
実際にインストールしてみると、たくさんのコンポーネントが動いているのがわかるかと思います。概要編のGPU Operatorにて紹介したとおりです。
また、NVIDIA GPU Operatorの起動後はGPU Feature DiscoveryがGPUのより詳細な情報をラベルとして付与します。
次の例だと、`Tesla-T4`であることがわかります。

```text
$ oc get pod | grep -e nvidia -e gpu
gpu-feature-discovery-95vpr                1/1     Running     0          24h
gpu-feature-discovery-wzz7r                1/1     Running     0          24h
nvidia-container-toolkit-daemonset-5jdhn   1/1     Running     0          25h
nvidia-container-toolkit-daemonset-6zfl4   1/1     Running     0          25h
nvidia-dcgm-exporter-5rl4f                 1/1     Running     0          24h
nvidia-dcgm-exporter-kjvnh                 1/1     Running     0          24h
nvidia-device-plugin-daemonset-bpdzs       1/1     Running     0          24h
nvidia-device-plugin-daemonset-pqztf       1/1     Running     0          24h
nvidia-device-plugin-validation            0/1     Completed   0          22h
nvidia-driver-daemonset-fwbj7              1/1     Running     1          25h
nvidia-driver-daemonset-zj65h              1/1     Running     0          25h
nvidia-driver-validation                   0/1     Completed   0          33m

$ oc get node xxxxx -o yaml | grep nvidia.com
...
    nvidia.com/cuda.driver.major: "450"
    nvidia.com/cuda.driver.minor: "80"
    nvidia.com/cuda.driver.rev: "02"
    nvidia.com/cuda.runtime.major: "11"
    nvidia.com/cuda.runtime.minor: "0"
    nvidia.com/gfd.timestamp: "1608307957"
    nvidia.com/gpu.compute.major: "7"
    nvidia.com/gpu.compute.minor: "5"
    nvidia.com/gpu.count: "1"
    nvidia.com/gpu.family: turing
    nvidia.com/gpu.machine: g4dn.xlarge
    nvidia.com/gpu.memory: "15109"
    nvidia.com/gpu.present: "true"
    nvidia.com/gpu.product: Tesla-T4
```

最終的に、ノードの`status.capacity`にて`nvidia.com/gpu`の状態が管理できるようになっていれば成功です。

```text
$ oc get node ip-10-0-220-29.ap-southeast-1.compute.internal -o yaml | grep -A 8 capacity
  capacity:
    attachable-volumes-aws-ebs: "39"
    cpu: "4"
    ephemeral-storage: 125277164Ki
    hugepages-1Gi: "0"
    hugepages-2Mi: "0"
    memory: 16116152Ki
    nvidia.com/gpu: "1"
    pods: "250"
```

## 運用
### スケジューリング
GPUノードが利用できるような状態になったらさっそく利用してみましょう。
GPU Operatorにて、`nvidia-device-plugin`がデプロイされました。これによって、PodのResource定義に`nvidia.com/gpu`を指定すると、GPUリソースの利用できるノードにスケジュールされます。具体例としては以下のとおりです。

```yaml
resources:
  limits:
    nvidia.com/gpu: 1
```

また、ほとんどのケースにおいて、OpenShiftクラスタのノードすべてがGPU搭載というわけではないはずです。
GPUを利用したいアプリケーションのみが、GPUノードにスケジューリングされるよう調整したいはずです。
そこででてくるのが、[TaintsとTolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)です。
GPUノードにtaintを付与し、tolerationを持たない通常のPodはスケジュールできないようにできます。

```text
$ oc adm taint node xxxxx nodetype=gpu:NoSchedule
node/xxxxx tainted
```

PodをデプロイするときはTolerationを追加します。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: debug-app
  name: debug-pp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: debug-app
  template:
    metadata:
      labels:
        app: debug-app
    spec:
      containers:
      - image: your-app-image:tag
        name: debug-app
        resources:
          limits:
            nvidia.com/gpu: 1
      tolerations:
      - key: "nodetype"
        operator: "Equal"
        value: "gpu"
        effect: "NoSchedule"
```

### 監視
NVIDIA GPU Operatorの中には、nvidia-dcgm-exporter が含まれておりPrometheusにて簡単に監視が可能です。
以下は、exporterのPodとServiceを出力したものですが、各GPUノード上`pod/nvidia-dcgm-exporter-xxxx`が展開され、ポート9400のServiceで待ち受けていることがわかります。

```text
$ oc get pod,service | grep exporter
pod/nvidia-dcgm-exporter-5rl4f                 1/1     Running     0          43h
pod/nvidia-dcgm-exporter-kjvnh                 1/1     Running     0          43h
service/nvidia-dcgm-exporter   ClusterIP   172.30.79.53    <none>        9400/TCP    43h
```

実際に、このサービスに向けてリクエストを投げてみましょう。
出力は一部省略しています。
（Kubernetes内部のServiceの名前解決について知りたい方はこちらのブログ「[KubernetesのPod内からの名前解決を検証する](https://blog.mosuke.tech/entry/2020/09/09/kuubernetes-dns-test/)」を参照ください）

```text
$ oc exec nvidia-dcgm-exporter-5rl4f -- curl nvidia-dcgm-exporter:9400/metrics
...
DCGM_FI_DEV_SM_CLOCK{gpu="0", UUID="GPU-4063626d-f712-3d69-7469-1f17e7a1027d", device="nvidia0"} 300
DCGM_FI_DEV_MEM_CLOCK{gpu="0", UUID="GPU-4063626d-f712-3d69-7469-1f17e7a1027d", device="nvidia0"} 405
DCGM_FI_DEV_GPU_TEMP{gpu="0", UUID="GPU-4063626d-f712-3d69-7469-1f17e7a1027d", device="nvidia0"} 32
DCGM_FI_DEV_POWER_USAGE{gpu="0", UUID="GPU-4063626d-f712-3d69-7469-1f17e7a1027d", device="nvidia0"} 15.539000
...
```

以上のように、NVIDIA GPU OperatorのなかではPrometheus向けのexporterも内包しているので、Prometheusでの監視はすぐにはじめることができます。ご自身のPrometheusにServiceの監視設定を追加してみてください。少し余談ですが、ZabbixでこれらのGPU情報を監視したい場合はZabbixのPrometheus Checkを利用してください。詳しくは「[ZabbixでKubernetesの監視を検討する（Prometheus exporter, Kubernetes API）](https://blog.mosuke.tech/entry/2020/08/27/zabbix-for-kubernetes/)」をご参照ください。  
Grafanaでの可視化ですが、この点についてはNVIDIA公式ではダッシュボードテンプレートを提供していません。
わたしが確認した限りでは、こちらの[NVIDIA DCGM Exporter Dashboard](https://grafana.com/grafana/dashboards/12219)が活用できそうでした。

![nvidia-dcgm-exporter-dashboard](/image/nvidia-dcgm-exporter-dashboard.png)

## reference
- [NVIDIA GPU Operatorインストール方法公式ドキュメント](https://docs.nvidia.com/datacenter/kubernetes/openshift-on-gpu-install-guide/index.html)
- [cluster-wide entitlementに関する有益なブログ](https://www.openshift.com/blog/how-to-use-entitled-image-builds-to-build-drivercontainers-with-ubi-on-openshift)
- [NVIDIA Driverのコンテナイメージ](https://gitlab.com/nvidia/container-images/driver/)


## まとめ
ふたつの記事に分けてOpenShiftでNVIDIAのGPUノードを利用していく方法について解説してきました。Kubernetesは、いまや単純なステートレスなアプリケーションのみならず、AIワークロードなどその用途は拡大しています。皆さんの環境でもGPUを活用していく場面はより多くなっていくと思いますので、ぜひトライしてみてください。