+++
categories = ["OpenShift", "kubernetes", "devops"]
date = "2024-12-09T00:00:00+09:00"
description = "OpenShiftクラスタが増えるといろんな弊害が生まれます。OpenShiftを効率的に管理する方法のひとつとしてアプリケーションチームへの権限委譲がありますが、それをACM(Advanced Cluster Management for Kubernetes)で実践します。"
draft = false
image = ""
tags = ["Tech"]
title = "OpenShift、ACMを使って利用者への権限委譲しつつ無法地帯を避ける方法を考えよう"
author = "mosuke5"
archive = ["2024"]
+++

だいぶお久しぶりです。もーすけです。  
気がつけば技術記事を書くのは2022年12年ぶりとなります（汗）
子供が生まれてから、毎日送り迎えやら一緒に遊びにいったりやらをしていたらこんなにも月日が経っていました。おそろしいですね！！

さて、2024年はみなさんにとってどんな技術トピックが話題だったでしょうか？

OpenShiftのコンサルタントとして日々いろんなお客さんに接していると、"Platform Engineering" というキーワードを使って組織改善に取り組むケースが増えてきたなという印象です。
Platform Engineeringといえば、2023年頃から少しずつ話題に上がっていましたが、いよいよトライしていく企業さんが増えてきたなあと。
もちろんそれ以前もDevOpsとかいろんな別の言葉を使って語られてはきたんですが、丁度いい言葉ができたからなのか話題にあがることが増えてきています。

今日は、そんなPlatform Engineeringを実践していく上での「アプリケーションチームへの権限委譲」のテクニックをひとつ紹介します。

ちなみに、こちらの記事は "{{< external_link url="https://qiita.com/advent-calendar/2024/openshift" title="OpenShift Advent Calendar 2024" >}}" の9日目の記事となります。

<!--more-->

## OpenShiftクラスタが増えていくとどうなるのか？
組織の作り方次第ではありますが、OpenShiftクラスタ自身を管理・運用するチーム（ここではプラットフォームチームと呼びます）と、そのOpenShift上のアプリケーションの開発・運用するチーム（ここではアプリケーションチームと呼びます）で分かれることはよくあります。

その場合の多くは、アプリケーションチームはNamespaceに閉じた権限を持っており、OpenShiftクラスタ全体の権限は付与されません。よって、アプリケーションチームからクラスタに関わる要求がある場合には、プラットフォームチームに作業依頼することになります。

この関係性は、ひとつのプラットフォームチームが担当するアプリケーションチームが少ない場合はそれほど大きく問題になりません。

しかし、その数が変わると問題はでてきます。  
たとえば、ひとつのプラットフォームチームが10のアプリケーションチームを担当する場合を想像してみましょう。アプリケーションが扱うクラスタが3クラスタあった場合、プラットフォームは30のクラスタを管理する必要がでてきます。

ひとつひとつの作業依頼が小さいものだったとしても（仮にある程度自動化してあったとしても）、なかなか大変な状況になりそうなことが想像できます。

この状況を図示ししたのが以下です。

![acm-governance-structure-before](/image/acm-governance-structure-before.png)

## どうやって解消しうるのか？
解決策はいろいろありそうですが、ひとつの方法としては **「アプリケーションチームにやれることはやってもらう（権限委譲する）」** が考えられます。

仕事において、他者と時間・スケジュールなどを調整していくことは結構な労力がかかりますよね。ましてや、複数の関係者がでてくると、、、
自分たちの都合だけで作業できると調整コストは劇的に下がります。

アプリケーションチームが、「自分たちでできることは自分たちでやれるようになる」というのはひとつの筋のいい案になりそうです。このような状態を目指せるとよさそうです。

![acm-governance-structure-after](/image/acm-governance-structure-after.png)

また、大変有名な書籍ではありますが、「チームトポロジー」という本は、このようなプラットフォームチームの作り方のヒントになりますのでぜひ参考にしてみてください。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://www.amazon.co.jp/%E3%83%81%E3%83%BC%E3%83%A0%E3%83%88%E3%83%9D%E3%83%AD%E3%82%B8%E3%83%BC-%E4%BE%A1%E5%80%A4%E3%81%82%E3%82%8B%E3%82%BD%E3%83%95%E3%83%88%E3%82%A6%E3%82%A7%E3%82%A2%E3%82%92%E3%81%99%E3%81%B0%E3%82%84%E3%81%8F%E5%B1%8A%E3%81%91%E3%82%8B%E9%81%A9%E5%BF%9C%E5%9E%8B%E7%B5%84%E7%B9%94%E8%A8%AD%E8%A8%88-%E3%83%9E%E3%82%B7%E3%83%A5%E3%83%BC%E3%83%BB%E3%82%B9%E3%82%B1%E3%83%AB%E3%83%88%E3%83%B3/dp/4820729632" data-iframely-url="//iframely.net/Y0Knp5T?card=small"></a></div></div><script async src="//iframely.net/embed.js"></script>

## 好き勝手やられると困るんですが？
一方で、こんな声がプラットフォームチームなどからも出てきそうですね。  
**「アプリケーションチームに好き勝手に設定されると困るんですが？」** というものです。

そのとおりだと思います。  
アプリケーションチームとプラットフォームチームで別れていた理由も、おそらく触っていい設定が異なっていたり、責任分界点があったからでしょう。

組織的にクリアしなければいけない問題もあるかと思いますが、OpenShiftの関連製品である {{< external_link url="https://www.redhat.com/en/technologies/management/advanced-cluster-management" title="Red Hat Advanced Cluster Management for Kubernetes（略称 ACM）" >}}の「ポリシーベースのガバナンス機能」で解消できる部分も多いです！

## ACMのポリシーベースのガバナンス機能ってなんですか？
### ACMの超概要
ACMとは、Kubernetesのマルチクラスタ管理の製品です。
OpenShiftのみならず、EKSやAKSといったKubernetesクラスタも管理できるものです。

主な機能に以下があるのですが、この記事で紹介したいのは、4番目の「ポリシーベースのガバナンス」というやつです。

1. 管理対象クラスターの可視化
1. クラスターのライフサイクル管理
1. アプリケーション・ライフサイクル管理
1. **ポリシーベースのガバナンス**


### 「ポリシーベースのガバナンス」機能
これは、**ACMに定義したポリシー（クラスタがどのような状態であってほしいかの定義）を、管理対象のKubernetesに反映する、あるいはポリシーにあっているかのチェックをする機能**です。

例をあげると以下のようなことができます。

- あるNamespaceが存在するか（Namespaceポリシー）
- あるPodが存在しているか（Podポリシー）
- あるOperatorがインストールされているか
- SCCがrestrictedで適用されているかどうか
- などなど

ポリシーの設定ファイル例も書いてみます。
以下は、`kube-system` namespaceに `kubeadmin` secretが存在しないこと(`mustnothub`)をポリシー定義したものです。あとで、具体的な動きについて出てきます。

```yaml
apiVersion: policy.open-cluster-management.io/v1
kind: Policy
metadata:
  name: policy-remove-kubeadmin
spec:
  remediationAction: Enforce
  disabled: false
  policy-templates:
    - objectDefinition:
        apiVersion: policy.open-cluster-management.io/v1
        kind: ConfigurationPolicy
        metadata:
          name: policy-remove-kubeadmin
        spec:
          remediationAction: inform
          severity: low
          object-templates:
            - complianceType: mustnothave
              objectDefinition:
                kind: Secret
                apiVersion: v1
                metadata:
                  name: kubeadmin
                  namespace: kube-system
                type: Opaque
```

大事なことは、Kubernetesクラスタが満たすべきポリシーを「マニフェストファイルで表現できる」「ポリシー通りにクラスタが設定される」ということですね。

### ポリシーの自由度の高さとGatekeeperがポイント
まず、ACMのポリシーの定義は自由度が高いので、実現したいことに対する表現力はかなりあると思います。
また、 policy-collection でサンプルもたくさん公開しているので、自分たちの作りたいポリシーを作成するのはそれほど難しくないです。

<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://github.com/open-cluster-management-io/policy-collection" target="_blank">
      <img class="belg-site-image" src="https://opengraph.githubassets.com/45647f046abe4cf9fd365986cfa6ec3bce22c1a52c3144f296e3ba48b088682a/open-cluster-management-io/policy-collection" />
    </a>
  </div>
  <div class="belg-right col-md-10">
  <div class="belg-title">
      <a href="https://github.com/open-cluster-management-io/policy-collection" target="_blank">GitHub - open-cluster-management-io/policy-collection: A collection of policy examples for Open Cluster Management</a>
    </div>
    <div class="belg-description">A collection of policy examples for Open Cluster Management - open-cluster-management-io/policy-collection</div>
    <div class="belg-site">
      <img src="https://github.githubassets.com/favicons/favicon.svg" class="belg-site-icon">
      <span class="belg-site-name">GitHub</span>
    </div>
  </div>
</div>


さらに、このガバナンス機能を強化する重要なパーツに "Gatekeeper" があります。  
Gatekeeperというのは、Kubernetesのためのポリシーコントローラの機能を提供するOSSです。Gatekeeperのベースになっているのは、Open Policy Agent（略称OPA,「おーぱ」）というソフトウェアです。OPA自体は、Kubernetesのためのツールということではなく、汎用的なポリシーエンジンで、それをKubernetesでうまく扱えるようにしたソフトウェアがGatekeeperとなります。

ポリシー言語であるRegoを使って、任意のポリシーを作成し、APIを経由してリクエストの妥当性を検査することができます。Kubernetesの環境においては、Admission Webhook を用いてユーザが発行するAPIに対してバリデーションをかけることができのです。

もしAdmission Webhookについて知りたい方はこちらもどうぞ。

<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://blog.mosuke.tech/entry/2022/05/15/admission-webhook-1/" target="_blank">
      <img class="belg-site-image" src="https://blog.mosuke.tech/image/logo.png" />
    </a>
  </div>
  <div class="belg-right col-md-10">
  <div class="belg-title">
      <a href="https://blog.mosuke.tech/entry/2022/05/15/admission-webhook-1/" target="_blank">Admission Webhookを作って遊んで、その仕組みを理解しよう（説明編） · Goldstine研究所</a>
    </div>
    <div class="belg-description">Kubernetesの運用には欠かせなくなってくる拡張。そのひとつであるAdmission Webhookを作って遊んでみるというものです。本記事は説明編で、動作編にも続きます。</div>
    <div class="belg-site">
      <img src="https://blog.mosuke.tech/image/favicon.ico" class="belg-site-icon">
      <span class="belg-site-name">Goldstine研究所</span>
    </div>
  </div>
</div>

ACMは、**このGatekeeperのポリシー設定をACMのポリシーとして設定できます。**  
なにをいっているのか意味不明ですね（笑）

Gatekeeperがカバーするポリシーと、ACMがカバーするポリシーには、同じポリシーという言葉が使われますが違うということがポイントです。
Gatekeeperは、Admission Webhookを使ったKubernetesのAPI発行に対してポリシーを設定できます。一方で、ACMではクラスタの設定に対してポリシー設定できます。

ACMのポリシーで、「Gatekeeperのポリシーが有効になっていること」と定義することで、そのクラスタにはGatekeeperのポリシーが有効化され、実際のユーザが行うAPI発行に対してのバリデーションはGatekeeperが担当するということができちゃうのです。

説明だけだと難しすぎるので、デモで紹介しましょう！

## 実際にどんな感じなんでしょうか？（デモ）
いろいろと紹介してきましたが、モノを見せてくれないとイメージできないですよね。
というわけで、あるシナリオに沿ったデモ動画を作ってみたのでこちらを閲覧ください。

### デモテーマ
**「アプリケーションチームに cluster-admin 権限を渡しつつも、無法地帯にならないように統制をとる。ついでにクラスターのセットアップを自動化する。」**

### デモシナリオ
- 新しく作成したばかりのクラスタに対して共通設定（ポリシー）が自動的に適用される
    - 決められたIdPのみ設定する
    - 監査ログの設定をする
    - kubeadmin アカウントを削除する
    - NodePortサービスを禁止する（所定のRouter経由でのみ外部アクセスを許可したい）
- 上記ポリシーに違反があった場合に検知できる or 勝手に修復される

<iframe width="560" height="315" src="https://www.youtube.com/embed/DGczPyS3Ygw?si=bhzmawfW1VUnhgoW" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


## まとめ
なんだかんだ長くなってしまいましたが、、やりたかったことは「アプリケーションチームに自由度をもたせつつも、無法地帯にならないクラスタ運用ってできるのか？」ということに対するひとつの見解でした。  
少ないプラットフォームチームで多くのアプリケーションチームを支えられるプラットフォーム作りにぜひ挑戦してみてください。

文中でも紹介しましたが、「チームトポロジー」という本は、このようなプラットフォームチームの作り方やアプリケーションチームとの関わり方のヒントになりますのでぜひ参考にしてみてください。

<div class="iframely-embed"><div class="iframely-responsive" style="height: 140px; padding-bottom: 0;"><a href="https://www.amazon.co.jp/%E3%83%81%E3%83%BC%E3%83%A0%E3%83%88%E3%83%9D%E3%83%AD%E3%82%B8%E3%83%BC-%E4%BE%A1%E5%80%A4%E3%81%82%E3%82%8B%E3%82%BD%E3%83%95%E3%83%88%E3%82%A6%E3%82%A7%E3%82%A2%E3%82%92%E3%81%99%E3%81%B0%E3%82%84%E3%81%8F%E5%B1%8A%E3%81%91%E3%82%8B%E9%81%A9%E5%BF%9C%E5%9E%8B%E7%B5%84%E7%B9%94%E8%A8%AD%E8%A8%88-%E3%83%9E%E3%82%B7%E3%83%A5%E3%83%BC%E3%83%BB%E3%82%B9%E3%82%B1%E3%83%AB%E3%83%88%E3%83%B3/dp/4820729632" data-iframely-url="//iframely.net/Y0Knp5T?card=small"></a></div></div><script async src="//iframely.net/embed.js"></script>