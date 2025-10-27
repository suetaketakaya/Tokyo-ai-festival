#!/usr/bin/env python3
"""
長文プロンプトテストデータ生成ツール
既存12件から100件に拡充
"""

import json
import random
from collections import Counter

# 既存12件を読み込み
with open('test_long_prompts.json', 'r', encoding='utf-8') as f:
    existing = json.load(f)

# 各カテゴリーの長文プロンプトバリエーション
prompts_by_category = {
    'machine_learning': [
        "scikit-learnでランダムフォレスト分類器を使用して、アイリスデータセットで花の種類予測モデルを構築してください。GridSearchCVを使用してハイパーパラメータチューニングを行い、5分割クロスバリデーションで性能を評価してください。さらに、特徴量重要度を可視化し、混同行列とROC曲線をプロットしてください。最終的に、モデルをpickleファイルとして保存し、推論用のシンプルなAPIエンドポイントも実装してください。",
        "TensorFlow 2.xでCNNアーキテクチャを実装し、CIFAR-10画像データで学習させてください。Adamオプティマイザを使用し、categorical crossentropyの損失関数で最適化してください。過学習を防ぐため、Dropoutレイヤーと早期停止を導入してください。学習曲線をTensorBoardで可視化し、最終的なテストデータでのモデル性能を詳細にレポートしてください。データ拡張も実装してください。",
        "PyTorchで画像分類タスク用の ResNetベースのニューラルネットワークを実装してください。Albumentationsを使用したデータ拡張、Weight Decayによる正則化、CosineAnnealingスケジューラによる学習率調整を含めてください。検証データで最良のモデルを選択し、テストデータで最終評価を行い、結果をWandBにログしてください。混同行列も可視化してください。",
        "KerasでLSTMを使用した時系列予測モデルを構築し、株価データセットでトレーニングしてください。ModelCheckpointとEarlyStoppingコールバックを使用して学習を監視し、MAEとRMSEメトリクスで性能を評価してください。データ前処理パイプライン（正規化、シーケンス作成）も実装し、再現性のためにランダムシードを固定してください。予測結果を可視化してください。",
        "XGBoostで住宅価格予測の回帰モデルを実装してください。相互情報量による特徴量選択、Optunaによるハイパーパラメータ最適化を行い、5分割クロスバリデーションで性能を検証してください。SHAP値を使用してモデルの解釈可能性も分析し、重要な特徴量トップ10を可視化してください。最終モデルの予測精度をR2スコアとMAPEで評価してください。",
        "scikit-learnでサポートベクターマシン（SVM）を使用して、乳がん診断の二値分類モデルを構築してください。RBFカーネルを使用し、GridSearchCVでCとgammaパラメータを最適化してください。Stratified K-Fold交差検証で性能を評価し、precision、recall、F1スコアを計算してください。ROC曲線とPR曲線をプロットし、最適な閾値を決定してください。",
        "TensorFlowでTransformerモデルを実装し、機械翻訳タスク（英語→日本語）で学習させてください。マルチヘッドアテンション、位置エンコーディング、学習率ウォームアップを含めてください。BLEUスコアで翻訳品質を評価し、アテンション重みを可視化してください。ビームサーチによるデコーディングも実装し、複数の翻訳候補を生成してください。",
        "PyTorchでGAN（敵対的生成ネットワーク）を実装し、MNIST手書き数字を生成してください。GeneratorとDiscriminatorの両方のネットワーク設計、BCELossによる損失関数、交互学習のループを実装してください。学習中の生成画像を定期的に保存し、FIDスコアで生成品質を定量評価してください。モデルの安定性向上のためにSpectral Normalizationも試してください。",
        "Kerasで感情分析のためのBidirectional LSTMモデルを構築してください。事前学習済みのGloVe埋め込みを使用し、Attention層を追加してモデルの解釈可能性を高めてください。IMDB映画レビューデータセットで訓練し、accuracyとF1スコアで評価してください。学習曲線を可視化し、過学習を防ぐためにDropoutとL2正則化を適用してください。",
        "LightGBMで顧客離反予測（churn prediction）の二値分類モデルを実装してください。クラス不均衡に対処するためSMOTEを使用し、カテゴリカル特徴を適切にエンコーディングしてください。特徴量重要度に基づく特徴選択を実施し、ROC-AUCスコアを最大化するようハイパーパラメータを調整してください。最終モデルの精度、再現率、適合率を詳細に分析してください。",
        "scikit-learnでクラスタリング（K-Means、DBSCAN、階層クラスタリング）を実装し、顧客セグメンテーションを行ってください。エルボー法とシルエット係数で最適クラスタ数を決定し、各アルゴリズムの結果を比較してください。PCAで2次元に次元削減してクラスタを可視化し、各セグメントの特性を統計的に分析してください。デンドログラムも作成してください。",
        "TensorFlowでオートエンコーダを実装し、画像の異常検知タスクに適用してください。エンコーダー、デコーダーのアーキテクチャを設計し、再構成誤差を損失関数として使用してください。正常データのみで訓練し、テストデータで異常スコアを計算してください。ROC曲線で検出性能を評価し、異常サンプルを可視化してください。Variational Autoencoderも試してください。",
    ],
    'data_analysis': [
        "pandasでCSV形式の大規模顧客データを読み込み、平均値による欠損値補完、IQR法による外れ値検出と除去を行ってください。One-Hot Encodingによるカテゴリカル変数のエンコーディング、Min-Max正規化による数値変数の正規化を実施し、最終的にクリーンなデータセットをCSVとして出力してください。各ステップの統計サマリも表示してください。",
        "SQLiteデータベースから売上テーブルと顧客テーブルをINNER JOINして抽出し、pandasで月次売上分析を実施してください。groupbyによる集計、pivot_tableによるクロス集計、resampleによる時系列分析を含めてください。結果をExcelの複数シート（サマリ、詳細、グラフ）に分けて出力し、主要KPIのレポートも生成してください。",
        "大規模CSVファイル（100万行以上）を効率的に処理してください。read_csvのchunksizeパラメータによるチャンク読み込み、multiprocessingによる並列処理、カテゴリ型変換によるメモリ最適化を実装してください。処理進捗をtqdmで表示し、最終結果をParquet形式で保存してください。処理時間とメモリ使用量も計測してください。",
        "eコマースの購買データに対して探索的データ分析（EDA）を実施してください。describeによる基本統計量の算出、corrによる相関分析、histogramとboxplotによる分布の可視化を行ってください。異常値や興味深いパターンを特定し、pandas-profilingを使用してHTMLレポートとして出力してください。各カテゴリーの売上トレンドも分析してください。",
        "時系列データのトレンド分析とARIMAモデルによる予測を実施してください。seasonal_decomposeによるトレンド分解、ACF/PACFによる季節性検出、Isolation Forestによる異常検知を含めてください。ARIMAモデルを構築し、予測精度をMAE、RMSE、MAPEで評価してください。予測結果と信頼区間を可視化してください。",
        "pandasで複数のJSONファイルを結合し、ネストされた構造をフラット化してください。json_normalizeを使用してDataFrameに変換し、重複レコードを削除し、データ型を適切に変換してください。explodeで配列カラムを展開し、mergeで関連データを結合してください。最終的にクリーンなCSVファイルとデータディクショナリを出力してください。",
        "SQLクエリでデータウェアハウスから販売データを抽出し、pandasで多次元分析を実施してください。WHERE句による期間フィルタリング、JOINによる複数テーブル結合、GROUP BYによる集計を含むクエリを作成してください。抽出データでコホート分析、RFM分析、バスケット分析を実行し、ビジネスインサイトをまとめたレポートを生成してください。",
        "時系列売上データのリサンプリング（日次→月次）と移動平均（7日、30日）を計算し、異常値をZ-score法で検出してください。結果を折れ線グラフで可視化し、統計サマリ（平均、中央値、標準偏差、四分位数）をDataFrameとして出力してください。前年比成長率も計算し、トレンド変化を分析してください。",
        "Excelファイルからマルチシートのデータをpandasで読み込み、VLOOKUPに相当するmerge操作を実施してください。各シートのデータ品質チェック（欠損値、重複、データ型）を行い、問題箇所をログに記録してください。クリーンアップ後、集計ピボットテーブルを作成し、ExcelWriterで新しいワークブックに出力してください。条件付き書式も適用してください。",
        "pandasでテキストデータのクリーニングと前処理を実施してください。str.stripによる空白除去、str.lowerによる小文字変換、正規表現による特殊文字除去、unicodedataによる正規化を含めてください。重複テキストの検出と除去、単語頻度分析、TF-IDF計算も実行し、クリーンなデータセットとして保存してください。",
        "大規模ログデータ（数百万行）を効率的に処理し、異常パターンを検出してください。chunksizeによるバッチ読み込み、dtypeによる型指定、parse_datesによる日時解析を使用してください。groupbyでエラーコード別に集計し、時系列で異常スパイクを検出してください。結果をダッシュボード形式でHTMLレポートとして出力してください。",
        "ETLパイプラインを構築し、PostgreSQLからデータ抽出、pandasで変換、BigQueryにロードしてください。SQLAlchemyでデータベース接続、read_sql_queryでデータ抽出、複数の変換処理（型変換、集計、正規化）を実施してください。to_gbqでBigQueryに書き込み、処理ログとエラーハンドリングも実装してください。処理時間を最適化してください。",
    ],
    'web_app': [
        "React.jsとTypeScriptでタスク管理アプリケーションを構築してください。Reduxによるグローバル状態管理、React Routerによるページルーティング、Formikによるフォームバリデーションを実装してください。Material-UIでスタイリングし、レスポンシブデザインに対応してください。LocalStorageでデータ永続化し、ドラッグ&ドロップ機能も追加してください。",
        "Vue.js 3のComposition APIでリアルタイムチャット機能を実装してください。Piniaによる状態管理、Socket.ioによるWebSocket通信、VeeValidateによるフォーム検証を含めてください。コンポーネントは再利用可能な設計にし、TypeScriptで型安全性を確保してください。オンラインステータス表示と既読機能も実装してください。",
        "Next.jsでブログシステムを構築してください。getStaticPropsによる静的サイト生成、Markdown記事のレンダリング、NextAuthによる認証、next-seoによるSEO最適化を実装してください。Tailwind CSSでモダンなUIを構築し、コメント機能とタグ検索も追加してください。Vercelへのデプロイ設定も含めてください。",
        "Node.js + Expressでユーザー管理のRESTful APIを構築してください。Joiによるリクエストバリデーション、カスタムミドルウェアによるエラーハンドリング、Winstonによるログ記録を実装してください。JWTトークン認証、bcryptによるパスワードハッシュ化、express-rate-limitによるレート制限も追加してください。MongoDBと連携してください。",
        "Reactで再利用可能なUIコンポーネントライブラリを作成してください。styled-componentsによるスタイリング、Framer Motionによるアニメーション、aria属性によるアクセシビリティ対応を含めてください。Button、Modal、Dropdown、Tooltipコンポーネントを実装し、Storybookでドキュメント化してください。TypeScriptで型定義を提供してください。",
        "Svelteでインタラクティブなデータダッシュボードを構築してください。Svelteストアによる状態管理、Chart.jsによるグラフ表示、SvelteKitによるルーティングを実装してください。WebSocket接続でリアルタイムデータ更新、フィルター機能、CSV/PDFエクスポート機能を追加してください。レスポンシブデザインとダークモードも対応してください。",
        "Angular 15でエンタープライズ向け管理画面を開発してください。NgRxによる状態管理、Angular Routerによる遅延ロード、Reactive Formsによるバリデーションを実装してください。PrimeNGでリッチなUIコンポーネントを使用し、役割ベースのアクセス制御（RBAC）も実装してください。国際化（i18n）にも対応してください。",
        "React Nativeでクロスプラットフォームモバイルアプリを開発してください。React Navigationによる画面遷移、AsyncStorageによるローカルストレージ、Axiosによる API通信を実装してください。カメラ機能、プッシュ通知、位置情報サービスも統合してください。iOS/Android両方でビルド可能にし、アプリストア公開用の設定も含めてください。",
        "Nuxt.jsでECサイトのフロントエンドを構築してください。Vuex Storeによるカート管理、Nuxt Contentによる商品データ管理、Stripe連携による決済機能を実装してください。SSRによるSEO最適化、PWA対応、画像最適化（next-image）も含めてください。検索機能とフィルタリングも実装してください。",
        "FastAPIとReact.jsでフルスタックアプリケーションを構築してください。バックエンドはFastAPIでRESTful API、フロントエンドはReactでSPAを実装してください。JWT認証、CORS設定、WebSocket通信を含めてください。Dockerで両方をコンテナ化し、docker-composeで統合してください。CI/CDパイプラインも設定してください。",
        "Gatsby.jsで静的サイトジェネレーターを使用したポートフォリオサイトを構築してください。GraphQLでデータ取得、gatsby-imageで画像最適化、gatsby-plugin-mdxでMarkdown記事を含めてください。Netlify CMSでコンテンツ管理、Contact Formでお問い合わせ機能を実装してください。パフォーマンススコア95+を目指してください。",
        "Electron + React.jsでデスクトップアプリケーションを開発してください。メインプロセスとレンダラープロセスの通信（IPC）、ファイルシステムアクセス、システムトレイ統合を実装してください。自動更新機能（electron-updater）、ネイティブ通知、メニューバー統合も含めてください。Windows/Mac/Linux向けにビルド設定してください。",
    ],
    'visualization': [
        "matplotlibとseabornで売上データの包括的な可視化ダッシュボードを作成してください。時系列の折れ線グラフ、カテゴリー別の棒グラフ、相関ヒートマップ、散布図、箱ひげ図を含めてください。各グラフに適切なタイトル、軸ラベル、凡例を追加し、viridisカラーパレットを使用してください。subplotsで6つのグラフを統合し、高解像度PNGとして保存してください。",
        "Plotlyで営業実績のインタラクティブダッシュボードを作成してください。折れ線グラフ、棒グラフ、円グラフ、地図可視化を含め、dropdown/sliderによる動的フィルタリングを実装してください。Dashを使用してWebアプリとして公開し、ユーザーが期間やカテゴリを調整できるようにしてください。ホバー時の詳細情報表示も実装してください。",
        "Altairで統計データの宣言的可視化を実装してください。ヒストグラム、散布図行列、並行座標プロット、ストリップチャートを作成し、ブラッシング&リンキングによるインタラクションを追加してください。データ変換（集計、フィルタ、ソート）も組み込み、VegaJSONとして出力して再利用可能にしてください。レイヤー合成も活用してください。",
        "Bokehで株価のリアルタイム可視化システムを構築してください。ColumnDataSourceによるストリーミングデータの更新、HoverToolによるインタラクティブ操作、Spanによる注釈表示を実装してください。複数銘柄の同時表示、ローソク足チャート、出来高グラフも含めてください。Bokeh Serverでホスティングし、複数ユーザーからアクセス可能にしてください。",
        "D3.jsでネットワークグラフのカスタムビジュアライゼーションを実装してください。force-directedレイアウト、ノードのドラッグ&ドロップ、ズーム&パン機能を使用してください。SVG要素を動的に生成し、ノードサイズを重要度で変更し、エッジの太さを関連度で調整してください。レスポンシブ対応にし、複雑なネットワーク関係を直感的に表現してください。",
        "Tableau PublicまたはPowerBIを使用して、販売データの経営ダッシュボードを作成してください。主要KPI（売上、利益率、成長率）のカード表示、地域別売上のマップ、商品カテゴリー別のツリーマップ、時系列トレンドのエリアチャートを含めてください。フィルター、ドリルダウン、パラメータによるシナリオ分析も実装してください。",
        "Plotly + Dashで機械学習モデルの評価ダッシュボードを構築してください。ROC曲線、PR曲線、混同行列のヒートマップ、特徴量重要度の棒グラフを表示してください。モデル選択のドロップダウン、閾値調整のスライダーを実装し、選択に応じて動的に更新してください。精度、再現率、F1スコアのメトリクス表も表示してください。",
        "matplotlibで科学論文向けの高品質グラフを作成してください。2カラム幅に最適化されたサイズ、LaTeX形式の数式ラベル、グレースケール印刷対応のカラースキームを使用してください。エラーバー、信頼区間、統計的有意性の表記も含めてください。複数のサブプロットを整列させ、PDF形式で300dpiで出力してください。",
        "seabornで多変量データの統計的可視化を実施してください。pairplot（散布図行列）、jointplot（2変数の分布）、violinplot（分布比較）、clustermap（階層クラスタリングのヒートマップ）を作成してください。カテゴリカル変数による色分け、回帰直線の追加、統計検定結果の表示も含めてください。各グラフのスタイルを統一してください。",
        "Plotlyで3D可視化と地理空間データの可視化を実装してください。3D散布図、サーフェスプロット、地図上のマーカープロット、コロプレス（塗り分け地図）を作成してください。アニメーションフレームで時系列変化を表現し、カメラアングルの自動回転も実装してください。Mapbox統合で高品質な地図表示を実現してください。",
        "Vegaで宣言的文法による複雑なビジュアライゼーションを作成してください。JSON仕様でインタラクティブなダッシュボードを定義し、データ変換パイプライン、複数ビューの連携、動的フィルタリングを含めてください。クロスフィルタリング、ツールチップ、凡例のインタラクションも実装してください。Vega-Embedで埋め込み可能にしてください。",
        "Matplotlibのアニメーション機能で時系列データの動的可視化を作成してください。FuncAnimationでフレームごとにデータを更新し、軌跡を残しながらプロットを描画してください。複数系列の同時アニメーション、再生速度調整、一時停止機能を実装してください。MP4動画またはGIFアニメーションとして保存してください。",
    ],
    'api': [
        "FastAPIでユーザー認証付きのRESTful APIを構築してください。Pydanticによるリクエスト/レスポンスバリデーション、OAuth2 + JWTによる認証・認可、SQLAlchemyによるPostgreSQL連携を実装してください。OpenAPIドキュメント自動生成、CORS設定、レート制限（Slowapi）、構造化エラーハンドリングを含め、Dockerコンテナ化してください。",
        "GraphQL APIをPython（Strawberry）で実装してください。スキーマ定義（Query、Mutation、Subscription）、リゾルバ実装、DataLoaderによるN+1問題の解決を含めてください。JWT認証、ページネーション（cursor-based）、フィールドレベルの権限制御も追加し、Apollo StudioでGraphiQL環境を提供してください。",
        "gRPCサービスをPythonで実装してください。Protocol Buffersによる.protoファイル定義、サーバー・クライアント実装、bidirectional streamingによるリアルタイム通信を含めてください。インターセプターによる認証・ロギング、エラーハンドリング（gRPCステータスコード）、メタデータ管理も実装し、Dockerで統合テストしてください。",
        "WebSocketサーバーをFastAPIで構築してください。ConnectionManagerによる接続管理、ルーム/チャンネル機能、broadcast/unicast メッセージング、heartbeatによる接続監視を実装してください。Redisでメッセージキューイングし、複数サーバー間でのメッセージ配信も可能にしてください。再接続処理とバックプレッシャー制御も実装してください。",
        "FastAPIでマイクロサービスAPIを実装してください。Consulによるサービスディスカバリー、Nginxによるロードバランシング、Circuitbreakerライブラリによるサーキットブレーカーパターンを含めてください。Jaegerで分散トレーシング、ELKスタックで集中ログ管理、Prometheusでメトリクス収集、ヘルスチェックエンドポイントも追加してください。",
        "Django REST Frameworkで大規模APIを構築してください。ViewSet、Serializer、Router による設計、django-filterによるクエリフィルタリング、JWT認証、throttlingによるレート制限を実装してください。Swagger/ReDocによるAPI文書化、drf-yasgによるスキーマ生成、CORS設定、ページネーションも含めてください。",
        "Node.js + Expressで高速APIサーバーを構築してください。ミドルウェアチェーン、非同期エラーハンドリング、JWTトークン検証、Helmet.jsによるセキュリティ強化を実装してください。MongoDB（Mongoose）連携、Redis キャッシング、rate-limiterによるDDoS対策も含めてください。クラスターモードで複数プロセス起動してください。",
        "GoでハイパフォーマンスなgRPCサーバーを実装してください。Protocol Buffers定義、サーバー/クライアントストリーミング、インターセプターによる認証・ロギング、エラーハンドリングを含めてください。コンテキストによるタイムアウト制御、graceful shutdown、Prometheusメトリクスエクスポートも実装してください。",
        "Flask-RESTfulで軽量APIを構築してください。Resourceクラスによるエンドポイント定義、marshmallowによるシリアライゼーション、Flask-JWTによる認証を実装してください。SQLAlchemyでデータベース連携、Flask-CORSでCORS設定、Flask-Limiterでレート制限を追加してください。APIバージョニングも実装してください。",
        "NestJSでスケーラブルなNode.jsバックエンドを開発してください。モジュール、コントローラー、サービスによる階層設計、TypeORMによるDB連携、Passport.jsによるJWT認証を実装してください。Guards、Interceptors、Pipesを活用し、Swaggerドキュメント生成、GraphQLサポート、WebSocket統合も含めてください。",
        "Ktor（Kotlin）でRESTful APIサーバーを実装してください。ルーティング、コンテンツネゴシエーション、JWTプラグインによる認証、Exposedによるデータベースアクセスを含めてください。非同期処理（コルーチン）、ミドルウェアによるロギング、例外ハンドリング、OpenAPI生成も実装してください。",
        "Spring Boot（Java）でエンタープライズAPIを開発してください。Spring MVC、Spring Data JPA、Spring Securityによる認証・認可を実装してください。RestControllerでRESTエンドポイント、GlobalExceptionHandlerでエラーハンドリング、Swagger統合、HATEOAS対応も含めてください。マイクロサービスアーキテクチャ向けにSpring Cloudも統合してください。",
    ],
    'docker': [
        "Docker Composeでマイクロサービススタックを構築してください。Nginx（リバースプロキシ）、React.js（フロントエンド）、FastAPI（バックエンド）、PostgreSQL（データベース）、Redis（キャッシュ）のサービスを含めてください。各サービスのDockerfileをマルチステージビルドで最適化し、環境変数管理、ボリュームマウント、ネットワーク設定、ヘルスチェックを実装してください。",
        "Kubernetesで本番環境へのアプリケーションデプロイを実施してください。Deployment、Service、Ingress、PersistentVolumeClaim、ConfigMap、Secretのマニフェストを作成してください。ローリングアップデート戦略、Horizontal Pod Autoscaler、リソースリクエスト/リミット設定、Readiness/Livenessプローブを含めてください。Helmチャートも作成してください。",
        "Python Webアプリ用のDockerイメージを最適化してください。Alpine Linuxによる軽量ベースイメージ、マルチステージビルドによるビルド成果物の分離、レイヤーキャッシュ最適化（requirements.txt先コピー）、Trivyによる脆弱性スキャンを実施してください。イメージサイズを500MB未満に抑え、セキュリティベストプラクティスに従い、Docker Hubにプッシュしてください。",
        "Docker Swarmでコンテナオーケストレーションクラスターを構築してください。docker stack deployによるサービスデプロイ、Swarmルーティングメッシュによるロードバランシング、docker service scaleによるスケーリングを実装してください。Secretsによる機密情報管理、ローリングアップデート設定、ヘルスチェックとサービスリカバリーも設定してください。",
        "GitHub ActionsでDockerイメージビルドのCI/CDパイプラインを構築してください。docker buildxによるマルチアーキテクチャビルド（amd64、arm64）、セマンティックバージョニングによるイメージタグ管理、GitHub Container Registryへのプッシュを実装してください。Trivyスキャン、ユニットテスト実行、ビルドキャッシュ活用も統合してください。",
        "DockerでNginx + Let's Encrypt自動SSL証明書更新システムを構築してください。nginx.confでリバースプロキシ設定、Certbotコンテナで証明書取得・更新、cronで自動更新スケジューリングを実装してください。複数ドメイン対応、HSTS設定、セキュリティヘッダー追加も含めてください。docker-composeで統合してください。",
        "Docker VolumesとBindマウントを活用したデータ永続化戦略を実装してください。Named Volumeによるデータベースデータ保存、Bind Mountによる開発時のホットリロード、Volume Driverによるネットワークストレージ統合を含めてください。バックアップ戦略（docker run --rm backup）も実装し、データのポータビリティを確保してください。",
        "Dockerでマルチステージビルドを使用したNode.jsアプリの最適化を実施してください。ビルドステージでnpm install + webpack、本番ステージで必要ファイルのみコピー、distrolessイメージまたはAlpineで最小化してください。.dockerignoreで不要ファイル除外、layer cachingで高速ビルド、最終イメージを100MB未満に抑えてください。",
        "Docker NetworkingでマイクロサービスのService DiscoveryとLoad Balancingを実装してください。カスタムブリッジネットワーク作成、サービス名によるDNS解決、内部ネットワーク分離（フロント/バック）を設定してください。外部公開ポートの最小化、ネットワークエイリアス、接続テストも含めてください。",
        "Dockerで開発環境の完全再現可能性を実現してください。Dockerfileでランタイム環境定義、docker-compose.ymlで複数サービス統合、.envファイルで環境変数管理、Makefileでコマンド簡略化を実装してください。VSCode Remote-Containersでコンテナ内開発、ホットリロード、デバッガー接続も設定してください。",
        "ECS（Amazon Elastic Container Service）でDockerコンテナをデプロイしてください。タスク定義（CPU/メモリ/ポート/環境変数）、サービス定義（ロードバランサー統合、Auto Scaling）、Fargateによるサーバーレス実行を設定してください。CloudWatch Logsでログ収集、Secrets Managerでシークレット管理も実装してください。",
        "Docker Composeでローカル開発環境のフルスタック構築を実施してください。フロントエンド（Vite + React）、バックエンド（FastAPI）、DB（PostgreSQL）、キャッシュ（Redis）、メッセージキュー（RabbitMQ）を含めてください。ホットリロード対応、初期データシード、テストデータ投入スクリプトも実装してください。",
    ],
    'general': [
        "Pythonで複数PDFファイルのテキスト抽出と分析の自動化スクリプトを作成してください。pathlibによるディレクトリ走査、PyPDF2によるテキスト抽出、spaCyによる固有表現抽出、結果のCSV保存を実装してください。エラーハンドリング（try-except）、詳細ログ記録（logging）、multiprocessingによる並列処理、tqdmプログレスバーも含めてください。",
        "大量画像ファイルの一括リサイズとフォーマット変換スクリプトを作成してください。Pillowによる画像処理、globによるファイル検索、EXIF情報保持、品質設定（JPEG圧縮率）を実装してください。concurrent.futuresによる並列処理、処理統計（成功/失敗件数）の出力、エラー画像の別フォルダ保存も含めてください。",
        "Webスクレイピングスクリプトでニュースサイトから記事を自動収集してください。requestsによるHTTP通信、BeautifulSoupによるHTML解析、pandasによるデータ構造化を実装してください。robots.txt遵守、User-Agent設定、リトライ処理（tenacity）、レート制限（time.sleep）、SQLiteへのデータ保存も含めてください。",
        "大量ファイルの自動バックアップスクリプトを作成してください。shutilによるファイルコピー、pathlibによるディレクトリ操作、日付ベースのバックアップフォルダ作成、zipfileによる圧縮を実装してください。増分バックアップ（差分ファイルのみ）、古いバックアップの自動削除、バックアップ検証（ハッシュ比較）、ログ記録も含めてください。",
        "cronまたはTask Schedulerで定期実行されるデータ収集バッチスクリプトを作成してください。API呼び出し（requests）、JSONパース、データベース保存（SQLAlchemy）、メール通知（smtplib）を実装してください。エラー時のリトライ（backoff）、処理結果サマリの生成、Slackへの通知、実行ログのローテーションも含めてください。",
        "Pythonでシステムモニタリングスクリプトを作成してください。psutilでCPU/メモリ/ディスク使用率を取得、閾値監視、異常検知時のアラート送信（メール/Slack）を実装してください。グラフ可視化（matplotlib）、ログファイル出力、定期実行（schedule）、システムメトリクスのCSV保存も含めてください。",
        "複数フォーマット（CSV、JSON、Excel）のデータを統一フォーマットに変換するETLスクリプトを作成してください。pandas による読み込み、データクリーニング、スキーマ統一、出力フォーマット選択を実装してください。バリデーションチェック、エラーレポート生成、処理サマリの出力、設定ファイル（YAML）による動作制御も含めてください。",
        "Click または argparseを使用した高機能CLIツールを開発してください。サブコマンド（init、run、deploy）、オプション引数（--verbose、--config）、環境変数読み込み、設定ファイル管理（TOML/YAML）を実装してください。カラー出力（colorama）、進捗表示、Bash/Zsh自動補完スクリプト生成も含めてください。",
        "Jupyter Notebookの自動実行とHTMLレポート生成スクリプトを作成してください。nbconvert による実行と変換、パラメータ注入（papermill）、複数ノートブックの一括処理を実装してください。実行エラーのキャッチと通知、生成レポートのメール送信、S3/GCSへのアップロードも含めてください。",
        "Pythonで設定ファイル（JSON、YAML、TOML、.env）を統合管理するライブラリを作成してください。複数フォーマットの自動検出と読み込み、環境変数オーバーライド、スキーマバリデーション（Pydantic）、型安全なアクセスを実装してください。設定の階層的マージ、シークレット管理、設定変更の監視（watchdog）も含めてください。",
        "ログ集約と分析のPythonスクリプトを作成してください。複数ログファイルの読み込み、正規表現によるパースィング、エラーパターンの検出、統計分析（エラー頻度、レスポンスタイム）を実装してください。Elasticsearchへの送信、Kibanaダッシュボード用のインデックス作成、アラート条件のチェックも含めてください。",
        "データベースマイグレーションツールを Python で実装してください。スキーマバージョン管理、up/down マイグレーション、トランザクション管理、ロールバック機能を実装してください。SQLAlchemy Coreによるスキーマ操作、マイグレーション履歴テーブル、CLI インターフェース、マイグレーションスクリプトの自動生成も含めてください。",
    ],
    'network': [
        "HTTP/2プロトコルを使用した高性能クライアントライブラリを実装してください。aiohttpによる非同期通信、HTTP/2多重化、接続プーリング、自動リトライ（exponential backoff with jitter）を含めてください。タイムアウト管理、エラーハンドリング、詳細ログ記録、接続メトリクス（レイテンシ、スループット）の収集も実装してください。",
        "WebSocketサーバーとクライアントをPythonで実装してください。websocketsライブラリによる非同期通信、ルーム/チャンネル管理、ブロードキャスト/ユニキャストメッセージング、heartbeatによる接続監視を含めてください。自動再接続処理（exponential backoff）、メッセージキューイング、接続状態管理も実装してください。",
        "MQTTブローカー（Mosquitto）との通信クライアントを実装してください。paho-mqttによるpub/sub、QoSレベル設定（0、1、2）、Last Will and Testament、トピックフィルタリングを含めてください。TLS/SSL暗号化、認証（ユーザー名/パスワード）、再接続処理、メッセージバッファリングも実装してください。",
        "gRPCクライアント・サーバーをPythonで実装してください。Protocol Buffersによるメッセージ定義、Unary RPC、Server Streaming、Client Streaming、Bidirectional Streamingの4種類のRPCを含めてください。インターセプターによるロギング・認証、デッドライン設定、エラーハンドリング（gRPCステータス）、メタデータ管理も実装してください。",
        "TCPサーバーとクライアントを低レベルソケットAPIで実装してください。socketモジュールによる接続管理、selectまたはasyncioによる非同期I/O、カスタムプロトコル設計（メッセージ長プレフィックス）を含めてください。タイムアウト処理、graceful shutdown、接続数制限、ログ記録も実装してください。",
        "HTTP APIのレート制限とサーキットブレーカーを実装してください。Token Bucketアルゴリズムによるレート制限、Redisによる分散カウンター、Circuit Breakerパターン（Open/Half-Open/Closed）を含めてください。429エラー応答、Retry-Afterヘッダー、メトリクス記録（成功/失敗率）も実装してください。",
        "プロキシサーバーをPythonで構築してください。HTTP/HTTPSリクエストの転送、ヘッダー書き換え、キャッシング（LRUCache）、リクエストフィルタリング（ブラックリスト）を実装してください。アクセスログ記録、Basic認証、SSL/TLS終端、upstream選択（ラウンドロビン）も含めてください。",
        "ネットワークスキャナーとポートスキャンツールを実装してください。nmap-pythonまたはscapyによるパケット送信、SYNスキャン、サービスバージョン検出、OS フィンガープリンティングを含めてください。並列スキャン（asyncio）、結果のJSON/CSV出力、脆弱性チェック、ネットワークトポロジーの可視化も実装してください。",
        "WebRTCによるP2P通信の実装を行ってください。aiortcライブラリによるPeer Connection、ICE Candidate交換、STUN/TURNサーバー統合、Data Channelによるメッセージング、Media Streamによる音声/動画ストリーミングを含めてください。シグナリングサーバー（WebSocket）、NAT traversal、接続品質モニタリングも実装してください。",
        "SSHクライアントとSFTP転送を実装してください。paramikoライブラリによるSSH接続、コマンド実行、ファイル転送（SCP/SFTP）、ポートフォワーディング（ローカル/リモート）を含めてください。公開鍵認証、known_hosts管理、タイムアウト設定、リトライ処理も実装してください。",
        "DNSサーバー/クライアントを実装してください。dnspythonによるDNSクエリ、レコードタイプ（A、AAAA、MX、TXT）解決、キャッシング、再帰的問い合わせを含めてください。カスタムDNSサーバー（権威サーバー）の構築、ゾーンファイル管理、DNSSEC対応も実装してください。",
        "ロードバランサーをPythonで実装してください。ラウンドロビン、最小接続数、重み付けによるアルゴリズム、ヘルスチェック（HTTP/TCPプローブ）、バックエンドの動的登録/削除を含めてください。セッション永続化（スティッキーセッション）、接続プーリング、メトリクス収集（Prometheus）も実装してください。",
    ],
}

# 100件生成
new_data = []
id_counter = 100

# 各カテゴリーから均等に選択
categories = list(prompts_by_category.keys())
prompts_per_category = 88 // len(categories)

for category in categories:
    prompts = prompts_by_category[category]
    # このカテゴリーから必要数選択（ランダム）
    selected = random.sample(prompts, min(prompts_per_category, len(prompts)))

    for prompt_text in selected:
        length = len(prompt_text)
        complexity = 'high' if length > 280 else 'medium' if length > 200 else 'low'

        # フレームワーク名を推測
        if category == 'machine_learning':
            framework = 'mixed'
            if 'scikit-learn' in prompt_text:
                framework = 'sklearn'
            elif 'TensorFlow' in prompt_text:
                framework = 'tensorflow'
            elif 'PyTorch' in prompt_text:
                framework = 'pytorch'
            elif 'Keras' in prompt_text:
                framework = 'keras'
        elif category == 'data_analysis':
            framework = 'pandas'
        elif category == 'web_app':
            framework = 'mixed'
            if 'React' in prompt_text:
                framework = 'react'
            elif 'Vue' in prompt_text:
                framework = 'vue'
            elif 'Next' in prompt_text:
                framework = 'nextjs'
        elif category == 'visualization':
            framework = 'matplotlib'
            if 'Plotly' in prompt_text:
                framework = 'plotly'
            elif 'Altair' in prompt_text:
                framework = 'altair'
            elif 'Bokeh' in prompt_text:
                framework = 'bokeh'
        elif category == 'api':
            framework = 'fastapi'
            if 'GraphQL' in prompt_text:
                framework = 'graphql'
            elif 'gRPC' in prompt_text:
                framework = 'grpc'
        elif category == 'docker':
            framework = 'docker'
        elif category == 'general':
            framework = 'python'
        elif category == 'network':
            framework = 'socket'

        new_data.append({
            'id': f'long_{category}_{id_counter}',
            'command': prompt_text,
            'category': category,
            'framework': framework,
            'complexity': complexity,
            'length': length
        })
        id_counter += 1

# 既存データと統合
all_data = existing + new_data

print(f'✅ 生成完了: {len(all_data)}件 (既存{len(existing)}件 + 新規{len(new_data)}件)')
print(f'\n📊 カテゴリー分布:')
category_counts = Counter([item['category'] for item in all_data])
for cat, count in sorted(category_counts.items()):
    print(f'   {cat}: {count}件')

print(f'\n📏 長さ分布:')
lengths = [item['length'] for item in all_data]
print(f'   最小: {min(lengths)}文字')
print(f'   最大: {max(lengths)}文字')
print(f'   平均: {sum(lengths)/len(lengths):.0f}文字')
print(f'   中央値: {sorted(lengths)[len(lengths)//2]}文字')

# 長さ別分布
buckets = {'<150': 0, '150-300': 0, '300-500': 0, '500+': 0}
for l in lengths:
    if l < 150:
        buckets['<150'] += 1
    elif l < 300:
        buckets['150-300'] += 1
    elif l < 500:
        buckets['300-500'] += 1
    else:
        buckets['500+'] += 1

print(f'\n📊 長さバケット分布:')
for bucket, count in buckets.items():
    print(f'   {bucket}文字: {count}件')

# 保存
with open('test_long_prompts_100.json', 'w', encoding='utf-8') as f:
    json.dump(all_data, f, indent=2, ensure_ascii=False)

print(f'\n💾 保存完了: test_long_prompts_100.json')
