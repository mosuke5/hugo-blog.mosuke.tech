+++
categories = ["Kubernetes"]
date = "2021-03-20T00:36:10+09:00"
description = "Tekton学習シリーズ第7回では、カタログを利用してパイプラインを作ることをやります。GitHubからソースコードをダウンロードして、コンテナイメージをビルドした結果をレジストリにPushします。"
draft = false
image = ""
tags = ["Tech"]
title = "Tekton、カタログをうまく活用してパイプラインを作る（イメージビルド）"
author = "mosuke5"
archive = ["2021"]
+++

{{< tekton-series >}}

こんにちは、もーすけです。  
本日もTekton学習フェーズやっていきます。第7回では、カタログの活用とTektonを使っていく上で必ず通るであろうイメージビルドについてあわせてやっていきたいと思います。
本日のゴールは、Tektonが公開しているカタログ（公開Task）を用いて、任意のGitレポジトリにあるDockerfileをビルドしてレジストリにPushするまです。ではよろしくおねがいします。
<!--more-->

## カタログを活用する
カタログについて紹介します。今までの学習ではTaskは全部自分で作成してきました。
一方で、パイプライン内で実行したいTaskは共通化されてきます。たとえば、GitHubからソースコードをダウンロードしたい、コンテナイメージをビルドしたい、ビルドしたイメージをレジストリにプッシュしたい、などなど数え切れないほどありますよね。
そこで、Tektonではカタログという形で、Taskを公開してくれています。これを使わない手はありません。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0; margin-bottom: 30px;"><a href="https://github.com/tektoncd/catalog" data-iframely-url="//cdn.iframe.ly/XxCD6ka"></a></div></div><script async src="//cdn.iframe.ly/embed.js" charset="utf-8"></script>

例として、本日使うTaskのひとつである`git-clone`を見てみましょう。
catalogをまずはダウンロードしてきて中身を確認します。`0.1`, `0.2`, `0.3`とバージョニングされているのは、Task自体のバージョンです。利用しているTektonのバージョンに合わせて利用するものを決定しましょう。本環境では、まだ`0.15.2`を使っているので`0.2`が該当します。

```
$ git clone https://github.com/tektoncd/catalog
$ cd catalog/task/git-clone
$ tree
.
├── 0.1
│   ├── README.md
│   ├── git-clone.yaml
│   ├── samples
│   │   ├── git-clone-checking-out-a-branch.yaml
│   │   ├── git-clone-checking-out-a-commit.yaml
│   │   └── using-git-clone-result.yaml
│   └── tests
│       └── run.yaml
├── 0.2
│   ├── README.md
│   ├── git-clone.yaml
│   ├── samples
│   │   ├── git-clone-checking-out-a-branch.yaml
│   │   ├── git-clone-checking-out-a-commit.yaml
│   │   └── using-git-clone-result.yaml
│   └── tests
│       └── run.yaml
└── 0.3
    ├── README.md
    ├── git-clone.yaml
    ├── samples
    │   ├── git-clone-checking-out-a-branch.yaml
    │   ├── git-clone-checking-out-a-commit.yaml
    │   ├── git-clone-sparse-checkout.yaml
    │   └── using-git-clone-result.yaml
    └── tests
        └── run.yaml

// 対象のバージョンはREADME.mdを読めばわかる
$ cat 0.2/README.md
# `git-clone`

**Please Note: this Task is only compatible with Tekton Pipelines versions 0.14.0 and greater!**
...
```

長いのでブログには記載しませんが、[catalog/task/git-clone/0.2/git-clone.yaml](https://github.com/tektoncd/catalog/blob/main/task/git-clone/0.2/git-clone.yaml) を確認してみてください。
Taskが記載されていており、すぐ利用できるようになっています。かなり汎用的に利用できるようパラメータ化も進んでいます。
利用するときには、Taskの中身を確認し必要なパラメータを確認しTaskRunやPipelineRunから指定して利用します。
実践はこのあと見ていきましょう。

## ビルドパイプラインを構成する
### 全体構成
では、作成するパイプラインの形を決めていきましょう。  
あるレポジトリからソースコードをダウンロードしてきて、その中にあるDockerfileをビルドして、DockerHubにPushするまでを実現することとします。次のようなイメージでしょうか？

```text
(Pipeline start) - (git-clone) - (builah[build & push])
                         \     /
                          \   /
                   (Persistent Volume [for workspace])
```

今回はイメージのビルドとレジストリへのPushに [buildah](https://github.com/tektoncd/catalog/tree/main/task/buildah/0.1) というTaskを使います。
buildahは、OCIに準拠したデーモンレスのコンテナビルドツールのひとつです。TektonのTask自身がKubernetes上のコンテナとして動作することもあり、Dockerのようなデーモンプロセスを利用するより、デーモンレスのBuildahやkanikoといったツールを用いたほうが容易に実装できます。

### 下準備（レジストリ認証）
カタログにある [buildah](https://github.com/tektoncd/catalog/tree/main/task/buildah/0.1) は、イメージのビルドとレジストリへのプッシュをあわせて行います。レジストリへのプッシュには当然レジストリへの認証が必要になります。
コンテナレジストリへの認証を簡単に実現する仕組みもTektonでは用意されています。
Taskを実行するPodの利用するServiceAccountを指定できるのですが、そのServiceAccountにレジストリの認証情報をリンクさせておけばできます。  
詳しくは、公式ドキュメントの [Authentication](https://tekton.dev/vault/pipelines-v0.15.2/auth/#kubernetes-s-docker-registry-s-secret) を参照しましょう。 

今回は、レジストリにDockerHubを利用するので次のような設定ファイルを用意しておきます。
Dockerなどで利用する認証用の`config.json`です。`xxxxx`には、認証に必要なトークンをいれてください。簡単に取得する方法としては、レジストリのIDとパスワードをコロンでつなげてbase64でエンコードすることですかね。`echo -n "id:password" | base64` このような感じです。

```json
// config.json
{
	"auths": {
		"https://index.docker.io/v1/": {
			"auth": "xxxxx"
		}
	}
}
```

```
$ kubectl create secret generic dockerhub-cred \
    --from-file=.dockerconfigjson=/path/to/config.json \
    --type=kubernetes.io/dockerconfigjson
secret/dockerhub-cred created
```

次にServiceAccountです。
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-tekton-pipeline
secrets:
  - name: dockerhub-cred
```

```
$ kubectl apply -f my-tekton-pipeline-sa.yaml
serviceaccount/my-tekton-pipeline created
```

SecretとSecretを紐付けたServiceAccountの作成ができたら下準備は終了です。

### パイプライン
いよいよパイプラインの作成です。  
以下のようなパイプラインを作成しました。Taskを独自に作る必要がなかったので、指定するパラメータさえ把握できていればシンプルに書くことができました。Task内に定義されているパラメータをすべてパイプラインで定義する必要はありません。多くのパラメータはデフォルト値が設定されているので、変更したい部分だけパラメータ設定してください。
前回の[第6回](/entry/2021/03/17/tekton-pipeline-with-workspace/)でやりましたが、Task間はデータを引き継ぎできません。Workspaceが必要になります。

```yaml
# build-image-pipeline.yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: build-image-pipeline
spec:
  workspaces: 
    - name: shared-workspace
  params:
    - name: git-url
      type: string
    - name: git-revision
      type: string
      default: "master"
    - name: image
      type: string
  tasks:
    - name: fetch-repository
      taskRef:
        name: git-clone
      workspaces:
        - name: output
          workspace: shared-workspace
      params:
        - name: url
          value: $(params.git-url)
        - name: deleteExisting
          value: "true"
        - name: revision
          value: $(params.git-revision)
    - name: build-push-image
      taskRef:
        name: buildah
      params:
        - name: IMAGE
          value: $(params.image)
        - name: DOCKERFILE
          value: "Dockerfile"
        - name: CONTEXT
          value: "$(workspaces.source.path)"
      workspaces:
        - name: source
          workspace: shared-workspace
      runAfter:
        - fetch-repository
```

では、実行してみましょう。
次のようにPipelineRunを準備しました。

```yaml
# build-image-pipeline-run.yaml
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  name: build-image-pipeline-run
spec:
  pipelineRef:
    name: build-image-pipeline
  params: 
    - name: git-url
      value: https://github.com/ncskier/myapp
    - name: image
      value: mosuke5/tekton-practice:from-pipeline
  serviceAccountName: my-tekton-pipeline
  workspaces: 
    - name: shared-workspace
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 1Gi
```

#### PipelineResourceはどこにいった？
第4回 [Tekton、TaskでPipelineResouceを利用したときの挙動を確認する](/entry/2021/03/07/tekton-task-with-pipelineresource/) では、Gitレポジトリ上にあるソースコードをPipelineResourceという機能を利用してTaskと連携しました。今回はPipelineResourceを使わずにカタログの `git-clone task` を利用したわけですが、どちらを利用したほうがいいのでしょうか？と疑問がわくと思います。
今回やってみてわかったのですが、PipelineResourceは忘れていただいて、Taskで操作したほうが使い勝手がいいと考えました。理由として、`buildah task` もworkspaceでソースコードが引き渡されることが前提となっておりPipelineResourceを使う場合、Task自身を修正しなければなりませんでした。
また、余計なKubernetesリソースを作成することなくPipeline内で完結できるので、PipelineResourceは不要かな。。？と現時点では思っています。

### パイプラインの実行
パイプラインを実行して、実行結果を見てみます。  
確認ポイントとしては、各Taskの実行結果や最終的なアウトプットとしてのコンテナレジストリです。

```
$ kubectl apply -f build-image-pipeline.yaml
pipeline.tekton.dev/build-image-pipeline created

$ kubectl apply -f build-image-pipeline-run.yaml
pipelinerun.tekton.dev/build-image-pipeline-run created

// build-image-pipeline-run-fetch-repository-s588m-pod-dc5h9 が完了後に
// build-image-pipeline-run-build-push-image-srdsz-pod-wj4l7 が実行
$ kubectl get pod -w
affinity-assistant-38b60e39a8-0                             0/1     Pending     0          5s
affinity-assistant-38b60e39a8-0                             0/1     ContainerCreating   0          5s
build-image-pipeline-run-fetch-repository-s588m-pod-dc5h9   0/1     Pending             0          5s
build-image-pipeline-run-fetch-repository-s588m-pod-dc5h9   0/1     Init:0/2            0          5s
affinity-assistant-38b60e39a8-0                             1/1     Running             0          7s
build-image-pipeline-run-fetch-repository-s588m-pod-dc5h9   0/1     Init:1/2            0          15s
build-image-pipeline-run-fetch-repository-s588m-pod-dc5h9   0/1     PodInitializing     0          16s
build-image-pipeline-run-fetch-repository-s588m-pod-dc5h9   1/1     Running             0          17s
build-image-pipeline-run-fetch-repository-s588m-pod-dc5h9   1/1     Running             0          17s
build-image-pipeline-run-fetch-repository-s588m-pod-dc5h9   0/1     Completed           0          19s
build-image-pipeline-run-build-push-image-srdsz-pod-wj4l7   0/3     Pending             0          1s
build-image-pipeline-run-build-push-image-srdsz-pod-wj4l7   0/3     Pending             0          1s
build-image-pipeline-run-build-push-image-srdsz-pod-wj4l7   0/3     Init:0/3            0          1s
build-image-pipeline-run-build-push-image-srdsz-pod-wj4l7   0/3     Init:1/3            0          18s
build-image-pipeline-run-build-push-image-srdsz-pod-wj4l7   0/3     Init:2/3            0          19s
build-image-pipeline-run-build-push-image-srdsz-pod-wj4l7   0/3     PodInitializing     0          21s
build-image-pipeline-run-build-push-image-srdsz-pod-wj4l7   3/3     Running             0          22s
build-image-pipeline-run-build-push-image-srdsz-pod-wj4l7   3/3     Running             0          22s
build-image-pipeline-run-build-push-image-srdsz-pod-wj4l7   2/3     Running             0          47s
build-image-pipeline-run-build-push-image-srdsz-pod-wj4l7   0/3     Completed           0          62s
affinity-assistant-38b60e39a8-0                             1/1     Terminating         0          83s
affinity-assistant-38b60e39a8-0                             0/1     Terminating         0          83s
affinity-assistant-38b60e39a8-0                             0/1     Terminating         0          84s
affinity-assistant-38b60e39a8-0                             0/1     Terminating         0          84s
```

buildah taskは3 Stepになっているのでそれぞれのログ結果を確認します。

```text
$ kubectl logs build-image-pipeline-run-build-push-image-srdsz-pod-wj4l7 -c step-build
+ buildah --storage-driver=overlay bud --format=oci --tls-verify=true --no-cache -f Dockerfile -t mosuke5/tekton-practice:from-pipeline /workspace/source
STEP 1: FROM node:10-alpine
Getting image source signatures
Copying blob sha256:d9692e56401d84fa6b0165d088b435621acc6be27d969b047d62413658094b78
Copying blob sha256:299bbe2100ab5b3ff39aeba08c0335acd76659a5cefd364d351a0b93695bfd77
Copying blob sha256:e95f33c60a645d6d31f52fdc334aecec0d79a1b410789eae37fbf69efcd587ab
Copying blob sha256:bc3b38a692a9ec24681521bbae19ba05bd8d8cf3c24120351c1aed643142ea6c
Copying config sha256:8dd791b3335fdda7c9214afcb2942ade98881493a3d9a2172c2a6f3001ef0268
Writing manifest to image destination
Storing signatures
STEP 2: WORKDIR /myapp
STEP 3: COPY package*.json ./
STEP 4: RUN npm install

> node@12.15.0 preinstall /myapp/node_modules/node
> node installArchSpecificPackage

+ node-linux-x64@12.15.0
added 1 package in 3.109s
found 0 vulnerabilities

added 52 packages from 38 contributors and audited 52 packages in 5.773s
found 0 vulnerabilities

STEP 5: COPY . .
STEP 6: EXPOSE 3000
STEP 7: CMD ["node", "app.js"]
STEP 8: COMMIT mosuke5/tekton-practice:from-pipeline
--> d849f62cbdd
d849f62cbdde81bc3732c8c77ac8f757a9b129a7b8d20d2966c03dcbb3e40943

$ kubectl logs build-image-pipeline-run-build-push-image-srdsz-pod-wj4l7 -c step-push
+ buildah --storage-driver=overlay push --tls-verify=true --digestfile /workspace/source/image-digest mosuke5/tekton-practice:from-pipeline docker://mosuke5/tekton-practice:from-pipeline
Getting image source signatures
Copying blob sha256:1200582c7aaeec2befa0416b9425b2dd7cf904750c6e2b37ae6b95c18b0e91cc
Copying blob sha256:9120c3c4dc211acf21a892c913e3410cc5c217504941307a821e9259bc662132
Copying blob sha256:796f68ff5eda2be2c081ac8276373cf0d61b7aedebc846909069cffeb85f3d9d
Copying blob sha256:af4e4e5799facf73eff4d722502aedc093c2bdfaf1eefce793347ab6e611387d
Copying blob sha256:6169bf830ae69f192382cfe9a6fe96e7f28a21c0c5e5045b85871b510de58435
Copying config sha256:d849f62cbdde81bc3732c8c77ac8f757a9b129a7b8d20d2966c03dcbb3e40943
Writing manifest to image destination
Storing signatures

$ kubectl logs build-image-pipeline-run-build-push-image-srdsz-pod-wj4l7 -c step-digest-to-results
+ tee /tekton/results/IMAGE_DIGEST
+ cat /workspace/source/image-digest
sha256:b25636094be442def8fb922a6b8a0893eba3ddc258f8042a76008af4ad3a92cc
```

DockerHubにも無事にイメージがプッシュされているのを確認しました。

![tekton-dockerhub](/image/tekton-dockerhub-after-buildah-task.png)

## まとめ
本日は、カタログを使用した、イメージのビルド方法について学びました。  
だいぶ実践的なパイプラインになってきましたね。これからはKubernetesクラスタにアプリケーションをデプロイするなど、より実践的な内容へと発展していきます。
内容が難しかったよという人は、ぜひ前の学習シリーズの復習などしてみてください。

{{< tekton-series >}}