+++
categories = ["Alibaba Cloud", "Kubernetes"]
date = "2021-09-04T16:11:27+09:00"
description = "Alibaba CloudのServerless KubernetesのImageCache機能について、仕組みや課金などについて検証しました。ノードレスの環境ではぜひ利用したいところですが、費用との相談になりそうです。"
draft = false
image = ""
tags = ["Tech"]
title = "Alibaba Cloud, Kubernetesのイメージキャッシュ機能を検証する"
author = "mosuke5"
archive = ["2021"]
+++

こんにちは。もーすけです。  
Alibaba CloudのServerless Kubernetesを使ったシステム構築に取り組んでいて、Alibaba Cloud固有のKubernetesまわりの仕組みについて検証したことをまとめていきます。
今回は、ImageCacheについてです。

そもそも、Serverless Kubernetesって？という方は、少し古いですが以下を参照ください。（アップデートしたい…）
一言でいうとノードレスのKubernetesで、EKS on Fargateなどに近い仕組みです。

<iframe src="//www.slideshare.net/slideshow/embed_code/key/7YPxzJxZzDfOlL" width="595" height="485" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px; max-width: 100%;" allowfullscreen> </iframe> <div style="margin-bottom:5px"> <strong> <a href="//www.slideshare.net/mosuke5/alibaba-cloud-serverless-kubernetes" title="Alibaba Cloud Serverless Kubernetes 徹底解説" target="_blank">Alibaba Cloud Serverless Kubernetes 徹底解説</a> </strong> from <strong><a href="https://www.slideshare.net/mosuke5" target="_blank">Shinya Mori (@mosuke5)</a></strong> </div>

<!--more-->

## ECIとはなんなのか？
Alibaba CloudのServerless Kubernetesでは、PodはECI(Elastic Container Instance)を用いて起動します。AWSでいうとFargate相当のサービスです。
Kubernetesから外部APIを通じてPodを起動させる仕組みは、Virtual Kubeletを用いています。（「[Virtual Kubeletとは何か。Alibaba Cloud上で実際に動かして検証する](https://blog.mosuke.tech/entry/2019/02/03/virtual-kubelet/)」も参照）

![virtual-kubelet](/image/virtual-kubelet-overview.png)

そして、ECIやFargateといったサービスの裏側はマイクロVMと呼ばれるVMで動作させていると言われています。
つまり、コンテナを動作させるための専用軽量VMを起動します。AWSの場合、[Firecracker](https://firecracker-microvm.github.io/)という仕組みで動かしています。
Alibaba CloudがどのようにECIを実行しているかは定かではないのですが、もし新情報があればお知らせします。

次に進む前に覚えておくべきことは、**Podを起動するのに専用のVMを起動しているということ**です。

## なぜイメージキャッシュが必要か
Serverless Kubernetesを利用するならば、個人的にはイメージキャッシュの機能を推奨したいですが、その理由を説明します。
このブログで、「イメージキャッシュ」が指すのは、以下の機能のことです。

[Use an image cache CRD to accelerate pod creation](https://www.alibabacloud.com/help/doc-detail/273116.htm)

Serverless Kubernetesでは、前述したとおり、Podを起動するために専用のVMを起動します。
通常のKubernetesでは、Workerノードがイメージをキャッシュするため、Podのレプリカ数を増やした場合や、Podが削除されて再作成される場合、アプリケーションのバージョンアップでイメージを差し替える場合、Workerノード上のキャッシュを有効活用できます。

しかし、Podを起動するごとにノードを準備するServerless KubernetesではWorkerノードのキャッシュが利用できません。
過去に利用したコンテナイメージであっても、Podを起動するたびにイメージの再取得が必要になってしまいます。

上記の理由から、イメージキャッシュの機能がとても役に立つということです。

## イメージキャッシュの仕組み
イメージキャッシュを利用するには、ImageCacheのカスタムリソースを作成します。
Serverless Kubernetesでは、クラスタ構築時点でCRD(Custom Resource Definition)が登録されていますが、通常のKubernetesサービスを利用している場合は、CRDの登録も必要になります。

以下の設定を行った場合、`centos:latest`と`busybox:latest`のイメージを25GBのサイズのディスクに7日間保存してキャッシュするということになります。

```yaml
apiVersion: eci.alibabacloud.com/v1
kind: ImageCache
metadata:
  name: imagecache-sample
spec:
  images:
    - centos:latest
    - busybox:latest
  imageCacheSize: 25
  retentionDays: 7
```

具体的な動きを以下のように図示します。  
イメージキャッシュのカスタムリソースを作成すると、イメージをダウンロードする一時的なECIが起動し、イメージダウンロードが終わるとスナップショットを作成します。
イメージキャッシュを利用する場合は、作成したスナップショットからボリュームを作ってマイクロVMにマウントすることでイメージをキャッシュします。

![imagecache-architecture](/image/imagecache-architecture.png)


## 試してみる
それでは実際に試してみて、Alibaba Cloud上のリソースを追っていきましょう。

### イメージキャッシュの作成
まずは、イメージキャッシュを作成します。
イメージキャッシュの作成に次のマニフェストを利用して検証しました。

```yaml
# imagecache-sample.yaml
apiVersion: eci.alibabacloud.com/v1
kind: ImageCache
metadata:
  name: imagecache-sample
spec:
  images:
    - centos:latest
    - busybox:latest
  imageCacheSize: 25
  retentionDays: 7
```

```
$ kubectl apply -f imagecache
imagecache.eci.alibabacloud.com/imagecache-sample created

$ kubectl get imagecache -w
NAME                AGE    CACHEID                    PHASE      PROGRESS
imagecache-sample   6s     imc-6we5ooph73mvgk9hnfdp   Pending    0%
imagecache-sample   108s   imc-6we5ooph73mvgk9hnfdp   Creating   0%
imagecache-sample   2m5s   imc-6we5ooph73mvgk9hnfdp   Creating   5%
...
```

イメージキャッシュの処理が始まると、ECIインスタンスが起動します。
KubernetesのPodとして起動しているわけではないので、`kubectl get pod` をしてもPodが見えるわけではありませんが、ECIのコンソール画面から確認できます。
残念ながら、中身の詳細設定については非表示となっており、内部の仕組みを追うことができませんでした。

![imagecache-eci-instance](/image/imagecache-eci-instance.png)

上のイメージキャッシュのECIインスタンスが起動している間、ECSコンソールからディスクを確認すると、25GBのディスクが払い出されていることが確認できます。
ディスクサイズは、`imageCacheSize: 25` と指定した値です。
つまり、イメージキャッシュサイズは合計でキャッシュしたいイメージのサイズを考慮して決めたほうがいいです。多くすると課金に響くので調整しましょう。

![imagecache-eci-disk](/image/imagecache-eci-disk.png)

イメージキャッシュの処理が完了するまで待ちます。  
PROGRESSが100%になり、処理が完了したらスナップショットを確認しましょう。

```
$ kubectl get imagecache -w
NAME                AGE    CACHEID                    PHASE      PROGRESS
imagecache-sample   13m    imc-6we5ooph73mvgk9hnfdp   Ready      100%
```

イメージキャッシュの処理が完了すると、ディスクは削除され、スナップショットが作成されています。
さきほど利用していたディスクのスナップショットとなります。

![imagecache-snapshot](/image/imagecache-snapshot.png)

スナップショットの `Automatic Snapshot Policy` を確認すると `Keep Snapshots: 7Days` となっていることを確認できます。
`retentionDays: 7` と対応しています。

![imagecache-snapshot-policy](/image/imagecache-snapshot-policy.png)

### イメージキャッシュの利用
続いて、作成したイメージキャッシュを使ってPodを起動してみます。
Podの起動は以下を使いました。キャッシュした `busybox:latest` を使うコンテナであることと、アノテーションでキャッシュを利用することを記述しています。

```yaml
# testpod.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: say-hello
spec:
  replicas: 1
  selector:
    matchLabels:
      app: say-hello
  template:
    metadata:
      labels:
        app: say-hello
      annotations:
        k8s.aliyun.com/eci-image-cache: "true"
    spec:
      containers:
        - name: hello
          image: busybox:latest
          command: ["/bin/sh","-c","while true; do echo $(date) hello to stdout.; sleep 10; done"]
```

Podを作成するとイメージダウンロード速度の速さがわかります。
`kubectl describe pod` で表示されるEvents内の `Successfully pulled image "busybox:latest" in 1.544009294s` このログメッセージをみればイメージキャッシュの効果がわかるはずです。
当然ながら、ECIインスタンスの起動までの時間がかかりますが、イメージダウンロードの時間が圧倒的に速いことがわかります。

```
$ kubectl apply -f testpod.yaml
deployment.apps/say-hello created

$ kubctl get pod -w
NAME                         READY   STATUS    RESTARTS   AGE
say-hello-7865948d7d-ln2pt   0/1     Pending   0          5s
say-hello-7865948d7d-ln2pt   0/1     Pending   0          12s
say-hello-7865948d7d-ln2pt   0/1     ContainerCreating   0          14s
say-hello-7865948d7d-ln2pt   0/1     Pending             0          14s
say-hello-7865948d7d-ln2pt   1/1     Running             0          17s

$ kubectl describe pod say-hello-7865948d7d-ln2pt
...
Events:
  Type    Reason                   Age   From          Message
  ----    ------                   ----  ----          -------
  Normal  SuccessfulHitImageCache  42s   eci-provider  [eci.imagecache]Successfully hit image cache imc-6we5ooph73mvgk9hnfdp, eci will be scheduled with this image cache.
  Normal  Pulling                  30s   kubelet       Pulling image "busybox:latest"
  Normal  Pulled                   28s   kubelet       Successfully pulled image "busybox:latest" in 1.544009294s
  Normal  Created                  28s   kubelet       Created container hello
  Normal  Started                  28s   kubelet       Started container hello
```

イメージキャッシュを利用した場合、ECIインスタンスを起動している間は、ディスクを使っていることになります。
ECSコンソールからディスクを確認しましょう。
アプリケーションを起動している間、ディスクを使っていることになるので大きく課金に影響します。

![imagecache-eci-cached-disk](/image/imagecache-eci-cached-disk.png)

このディスクは、Podにマウントしているわけではないということは注意が必要です。
このディスクはイメージを保存してキャッシュしており、Podを起動するための下回りのVMへマウントしています（VMはユーザからは見えません）。
Podの永続ストレージとして利用できるわけではありません。

## 課金ポイントの整理
さいごに、課金ポイントの整理をしていきましょう。
Kubernetesのよさを活かすのであればイメージキャッシュしたいところですが、どのくらいの追加費用が発生するかによりますよね。

仕組みの全体像のおさらいですが、今度は「※課金」に注目しましょう。

![imagecache-architecture](/image/imagecache-architecture.png)

- 課金1:
    - イメージをダウンロードしてディスクに保存する作業を行います。イメージキャッシュを作成する間でしか利用しません。
    - 例として、イメージダウンロードするのに10分かかる場合、10分間のECIインスタンス費用が発生します。ECIインスタンスのデフォルトのリソースはCPU2コア、メモリ4GBです。
- 課金2:
    - 課金1のECIインスタンスのイメージダウンロードの書き込み先のディスクです。
    - 基本的に課金1と同じ時間分だけディスクを利用します。上の例であれば、10分間のディスク費用が発生します。
    - ディスクタイプはESSDで、サイズは `imageCacheSize` で指定した値になります。
- 課金3:
    - 課金2で利用したディスクは最終的にスナップショットをとったあとに削除されます。スナップショットの保存費用が発生します。
    - スナップショットの保存期間は、`retentionDays`で指定した値となりますが、デフォルト値は無期限です。
- 課金4:
    - イメージキャッシュを利用するアプリケーション（ECIインスタンス）が起動している間、スナップショットから作成したディスクが起動します。
    - Webサーバやアプリケーションサーバといった長時間起動する場合、その時間分のディスク費用が発生します。またECIインスタンスごとにディスクが起動するため、Pod数分のディスクが消費します。
    - 例として、アプリケーションをレプリカ3で、imageCacheSizeを25とした場合、25GBのESSD×3の費用が発生します。

上の課金ポイントをもとに、シナリオを作って試算してみます。  
「imageCacheSizeを25GB、retentionDaysを無期限、イメージキャッシュ処理に10分間、アプリケーションをレプリカ3で起動する」というシナリオで1か月分の費用を計算してみます。
（※計算間違っているかもしれないので、実プロジェクトで試算するときには計算し直してください。）

- 課金1:
    - ECIはvcpuとmemoryの量と起動時間で決定。
    - USD 0.0000077 per second x 2vcpu x 600s = USD 0.00924
    - USD 0.00000096 per second x 4GB x 600s = USD 0.002304
- 課金2:
    - ESSDの料金を計算します。時間課金なので、10分の起動でも1時間分の費用が発生。
    - USD 0.0320/100 GB/hour x 25GB = USD 0.008
- 課金3:
    - スナップショットの保持費用。1か月なので720hで計算。
    - USD 0.0000277778/GB/hour x 25GB x 720hour = USD 0.5000004
- 課金4:
    - アプリケーションに付随するディスクの料金。
    - USD 0.0320/100 GB/hour x 25GB x 720hour x 3 = USD 17.28
- 合計:
    - USD 17.8827044 = 約2,000円（110円/USD）

## その他の確認ポイント
まだいくつか細かい部分で未検証の部分がありますので、メモしておきます。

- Instant accessについて
    - スナップショットの費用を調べるとInstan access費用の記載があるが、Kubernetesから利用できるイメージキャッシュではInstant accessを有効にすることはできなさそうだったため、現時点で無視しました。
- イメージの更新
    - キャッシュしたイメージの更新タイミングについてはまだ未検証です。

## さいごに
Alibaba CloudのServerless Kubernetesのイメージキャッシュについていろいろと検証してきました。
ECIをイメージキャッシュなしで利用すると、結構コンテナの起動まで時間かかります。すばやいオートスケーリングや障害復旧を見据えると、イメージキャッシュはぜひとも使いたいところです。検証環境でも、なんどもコンテナを作成する場合とても役に立ちます。

費用と相談して利用を検討していきましょう。