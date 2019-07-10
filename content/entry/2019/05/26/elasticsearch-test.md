+++
categories = ["ElasticSearch", "Ruby on Rails", "Ruby", "テスト", "gitlab-ci"]
date = "2019-05-26T17:30:51+09:00"
description = "ElasticSearchなどの外部コンポーネントが存在するときのRailsアプリでのテストで考慮ポイントを記載。Gitlab-CIでCIを回すことにも触れていく。"
draft = false
image = ""
tags = ["Tech"]
title = "[基礎] ElasticSerachなどの外部コンポーネントがあるときのテスト"
author = "mosuke5"
archive = ["2019"]
+++

お久しぶりです。@mosuke5です。  
新しい会社に入って１ヶ月ほど経ちましたが生きています。
今回は、ElasticSearchを題材にしますが外部コンポーネントを利用しているアプリケーションのテストについてです。
すごく初歩的なところですが、いくつか考えなければいけないポイントもあったのでまとめました。

## はじめに
今回の題材は非常にシンプルな検索機能をもったアプリケーションです。
構成はアプリケーションはRailsで、検索エンジンを担うのがElastiCsearchという前提です。

アプリケーションがもつmethodは３つで以下としています。

1. GET '/'  => 'Hello'を返す
1. GET '/search' => GETパラメータ'q'のキーワードで検索した結果をjsonで返す
1. POST '/update' => 所定のjsonファイルをPOSTするとbulkでinsertされ、その結果をjsonで返す
<!--more-->

## ElasticSearchを使うテスト
これらのメソッドに対してテストを書こうと考えたときに、そもそもElasticSearch自体の扱いをどうするかでまず最初の考慮ポイントがありました。
以下３つくらいの考え方がありそうです。答えはなく、システムの要件によって変わると思います。

1. 事前に手動でElasticSearchを立ち上げておく
2. テストコードの中でプログラム的にElasticSearchを立ち上げる
3. モックする

まずは1.についてですが、一番シンプルな方法でしょう。  
開発しているときにもElasticSearchが必要であることを考えるとローカル環境ではすでに立ち上がっていることが前提で進めていくのも良いと思います。
その場合、CI環境でどうするんだ！？と思う方もいると思うがそれは次の章で解決策はあるのでそこで紹介する。

実際にメリットとして、ElasticSearchを立ち上げる手間もないのでテストが早いなどのメリットもあっていいです。  
一方で、データの扱いだけ注意が必要である。テストではテストの実行環境を統一することが重要であるため、テストの度にテストデータを入れたり、データを追加したり削除したりすることがある。
たとえばindexを分けるなどして対応するなどして、開発用のデータとの分離を考えましょう。

次に2.のプログラム的に起動する方法ですが、[ElasticSearchのrubyのSDK](https://github.com/elastic/elasticsearch-ruby/tree/master/elasticsearch-extensions)ではTest::Clusterという機能を提供していて、テスト用のクラスターをプログラム的に起動することが可能です。
テスト実行前に起動して、終了時に停止するということが可能です。

一般的にテストフレームワークではテストケースごとにその前後で任意の処理を実行する機能と、テスト全体の前後で任意の処理を実行する処理を備えています。
そちらを使ってテストの前後で起動・停止するといいと思います。  
しかし、テストケースごとの前後で実行してしまうとテストの実行時間が長くなるので注意が必要です。とくにElasticSearchは起動に時間がかかるのでテストケースごとに行うのは無理がありそうです。

最後に3.のモックです。外部システムとの連携を伴うシステムのテストではモックなどを利用するケースも多いと思います。ElasticSearchをモックしてしまうこともできます。しかし、モックはあくまでモックであり、実際の処理を実行するのとは異なります。
可能な限りモックせず、きちんとテストできるものはする、とするほうがベターかなと思います。実際、ElasticSearchくらいであれば、起動にいくつかの制限がありますがDockerなどを使って比較的容易に起動させることが可能です。

以下はサンプルのコードです。minitestを利用しています。
いくつかコメントをいれてみました。

```ruby
class EsControllerTest < ActionDispatch::IntegrationTest
  ## 今回は自分は利用しませんでしたが、setup/teardownでelasticsearchの起動を設定することも可能です。
  #def setup
  #  Elasticsearch::Extensions::Test::Cluster.start \
  #    cluster_name:    "my-testing-cluster",
  #    command:         "/path/to/elasticsearch",
  #    port:            9350,
  #    number_of_nodes: 1
  #end

  #def teardown
  #  Elasticsearch::Extensions::Test::Cluster.stop \
  #    port:            9350,
  #end

  # テストのHello world的なもの。
  test "should return index" do
    get "/"
    assert_equal "Hello", @response.body
  end
  
  # テストデータのpostをしてエラーなくレスポンししたかどうか
  test "should upload blog data" do
    post_entry_data
    assert_response :success
  end
  
  # テストデータがきちんとインポートされているかの確認
  # テストの実行方法にもよりますが、テストケースは順番に実行されるとは限りません。
  # そのため、"順番に依存しないよう"にここで事前にまたテストデータのインポートを行います。
  test "should get search results" do
    post_entry_data
    get '/search', params: { q: 'keyword' }
    assert_response :success
    assert_not_empty @response.body
  end
  
  # テストデータをpostする関数
  def post_entry_data
    entries = fixture_file_upload(Rails.root.join('test/fixtures/files/entries.json'))
    post '/update', params: { file: entries }
  end
end
```

## CI環境でのElasticSearchの扱い
テストコードがかけて、ローカルでテストが通るようになったら、CI環境で実行するようにしたいですよね。
今回はgitlab-ciを使って行ってみます。
CI環境でもElasticSearchをどう扱うか、考えるポイントがあります。

1. CIの実行環境の上にElasticSearchを起動させる
2. テストの実行環境とは別環境で起動させる

今回の例では2の方式を取りました。
gitlab-ciやcircleCIなどのよくあるCIサービスでは実行環境はDockerベースで動いていることが多いです。その環境の中で1.の方式でElasticSearchを起動させるのは、何かと面倒がおおいというのが実際でした。
例えば、ElasticSearchの実行バイナリをダウンロードしたり、rootだと起動できないので調整したり、はたまたメモリが足りなかったり。。

gitlab-ciのservicesという機能を使うことで簡単にElasticSearch環境を起動させることが可能でしたので2.の方法をとりました。

下記が`.gitlab-ci.yml`のサンプルコードなのですが、servicesというのが関連する他のサービス（例えばMySQLだったり、Redis、ElasticSearchなど）を実行環境とは別に起動することのできる機能です。
servicesについてもdockerイメージを指定することで特定のサービスを簡単に起動できます。ElasticSearchも公式でDockerイメージを出しているので簡単に起動ができます。
また、`alias`を設定すると、その名前でサービスにアクセスできます。
`alias`に`elasticsearch`と指定し、Rails側のElasticSearchのホストを指定する環境変数に同じように`elasticsearch`と指定することで簡単に接続が可能です。

```yml
# .gitlab-ci.yml
stages:
  - test

test:
  stage: test
  image: ruby:2.5.5
  services:
    - name: docker.elastic.co/elasticsearch/elasticsearch:6.7.2
      alias: elasticsearch
  before_script:
    - apt-get update && apt-get upgrade -y
    - apt-get install -y some componets
  script:
    - bundle install
    - bundle exec rake test
  variables:
    ELASTICSEARCH_HOST: "elasticsearch"
    ELASTICSEARCH_PORT: 9200
```
