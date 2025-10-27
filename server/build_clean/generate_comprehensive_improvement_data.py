#!/usr/bin/env python3
"""
包括的改善データ生成
- 短文特化: 30,000件
- カテゴリ境界: 10,000件
- devops/testing強化: 10,000件
合計: 50,000件
"""

import json
import random

class ComprehensiveDataGenerator:
    def __init__(self):
        self.categories = ['api', 'data_analysis', 'docker', 'general',
                          'machine_learning', 'network', 'visualization',
                          'web_app', 'devops', 'testing']

    def generate_short_commands(self, count=30000):
        """短文コマンド生成（5-20文字）"""
        print(f"🔄 Generating {count:,} short commands...")

        patterns = {
            'web_app': [
                # 超短文
                '{}実装', '{}追加', '{}作成', '{}構築', '{}開発',
                '{}機能', '{}UI', '{}画面', '{}ボタン', '{}フォーム',
                # 製品名のみ
                'Slack風', 'Notion風', 'Trello風', 'Discord風',
                'GitHub風', 'Figma風', 'Linear風', 'Asana風',
                # プレビュー短文
                'プレビュー', 'プレビュー表示', 'プレビュー機能',
                'リアルタイムプレビュー', 'ライブプレビュー',
            ],
            'api': [
                '{}統合', '{}API', '{}連携', '{}決済', '{}認証',
                'Stripe決済', 'PayPal決済', 'Twilio SMS',
                'OpenAI統合', 'Firebase連携', 'AWS統合',
                'REST API', 'GraphQL', 'gRPC', 'WebSocket',
            ],
            'machine_learning': [
                '{}訓練', '{}学習', '{}推論', '{}予測', '{}分類',
                'TensorFlow訓練', 'PyTorch学習', 'BERT微調整',
                'モデル訓練', 'データ訓練', 'ML推論',
                '画像分類', 'テキスト分類', '異常検知',
            ],
            'visualization': [
                '{}グラフ', '{}チャート', '{}可視化', '{}ダッシュボード',
                'Grafanaダッシュボード', 'Tableau可視化', 'D3グラフ',
                '折れ線グラフ', '棒グラフ', '円グラフ', 'ヒートマップ',
            ],
            'data_analysis': [
                '{}分析', '{}集計', '{}処理', 'データ分析',
                'Pandas処理', 'SQL集計', 'Spark処理',
                'ETL処理', 'データクレンジング', 'データ変換',
            ],
            'docker': [
                '{}デプロイ', '{}コンテナ化', 'Docker化',
                'Kubernetesデプロイ', 'Helm Chart', 'k8s設定',
                'コンテナ構築', 'イメージビルド', 'Pod設定',
            ],
            'network': [
                '{}設定', 'CDN設定', 'nginx設定', 'SSL設定',
                'Cloudflare設定', 'プロキシ設定', 'DNS設定',
                'ロードバランサー', 'リバースプロキシ',
            ],
            'devops': [
                'CI/CD', 'パイプライン', 'デプロイ自動化',
                'GitHub Actions', 'Jenkins設定', 'Terraform',
                'Ansible', 'IaC', 'インフラ自動化',
                '自動デプロイ', 'リリース自動化',
            ],
            'testing': [
                'テスト', '単体テスト', '統合テスト', 'E2Eテスト',
                'Jestテスト', 'Cypress E2E', 'Playwright',
                'テスト自動化', 'テストカバレッジ', 'QA自動化',
            ],
            'general': [
                'Git', 'GitHub', 'GitLab', 'コードレビュー',
                'VS Code', 'ESLint', 'Prettier', 'ドキュメント',
                'バージョン管理', 'リファクタリング',
            ]
        }

        short_data = []
        samples_per_category = count // len(self.categories)

        for category in self.categories:
            cat_patterns = patterns.get(category, ['{}'])

            for _ in range(samples_per_category):
                template = random.choice(cat_patterns)

                if '{}' in template:
                    # 空欄埋め
                    fillers = ['機能', 'システム', 'ツール', 'API', '画面']
                    cmd = template.format(random.choice(fillers))
                else:
                    cmd = template

                short_data.append({
                    "command": cmd,
                    "category": category,
                    "confidence": round(random.uniform(0.85, 0.95), 2),
                    "type": "short_command"
                })

        return short_data

    def generate_boundary_data(self, count=10000):
        """カテゴリ境界データ生成"""
        print(f"🔄 Generating {count:,} boundary samples...")

        # 混同しやすいペア
        boundary_pairs = {
            ('machine_learning', 'data_analysis'): [
                'TensorFlowでデータ前処理パイプライン',
                'PyTorchによるデータローダー実装',
                'Pandasでの特徴量エンジニアリング',
                'Sparkによる大規模ML訓練データ準備',
                'データ分析用MLモデル構築',
                'MLモデルのデータ検証パイプライン',
            ],
            ('docker', 'network'): [
                'Kubernetesネットワークポリシー設定',
                'Dockerコンテナのネットワーク設定',
                'nginxコンテナのロードバランシング',
                'Istioサービスメッシュ構築',
                'コンテナ間ネットワーク構築',
            ],
            ('devops', 'docker'): [
                'KubernetesへのCI/CDデプロイ',
                'Docker イメージの自動ビルドパイプライン',
                'コンテナデプロイ自動化',
                'Helm ChartのCI/CD統合',
            ],
            ('devops', 'testing'): [
                'CI/CDパイプラインでのテスト自動化',
                'デプロイ前の自動テスト実行',
                'GitHub ActionsでのE2Eテスト',
            ],
            ('general', 'devops'): [
                'GitワークフローとCI/CD統合',
                'コードレビューからデプロイまでの自動化',
            ],
            ('web_app', 'api'): [
                'REST APIを使用したWebアプリ構築',
                'GraphQLバックエンドとReact フロントエンド',
            ],
        }

        boundary_data = []
        samples_per_pair = count // len(boundary_pairs)

        for (cat1, cat2), templates in boundary_pairs.items():
            for _ in range(samples_per_pair // 2):
                # cat1として
                template = random.choice(templates)
                boundary_data.append({
                    "command": template,
                    "category": cat1,
                    "confidence": round(random.uniform(0.80, 0.90), 2),
                    "type": "boundary"
                })

                # cat2として（別の表現）
                boundary_data.append({
                    "command": template,
                    "category": cat2,
                    "confidence": round(random.uniform(0.80, 0.90), 2),
                    "type": "boundary"
                })

        return boundary_data

    def generate_devops_testing_data(self, count=10000):
        """devops/testing カテゴリ強化"""
        print(f"🔄 Generating {count:,} devops/testing samples...")

        devops_patterns = [
            'GitHub Actions CI/CDパイプライン構築',
            'GitLab CI/CD 自動デプロイ設定',
            'Jenkins パイプライン設定',
            'CircleCI ワークフロー構築',
            'Terraform AWS インフラ構築',
            'Ansible サーバープロビジョニング',
            'Puppet 構成管理',
            'Chef クックブック作成',
            'ArgoCD GitOps デプロイ',
            'Spinnaker 継続的デリバリー',
            '自動デプロイパイプライン構築',
            'インフラストラクチャーコード実装',
            'IaC テンプレート作成',
            'コンテナデプロイ自動化',
            'Blue-Greenデプロイ実装',
            'カナリアリリース設定',
            'ロールバック自動化',
            'デプロイメント監視',
        ]

        testing_patterns = [
            'Jest 単体テスト実装',
            'Mocha + Chai テスト',
            'JUnit Java テスト',
            'pytest Python テスト',
            'Cypress E2Eテスト',
            'Playwright ブラウザテスト',
            'Selenium 自動化テスト',
            'TestNG 統合テスト',
            'Karma Jasmine テスト',
            'テストカバレッジ90%達成',
            'スナップショットテスト実装',
            'APIテスト自動化',
            'パフォーマンステスト実装',
            'ロードテスト実行',
            'セキュリティテスト自動化',
            'リグレッションテスト',
            'テストデータ生成',
            'モックサーバー構築',
        ]

        data = []

        # devops: 60%
        for _ in range(int(count * 0.6)):
            cmd = random.choice(devops_patterns)
            data.append({
                "command": cmd,
                "category": "devops",
                "confidence": round(random.uniform(0.85, 0.95), 2),
                "type": "devops_enhanced"
            })

        # testing: 40%
        for _ in range(int(count * 0.4)):
            cmd = random.choice(testing_patterns)
            data.append({
                "command": cmd,
                "category": "testing",
                "confidence": round(random.uniform(0.85, 0.95), 2),
                "type": "testing_enhanced"
            })

        return data

    def generate_all(self):
        """全データ生成"""
        print("=" * 70)
        print("🚀 Comprehensive Improvement Data Generation")
        print("=" * 70)

        all_data = []

        # 1. 短文特化
        all_data.extend(self.generate_short_commands(30000))

        # 2. カテゴリ境界
        all_data.extend(self.generate_boundary_data(10000))

        # 3. devops/testing強化
        all_data.extend(self.generate_devops_testing_data(10000))

        random.shuffle(all_data)

        print(f"\n✅ Total generated: {len(all_data):,} samples")

        # 統計
        from collections import Counter
        cat_counts = Counter(item['category'] for item in all_data)
        type_counts = Counter(item['type'] for item in all_data)

        print(f"\n📊 Category Distribution:")
        for cat, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
            print(f"   {cat:20s}: {count:6,} ({count/len(all_data)*100:5.1f}%)")

        print(f"\n📊 Type Distribution:")
        for typ, count in sorted(type_counts.items(), key=lambda x: -x[1]):
            print(f"   {typ:20s}: {count:6,} ({count/len(all_data)*100:5.1f}%)")

        return all_data

if __name__ == '__main__':
    generator = ComprehensiveDataGenerator()
    data = generator.generate_all()

    # 保存
    output_file = "improvement_data_50k.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n💾 Saved to: {output_file}")
    print(f"   File size: {len(json.dumps(data, ensure_ascii=False)) / 1024 / 1024:.1f} MB")
    print("\n✅ Data generation completed!")
