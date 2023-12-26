+++
categories = ["", ""]
date = "2017-12-30T04:10:49Z"
description = ""
draft = true
image = ""
tags = ["Tech"]
title = ""
author = "mosuke5"
archive = ["2017"]
+++

## Installation
```text
$ wget https://github.com/prometheus/prometheus/releases/download/v2.0.0/prometheus-2.0.0.linux-amd64.tar.gz
$ tar xvfz prometheus-*.tar.gz
```

## 自動起動設定
```text
$ sudo vim /lib/systemd/system/prometheus.service
[Unit]
Description=Prometheus Service
After=syslog.target prometheus.service

[Service]
Type=simple
ExecStart=/usr/local/src/prometheus/prometheus --config.file=/usr/local/src/prometheus/prometheus.yml
PrivateTmp=false

[Install]
WantedBy=multi-user.target
```

```text
$ sudo systemctl enable prometheus
$ sudo systemctl start prometheus
```