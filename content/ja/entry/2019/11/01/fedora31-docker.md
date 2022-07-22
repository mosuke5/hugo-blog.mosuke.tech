+++
categories = ["", ""]
date = "2019-11-01T10:23:57+09:00"
description = ""
draft = true
image = ""
tags = ["Tech"]
title = ""
author = "mosuke5"
archive = ["2019"]
+++

## Fedora31でdockerが動作しない
10月の終わり頃にFedora31がきました。
早速アップグレードして楽しんでいたのですが、アップグレード内容をよく知らずに行ったのですが、ここには重大な内容も含まれていました。
https://fedoramagazine.org/announcing-fedora-31/


Fedora31では、cgroupがv2に上がっています。
cgroupとは、
それゆえに、今日時点ではDockerは動作しません。今日の多くのコンテナツールではまだ対応がされていません。

実際にDockerを動かしてみると、下記のように`open /sys/fs/cgroup/docker/cpuset.cpus.effective: no such file or directory`とエラーが発生して起動できません。

```
$ sudo docker run nginx --image=nginx
docker: Error response from daemon: OCI runtime create failed: container_linux.go:346: starting container process caused "process_linux.go:297: applying cgroup configuration for process caused \"open /sys/fs/cgroup/docker/cpuset.cpus.effective: no such file or directory\"": unknown.
ERRO[0000] error waiting for container: context canceled
```

解決策は大きく２つあると書かれています。
1. cgroupのバージョンを下げる
1. <a href="https://podman.io/" target="_blank">podman</a>を使う

せっかくなのでpodmanを使ってみることにしました。

## podmanとは
簡単な動かし方は、Dockerと変わりません。
めざすところ、やらないところ。
linkがない。いろいろない。

## How to use
```
$ podman run --name mynginx -p 8888:80 -d nginx
$ podman ps -a
CONTAINER ID  IMAGE                           COMMAND               CREATED        STATUS            PORTS                   NAMES
4c5ef3eddaa4  docker.io/library/nginx:latest  nginx -g daemon o...  3 seconds ago  Up 3 seconds ago  0.0.0.0:8888->80/tcp    mynginx
$ curl localhost:8888
curl localhost:8888
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
    body {
        width: 35em;
        margin: 0 auto;
        font-family: Tahoma, Verdana, Arial, sans-serif;
    }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>

$ podman stop mynginx
4c5ef3eddaa4abf40ebd13b7337769039d65690cfc5691d72cbe3cba67fece2f
$ podman rm mynginx
4c5ef3eddaa4abf40ebd13b7337769039d65690cfc5691d72cbe3cba67fece2f
```

## buildah, skopeo


## まとめ