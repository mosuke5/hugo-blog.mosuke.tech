+++
categories = ["Kubernetes"]
date = "2020-12-03T19:21:02+09:00"
description = ""
draft = true
image = ""
tags = ["Tech"]
title = "OpenShift on NVIDIA GPU"
author = "mosuke5"
archive = ["2020"]
+++

こんにちは、もーすけです。  
本日はOpenShiftにNVIDIA GPUのノードを追加して利用する方法を紹介したいと思います。
あまりまだ日本語で情報がないので、挑戦したいと考えている人の参考になればと思います。
また、非常に進化が速く、情報が古くなる可能性もありますがなるべく更新していきたいと思っています。
OpenShiftではなく、他のKubernetesディストリビューションをお使いの方も参考になるところはあると思います。

## Node Feature Discovery
### 概要
GPUの話に入る前に、Node Feature Discoveryというソフトウェアについて説明します。なぜこの説明が必要かは後述します。  
Node Feature Discovery（以下、nfd）は、Kubernetesクラスタ内のノードのハードウェア情報を調べ、ラベルとしてノードに情報を付与するソフトウェアです。Kubernetes SIGの中で開発がされています。（Github [kubernetes-sig/node-feature-discovery](https://github.com/kubernetes-sigs/node-feature-discovery)）

nfdは `nfd-master` と `nfd-worker` の2つのコンポーネントから構成されます。  
`nfd-master` は、`nfd-worker` からの通信をListenしていて、`nfd-worker` から通知されたラベル情報をKubernetes APIへ更新する役割をになっています。  
`nfd-worker` は、DaemonSetとして各ノードで起動し、そのノードのハードウェア情報を確認し `nfd-master` へと通知します。

`nfd-master` は、v0.4.0の頃はDaemonSetとしてMasterノード上で起動していましたが、v0.6.0でDaemonSetからDeploymentで動作するように変更が加わりました（該当の[Pull Request](https://github.com/kubernetes-sigs/node-feature-discovery/pull/294)）。
nfdのバージョンによる、構成の違いに着目したのは、OpenShiftのバージョンとそれにバンドルされるnfd Operatorのバージョンに差があるからです。以下の通りの対応付けとなっています。

<table class="table">
  <thead>
    <tr>
      <th>OpenShift Version</th>
      <th>Node Feature Discovery</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>OpenShift 4.6</td>
      <td><a href="https://github.com/kubernetes-sigs/node-feature-discovery/tree/release-0.6">0.6.0</a></td>
    </tr>
    <tr>
      <td>OpenShift 4.5</td>
      <td><a href="https://github.com/kubernetes-sigs/node-feature-discovery/tree/5ae4574180a1dc400b6ee4e050dafec122c4d949">0.4.0</a></td>
    </tr>
  </tbody>
</table>

### nfdによって付与されるラベル
nfdが実際に動作すると以下のようなハードウェア情報がノードのラベルとして付与されます。
上の役割で説明しましたが、ハードウェア情報を検出しラベルを付与するように通知するのは`nfd-worker`です。
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

## gpu operator


![nfd-and-gpu-operator](/image/nfd-and-gpu-operator.png)

## セットアップ
### cluster wide entitlement

### gpu worker nodeの追加

### nfd のインストール

### gpu operatorのインストール

## 運用
### スケジューリング

### リソース設定

### 監視