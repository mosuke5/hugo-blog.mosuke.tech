+++
categories = ["Kubernetes", "fluentd", "AWS"]
date = "2019-07-12T12:57:59+09:00"
description = "Sidecar方式のFluentdでCloudWatch logsへログを集約することについての検討をしてみました。試すことで向き不向きや、役立つワークロードが見えてきました。選択肢の1つとして検討するといいです。"
draft = true
image = ""
tags = ["Tech"]
title = "Sidecar方式のFluentdでCloudWatch logsへログを集約することについての検討"
author = "mosuke5"
archive = ["2019"]
+++

[@mosuke5](https://twitter.com/mosuke5)です。  
Kubernetes上でのアプリケーションのロギングについてFluentdを使ってどうできるか考えていきます。
今回はサイドカー方式という方法を使ってFluentdでAWS CloudWatch logsへ集約することについてやってみました。

FluentdとAWSの連携については、以前にそういえばこんなものもかきましたので、参考にしてください。自分も復習で見返しました。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://blog.mosuke.tech/entry/2017/09/03/fluentd_to_dynamodb/" data-iframely-url="//cdn.iframe.ly/fUX8Gqb"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>
<!--more-->

## 実現すること
今回やりたいことは、Kubernetes上で動かしているアプリケーションに対して、サイドカーとしてFluentdを動かしてログをCloudWatch logsに送ることです。アプリケーションは、ブログでの例ではNginxにしました。実際にはNginxや独自のアプリケーションだったり様々かなと思います。

まず、背景としては、ロギングの方法についてはいくつかあるが、それぞれを実際に行うとどんな印象か・使い勝手かといったところが知りたいので行いました。
Kubernetesでのロギングについての考え方は英語ですが<a href="https://kubernetes.io/docs/concepts/cluster-administration/logging/" target="_blank">こちらを参考</a>にするといいです。本ブログは、ロギングはサイドカーでやるのがいい！、という話ではありませんので注意してください。

また、ログの送付先ですが、いろいろと選択肢があると思います。Kubernetesクラスター上にElasticSearchなどを立てる、DatadogのようなSaaSを使うなどなど。
ロギングや監視などは可能な限り省力化したく、運用の手間がかからず安い値段から始められるものがいいということで、一旦CloudWatch logsにしてみました。（CloudWatch logsが使いづらいのはしっている！！笑）
他のサービスでも基本的な考え方は一緒なので応用できると思います。

## 結果・所感
先にこちらをやってみた結果を書くと、やってみた感じアプリケーションのログをサイドカーのFluentdで収集するのは場面によりますがあまり得ではないと現時点で考えました。  
理由は、サイドカーのデメリットはPod毎にサイドカーコンテナが必要だということです。Fluentdもまあまあメモリを食うので、ロギングというほぼどんなアプリケーションにも必要なものについてサイドカーで載せる必要はないと思っています。
サイドカーではなくDaemonSetとしてFluentdを動かすのが一番よさそうです。

Twitterで聞いてみたところ、標準出力以外に複数のファイルにログを吐く場合にサイドカーでのFluetndを使うという意見もありました。

## fluentdの設定について
コンテナ化する場合はまずは通常のサーバなりローカルで設定や概念を理解することをおすすめします。自分もこちらを実施するに当たり、一度テスト用のEC2の上で動作など確認しました。

### fluent.conf
利用するfluent.confは次のようなものとします。

```
<source>
  @type tail
  path /var/log/nginx/access.log
  format /^(?<remote>[^ ]*) (?<host>[^ ]*) (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^ ]*) +\S*)?" (?<code>[^ ]*) (?<size>[^ ]*)(?: "(?<referer>[^\"]*)" "(?<agent>[^\"]*)" "(?<forwarder>[^\"]*)")?/
  time_format %d/%b/%Y:%H:%M:%S %z
  tag nginx.access
  pos_file /fluentd/log/nginx.pos
</source>

<filter nginx.access>
  @type grep
  exclude1 path /healthcheck
</filter>

<match nginx.access>
  @type cloudwatch_logs
  log_group_name xxxxxx
  log_stream_name fluentd
  auto_create_stream true
</match>
```

### source
Nginxのaccess.logを対象としました。  
流れとしては<source>でまず対象のログをどう取得するかを決めます。
この場合はTailというプラグインを使った収集を使っています。
この対象になったログにはnginx.accessというタグをつけました。
これは後ほどフィルターしたり他の場所に転送するための判断材料になります。

### fileter
<filter>はあとからつけました。なくても動作はします。  
これをつけた理由はKubernetesのLivenessProbeでのヘルスチェックのログを排除するためです。

### match
転送先を設定します。今回はAWSのCloudWatch logsに送りたかったので、プラグインをインストールする必要があります。こちらのプラグインを利用しました。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://github.com/fluent-plugins-nursery/fluent-plugin-cloudwatch-logs" data-iframely-url="//cdn.iframe.ly/hePgjOd"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

利用するには、下記のようにgemでインストールします。
DockerHubで公開されているfluentdのコンテナイメージには当然インストールされておらず、都度インストールするのはめんどくさいので、プラグインがインストールされた状態のコンテナイメージを作っておきました。
（個人で遊びで使うときはいつもGitlabのイメージレジストリを使っています。Gitlabを使ったコンテナイメージの自動ビルドについては過去に[こちらの記事の一部](https://blog.mosuke.tech/entry/2018/05/02/rails-app-on-docker/)として書いています。）

```
gem install fluent-plugin-cloudwatch-logs
```

Fluentdは、AWSに送付するので、AWSへのアクセス権限が必要です。  
コンテナ上でIAMロールを使うのはちょっと大変なので(コンテナ環境におけるIAMロールの扱いについてはどこかで別途書きたいですね)、専用のユーザとポリシーを作成し、API Keyを環境変数で渡すことにしました。こちらは次のDeploymentの部分で説明します。

## Deploymentに組み込む
Kubernetes上のDeploymentに組み込むわけですが、サイドカー方式での基本的なロギングの考え方は以下のようになります。

![sidecar-fluentd-ovewview](/image/sidecar-fluentd-overview.png)

最終的には下記のようなマニフェストになりますが、ポイントは次の3つです。

1. PodはKubernetesのデプロイの最小単位ではありますが、そのなかにコンテナは複数配備することができます。メインはNginxなのですが、サイドカーとしてFluentdコンテナを配備しています。
2. 各コンテナでログを共有できるように、ボリューム共有(EmptyDir)をマウントしています。
3. AWSのAPI KeyなどをSecretとして環境変数で渡しています。

その他下記コメントをまぜました。
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80
        volumeMounts:
        # Nginxのconfgiをconfigmapでマウント
        - name: config-volume
          mountPath: /etc/nginx/conf.d
        # fluentdコンテナと共有するためのボリューム
        - name: log-volume
          mountPath: /var/log/nginx
        livenessProbe:
          httpGet:
            path: /healthcheck
            port: 80
      - name: fluentd
        # プラグインをインストールした独自イメージをプライベートレジストリから取得
        image: registry.gitlab.com/private-group/fluentd:latest
        volumeMounts:
        # Nginxコンテナと共有するためのボリューム
        - name: log-volume
          mountPath: /var/log/nginx
        # fluentdのconfgiをconfigmapでマウント
        - name: fluentd-config-volume
          mountPath: /fluentd/etc/
        # AWSのAPI Keyなどを環境変数でセット
        env:
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: beeglobal-app
              key: aws_access_key_id
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: beeglobal-app
              key: aws_access_key_secret
        - name: AWS_REGION
          valueFrom:
            secretKeyRef:
              name: beeglobal-app
              key: aws_region
      # プライベートレジストリへのアクセスシークレット
      imagePullSecrets:
      - name: gitlab-docker-registry
      volumes:
      - name: config-volume
        configMap:
          name: nginx-conf
          items:
          - key: proxy.conf
            path: proxy.conf
      - name: fluentd-config-volume
        configMap:
          name: fluentd-conf
          items:
          - key: fluent.conf
            path: fluent.conf
      # コンテナ間でシェアするボリューム
      - name: log-volume
        emptyDir: {}
```

## 動作確認
podを確認すると、2/2とふたつのコンテナが起動していることがきちんと確認できる。
今回のようなサイドカー方式にすると、Nginxコンテナは標準出力でログを吐き出さなくなるので、`kubectl logs`でログは確認できないことは要注意しておきましょう。

```
$ kubectl get pod
NAME                                           READY   STATUS    RESTARTS   AGE
nginx-deployment-58b86c84bb-6mggw   2/2     Running   0          22h
```

またAWSコンソール側にも少しラグはあるものの、送付されていることが確認できました。
もし、AWS側に来ない場合には、fluentdコンテナのログを確認してエラーが出てないかなど確認してみましょう。

```
$ kubectl logs nginx-deployment-58b86c84bb-6mggw -c fluentd
2019-07-11 08:20:09 +0000 [info]: starting fluentd-1.6.0 pid=6 ruby="2.5.5"
2019-07-11 08:20:09 +0000 [info]: spawn command to main:  cmdline=["/usr/bin/ruby", "-Eascii-8bit:ascii-8bit", "/usr/bin/fluentd", "-c", "/fluentd/etc/fluent.conf", "-p", "/fluentd/plugins", "--under-supervisor"]
2019-07-11 08:20:09 +0000 [info]: gem 'fluent-plugin-cloudwatch-logs' version '0.7.3'
2019-07-11 08:20:09 +0000 [info]: gem 'fluentd' version '1.6.0'
2019-07-11 08:20:09 +0000 [info]: adding filter pattern="nginx.access" type="grep"
2019-07-11 08:20:09 +0000 [warn]: #0 'exclude1' parameter is deprecated: Use <exclude> section
2019-07-11 08:20:09 +0000 [info]: adding match pattern="nginx.**" type="cloudwatch_logs"
2019-07-11 08:20:09 +0000 [info]: adding source type="tail"
2019-07-11 08:20:09 +0000 [info]: #0 starting fluentd worker pid=14 ppid=6 worker=0
2019-07-11 08:20:09 +0000 [info]: #0 following tail of /var/log/nginx/access.log
2019-07-11 08:20:09 +0000 [info]: #0 fluentd worker is now running worker=0
```

![cloudwatchlogs](/image/cloudwatchlogs-from-fluentd.png)

## まとめ
Kubernetes上のアプリケーションについて、Sidecar方式でのロギングをやってみました。
冒頭の結果のところにも書きましたが、ロギングという観点でいうとSidecarではない方法でのアプローチのほうが便利そうでした。
一方でこういったアプローチが必要な場面もあることがわかり、１つの選択肢として重要かなと考えています。