+++
categories = ["コンテナ", "Kubernetes", "ブログ運用"]
date = "2020-11-18T17:32:21+09:00"
description = "DockerがDocker Hubに対してもうけたイメージのダウンロードの回数制限とその対策について解説します。仕様と対策方法さえ理解しておけばこわくないです。"
draft = false
image = ""
tags = ["Tech"]
title = "Docker Hubのダウンロード回数制限の対策を考える"
author = "mosuke5"
archive = ["2020"]
+++

こんにちは。もーすけです。  
今日は最近開始されたDocker Hubのイメージダウンロードの回数制限について書きたいと思います。
動向だけはなんとなく追っていたのですが、先日に自分がこの問題に向き合わなければいけないケースに遭遇したため、残しておこうと思い立ちました。

## きっかけ
本ブログの記事のビルドやデプロイには[Wecker](https://app.wercker.com/)というサービスを利用しています。
ある日、記事を投稿しようとしたところCIのビルドがコケて記事を投稿できませんでした。
エラーは以下のとおりで、調べるとDocker Hubのイメージダウンロードの回数制限に引っかかっていることがわかりました。

> `fetch failed to pull image debian: API error (500): {"message":"toomanyrequests: You have reached your pull rate limit. You may increase the limit by authenticating and upgrading: https://www.docker.com/increase-rate-limit"}`

![docker-rate-limit-error](/image/wercker-docker-rate-limit-error.png)
<!--more-->

## Dockerの対応方針
Dockerは、Docker Hubへのイメージのダウンロード（Pull）に対して、回数制限をもうけました。
回数制限は、ユーザのアカウントタイプによって変わります。アカウントタイプについてはこちらの[Pricing](https://www.docker.com/pricing)をみるといいです。

回数制限は、ユーザのアカウントタイプによって変わるということですが、認証していない状態の場合はイメージのダウンロードができなくなったということでしょうか？どうやらそういうわけではないようです。  
認証をしていない場合は、**接続元のIPアドレスで判断**されるそうです。  
原文をみると `Unauthenticated (anonymous) users will have the limits enforced via IP.` と記述があります。
ちなみにダウンロードの回数制限は下記のとおりとなっています。（2020年11月18日時点の情報です）

- 認証なし: 6時間で100リクエスト
- 無料ユーザ: 6時間で200リクエスト
- 有料ユーザ: 無制限

詳しくは、公式ドキュメントを読むようにしてください。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://docs.docker.com/docker-hub/download-rate-limit/" data-iframely-url="//cdn.iframe.ly/t2IWTFY?iframe=card-small"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

### オープンソースプロジェクトへの対応
ただし、「オープンソースのプロジェクトに対してはこの制限措置を行わない」ことも発表しています。  
承認されるには申請も必要とのことなので、この文章を執筆時点ではメジャーなオープンソースプロジェクトでも制限にひっかかることがあるということと理解しています。
もしかしたら、今後メジャーなオープンソースプロジェクトがしっかりとDocker社に承認されれば、以下に記述する対策は必要なくなるかもしれませんが、仕様と対応方法を理解しておけばもう怖くないです。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://www.publickey1.jp/blog/20/docker_hubdocker.html" data-iframely-url="//cdn.iframe.ly/G5QNWE4?iframe=card-small"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

## 対策
上の、「接続元のIPアドレスで判断」というのが非常にやっかいです。
たとえば、自分が遭遇したようにSaaSのCIツールを使っている場合、そのSaaSが動く環境のIPアドレスで判断されるため、SaaSのユーザが多ければ当然このリミットに引っかかることがあるということです。
社内のネットワークなども同様でしょう。充分に仕様を理解して対策・対応しておく必要があるといえます。

### アカウントを作る
まず当然のことながら、回数制限に引っかかってしまったときのために、自分のDocker Hubのアカウントを作りましょう。
そして、必要なときにすぐにDocker Hubのアカウントで認証できるように準備しておくことが重要です。
アカウントで認証さえしておけば、IPアドレスによる判断はなくなりますので安心して使えます。

### 認証する (Docker)
Dockerを利用している多くの方は問題ないかと思いますが、`docker`コマンドを使ってDocker Hubへ認証を素振りしておきましょう。
今までは、自分のレポジトリにコンテナイメージをアップロードしたり、プライベートレジストリを利用するときくらいしか認証しませんでしたが、Pullのみでも認証する必要がでてきます。

```text
% docker login
Login with your Docker ID to push and pull images from Docker Hub. If you don't have a Docker ID, head over to https://hub.docker.com to create one.
Username: mosuke5
Password:
WARNING! Your password will be stored unencrypted in /Users/mosuke5/.docker/config.json.
Configure a credential helper to remove this warning. See
https://docs.docker.com/engine/reference/commandline/login/#credentials-store

Login Succeeded
```

### 認証する (Kubernetes)
Docker Hubからイメージを取得するのは、Kubernetesを利用しているときにもあります。
Kubernetesを利用した場合の、Docker Hubへの認証方法もきちんと練習しておきましょう。
これは、普段プライベートレジストリを使っている人はおなじみです。パブリックレジストリですが、プライベートレジストリと同様に認証の設定を行えば問題なしです。詳しくは[こちらのドキュメント](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/)をみてもらうとして、ここでは簡易的に情報をお伝えします。

上で `docker login` を行いましたが、こちらに成功すると `~/.docker/config.json` にトークンが記述されます。（他のレジストリにログインしたことあれば、他のレジストリへのトークンも保存されているでしょう。）
このトークンをKubernetesのSecretとして保存する必要があります。

```text
% cat ~/.docker/config.json
{
    "auths": {
        "https://index.docker.io/v1/": {
            "auth": "your-auth-token"
        }
    }
}
```

下記のように登録し、状態を確認しておきます。

```text
% kubectl create secret generic regcred \
    --from-file=.dockerconfigjson=/Users/mosuke5/.docker/config.json \
    --type=kubernetes.io/dockerconfigjson
secret/regcred created

% oc get secret
NAME                       TYPE                                  DATA   AGE
regcred                    kubernetes.io/dockerconfigjson        1      3s

% oc get secret regcred -o yaml
apiVersion: v1
data:
  .dockerconfigjson: xxxxxxxxxxxxxxxxxxxxxxxx
kind: Secret
metadata:
  creationTimestamp: "2020-11-18T10:09:39Z"
  name: regcred
  namespace: default
  resourceVersion: "291862"
  selfLink: /api/v1/namespaces/default/secrets/regcred
  uid: 03527b40-6c46-43b6-a4a3-9bd10e0f3eb7
type: kubernetes.io/dockerconfigjson
```

あとは、Podをデプロイするときに、上で作成したSecretを`imagePullSecrets`に引き渡してあげれば問題なしです。
パブリックレジストリなのにSecretを指定するのはややめんどくさいです。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: from-docker-hub
spec:
  containers:
  - name: docker-hub-image
    image: nginx:latest
  imagePullSecrets:
  - name: regcred
```

### 別レジストリを検討しておく
もし、よく使うイメージなどがあれば、Docker Hub以外のところにおいておくのもひとつの手段かと思います。
現時点で、わたしがよく使う他のレジストリとしては、[quay.io](https://quay.io/)や[GitlabのContainer Registry](https://docs.gitlab.com/ee/user/packages/container_registry/)があります。
これらのサービスもいつどういう方針になるかわかりませんが、バックアップとしてもっておくといいでしょう。

### サードパーティプラットフォームの対応
SaaSのCIツールなどサードパーティのプラットフォームの処理でDocker Hubからイメージを取得している場合は、要対応が必要です。
Dockerも [Third-party platforms](https://docs.docker.com/docker-hub/download-rate-limit/#third-party-platforms) という公式ドキュメントを出していますので、確認し対応してみてください。
自分が使っていたWerckerはこの一覧にはなかったので自分で調べて対応する必要があります。
多くのサービスではプライベートレジストリに対応するための認証機能をもっているはずです。確認してみましょう。

## まとめ
自分がこの問題に遭遇してみると、今回のDockerのポリシーの変更のインパクトの大きさを実感します。
遭遇しないように、遭遇したときにすぐ対応できるように、仕様を理解し対策を考えておきましょう。
最近のDocker社の動きは激しいので、またポリシー変更などあればお知らせしたいと思います。