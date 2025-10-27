#!/usr/bin/env python3
"""
Comprehensive Real-World Training Data Generator
実世界のWebアプリ・API・ツールから1000件以上の訓練データを生成
"""

import json
import random
from typing import List, Tuple

class RealWorldDataGenerator:
    """実世界データ生成器"""

    def __init__(self):
        # 製品名・サービス名の辞書
        self.products = self._define_products()
        # 機能パターンの辞書
        self.patterns = self._define_patterns()

    def _define_products(self):
        """実世界の製品・サービス名を定義"""
        return {
            'web_app': [
                # コラボレーション
                'Slack', 'Discord', 'Microsoft Teams', 'Zoom', 'Google Meet',
                # プロジェクト管理
                'Jira', 'Trello', 'Asana', 'Monday.com', 'ClickUp', 'Linear',
                # ドキュメント
                'Notion', 'Confluence', 'Obsidian', 'Roam Research', 'Coda',
                # SNS
                'Twitter', 'Facebook', 'Instagram', 'LinkedIn', 'Reddit', 'TikTok',
                # Eコマース
                'Shopify', 'WooCommerce', 'Magento', 'BigCommerce', 'Amazon',
                # ストリーミング
                'Netflix', 'Spotify', 'YouTube', 'Twitch', 'SoundCloud',
                # その他
                'Airbnb', 'Uber', 'Lyft', 'DoorDash', 'Instacart',
                'Gmail', 'Outlook', 'Dropbox', 'Google Drive', 'OneDrive',
                'Figma', 'Miro', 'Canva', 'Adobe XD', 'InVision'
            ],
            'api': [
                'Stripe', 'PayPal', 'Square', 'Twilio', 'SendGrid',
                'AWS', 'Google Cloud', 'Azure', 'Heroku', 'Vercel',
                'OpenAI', 'Anthropic', 'Google Maps', 'Mapbox',
                'Auth0', 'Okta', 'Firebase', 'Supabase',
                'Algolia', 'Elasticsearch', 'MongoDB Atlas'
            ],
            'machine_learning': [
                'TensorFlow', 'PyTorch', 'Keras', 'scikit-learn',
                'Hugging Face', 'OpenAI', 'Anthropic Claude',
                'Kaggle', 'Google Colab', 'Jupyter',
                'MLflow', 'Weights & Biases', 'Neptune.ai'
            ],
            'visualization': [
                'Tableau', 'Power BI', 'Looker', 'Metabase',
                'Grafana', 'Kibana', 'Datadog', 'New Relic',
                'D3.js', 'Chart.js', 'Plotly', 'Matplotlib', 'Seaborn'
            ],
            'data_analysis': [
                'Pandas', 'NumPy', 'Apache Spark', 'Databricks',
                'Snowflake', 'BigQuery', 'Redshift', 'Athena',
                'Jupyter', 'RStudio', 'Excel', 'Google Sheets'
            ],
            'docker': [
                'Docker', 'Kubernetes', 'Docker Compose', 'Helm',
                'Docker Hub', 'Amazon ECS', 'Google GKE', 'Azure AKS',
                'Rancher', 'OpenShift', 'Nomad'
            ],
            'network': [
                'Cloudflare', 'Akamai', 'Fastly', 'nginx', 'Apache',
                'HAProxy', 'Kong', 'Envoy', 'Istio',
                'Wireshark', 'Postman', 'Insomnia'
            ],
            'general': [
                'VS Code', 'IntelliJ IDEA', 'PyCharm', 'Sublime Text',
                'Git', 'GitHub', 'GitLab', 'Bitbucket',
                'Jenkins', 'CircleCI', 'Travis CI', 'GitHub Actions',
                'Terraform', 'Ansible', 'Puppet', 'Chef'
            ]
        }

    def _define_patterns(self):
        """機能パターンを定義"""
        return {
            'web_app': [
                # 短文パターン（実世界で頻出）
                "{product}のようなリアルタイムチャット機能",
                "{product}風のプロジェクト管理ダッシュボード",
                "{product}に似たドキュメント共同編集",
                "{product}のようなカンバンボード",
                "{product}風のタスク管理システム",
                "{product}に似たビデオ会議機能",
                "{product}のような投稿・いいね・コメント機能",
                "{product}風のマーケットプレイス",
                "{product}に似た予約システム",
                "{product}のようなストリーミング配信",
                # 中文パターン
                "{product}のようなアプリを作成してください。ユーザー認証、リアルタイム通知、検索機能を含めてください。",
                "{product}風のプラットフォームを構築してください。レスポンシブデザイン、モバイル対応を実装してください。",
                "{product}に似たサービスを開発してください。データベース設計、API設計、フロントエンド実装を含めてください。",
                # 機能要件
                "{product}の主要機能を実装：{feature1}、{feature2}、{feature3}",
                "{product}ライクな{feature1}と{feature2}を持つアプリ開発",
            ],
            'api': [
                "{product}のような決済API実装",
                "{product}風のメール送信サービス",
                "{product}に似た認証API構築",
                "{product}のような地図・位置情報API",
                "{product}風のクラウドストレージAPI",
                "{product} APIを使用した{feature}の実装",
                "{product}互換のRESTful API開発",
                "{product}スタイルのWebhook システム",
            ],
            'machine_learning': [
                "{product}を使用した画像分類モデル訓練",
                "{product}で自然言語処理パイプライン構築",
                "{product}による時系列予測モデル開発",
                "{product}を活用したレコメンデーションシステム",
                "{product}ベースの異常検知モデル",
                "{product}でファインチューニング実施",
                "{product}を用いた{feature}の実装",
            ],
            'visualization': [
                "{product}のようなダッシュボード作成",
                "{product}風のリアルタイム監視画面",
                "{product}に似たBIツール開発",
                "{product}スタイルのデータ可視化",
                "{product}を使用した{feature}グラフ作成",
                "{product}ベースの分析レポート生成",
            ],
            'data_analysis': [
                "{product}でデータクレンジングパイプライン",
                "{product}を使用したETL処理実装",
                "{product}によるデータウェアハウス構築",
                "{product}でSQL分析クエリ最適化",
                "{product}を活用した統計分析",
                "{product}ベースのデータパイプライン",
            ],
            'docker': [
                "{product}でマイクロサービスデプロイ",
                "{product}によるコンテナオーケストレーション",
                "{product}を使用したCI/CDパイプライン",
                "{product}でスケーラブルな環境構築",
                "{product}ベースのインフラ自動化",
            ],
            'network': [
                "{product}のようなCDN設定",
                "{product}風のロードバランサー構築",
                "{product}に似たAPI ゲートウェイ",
                "{product}スタイルのプロキシ設定",
                "{product}を使用したトラフィック管理",
            ],
            'general': [
                "{product}プラグイン開発",
                "{product}の自動化スクリプト作成",
                "{product}統合ツール実装",
                "{product}を使用した{feature}",
                "{product}ベースの開発環境構築",
            ]
        }

    def _define_features(self):
        """機能要素を定義"""
        return {
            'web_app': [
                'リアルタイム通知', 'チャット機能', 'ファイル共有', 'コメント機能',
                'いいね・リアクション', '検索・フィルタ', 'ソート機能', 'ページネーション',
                'ユーザー認証', '権限管理', 'プロフィール管理', 'ダッシュボード',
                'レポート生成', 'エクスポート機能', 'インポート機能', '通知設定',
                'ドラッグ&ドロップ', 'モバイル対応', 'ダークモード', '多言語対応'
            ],
            'api': [
                'OAuth認証', 'JWT トークン', 'レート制限', 'Webhook',
                'バッチ処理', '非同期処理', 'キャッシング', 'ページネーション',
                'エラーハンドリング', 'バージョニング', 'ドキュメント生成', 'SDK提供'
            ],
            'machine_learning': [
                'データ前処理', '特徴量エンジニアリング', 'モデル訓練', 'ハイパーパラメータ調整',
                'クロスバリデーション', '精度評価', 'モデルデプロイ', '推論API',
                'A/Bテスト', 'モニタリング', '再訓練パイプライン', 'モデルバージョン管理'
            ]
        }

    def generate_samples(self, count: int = 1000) -> List[Tuple[str, str, float]]:
        """実世界データサンプルを生成"""
        samples = []
        features_dict = self._define_features()

        # カテゴリごとの目標数
        target_per_category = {
            'web_app': 300,  # 最も重要
            'api': 200,
            'machine_learning': 150,
            'visualization': 100,
            'data_analysis': 100,
            'docker': 50,
            'network': 50,
            'general': 50
        }

        for category, target in target_per_category.items():
            products = self.products[category]
            patterns = self.patterns[category]
            features = features_dict.get(category, [])

            for _ in range(target):
                product = random.choice(products)
                pattern = random.choice(patterns)

                # パターンに製品名と機能を埋め込み
                if '{feature1}' in pattern:
                    feature1 = random.choice(features) if features else ''
                    feature2 = random.choice(features) if features else ''
                    feature3 = random.choice(features) if features else ''
                    command = pattern.format(
                        product=product,
                        feature1=feature1,
                        feature2=feature2,
                        feature3=feature3,
                        feature=feature1
                    )
                else:
                    command = pattern.format(
                        product=product,
                        feature=random.choice(features) if features else 'システム'
                    )

                confidence = round(random.uniform(0.70, 0.95), 2)
                samples.append((command, category, confidence))

        # シャッフル
        random.shuffle(samples)

        return samples

def main():
    print("=" * 70)
    print("🌍 Comprehensive Real-World Training Data Generator")
    print("=" * 70)

    generator = RealWorldDataGenerator()

    print("\n📊 Generating 1000+ real-world samples...")
    samples = generator.generate_samples(count=1000)

    print(f"✅ Generated {len(samples)} samples")

    # カテゴリ別統計
    from collections import Counter
    category_counts = Counter([s[1] for s in samples])

    print("\n📈 Category Distribution:")
    for cat, count in sorted(category_counts.items()):
        print(f"   {cat:20s}: {count:4d} samples")

    # JSON形式で保存
    training_data = []
    for command, category, confidence in samples:
        training_data.append({
            "command": command,
            "category": category,
            "confidence": confidence
        })

    output_file = "real_world_training_data_1000.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(training_data, f, indent=2, ensure_ascii=False)

    print(f"\n💾 Saved to: {output_file}")

    # サンプル表示
    print("\n📝 Sample Examples:")
    for i, (cmd, cat, conf) in enumerate(samples[:10], 1):
        print(f"\n{i}. [{cat}] (conf: {conf})")
        print(f"   {cmd}")

    print("\n" + "=" * 70)
    print("✅ Real-world data generation complete!")
    print("=" * 70)

if __name__ == "__main__":
    main()
