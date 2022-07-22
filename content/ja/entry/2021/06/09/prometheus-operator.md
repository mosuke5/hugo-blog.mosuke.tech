+++
categories = ["", ""]
date = "2021-06-09T17:06:07+09:00"
description = ""
draft = true
image = ""
tags = ["Tech"]
title = ""
author = "mosuke5"
archive = ["2021"]
+++

こんにちは、もーすけです。  
以前に書いた「ZabbixでKubernetesの監視を検討する（Prometheus exporter, Kubernetes API）」のブログがそれなりにアクセス数があり、みなさんKubernetesにおける監視に困っているんだろうなと思いこの記事を書こうと決断しました。
前の記事では、既存環境で使われていたZabbixをどうKubernetesにおける監視で利用できるか？といった観点でしたが、Zabbixでなくていいとしたらなにで監視するのがいいのだろうか？と思いますよね。
そこで、ひとつの選択肢であるPrometheusについて紹介します。

## Prometheusとは

## Prometheus Operatorとは

## Prometheus Operatorのインストール

## ServiceMonitor

## PrometheusRule

## Alert Manager

## Grafana Operator