+++
categories = ["DevOps", "Kubernetes"]
date = "2022-01-24T10:52:13+09:00"
description = "Tektonのgit-cloneタスクでプライベートレポジトリを扱う際の認証・クレデンシャル管理の方法と仕組みをみていきます。"
draft = false
image = ""
tags = ["Tech"]
title = "Tekton、プライベートなGitレポジトリを扱う方法と仕組みについて"
author = "mosuke5"
archive = ["2022"]
+++

{{< tekton-series >}}

こんにちは、もーすけです。  
このシリーズの中で[git-clone](https://hub.tekton.dev/tekton/task/git-clone)タスクを利用してきましたが、いままではパブリックなレポジトリを対象に扱ってきましたが、実運用では当然ながらプライベートレポジトリを活用するはずです。
プライベートレポジトリを使っていくにはどうしたらいいのか、その場合の挙動などを確認しておきます。

Tektonパイプラインで、git-cloneタスクを使う場合、git-cloneタスクに実装される `ssh-directory` 設定を使うか、Tektonで用意した認証の仕組みを使うかのどちらかになると思います。それぞれの方法について見ていきましょう。
<!--more-->

## git-cloneタスクのssh-directoryを使う
※ここで紹介しているgit-cloneタスクは[v0.5](https://github.com/tektoncd/catalog/blob/main/task/git-clone/0.5/git-clone.yaml)です。  
ひとつめの方法は、git-cloneタスクに実装されているworkspace設定を利用する方法です。
git-cloneタスクでは、次のようにworkspacesの設定（`ssh-directory`）が定義されています。

```yaml
# https://github.com/tektoncd/catalog/blob/main/task/git-clone/0.5/git-clone.yaml
  workspaces:
    - name: output
      description: The git repo will be cloned onto the volume backing this Workspace.
    - name: ssh-directory
      optional: true
      description: |
        A .ssh directory with private key, known_hosts, config, etc. Copied to
        the user's home before git commands are executed. Used to authenticate
        with the git remote when performing the clone. Binding a Secret to this
        Workspace is strongly recommended over other volume types.
```

`ssh-directory`の情報（パスやバインド有無）が環境変数で指定されPodが起動します。

```yaml
# https://github.com/tektoncd/catalog/blob/main/task/git-clone/0.5/git-clone.yaml
  steps:
    - name: clone
      image: "$(params.gitInitImage)"
      env:
      ...
      - name: WORKSPACE_SSH_DIRECTORY_BOUND
        value: $(workspaces.ssh-directory.bound)
      - name: WORKSPACE_SSH_DIRECTORY_PATH
        value: $(workspaces.ssh-directory.path)
      ...
```

Taskが実行されるPod内で、上の環境情報を用いて、ホームディレクトリの`.ssh`内にコピーされることもわかります。
ホームディレクトリの `.ssh`までコピーされれば、LinuxやUNIXシステムでいつもどおり扱っているとおりですね。
つまり、`ssh-directory`に指定するシークレット内で、`id_rsa`や`known_host`, `config`ファイルを用意すれば良さそうですね。

```shell
# https://github.com/tektoncd/catalog/blob/main/task/git-clone/0.5/git-clone.yaml
if [ "${WORKSPACE_SSH_DIRECTORY_BOUND}" = "true" ] ; then
  cp -R "${WORKSPACE_SSH_DIRECTORY_PATH}" "${PARAM_USER_HOME}"/.ssh
  chmod 700 "${PARAM_USER_HOME}"/.ssh
  chmod -R 400 "${PARAM_USER_HOME}"/.ssh/*
fi
```

次のようなシークレットを作って、Task利用時にパラメータを指定してあげれば問題なしです。

```yaml
kind: Secret
apiVersion: v1
metadata:
  name: my-ssh-credentials
data:
  id_rsa: <base64でエンコードされた秘密鍵>
  known_hosts: <base64ででエンコードされたknown_hosts>
```

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: my-pipeline 
spec:
  workspaces:
    - name: shared-workspace
    - name: ssh-cred
  #...
  tasks:
    - name: fetch-repository
      taskRef:
        name: git-clone
      workspaces:
        - name: output
          workspace: shared-workspace
        - name: ssh-directory
          workspace: ssh-cred
      params:
        - name: url
          value: $(params.git-url)
        - name: deleteExisting
          value: "true"
        - name: revision
          value: $(params.git-revision)
```

## Tektonに実装された認証の仕組みを使う
もうひとつの方法が、Tektonのもつ認証の仕組みを利用するものです。  
Tektonでは、所定の方式で記述したSecretをTaskのPod内で展開する仕組みを持っています。
実際の使い方と、動きを見ていきましょう。

公式ドキュメントは以下を参照してください。

<div class="belg-link row">
  <div class="belg-right col-md-12">
  <div class="belg-title">
      <a href="https://tekton.dev/vault/pipelines-v0.28.2/auth/" target="_blank">Tekton: Using custom ServiceAccount credentials</a>
    </div>
    <div class="belg-description">Authentication at Run Time This document describes how Tekton handles authentication when executing TaskRuns and PipelineRuns. Since authentication concepts and processes apply to both of those entities in the same manner, this document collectively refers to TaskRuns and PipelineRuns as Runs for the sake of brevity.</div>
    <div class="belg-site">
      <img src="https://tekton.dev/favicons/android-192x192.png" class="belg-site-icon">
      <span class="belg-site-name">Tekton</span>
    </div>
  </div>
</div>

次のようにSecretを作ります。  
後ほど見ますが、Tekton的には、`github.com`に対して、設定した`private-key`を使いますということです。

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-ssh
  annotations:
    tekton.dev/git-0: github.com
type: kubernetes.io/ssh-auth
stringData:
  ssh-privatekey: <private-key>
  known_hosts: <known-hosts>
```

Taskの実行にpipelineというService Accountを使います。
次のように上で作ったシークレットをServiceAccountと紐付けておきます。

```text
$ kubectl get sa pipeline -o yaml
apiVersion: v1
imagePullSecrets:
- name: pipeline-dockercfg-5hww7
kind: ServiceAccount
metadata:
  creationTimestamp: "2022-01-24T07:01:01Z"
  name: pipeline
  namespace: cicd-demo
  ownerReferences:
  - apiVersion: operator.tekton.dev/v1alpha1
    blockOwnerDeletion: true
    controller: true
    kind: TektonInstallerSet
    name: rbac-resources
    uid: a90a96f6-5ca5-4823-b3bd-46e21d8161b8
  resourceVersion: "145756"
  uid: 40c66ae7-9a4a-46ea-bc4e-7a8224f12402
secrets:
- name: pipeline-token-fp78s
- name: pipeline-dockercfg-5hww7
- name: my-ssh
```

この状態でTaskを実行したときの、Pod内の状態を確認します。  
次のTask/TaskRunを使用し、起動したPod内でいろいろとファイルを確認していきましょう。

```yaml
## sleep-task.yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: sleep-task
spec:
  steps:
    - name: sleep
      image: fedora:latest
      command: ["sleep"]
      args: ["3600"]
```

```yaml
## sleep-task-run.yaml
apiVersion: tekton.dev/v1beta1
kind: TaskRun
metadata:
  name: sleep-task-run
spec:
  taskRef:
    name: sleep-task
```

```text
$ kubectl apply -f sleep-task.yaml
task.tekton.dev/sleep-task created

$ kubectl apply -f sleep-task-run.yaml
taskrun.tekton.dev/sleep-task-run created

$ kubectl get pod
NAME                             READY   STATUS      RESTARTS   AGE
sleep-task-run-pod-spz2n         1/1     Running     0          25s

$ kubectl exec -it sleep-task-run-pod-spz2n -- bash
[root@sleep-task-run-pod-slq52 ~]#
[root@sleep-task-run-pod-slq52 ~]# ls -l /tekton/creds-secrets/my-ssh/
total 0
lrwxrwxrwx. 1 root 1000670000 21 Jan 24 09:21 ssh-privatekey -> ..data/ssh-privatekey
[root@sleep-task-run-pod-slq52 ~]#
[root@sleep-task-run-pod-slq52 ~]# ls -al /tekton/creds/.ssh/
total 8
drwxr-sr-x. 2 root 1000670000   80 Jan 24 14:36 .
drwxrwsrwt. 4 root 1000670000   80 Jan 24 14:36 ..
-rw-------. 1 root 1000670000   98 Jan 24 14:36 config
-rw-------. 1 root 1000670000 1675 Jan 24 14:36 id_my-ssh
[root@sleep-task-run-pod-slq52 ~]#
[root@sleep-task-run-pod-slq52 ~]# #のちほど説明するが、ホームディレクトリにクレデンシャル等がコピーされている
[root@sleep-task-run-pod-slq52 ~]# ls -al /root/.ssh/
total 8
drwx------. 2 root root   37 Jan 24 09:21 .
dr-xr-x---. 1 root root   33 Jan 24 09:21 ..
-rw-------. 1 root root   98 Jan 24 09:21 config
-rw-------. 1 root root 1675 Jan 24 09:21 id_my-ssh
[root@sleep-task-run-pod-slq52 ~]#
[root@sleep-task-run-pod-slq52 ~]# cat /root/.ssh/config
Host github.com
    HostName github.com
    Port 22
    IdentityFile /tekton/creds/.ssh/id_my-ssh
[root@sleep-task-run-pod-slq52 ~]#
[root@sleep-task-run-pod-slq52 ~]# cat /root/.ssh/id_my-ssh
-----BEGIN RSA PRIVATE KEY-----
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
-----END RSA PRIVATE KEY-----
```


では、これらの設定はいつどのように行われるのでしょうか。
TektonがTaskを実行するPodでは、`/tekton/tools/entrypoint` が実行されます。
`entrypoint` の引数には `-ssh-git=my-ssh=github.com` が書かれており、シークレットで定義した情報がわたっています。

```yaml
  containers:
  - args:
    - -wait_file
    - /tekton/downward/ready
    - -wait_file_content
    - -post_file
    - /tekton/tools/0
    - -termination_path
    - /tekton/termination
    - -step_metadata_dir
    - /tekton/steps/step-sleep
    - -step_metadata_dir_link
    - /tekton/steps/0
    - -docker-cfg=pipeline-dockercfg-5hww7
    - -ssh-git=my-ssh=github.com
    - -entrypoint
    - sleep
    - --
    - "3600"
    command:
    - /tekton/tools/entrypoint
```

`/tekton/tools/entrypoint`の実装を見てみると、実態がみえてきます。  
以下は [/cmd/entrypoint/main.goの88-97行](https://github.com/tektoncd/pipeline/blob/release-v0.21.x/cmd/entrypoint/main.go#L88-L97) ですが、このWrite処理にて、`/tekton/creds`配下に秘密鍵の書き込みや生成した`.ssh/config`を書き込みます。 
Writeの処理は、Gitレポジトリかイメージレジストリ向けのクレデンシャルで処理がことなりますが、Gitレポジトリむけのsshの設定ファイルは [pkg/credentials/gitcreds/ssh.go](https://github.com/tektoncd/pipeline/blob/release-v0.21.x/pkg/credentials/gitcreds/ssh.go#L74-L126) に記載があります。

```go
	// Copy credentials we're expecting from the legacy credentials helper (creds-init)
	// from secret volume mounts to /tekton/creds. This is done to support the expansion
	// of a variable, $(credentials.path), that resolves to a single place with all the
	// stored credentials.
	builders := []credentials.Builder{dockercreds.NewBuilder(), gitcreds.NewBuilder()}
	for _, c := range builders {
		if err := c.Write("/tekton/creds"); err != nil {
			log.Printf("Error initializing credentials: %s", err)
		}
	}
```

その上で、ホームディレクトリに対してコピーを行うという処理になっています。
以下は [/cmd/entrypoint/main.goの113-117行](https://github.com/tektoncd/pipeline/blob/release-v0.21.x/cmd/entrypoint/main.go#L113-L117) です。

```go  
  // Copy any creds injected by the controller into the $HOME directory of the current
  // user so that they're discoverable by git / ssh.
  if err := credentials.CopyCredsToHome(credentials.CredsInitCredentials); err != nil {
  	log.Printf("non-fatal error copying credentials: %q", err)
  }
```

やっていること自体はそれほど難しくないことがうかがえます。

## まとめ
今回は、git-cloneタスクを使った場合にプライベートレポジトリへどうやってアクセスできるか？（クレデンシャルをどう扱えるか？）を確認してみました。
実装を追っていくとそれほど難しくないこともわかります。
また、今回はGitレポジトリのクレデンシャルを扱いましたが、コンテナイメージレジストリへのクレデンシャルについてもほぼ同様の仕組みが使われています。

もう怖くないですね。  
今後もTektonを楽しんでいきましょう。
