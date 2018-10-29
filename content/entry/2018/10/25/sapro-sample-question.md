+++
categories = ["AWS", "Solution Architect Professional", "認定試験"]
date = "2018-10-25T16:15:10+09:00"
description = "AWS Solution Architect Professionalサンプル問題38選。取得に向けて勉強している方はぜひトライしてみるといいです。"
draft = false
image = ""
tags = ["Tech"]
title = "AWS Solution Architect Professionalサンプル問題38選"
author = "mosuke5"
archive = ["2018"]
+++

こんにちは。mosuke5です。  
職業柄、AWSについても研究含めて勉強しています。  
ベンチマークとしてAWS Solution Architect Professionalの取得も目標にしているのですが、海外のサイトで模擬試験の問題とそれに対するディスカッションが普通におこなわれていました。  
模擬試験の問題が表にでているのはどうかとも思いますが、38問見つけたので、それぞれのリンクと簡単な個人のコメントを書きましたので、勉強しているよという人はぜひ参考にしてみてください。

私のコメントは完全に個人的なもので、あやまりも多いと思います。  
もし見つけた方は教えてくれるとたすかります。

また、ディスカッションでは答えが割れているものも多いです。  
ぜひ、ディスカッションの内容も読んでみると良い勉強になると考えています。
<!--more-->

## 1.CloudFormationでリソースを保持する方法に関する問題
<a href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KWdLqiGm5yagpOb5GaH/aws-prof-practice-question-a-gaming-company-adopted-aws-cloudformation" target="_blank">問題はこちら</a>

負荷テストを行う環境をCloudFormationで作っていて、テストが終了したらスタックを削除するが、RDBに入れた結果は保持しておきたい、という要望に応える方法についての問題。
DeletionPolicy属性のretainあるいはsnapshotを利用することでリソース保持ができる。

## 2.RDSを利用してDR環境を作る時にRPOを短くする方法に関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KWCGDsFy5wYTN5UI6On/sample-rpo-question">問題はこちら</a>

まず前提の知識としてRPOとRTOについてしっておくとよい。  
次にRDSのレプリケーション方式について、押さえておく。
Multi-AZのマスタースレーブのレプリケーションは同期レプリケーション。
ReadReplica機能では非同期レプリケーション。  
また、AWSではリージョンをまたいでリードレプリカを作成することが可能。

## 3.外部の認証を利用したAWSマネジメントコンソールへのアクセスに関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KKgMglgtNynF-JbG0CG/let's_check_our_capability">問題はこちら</a>

オンプレを拡張する形でAWSを使い始めたが、マネジメントコンソールへのアクセスをさせるためにIAMユーザを発行したくない場合、どのように対応するのがよいか。
以下のスライドのP40がわかりやすいが、オンプレ側の認証機能を使ってマネジメントコンソールへログインするとよさそう。

<a href="//www.slideshare.net/AmazonWebServicesJapan/aws-black-belt-online-seminar-2016-awsactive-directory" title="AWS Black Belt Online Seminar 2016 AWS上でのActive Directory構築" target="_blank">AWS Black Belt Online Seminar 2016 AWS上でのActive Directory構築</a>

## 4.Kinesisを使ったアプリケーションのデータロスト防止に関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KF8BENp0vSmhLllUuCG/practice-exam-question-3?answer=-KHvjUhFhJE_TJHpc7wD">問題はこちら</a>

Kinesisを利用してソーシャルメディアの情報を収集しているアプリケーションで、Kinesisのデータのロストを防ぐためにどうしたらよいか。Kinesis Connector Library（KCL）を利用してS3へアーカイブを作成しましょう、というものだと思う。

## 5.既存DCとAWS間のネットワーク接続に関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KWdEvkJ7DqCSlVNgriO/aws-prof-practice-question-you-have-been-asked-to-design-network-connectivity">問題はこちら</a>

既存データセンターとaws間のネットワーク接続について
接続環境の構築スピードが求められる場合にはまずはvpnでつなぎその後にダイレクトコネクトにしましょうというはなし

## 6.S3のオブジェクトに関連するメタ情報の管理に関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KWWBTRJSKdV4HuUU1rV/aws-prof-practice-exam-question-you-are-designing-a-file-sharing-service">問題はこちら</a>

ファイル共有サービスで、ファイルをS3に保存しているが、その各ファイルのタイトルや説明文、公開可否などのパラメータをどう管理するとよいか。

この例とは異なるがこちら参考。  
https://aws.amazon.com/jp/blogs/big-data/building-and-maintaining-an-amazon-s3-metadata-index-without-servers/

## 7.CloudFrontを利用したオンデマンドストリーミングの実現方法に関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KVxW7wF-pN4N-D046Ys/sample-scalability-cost-question">問題はこちら</a>

オンデマンドストリーミングかライブストリーミングかで実現方法は変わる。  
オンデマンドストリーミングの場合S3のファイルから実現することが可能。ライブストリーミングの場合は別途配信サーバの準備が必要。

## 8.Webアプリケーションの可用性を高めるのに必要なプロダクトに関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KW1psKo8Z2LJg6EK9Uu/Sample%20HA%20question">問題はこちら</a>

めずらしく非常に簡単な問題。  
一般的なWebアプリケーションでの可用性高める方法を理解していれば問題ない。

## 9.CloudFormationを他のリージョンで動作させるときの対応事項に関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KF81EOHnCCZWOi5orcq/practice-exam-question-1">問題はこちら</a>

CloudFormationを使ってシステムの構築を自動化した。
それを１つのリージョンだけでなく、他のリージョンでも動作させたいと考えている。
その場合に対応すべき項目をこたえる問題。

リージョンによって変化するものを抑えておく必要がある。  
AZの数、イメージID、キーペアあたりは要注意である。

## 10.グローバル企業でのインフラデザインに関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KHH8QGxQ3d1FaEFzo6F/practice-exam-question">問題はこちら</a>

グローバルに拠点を持つ会社でのインフラデザインに関する問題。
この問題ではとくにCloudFrontの適用可否やActiveDirectoryをどう扱うかなどが問われている。
SA Proの試験では案外ADに関する問題は多いので、触ったことない人も概念や構成などは覚えておくといい。

<a href="https://www.slideshare.net/AmazonWebServicesJapan/aws-black-belt-online-seminar-2016-awsactive-directory" target="_blank">AWS Black Belt Online Seminar 2016 AWS上でのActive Directory構築</a>  
がわかりやすいので読んでおくと参考になる。

## 11.オンプレミスのADをAWS上のアプリケーションが利用できるようにする構成に関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KW15v4vLUzEegyxjfvV/sample-cloud-migration-question">問題はこちら</a>

またしても、ADに関する問題。
オンプレの変更を最小限にしつつ、AWS上のアプリケーションがADを利用できるようにするアーキテクチャを問われている。
10の問題の参考資料が役に立つ。
AWSのVPC上にドメインコントローラを配置するのがよいと考える。

## 12.データのアーカイブ方法の設計に関する問題 
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KWdk0PYZwNnq6SuJ3nU/aws-professional-practice-question-to-meet-regulatory-requirements">問題はこちら</a>

アーカイブしたいファイルの特徴や取り出しに必要な時間などの条件があり、あてはまる方式を考える問題。
めったに取り出すことはなく、24時間以内に取得できればいいそうで、まずGlacierを利用していくでよいだろう。
次は、Glacierにどのようにファイルを保存して、取り出すかが観点。
自分は知らなかったのだが、Glacierではデータのレンジを指定してデータの1部を取り出すことが可能のようだ。
これを使うとよさそうと考えている。

https://docs.aws.amazon.com/ja_jp/amazonglacier/latest/dev/downloading-an-archive-two-steps.html#downloading-an-archive-range

## 13.OpsWorksを使ったAMIの更新方法についての問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KAeiHnioz5qTV_6motJ/question-about-opsworks">問題はこちら</a>

まずはOpsWorksを簡単でいいので触って用語と概念を抑えるといい。
自分はOpsWorksは使ったことなかったが、これを機に触りStack, Layers, Apps, Deploymentsの概念とそれぞれで何ができるか確認した。
OSのイメージは後から変更することができず、Instanceを作るときに指定するしかない。
そのため、基本的に新しいインスタンスを作って古いインスタンスを消すというのが王道になるだろう。
Dは近いが、ダウンタイムをなくすために新しいインスタンスを作るのが先というので答えではないと考えている。

## 14. AWSへのマイグレーションと単一障害点サーバの扱いに関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KAgfPP5Pj43Oe3ZY0Z4/26-migration-to-aws">問題はこちら</a>

観点は２つ。DBの扱いと単一障害点のサーバの扱い。
まずDBのほうだが、単一障害点サーバのローカルにあるDBから分離する必要があるので、
レプリケーションよりは、RDSへ移行してしまったほうがいいと思う。
そのつぎに単一障害点サーバだが、これを高可用にする時間がないとのことなので、なんとかself-healing(日本語だと自動復旧？)できるようにする必要がある。
EC2のAutoScalingの<a href="https://docs.aws.amazon.com/ja_jp/autoscaling/ec2/userguide/as-maintain-instance-levels.html#replace-unhealthy-instance">異常なインスタンスの置き換え機能</a>でしのぐしかないと考える。

## 15.インターネットから接続できるWebサーバを作る際のVPCの設計に関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KFCPlF0qXSWdE56_aYF/practice-question-5">問題はこちら</a>

比較的Easyな問題。  
ELB経由かEIP付与で接続できるよっていうはなし。

## 16.アプリケーションのコスト最適化方法を問う問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KHHZn319_4Wp93zvrhC/practice-exam-question-document-cost-optimization">問題はこちら</a>

読解力が必要な問題。正直答えに自信はない。  
まずはCloudFrontの利用。AWSの考えによれば、オリジンへの負荷が下がるので、コストが下がることになる。  
あとはS3のRRSクラスの利用。オリジナルのファイルはGlacierに保存していると書いてあるので、RRSを使っても大丈夫と見える。  
最後は、最大ズームの時の画像サイズのw/hを上げれば利用する画像の量が減るのでコスト削減になるのでは、と考える。


## 17.複数チームで運用するCloudFormationの設計の考慮事項に関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KWRrhpD8UjXvBRRutOF/aws-prof-practice-exam-question-a-large-enterprise-wants-to-adopt-cloud-formatio">問題はこちら</a>

よくありがちなユースケースで、ネットワーク管理者とアプリケーション管理者が分かれており、それぞれの管理者がCloudFormationwo持って管理している。その場合の注意事項について。
ネットワーク管理者が作るVPC内にアプリケーションをのせるので、VPCを削除する場合にはアプリケーションが依存しているのでアプリケーション側を削除しないといけない。


## 18.EMRのコスト最適化に関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KWq7PkmfXXSphQWxyAO/aws-prof-practice-q-a-research-scientist-is-planning-for-the-one-time-launch">問題はこちら</a>

まずはEMRのアーキテクチャを覚えておくとよさそう。  
Master Node, Core Node, Task Nodeの3種類で構成されており、それぞれの役割を抑えよう。  
そのうえで、どのノードでオンデマンドインスタンスやスポットインスタンスが利用できるか考えるとよい。
下記にずばりまとまっている。
<a href="https://www.slideshare.net/AmazonWebServicesJapan/aws-black-belt-online-seminar-2017-amazon-emr" target="_blank">AWS Black Belt Online Seminar 2017 Amazon EMR</a>

## 19.ストレージアプリケーションの設計に関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-K9xEKH_5mVuK6oX11RD/another-practice-question-need-your-feedback-18">問題はこちら</a>

有料会員と無料会員にのあるストレージアプリケーションで、利用者のストレージ容量が閾値を超えたらアラートしたい。どう実装するかという問題。  
答えが割れているが、まずS3のメタデータを使う方式は難しいと思う。何十億というレベルで置かれているオブジェクトの１つ１つのメタデータを取り出して集計するのは現実的でないと考える。  
また、RDB自体を使うことはよいと思うが、Bの選択肢ではRDBで都度計算するように見える。  
それよりは、DynamoDBとユーザの利用料をカウントアップしていく仕組みのほうがベターとみえる。

## 20.ニュースアプリケーションの設計（コンテンツのダウンロード・アップロード速度）に関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KWIFd5k8w_WLSf97-PU/AWS%20Prof%20Practice%20Exam%20Question-You%20are%20an%20architect%20for%20a%20news-sharing..">問題はこちら</a>

問題文から、モバイル環境でコンテンツのアップロードとダウンロードを高速化したいことがわかる。
CloudFrontはCDNとして一般的に認知されており、ダウンロードについての高速化については言うまでもないと思う。
しかし、S3の<a href="https://docs.aws.amazon.com/ja_jp/AmazonS3/latest/dev/transfer-acceleration.html">Transfer Accelaration</a>を利用するとCloudFrontを利用してコンテンツのアップロードも最適化できるという。
CloudFrontがあるエッジロケーションからS3のあるリージョンロケーションまでは、最適化されたネットワーク経路があるから実現できるのだという。

## 21.Webアプリケーションの可用性の高めかたに関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KF8JnQcRa4AWNIWYwa5/practice-exam-question-4">問題はこちら</a>

答えが割れているが、ピークロード時に１つのAZが利用できなくなることを考えると、spotインスタンスより安定的に利用できるオンデマンドでスケーリングできるBではないかと思う。

## 22.SSL証明書とアプリケーションログのセキュアな管理の仕方に関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KVj_o43efIRONfHwq_q/sample_question_4">問題はこちら</a>

答えから考えると、C,Dでどちから迷うが、おそらくDと思う。
まず、SSL証明書の管理だが、CloudHSMを利用することでこの問題を解決できると思う。
ELBに保存やboot時にEC2に取り込むでは解決できない。

ちなみに、CloudHSMを使ったSSL/TLSのオフロードは下記がわかりやすい。
現状、ELBとは連携しておらず、ロードバランサを利用している場合は、LBをL4レイヤー（TCP）にして、EC2のL7レイヤーで設定する必要がある。

SSL/TLS オフロードが AWS CloudHSM と連携する仕組み
https://docs.aws.amazon.com/ja_jp/cloudhsm/latest/userguide/ssl-offload-overview.html

次にログの管理だが、アプリケーションからS3へ直接書き込むのはよいとは言えない。
それはオブジェクトストレージの構造上、ストリームで書き込むのに適していないからだ。
そうなると、EC2のストレージに暗号化で保存するのがよさそうだが、エフェメラルディスクに書き込むというのがひっかかるポイントではある。

## 23. SSL証明書の管理方法に関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KCH_B98vCLMkFmosM-8/22-security-question">問題はこちら</a>

ELBの証明書管理をセキュリティオフィサーのみができるようにしたいという要望。
ELBではHTTPSのリスナーを作る際にどこからSSL証明書をインポートするか指定できる。推奨はACMというサービスからの呼び出しになるのだが、セキュリティオフィサーにだけACMの権限を与えることで実現できそう。

## 24.DynamoDBの時系列データを扱う際のテーブル設計に関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-LHhpVRBdbuIOG6jWCA7/Practice%20exam%20question%20-%20DynamoDB%20time-series%20data">問題はこちら</a>

DynamoDBのキーに関する基礎知識を抑えていれば大丈夫そう。  
<a href="https://docs.aws.amazon.com/ja_jp/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html#HowItWorks.CoreComponents.PrimaryKey">DynamoDB コアコンポーネント - Amazon DynamoDB</a>

## 25.セッションの共有に関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KWjrMz_FMZryQuUrY9o/aws-prof-practice-exam-q-youve-been-tasked-with-moving-an-ecommerce">問題はこちら</a>

オンプレミスで動作しているアプリケーションをAWSへ移行しようとしたが、セッションの共有をマルチキャストで行っていることに気づいたという場面。AWS上でどのようにセッションを共有するかという問題。
答えは割れているが、個人的には素直にDのElastiCashe for Redisに保存と考える。
VPC内では基本的にはマルチキャストは利用できないが、メッシュVPNを張ってマルチキャストできるようにするという案もあるが、ここは素直に。。。と考える。

## 26.S3の署名付きURLでのアップロードに関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KMQ8Ghm06-pLeVhjkVL/help-to-this-practice-exam-question">問題はこちら</a>

以下のURLが参考になる。  
署名付きURLは発行できても、実際にアップロードできるかどうかは発行者の権限次第となる。  
https://docs.aws.amazon.com/ja_jp/AmazonS3/latest/dev/PresignedUrlUploadObject.html

## 27.効率的なデプロイに関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KWP01YPifLZyxY6C7C_/sample-deployment-management-question">問題はこちら</a>

自分の読解力、知識不足なのか、問題の意図がよくわからず答えが選べない。
フロントエンドとバックエンドの両方の前にELBを挟むことで効率的なデプロイができるようになるので、C,Dは答えと思われる。

## 28.コンテンツのダウンロード回数を制限する方法に関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KF867yKa5oAxFS8D2N6/practice-test-question-2">問題はこちら</a>

ビデオ素材を配信している会社で、ユーザごとにダウンロード回数を設けており、ダウンロード回数を超えた際のアクションを考える問題。

## 29.オンプレとAWS間のネットワーク冗長に関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KWqsFsZ-ke6mJmFrDEe/aws-prof-practice-exam-q-you-have-been-asked-to-virtually-extend">問題はこちら</a>

ふたつの既存のDCがあるということで、もう片方のDCへのVPNコネクションをはることで冗長化できそう。

## 30.CloudFront経由での通信でブラウザからオリジンまでE2EでSSL化する方法
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KVxfqlwBvOQIrE8GFj6/sample_cloudfront_question">問題はこちら</a>

Webで一般公開している以上、オリジンはCA認証のSSLを使うべき。  
CloudFrontでデフォルトのURLを利用するのであれば、デフォルトで準備されているSSL証明書を利用することもできる。

## 31.コスト最適化に関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KWOsgSeWQtUL7uIw3cB/sample-deployment-question">問題はこちら</a>

システムの要件からスケーラブルにする必要があるので、RDSよりDynamoDBのほうが向いてそうにみえる。
そのうえで、処理が多いのが一時的なことであるので、RIよりはスポットインスタンスなどで対応したほうがよさそう。


## 32.オンプレミス上の仮想環境で動作しているアプリケーションのマイグレーションに関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KWjbznDR58BIMm0XiS6/aws-prof-practice-exam-question-company-a-has-hired-you-to-assist-with-the-migra">問題はこちら</a>

仮想環境からの移行なのでVM Import/Exportが利用できるという話。

## 33.アプリケーションの設計に関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KYsGcUdRjMCWYYmueqW/practice-q-nba">問題はこちら</a>

問題の意図がはっきりわからず答えにこまるのだが、
レポートの取得がピーク時1000万～1500万リクエストほどくるとのことで一番よい方法を考える。
S3にレポートを置いてCloudFrontで配信するのが、いちばんオリジンに負荷がかからずよさそうである。

## 34.VPC内のネットワークセキュリティに関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KPOrhtqq52941y0Iy6A/choose-2-answers-vpc">問題はこちら</a>

VPC内のネットワークの制御に関する問題。
重要なのは、セキュリティグループで制御しましょうというのと、サブネットのルーティングテーブルでサブネット同士の通信の制御をしましょうということ。

## 35.負荷テスト実施時にELBがうまく分散しなかった場合の対処方法に関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KG0jNQAIxEjp7-5xwZs/practice-question-load-testing">問題はこちら</a>

答えわからず。偉い人教えてください。。

## 36.ユーザ管理とセキュリティ制御に関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KVxJKTe_hiltx-STRPv/sample-security-question">問題はこちら</a>

## 37.3層ウェブアプリケーションの耐障害性あるアーキテクチャに関する問題
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KW2-4by33fyMW4Xf_YI/sample-fault-tolerance-questions">問題はこちら</a>

マルチAZ構成の場合に、どのようにインスタンスを配置すればいいかという問題。
Aは構成としては間違っていないが、オーバスペックすぎるのでBが正解と思う。

## 38.S3にアクセスできるようにするための設定に関する問題	
<a target="_blank" href="https://acloud.guru/forums/aws-certified-solutions-architect-professional/discussion/-KJQ7xdcpGJnftV3RLw0/select-2-from-this">問題はこちら</a>

S3へアクセスできるようにするためには、どこの設定が必要かという問題。