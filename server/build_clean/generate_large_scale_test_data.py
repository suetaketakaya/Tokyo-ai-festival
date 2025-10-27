#!/usr/bin/env python3
"""
大規模開発対応テストデータ生成（10万件）
プレビューボタン生成・表示確認を含む
"""

import json
import random
from typing import List, Dict

class LargeScaleTestGenerator:
    def __init__(self):
        self.categories = [
            'web_app', 'api', 'machine_learning', 'visualization',
            'data_analysis', 'docker', 'network', 'general'
        ]

        # 大規模開発パターン
        self.large_scale_patterns = {
            'web_app': [
                # プレビューボタン関連
                "プレビューボタンを生成して表示確認",
                "レスポンシブなプレビューボタンコンポーネント作成",
                "プレビュー機能の実装と表示テスト",
                "リアルタイムプレビュー表示システム構築",
                "マークダウンプレビューボタン実装",
                "コードプレビュー機能とボタンUI設計",

                # 大規模システム
                "マイクロサービスアーキテクチャでSlack風チャット構築",
                "100万ユーザー対応のリアルタイム通知システム",
                "Notion風エディタのフルスタック実装（React + Node.js + PostgreSQL）",
                "Trelloクローンのカンバンボード（Next.js + TypeScript + Prisma）",
                "Instagram風SNSプラットフォーム（投稿・いいね・コメント・フォロー）",
                "Discord風音声チャット（WebRTC + Socket.io）",
                "YouTube風動画ストリーミングプラットフォーム",
                "Shopify風Eコマース（決済・在庫管理・注文処理）",
                "Figma風リアルタイム共同編集ツール",
                "Jira風プロジェクト管理ツール（スプリント・バックログ・カンバン）",

                # エンタープライズ
                "エンタープライズSaaSダッシュボード（認証・権限・監査ログ）",
                "マルチテナントB2Bプラットフォーム",
                "SSO統合とRBAC実装",
                "GraphQL APIとReact管理画面",
                "PWA対応のモバイルファーストWebアプリ",

                # リアルタイム
                "WebSocket使用のリアルタイムコラボレーション",
                "Server-Sent Eventsでライブアップデート",
                "リアルタイムアナリティクスダッシュボード",
                "協調編集エンジン（Operational Transformation）",
                "ライブカーソル・プレゼンス表示",
            ],

            'api': [
                "Stripe決済フロー完全統合（Webhook処理含む）",
                "Twilio SMS/音声通話API実装",
                "OpenAI GPT-4 APIチャットボット構築",
                "SendGrid一括メール送信システム",
                "AWS S3署名付きURL生成とファイルアップロード",
                "Google Cloud Vision API画像認識",
                "Firebase Authentication + Firestore統合",
                "PayPal定期課金システム",
                "Auth0 SSO統合",
                "Algolia全文検索実装",
                "RESTful API設計とOpenAPI仕様書",
                "GraphQL APIとApollo Client",
                "gRPC マイクロサービス通信",
                "OAuth 2.0認証フロー実装",
                "WebhookサーバーとEvent駆動処理",
            ],

            'machine_learning': [
                # プレビュー関連
                "モデル予測結果のリアルタイムプレビュー表示",
                "学習曲線のインタラクティブプレビュー",

                # 大規模ML
                "TensorFlowで大規模画像分類モデル訓練（ImageNet）",
                "PyTorch Transformerファインチューニング（BERT/GPT）",
                "分散学習パイプライン（Horovod + Ray）",
                "MLOpsパイプライン（MLflow + Kubeflow）",
                "リアルタイム推論サーバー（TensorFlow Serving）",
                "AutoML実装（ハイパーパラメータ最適化）",
                "強化学習エージェント（DQN/PPO）",
                "時系列予測モデル（LSTM/Transformer）",
                "レコメンデーションシステム（協調フィルタリング）",
                "異常検知システム（Isolation Forest/Autoencoder）",
                "Hugging Face Transformersカスタム訓練",
                "Weights & Biases実験トラッキング統合",
                "TensorBoard可視化パイプライン",
                "モデルバージョン管理とA/Bテスト",
                "エッジデバイス向け量子化モデル（TFLite/ONNX）",
            ],

            'visualization': [
                # プレビュー関連
                "グラフのインタラクティブプレビュー生成",
                "ダッシュボードリアルタイムプレビュー",

                # BI/分析
                "Tableau風ドラッグ&ドロップBI構築",
                "Grafanaダッシュボード自動生成",
                "D3.jsカスタムビジュアライゼーション",
                "リアルタイムメトリクスダッシュボード（Prometheus + Grafana）",
                "Apache Supersetデータ探索プラットフォーム",
                "Plotly Dashインタラクティブアプリ",
                "Chart.jsレスポンシブグラフライブラリ",
                "ヒートマップ・コロプレス地図可視化",
                "時系列データストリーミングチャート",
                "ネットワークグラフ可視化（D3 force layout）",
            ],

            'data_analysis': [
                "Pandas大規模データ処理パイプライン（1億行）",
                "Spark分散処理ジョブ（Databricks）",
                "Snowflakeデータウェアハウス構築",
                "dbtデータ変換パイプライン",
                "Apache Airflow ETLワークフロー",
                "リアルタイムストリーミング処理（Kafka + Flink）",
                "BigQuery SQLクエリ最適化",
                "ClickHouse高速OLAP分析",
                "データレイクアーキテクチャ（S3 + Glue + Athena）",
                "Prefect/Dagsterデータオーケストレーション",
            ],

            'docker': [
                "Kubernetes本番環境デプロイメント（Helm Chart）",
                "Docker Compose マルチコンテナ開発環境",
                "Istioサービスメッシュ構築",
                "ArgoCD GitOps CI/CD",
                "Amazon EKS/GKEクラスタ構築",
                "コンテナイメージ最適化（multi-stage build）",
                "Kubernetes Ingress + cert-manager（SSL自動化）",
                "Horizontal Pod Autoscaler設定",
                "StatefulSet でステートフルアプリ",
                "Prometheusコンテナ監視",
            ],

            'network': [
                "Cloudflare CDN + WAF設定",
                "nginx リバースプロキシ + ロードバランサー",
                "Traefik動的ルーティング",
                "VPN/プライベートネットワーク構築",
                "DNS設定とRoute53管理",
                "SSL/TLS証明書自動更新（Let's Encrypt）",
                "ネットワークセキュリティグループ設定",
                "DDoS対策とレート制限",
                "ゼロトラストネットワーク実装",
            ],

            'general': [
                "モノレポ管理（Nx/Turborepo）",
                "GitHub Actions CI/CDパイプライン",
                "Terraform インフラストラクチャーコード",
                "Ansible サーバープロビジョニング",
                "テスト自動化（Jest/Cypress/Playwright）",
                "コード品質管理（ESLint/Prettier/SonarQube）",
                "セキュリティスキャン（Dependabot/Snyk）",
                "パフォーマンス監視（New Relic/Datadog）",
                "ログ集約（ELK Stack/Loki）",
                "シークレット管理（Vault/AWS Secrets Manager）",
            ]
        }

        # 製品名
        self.products = {
            'web_app': ['Slack', 'Discord', 'Notion', 'Trello', 'Jira', 'Figma', 'Miro',
                        'Linear', 'Asana', 'Monday.com', 'Airtable', 'Coda'],
            'api': ['Stripe', 'PayPal', 'Twilio', 'SendGrid', 'OpenAI', 'AWS',
                    'Google Cloud', 'Azure', 'Auth0', 'Firebase'],
            'machine_learning': ['TensorFlow', 'PyTorch', 'Keras', 'Hugging Face',
                                 'Scikit-learn', 'XGBoost', 'MLflow'],
            'visualization': ['Tableau', 'Grafana', 'Kibana', 'D3.js', 'Plotly',
                             'Chart.js', 'Apache Superset'],
            'data_analysis': ['Pandas', 'Spark', 'Snowflake', 'BigQuery', 'Airflow',
                             'dbt', 'Databricks'],
            'docker': ['Docker', 'Kubernetes', 'Helm', 'Istio', 'ArgoCD'],
            'network': ['Cloudflare', 'nginx', 'Traefik', 'Envoy', 'HAProxy'],
            'general': ['Git', 'GitHub', 'Terraform', 'Ansible', 'Jenkins']
        }

        # 技術スタック組み合わせ
        self.tech_stacks = [
            "React + TypeScript + Next.js",
            "Vue.js + Nuxt.js + TypeScript",
            "Angular + RxJS + NgRx",
            "Node.js + Express + PostgreSQL",
            "Python + FastAPI + SQLAlchemy",
            "Go + Gin + GORM",
            "Rust + Actix + Diesel",
            "Java Spring Boot + JPA",
            "React Native + Expo",
            "Flutter + Firebase",
        ]

    def generate_preview_patterns(self, count: int) -> List[Dict]:
        """プレビューボタン関連パターン生成"""
        patterns = []

        preview_templates = [
            "{}のプレビューボタンを生成して表示確認してください",
            "{}機能にリアルタイムプレビュー表示を追加",
            "{}のプレビュー機能実装とUIテスト",
            "{}にプレビューボタンとモーダル表示",
            "{}のライブプレビュー機能を構築",
            "{}でマークダウンプレビュー実装",
            "{}のコードエディタにプレビューペイン追加",
            "{}にドラッグ&ドロッププレビュー機能",
            "インタラクティブな{}プレビュー表示システム",
            "{}のビフォー/アフタープレビュー比較UI",
        ]

        features = [
            "記事エディタ", "画像アップロード", "フォーム入力", "データテーブル",
            "グラフ生成", "レポート", "ダッシュボード", "デザインツール",
            "コードスニペット", "設定変更", "テーマカスタマイズ", "レイアウト"
        ]

        for _ in range(count):
            template = random.choice(preview_templates)
            feature = random.choice(features)
            cmd = template.format(feature)

            patterns.append({
                "command": cmd,
                "category": "web_app",
                "type": "preview_feature",
                "scale": "medium"
            })

        return patterns

    def generate_large_scale_patterns(self, count: int) -> List[Dict]:
        """大規模開発パターン生成"""
        patterns = []

        for _ in range(count):
            category = random.choice(self.categories)

            # 大規模パターンから選択
            if random.random() < 0.7:
                cmd = random.choice(self.large_scale_patterns[category])
                scale = "large"
            else:
                # 製品名 + 技術スタック組み合わせ
                product = random.choice(self.products.get(category, ['']))
                tech = random.choice(self.tech_stacks)
                templates = [
                    f"{product}風アプリを{tech}で構築",
                    f"{product}クローンの大規模実装（{tech}）",
                    f"{tech}による{product}風システム開発",
                    f"{product}スタイルのエンタープライズアプリ（{tech}）",
                ]
                cmd = random.choice(templates)
                scale = "medium"

            patterns.append({
                "command": cmd,
                "category": category,
                "type": "large_scale",
                "scale": scale
            })

        return patterns

    def generate_realistic_short_commands(self, count: int) -> List[Dict]:
        """実世界の短いコマンド生成"""
        patterns = []

        short_templates = {
            'web_app': [
                "{}風チャット", "{}のUI", "{}機能追加", "{}実装",
                "プレビュー表示", "ボタン生成", "フォーム作成",
            ],
            'api': [
                "{}統合", "{} API", "{}連携", "認証実装", "決済処理",
            ],
            'machine_learning': [
                "{}で学習", "{}モデル", "予測実装", "プレビュー表示",
            ],
            'visualization': [
                "{}グラフ", "{}ダッシュボード", "チャート作成", "プレビュー",
            ],
            'data_analysis': [
                "{}分析", "{}処理", "データ集計", "クエリ最適化",
            ],
            'docker': [
                "{}デプロイ", "{}環境構築", "コンテナ化",
            ],
            'network': [
                "{}設定", "プロキシ設定", "CDN導入",
            ],
            'general': [
                "{}自動化", "CI/CD", "テスト", "デプロイ",
            ]
        }

        for _ in range(count):
            category = random.choice(self.categories)
            template = random.choice(short_templates[category])

            if '{}' in template:
                product = random.choice(self.products.get(category, ['']))
                cmd = template.format(product)
            else:
                cmd = template

            patterns.append({
                "command": cmd,
                "category": category,
                "type": "short_realistic",
                "scale": "small"
            })

        return patterns

    def generate_test_data(self, total_count: int = 100000) -> List[Dict]:
        """10万件テストデータ生成"""
        print(f"🚀 Generating {total_count:,} test samples...")

        all_patterns = []

        # 構成比率
        preview_count = int(total_count * 0.15)  # 15%: プレビュー関連
        large_scale_count = int(total_count * 0.50)  # 50%: 大規模開発
        short_count = total_count - preview_count - large_scale_count  # 35%: 短文

        print(f"  Preview patterns: {preview_count:,}")
        all_patterns.extend(self.generate_preview_patterns(preview_count))

        print(f"  Large-scale patterns: {large_scale_count:,}")
        all_patterns.extend(self.generate_large_scale_patterns(large_scale_count))

        print(f"  Short realistic commands: {short_count:,}")
        all_patterns.extend(self.generate_realistic_short_commands(short_count))

        # ID付与
        for i, pattern in enumerate(all_patterns, 1):
            pattern['id'] = f"test_{i:06d}"

        # シャッフル
        random.shuffle(all_patterns)

        return all_patterns

if __name__ == '__main__':
    generator = LargeScaleTestGenerator()

    # 10万件生成
    test_data = generator.generate_test_data(100000)

    # 統計出力
    from collections import Counter
    cat_counts = Counter(item['category'] for item in test_data)
    type_counts = Counter(item['type'] for item in test_data)
    scale_counts = Counter(item['scale'] for item in test_data)

    print("\n📊 Category Distribution:")
    for cat, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
        print(f"  {cat:20s}: {count:6,} ({count/len(test_data)*100:5.1f}%)")

    print("\n📊 Type Distribution:")
    for typ, count in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"  {typ:20s}: {count:6,} ({count/len(test_data)*100:5.1f}%)")

    print("\n📊 Scale Distribution:")
    for scale, count in sorted(scale_counts.items(), key=lambda x: -x[1]):
        print(f"  {scale:20s}: {count:6,} ({count/len(test_data)*100:5.1f}%)")

    # 保存
    output_file = "test_data_100k_large_scale.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(test_data, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Saved {len(test_data):,} samples to: {output_file}")
    print(f"   File size: {len(json.dumps(test_data, ensure_ascii=False)) / 1024 / 1024:.1f} MB")
