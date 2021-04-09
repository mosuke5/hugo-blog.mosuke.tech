+++
categories = ["Kubernetes", "OpenShift"]
date = "2020-12-16T19:21:02+09:00"
description = "NVIDIA GPUを搭載したサーバをOpenShift上で利用するための基礎知識を紹介します。OpenShiftに限らずKubernetesをお使いの方の参考にもなると思います。"
draft = false
image = ""
tags = ["Tech"]
title = "OpenShift on NVIDIA GPU（概要編）"
author = "mosuke5"
archive = ["2020"]
+++

こんにちは、もーすけです。  
本日はOpenShiftにNVIDIA GPUのノードを追加して利用する方法2つのブログ（概要編と導入編）に分けて紹介したいと思います。
あまりまだ日本語での情報がないので、挑戦したいと考えている人の参考になればと思います。
また、非常に進化が速く、情報が古くなる可能性もあります。なるべく更新していきたいと思っていますが、最新情報は公式情報をみてください。。
導入編では、OpenShiftを取り扱いますが、他のKubernetesディストリビューションをお使いの方も参考になるところはあると思います。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2020/12/17/openshift-on-nvidia-gpu-2/" data-iframely-url="//cdn.iframe.ly/ELaxDLL"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>
<!--more-->

## NVIDIA GPU Operator
Kubernetes上でGPUを利用するには、次の3つを最低限準備する必要があります。
Workerノードは当然ですよね。NVIDIAのGPUを利用するためのDriver、そしてKubernetesからNVIDIA GPUをリソースとして制御できるようにするための[Device Plugin](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/)がさらに必要です。

1. GPU搭載のWorkerノード
1. NVIDIA Driver
1. [NVIDIA k8s device plugin](https://github.com/NVIDIA/k8s-device-plugin)

NVIDIA DriverとNVIDIA k8s device pluginを個別にインストールしてKubernetes上でGPUを利用することはできます。
しかし、それらの管理やその他の追加コンポーネントもあったりします。自前でやろうと思うとそれなりに大変かと思います。

そこででてくるのが、[NVIDIA GPU Operator](https://github.com/NVIDIA/gpu-operator)です。  
このOperatorは、KubernetesでNVIDIAのGPUを動かして運用するのに必要なコンポーネントをセットにして提供してくれるソフトウェアです。
NVIDIA GPU Operatorには、下記のコンポーネントが含まれています。（以下はv1.4.0の例です。詳しくは[公式ドキュメント](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/overview.html)を参照してください。）

{{< table class="table" >}}
|Component  |Version  |Memo  |
|---|---|---|
|NVIDIA Driver  |450.80.02  |  |
|NVIDIA Container Toolkit  |1.4.0  |  |
|NVIDIA K8s Device Plugin  |0.7.1  |  |
|NVIDIA DCGM-Exporter  |2.1.2  |GPUメトリックを出力するPrometheus exporter  |
|Node Feature Discovery  |0.6.0  |Helmを利用する場合のみインストール可能。詳細は後述  |
|[GPU Feature Discovery](https://github.com/NVIDIA/gpu-feature-discovery)  |0.2.2  |v1.3.0からbetaとして追加。GPUの詳細情報をノードのラベルに付与。  |
{{</ table >}}

NVIDIAのGPUを利用するために必要なコンポーネントのみならず、運用などを見越したツールセットを管理してくれます。
実際にインストールする場合にはこちらを利用したほうが楽ではないかと思います。

## Node Feature Discovery
### 概要
次に、Node Feature Discoveryというソフトウェアについて説明します。なぜこの説明が必要かは後述します。
Node Feature Discovery（以下、nfd）は、Kubernetesクラスタ内のノードのハードウェア情報を調べ、ラベルとしてノードに情報を付与するソフトウェアです。Kubernetes SIGの中で開発がされています。（Github [kubernetes-sig/node-feature-discovery](https://github.com/kubernetes-sigs/node-feature-discovery)）

nfdは **nfd-master** と **nfd-worker** の2つのコンポーネントから構成されます。  
nfd-masterは、0.6.0以降のバージョンではdeploymentとして起動します。nfd-workerからの通信をListenして、nfd-workerから通知されたラベル情報をKubernetes APIへ更新する役割をになっています。  
nfd-workerは、DaemonSetとして各ノードで起動します。そのノードのハードウェア情報を確認しnfd-masterへと通知します。

nfd-masterは、v0.4.0まではDaemonSetとしてMasterノード上で起動していましたが、v0.6.0でDaemonSetからDeploymentで動作するように変更が加わりました（該当の[Pull Request](https://github.com/kubernetes-sigs/node-feature-discovery/pull/294)）。理由は、マネージドのKubernetesなどではmasterノードにPodの配置ができないからです。

### nfdによって付与されるラベル
nfdが実際に動作すると以下のようなハードウェア情報がノードのラベルとして付与されます。
上の役割で説明しましたが、ハードウェア情報を検出しラベルを付与するように通知するのはnfd-workerです。
Masterノードにはラベルは付与されません。

- CPU
- IOMMU
- Kernel
- Memory
- Network
- PCI
- Storage
- System
- USB
- Custom (rule-based custom features)
- Local (hooks for user-specific features)

実際にノード情報を確認してみます。`feature.node.kubernetes.io/xxxxx` がnfdによって付与されたラベルです。

```
$ oc get node xxxxxxx -o yaml
...
  labels:
    beta.kubernetes.io/arch: amd64
    beta.kubernetes.io/instance-type: m5.2xlarge
    beta.kubernetes.io/os: linux
    failure-domain.beta.kubernetes.io/region: ap-southeast-1
    failure-domain.beta.kubernetes.io/zone: ap-southeast-1b
    feature.node.kubernetes.io/cpu-cpuid.ADX: "true"
    feature.node.kubernetes.io/cpu-cpuid.AESNI: "true"
    feature.node.kubernetes.io/cpu-cpuid.AVX: "true"
    feature.node.kubernetes.io/cpu-cpuid.AVX2: "true"
    feature.node.kubernetes.io/cpu-cpuid.AVX512BW: "true"
    feature.node.kubernetes.io/cpu-cpuid.AVX512CD: "true"
    feature.node.kubernetes.io/cpu-cpuid.AVX512DQ: "true"
    feature.node.kubernetes.io/cpu-cpuid.AVX512F: "true"
    feature.node.kubernetes.io/cpu-cpuid.AVX512VL: "true"
    feature.node.kubernetes.io/cpu-cpuid.FMA3: "true"
    feature.node.kubernetes.io/cpu-cpuid.MPX: "true"
    feature.node.kubernetes.io/cpu-hardware_multithreading: "true"
    feature.node.kubernetes.io/kernel-selinux.enabled: "true"
    feature.node.kubernetes.io/kernel-version.full: 4.18.0-193.14.3.el8_2.x86_64
    feature.node.kubernetes.io/kernel-version.major: "4"
    feature.node.kubernetes.io/kernel-version.minor: "18"
    feature.node.kubernetes.io/kernel-version.revision: "0"
    feature.node.kubernetes.io/pci-1d0f.present: "true"
    feature.node.kubernetes.io/storage-nonrotationaldisk: "true"
    feature.node.kubernetes.io/system-os_release.ID: rhcos
    feature.node.kubernetes.io/system-os_release.VERSION_ID: "4.5"
    feature.node.kubernetes.io/system-os_release.VERSION_ID.major: "4"
    feature.node.kubernetes.io/system-os_release.VERSION_ID.minor: "5"
    kubernetes.io/arch: amd64
    kubernetes.io/hostname: ip-10-0-162-120
    kubernetes.io/os: linux
...
```

## NVIDIA GPU Driverとnfdの関係性
いままでNVIDIA GPU OperatorとNode Feature Discoveryについて説明してきました。
そこで、あらためてこれらがどのような関係性にあるか図示しました。
まず、NVIDIA GPU Operatorに先立ってnfdを展開し、各ノードにハードウェア情報のラベルを付与します。
NVIDIA GPU Operatorが展開するコンポーネントのひとつのNVIDIA Driverは、nfdが付与したラベルからGPUが搭載されているノードだけに展開されるようになっています。それでようやくNVIDIA DriverとGPUノードが対応付けされるわけです。
厳密な実装でいうと、nfdが付与したGPUを搭載するノードのラベル（たとえば`feature.node.kubernetes.io/pci-10de.present: 'true'`）をNVIDIA GPU Operatorが探し出し、`nvidia.com/gpu.present: 'true'`のラベルを追加で付与します（[該当ソースコード](https://github.com/NVIDIA/gpu-operator/blob/d16c90ba8d0d6dcba079ee6a5d7f22140674dedb/pkg/controller/clusterpolicy/state_manager.go#L110)）。nvidia-driverのnodeSelectorではこのラベルが指定されています。

![nfd-and-gpu-operator](/image/nfd-and-gpu-operator.png)


## 次に向けて
さて、次は導入編です。  
この基礎的な知識をもとにGPUを使える状態にしてみましょう。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2020/12/17/openshift-on-nvidia-gpu-2/" data-iframely-url="//cdn.iframe.ly/ELaxDLL"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>
