+++
categories = ["AWS", "クラウド技術"]
date = "2019-04-14T13:40:27+09:00"
description = "Amaozn ECSを利用した際のFargateの仕組みやそのデプロイフローを解説します。Fargateが単なるコンテナではなくVMである点など興味深いことが見えてきました。"
draft = false
image = ""
tags = ["Tech"]
title = "Amazon ECSを使った際のFargateの仕組みとそのデプロイフローを学ぶ"
author = "mosuke5"
archive = ["2019"]
+++

ニート最終日の[@mosuke5](https://twitter.com/mosuke5)です。  
今日は、Amazon ECSからみる、AWSのコンテナ戦略やECSへのデプロイフローなどについて解説します。
自分はDockerやKubernetesなどを触ってきましたが、AWS特有のコンテナサービスであるECS, Fargateを調査していくとAWSの戦略などいろんな発見がありました。
<!--more-->

## 全体像
Amazon ECSで実現することの全体像は下記の通りです。  
大きく右と左で分かれていて、左側のAWS上ではECS(Fargateのタスク)でNginxで静的なデータを返すWebサーバを配置。前段にALBで分散してアクセスできるようにしています。
右側では、Gitlabを用いて、そのECSに対して変更をデプロイを行います。

![overview](/image/overview-deploy-to-ecs-with-gitlab.png)

## Fargateの動き
まず、Fargateについてです。個人的に一番盛り上がっていたポイントです！！  
Amazon ECSではタスクを実行する環境をEC2かFargateか選ぶことができます。
今回はサーバレスで起動できるFargateを採用したのですが、触り始めてすぐにある違和感に気づきました。
それは、**Fargateが単なるコンテナではない**、ということです。
どういうことかというと、Fargate Taskをスケールさせた際にALB配下のターゲットがFargateのIPアドレスであり、また全てが同じ80番ポートだったということです。
以下のスクリーンショットは3台にFargateをスケールさせたときのALBのターゲットです。  
みなさんは、これをみて違和感に気づきましたでしょうか？

![alb-targets](/image/ecs-alb-targets.png)

もしFargateを単なるコンテナとして見るならば、すべてがポート80であることは不自然です。
なぜかというと、コンテナはホストサーバの上に複数立ち上がることが一般的です。
ホスト上では80ポートは1つしか使えないため、もしすべてのコンテナが80ポートでアクセスできるためにはそれぞれのコンテナが別々のホストでないといけないからです。
1コンテナに対して1VMというのは一般的には考えづらく、これはなんだ？？と思っていました。

自分はKubernetesは触っており、kube-proxyによるコンテナの分散を見ていたから余計にそのように感じるのかもしれません。
Kubernetesではロードバランサが直接コンテナに分散することはなく、ワーカーノードに対してロードバランサの振り先が設定されます。
その上で、ワーカーノード上のkube-proxyが適切なコンテナへのリクエストの振り分けを行います。そのため、例えば80番ポートを利用するコンテナも、コンテナのホスト側のポートが必ずしも80である必要はない、というものです。
下記は、[こちらのスライドの抜粋](https://www.slideshare.net/mosuke5/alibabacloudkubernetes)。

![kube-proxy](/image/kubeproxy-why-loadbalanced.png)

実際に、この違和感はすぐにとあることを思い出して納得しました。  
それは少し前にAWSが公表していたFirecrackerというオープンソースです。こちらでは、125msでmicroVMを立ち上げることのできるソフトウェアで、こちらをFargateやLambdaに利用しているとのことでした。
つまり、**Fargateはたんなるコンテナではなく、やはりひとつのVMとして動作しているということ**です。
詳しくはこちらの記事をみるといいでしょう。

[Firecracker – サーバーレスコンピューティングのための軽量な仮想化機能 | Amazon Web Services ブログ](https://aws.amazon.com/jp/blogs/news/firecracker-lightweight-virtualization-for-serverless-computing/)


ちなみに、料金をみるとFargateは少しお高めに設定されています。  
最近値下がったとはいえ、例えば1vCPU, 1GB memoryのFargateコンピューティングを1ヵ月動かすと、大体4400円/月くらいかかります。高いですね。
しかし、料金体系的にメモリを増やしてもそこまで高くならないのがポイントかもしれません。
1vCPU, 4GB memoryのFargateコンピューティングを1ヵ月動かしても、5500-6000円/月とそこまで変わりません。
仮に小スペックでも上のようにFirecrackerでVMとして起動するのでそういう意味で高いのかもしれませんね。（真相はしりません.）

## ECSへのデプロイ
さて、ECSを利用したときのFargateの動きが理解できたところで、実際にECSへのデプロイを行っていきます。
ECSへのデプロイは、[ecs-deploy](https://github.com/silinternational/ecs-deploy)というオープンソースを利用しました。

@mogulla3がツールの解説をしているのでこちらを参考にするといいと思います。  
[ecs-deployを使ったAmazon ECSへのデプロイの裏側](https://sandragon.hatenablog.com/entry/2019/04/14/211209)

アプリの変更から自動的にコンテナイメージを生成してデプロイするまでをGitlabを活用しました。
下記のような`.gitlab-ci.yml`をアプリのレポジトリに配置して、Masterブランチへのコミットをトリガーに、Dockerイメージの生成とAWS ECSへのデプロイを行いました。Dockerイメージにはgitのコミット番号を振り、切り戻しなどしやすいようにしています。

```YAML
image: docker:stable

services:
  - docker:dind

stages:
  - build
  - deploy

variables:
  CONTAINER_IMAGE: registry.gitlab.com/$CI_PROJECT_PATH
  DOCKER_DRIVER: overlay2

before_script:
  - docker login -u gitlab-ci-token -p $CI_JOB_TOKEN registry.gitlab.com
  - apk add jq python3
  - apk add bash
  - pip3 install awscli
  
release-image:
  stage: build
  script:
    - docker pull $CONTAINER_IMAGE:latest || true
    - docker build --cache-from $CONTAINER_IMAGE:latest --tag $CONTAINER_IMAGE:$CI_BUILD_REF --tag $CONTAINER_IMAGE:latest .
    - docker push $CONTAINER_IMAGE:$CI_BUILD_REF
    - docker push $CONTAINER_IMAGE:latest
  only: 
    - master

deploy:
  stage: deploy
  script:
    - wget https://raw.githubusercontent.com/silinternational/ecs-deploy/master/ecs-deploy -O /usr/bin/ecs-deploy
    - chmod +x /usr/bin/ecs-deploy
    - ecs-deploy -c <ECS cluster name> -n <ECS service name> -i $CONTAINER_IMAGE:$CI_BUILD_REF
  only: 
    - master
```

## SecretManager連携
Fargateのタスクで利用するDockerイメージはプライベートレポジトリに格納されているものです。
プライベートレポジトリから取得するためには認証がいるのですが、ここでしょうもないことにハマりました。
設定自体は[こちらのドキュメント](https://docs.aws.amazon.com/ja_jp/AmazonECS/latest/developerguide/private-auth.html)をみながらやっていたのですが、うまくいかない状況でした。  
下記は出ていたエラーメッセージです。IAMのポリシーがおかしいというのは分かっていたのですが、はじめなにがおかしいかわかりませんでした。

```
Asm fetching secret from the service for arn:aws:secretsmanager:ap-northeast-1:xxxxxxxxxx:secret:gitlab-sample-registry-y54JnU: AccessDeniedException: User: arn:aws:sts::xxxxxxxxxx:assumed-role/ecsTaskExecutionRole/14edf050-3d47-4c90-8e13-cb4a6d0e67a1 is not authorized to perform: secretsmanager:GetSecretValue on resource: arn:aws:secretsmanager:ap-northeast-1:xxxxxxxxxx:secret:gitlab-sample-registry-y54JnU status code: 400, request id: 83b3a590-db73-43d8-a0cb-abf894994173
```

IAMのロールのポリシーの設定で下記を設定する必要があるのですが、`Resource`ででてくる`secret_name`に少し罠がありました。

```json
{
  "Version": "2012-10-17",
  "Statement": 
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:region:aws_account_id:secret:secret_name",
        "arn:aws:kms:region:aws_account_id:key:key_id"     
      ]
    }
  ]
}
```

secret managerの下記の画面の「Secret Name」ではなく、ARNの末尾の値のことでした。ここは初心者には間違えやすいので注意してください。

![secret-name](/image/aws-secret-name-edited.png)

## まとめ
Amazon ECSでタスクの実行にFargateを利用する際に知っておくべき、Fargeteの仕組みやECSへのデプロイ方法を見てきました。Fargateの仕組みについては、一見クラウド利用者からすると無関係な知識のように見えますが、コンテナのセキュリティやクラウドを真に理解して使っていくためには必要な知識と言えます。  
今後ECSを使っていく人のすこしでも参考になればと思います。