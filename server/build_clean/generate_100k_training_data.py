#!/usr/bin/env python3
"""
大規模訓練データ生成ツール
目標: 10万サンプルの高品質訓練データ生成
"""

import json
import random
import itertools
from typing import List, Tuple

class TrainingDataGenerator:
    """10万サンプル訓練データジェネレーター"""

    def __init__(self):
        # カテゴリー別目標サンプル数
        self.target_counts = {
            'machine_learning': 15000,
            'web_app': 15000,
            'data_analysis': 15000,
            'visualization': 10000,
            'api': 10000,
            'docker': 10000,
            'general': 15000,
            'network': 10000,
        }

        # テンプレートとパラメータ定義
        self.templates = self._define_templates()

    def _define_templates(self):
        """カテゴリー別テンプレート定義"""
        return {
            'machine_learning': {
                'templates': [
                    "{framework}で{task}モデルを{action}してください",
                    "{framework}を使用して{dataset}データセットで{model}を{action}",
                    "{model}の{task}タスクを{framework}で実装",
                    "{framework}で{technique}を使用した{task}",
                    "{model}モデルで{dataset}の{task}を実行",
                    "{framework} {model} implementation for {task}",
                    "Train {model} on {dataset} using {framework}",
                    "{technique} with {framework} for {task}",
                    "Build {model} model using {framework} and {technique}",
                    "Implement {task} using {framework} {model}",
                ],
                'params': {
                    'framework': ['TensorFlow', 'PyTorch', 'Keras', 'scikit-learn', 'XGBoost', 'LightGBM', 'JAX', 'MXNet'],
                    'task': ['画像分類', '物体検出', 'テキスト分類', '感情分析', '時系列予測', '異常検知', '推薦システム', 'クラスタリング', '次元削減', 'image classification', 'object detection', 'text classification', 'sentiment analysis', 'time series forecasting'],
                    'action': ['訓練', '実装', '構築', '作成', '最適化', 'train', 'implement', 'build', 'create', 'optimize'],
                    'dataset': ['MNIST', 'CIFAR-10', 'ImageNet', 'COCO', 'IMDB', 'Wikipedia', 'タイタニック', 'アイリス', '住宅価格'],
                    'model': ['CNN', 'RNN', 'LSTM', 'GRU', 'Transformer', 'BERT', 'GPT', 'ResNet', 'VGG', 'ランダムフォレスト', '勾配ブースティング', 'SVM', 'ロジスティック回帰', 'ニューラルネットワーク'],
                    'technique': ['転移学習', 'データ拡張', 'ファインチューニング', 'アンサンブル学習', 'ハイパーパラメータチューニング', 'early stopping', 'dropout', 'batch normalization', 'transfer learning', 'data augmentation'],
                }
            },
            'web_app': {
                'templates': [
                    "{framework}で{app_type}を{action}してください",
                    "{framework}を使用した{feature}機能付き{app_type}",
                    "{framework} + {styling}で{app_type}開発",
                    "{framework}で{state_mgmt}を使った{app_type}",
                    "{app_type}アプリを{framework}と{tool}で構築",
                    "Build {app_type} with {framework} and {styling}",
                    "Create {app_type} using {framework} {feature}",
                    "{framework} {app_type} with {state_mgmt}",
                    "Develop {feature} for {app_type} using {framework}",
                    "Implement {app_type} frontend with {framework}",
                ],
                'params': {
                    'framework': ['React.js', 'Vue.js', 'Angular', 'Next.js', 'Nuxt.js', 'Svelte', 'SvelteKit', 'Solid.js', 'Remix'],
                    'app_type': ['Todoアプリ', 'ダッシュボード', 'ブログ', 'ECサイト', 'SNS', '管理画面', 'ポートフォリオ', 'チャットアプリ', 'カレンダー', 'landing page', 'dashboard', 'blog', 'e-commerce', 'admin panel'],
                    'action': ['作成', '開発', '構築', '実装', 'create', 'develop', 'build', 'implement'],
                    'feature': ['認証', 'リアルタイム更新', 'ファイルアップロード', 'フォームバリデーション', 'ルーティング', 'authentication', 'real-time updates', 'file upload', 'form validation', 'routing'],
                    'styling': ['Tailwind CSS', 'Material-UI', 'Chakra UI', 'Bootstrap', 'Ant Design', 'styled-components', 'CSS Modules', 'Sass'],
                    'state_mgmt': ['Redux', 'Zustand', 'Recoil', 'MobX', 'Context API', 'Vuex', 'Pinia', 'NgRx'],
                    'tool': ['TypeScript', 'Vite', 'Webpack', 'ESLint', 'Prettier', 'Jest'],
                }
            },
            'data_analysis': {
                'templates': [
                    "pandasで{data_source}から{operation}を実施",
                    "{tool}を使用して{operation}と{visualization}",
                    "{data_source}データの{operation}をpandasで実行",
                    "{operation}して{output}に出力",
                    "{tool}で{technique}による{operation}",
                    "Perform {operation} on {data_source} using pandas",
                    "{tool} {operation} and {visualization}",
                    "Analyze {data_source} data with {technique}",
                    "Data {operation} using {tool} and {technique}",
                    "Extract and {operation} from {data_source}",
                ],
                'params': {
                    'tool': ['pandas', 'numpy', 'scipy', 'statsmodels', 'polars', 'dask'],
                    'data_source': ['CSV', 'Excel', 'JSON', 'SQL', 'Parquet', 'PostgreSQL', 'MySQL', 'MongoDB', 'BigQuery', 'データベース', 'API', 'ログファイル'],
                    'operation': ['データクリーニング', '欠損値処理', '外れ値検出', '集計', '統計分析', '相関分析', 'グループ化', 'ピボット', '結合', 'data cleaning', 'missing value imputation', 'outlier detection', 'aggregation', 'groupby', 'pivot table', 'merge'],
                    'visualization': ['ヒストグラム作成', '散布図プロット', '箱ひげ図', 'ヒートマップ', 'histogram', 'scatter plot', 'box plot', 'heatmap'],
                    'technique': ['統計的仮説検定', '回帰分析', '時系列分析', 'クラスタリング', 'regression', 'time series analysis', 'clustering'],
                    'output': ['CSV', 'Excel', 'JSON', 'データベース', 'HTMLレポート'],
                }
            },
            'visualization': {
                'templates': [
                    "{library}で{chart_type}を作成してください",
                    "{library}を使用した{data}の{chart_type}",
                    "{chart_type}と{chart_type2}を{library}で可視化",
                    "{library}で{feature}付き{chart_type}",
                    "インタラクティブな{chart_type}を{library}で実装",
                    "Create {chart_type} using {library}",
                    "{library} {chart_type} with {feature}",
                    "Visualize {data} with {library} {chart_type}",
                    "Plot {chart_type} and {chart_type2} using {library}",
                    "Interactive {chart_type} dashboard with {library}",
                ],
                'params': {
                    'library': ['matplotlib', 'seaborn', 'plotly', 'Bokeh', 'Altair', 'Plotly Dash', 'D3.js', 'Vega', 'Highcharts'],
                    'chart_type': ['折れ線グラフ', '棒グラフ', '円グラフ', '散布図', 'ヒートマップ', 'ヒストグラム', '箱ひげ図', 'バイオリンプロット', 'サンバーストチャート', 'line chart', 'bar chart', 'pie chart', 'scatter plot', 'heatmap', 'histogram', 'box plot'],
                    'chart_type2': ['ヒートマップ', '散布図行列', '3Dプロット', 'ウォーターフォールチャート', 'treemap', 'sankey diagram'],
                    'data': ['時系列データ', '売上データ', '在庫データ', '顧客データ', 'KPI', 'time series', 'sales data', 'inventory', 'customer data'],
                    'feature': ['アニメーション', 'ツールチップ', 'ズーム機能', 'フィルター', 'ドリルダウン', 'animation', 'tooltip', 'zoom', 'filter', 'drilldown'],
                }
            },
            'api': {
                'templates': [
                    "{framework}で{api_type} APIを{action}",
                    "{framework}を使用した{feature}付きAPI",
                    "{api_type} APIに{auth}認証を実装",
                    "{framework}で{protocol} {api_type}サーバー構築",
                    "{framework} {feature} and {db} integration",
                    "Build {api_type} API with {framework} and {auth}",
                    "Create {protocol} server using {framework}",
                    "{framework} API with {feature} and {db}",
                    "Implement {api_type} endpoint with {auth}",
                    "{framework} microservice with {feature}",
                ],
                'params': {
                    'framework': ['FastAPI', 'Flask', 'Django REST Framework', 'Express.js', 'NestJS', 'Spring Boot', 'Go Gin', 'ASP.NET Core'],
                    'api_type': ['REST', 'GraphQL', 'gRPC', 'WebSocket', 'RESTful', 'CRUD'],
                    'action': ['作成', '構築', '実装', 'create', 'build', 'implement'],
                    'feature': ['認証', 'レート制限', 'バリデーション', 'エラーハンドリング', 'ロギング', 'キャッシング', 'authentication', 'rate limiting', 'validation', 'error handling', 'logging', 'caching'],
                    'auth': ['JWT', 'OAuth2', 'Basic認証', 'APIキー', 'JWT token', 'OAuth 2.0', 'API key'],
                    'protocol': ['HTTP', 'WebSocket', 'gRPC', 'MQTT'],
                    'db': ['PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'DynamoDB'],
                }
            },
            'docker': {
                'templates': [
                    "Docker{tool}で{target}を{action}",
                    "{service}と{service2}を含むDocker環境構築",
                    "Dockerfileで{target}の{feature}を実装",
                    "Kubernetes{resource}を{action}してください",
                    "{orchestration}で{service}デプロイ",
                    "Build {target} Docker image with {feature}",
                    "Docker Compose {service} and {service2} stack",
                    "Kubernetes {resource} deployment with {feature}",
                    "Containerize {target} with {tool}",
                    "{orchestration} cluster for {service}",
                ],
                'params': {
                    'tool': ['', ' Compose', 'file', ' Hub', ' Swarm'],
                    'target': ['Webアプリ', 'API', 'データベース', 'マイクロサービス', 'バッチ処理', 'web application', 'API server', 'database', 'microservice'],
                    'action': ['構築', '作成', '最適化', 'デプロイ', 'build', 'create', 'optimize', 'deploy'],
                    'service': ['Nginx', 'PostgreSQL', 'Redis', 'RabbitMQ', 'Elasticsearch', 'MongoDB', 'MySQL'],
                    'service2': ['React', 'FastAPI', 'Node.js', 'Django', 'Spring Boot'],
                    'feature': ['マルチステージビルド', 'ヘルスチェック', 'ボリュームマウント', 'ネットワーク設定', 'multi-stage build', 'health check', 'volume mount', 'network config'],
                    'resource': ['Deployment', 'Service', 'Ingress', 'ConfigMap', 'Secret', 'Pod', 'StatefulSet'],
                    'orchestration': ['Docker Swarm', 'Kubernetes', 'K8s', 'ECS', 'EKS'],
                }
            },
            'general': {
                'templates': [
                    "Python{task}スクリプトを{action}",
                    "{file_type}ファイルの{operation}処理",
                    "{tool}で{task}を自動化",
                    "{operation}して{output}に保存",
                    "{task}の{feature}を実装",
                    "Python {task} script with {feature}",
                    "Automate {operation} using {tool}",
                    "{file_type} file {operation} and {output}",
                    "Batch {operation} for {file_type} files",
                    "Implement {task} with {feature} and {tool}",
                ],
                'params': {
                    'task': ['ファイル処理', 'データ変換', 'バックアップ', '監視', '自動化', 'スクレイピング', 'メール送信', 'ログ解析', 'file processing', 'data conversion', 'backup', 'monitoring', 'automation', 'scraping'],
                    'action': ['作成', '実装', '開発', 'create', 'implement', 'develop'],
                    'file_type': ['PDF', 'CSV', 'JSON', 'Excel', 'XML', '画像', 'テキスト', 'ログ'],
                    'operation': ['読み込み', '変換', '圧縮', '解凍', '暗号化', '復号化', 'マージ', '分割', 'read', 'convert', 'compress', 'extract', 'encrypt', 'decrypt', 'merge', 'split'],
                    'output': ['CSV', 'JSON', 'データベース', 'ファイル', 'メール', 'Slack'],
                    'tool': ['Python', 'subprocess', 'pathlib', 'shutil', 'schedule', 'cron'],
                    'feature': ['並列処理', 'エラーハンドリング', 'ログ記録', 'リトライ', 'プログレスバー', 'parallel processing', 'error handling', 'logging', 'retry', 'progress bar'],
                }
            },
            'network': {
                'templates': [
                    "{protocol}通信を{tool}で実装",
                    "{tool}で{feature}付き{protocol}クライアント",
                    "{protocol}サーバーに{feature}を追加",
                    "{tool}を使用した{operation}",
                    "非同期{protocol}通信の{action}",
                    "Implement {protocol} {type} using {tool}",
                    "{tool} {protocol} with {feature}",
                    "{protocol} communication with {feature} and {security}",
                    "Build {protocol} server with {tool} and {feature}",
                    "Async {protocol} {type} implementation",
                ],
                'params': {
                    'protocol': ['HTTP', 'WebSocket', 'TCP', 'UDP', 'gRPC', 'MQTT', 'SSH', 'FTP', 'DNS'],
                    'tool': ['socket', 'asyncio', 'aiohttp', 'requests', 'websockets', 'paramiko', 'scapy', 'twisted'],
                    'feature': ['再接続処理', 'タイムアウト', 'ハートビート', 'バッファリング', 'reconnect', 'timeout', 'heartbeat', 'buffering'],
                    'type': ['クライアント', 'サーバー', 'プロキシ', 'client', 'server', 'proxy'],
                    'operation': ['ポートスキャン', 'パケットキャプチャ', 'ネットワーク監視', 'トラフィック分析', 'port scan', 'packet capture', 'network monitoring', 'traffic analysis'],
                    'action': ['実装', '構築', 'implement', 'build'],
                    'security': ['SSL/TLS', '暗号化', '認証', 'encryption', 'authentication'],
                }
            },
        }

    def generate_samples(self, category: str, count: int) -> List[Tuple[str, str, float]]:
        """指定カテゴリーのサンプルを生成"""
        templates_data = self.templates[category]
        templates = templates_data['templates']
        params = templates_data['params']

        samples = []

        # テンプレート×パラメータの全組み合わせを生成
        for i in range(count):
            template = random.choice(templates)

            # テンプレート内のプレースホルダーを置換
            sample = template
            for key in params.keys():
                if '{' + key + '}' in sample:
                    value = random.choice(params[key])
                    sample = sample.replace('{' + key + '}', value, 1)

            # 信頼度をランダムに設定 (0.75-0.95)
            confidence = round(random.uniform(0.75, 0.95), 2)

            samples.append((sample, category, confidence))

        return samples

    def generate_all(self) -> List[Tuple[str, str, float]]:
        """全カテゴリーの訓練データを生成"""
        all_samples = []

        print("🔧 10万サンプル訓練データ生成開始...")
        print("=" * 60)

        for category, target_count in self.target_counts.items():
            print(f"📦 {category}: {target_count:,}サンプル生成中...", end=' ')
            samples = self.generate_samples(category, target_count)
            all_samples.extend(samples)
            print(f"✅ 完了 ({len(samples):,}件)")

        print("=" * 60)
        print(f"✅ 合計 {len(all_samples):,} サンプル生成完了")

        # シャッフル
        random.shuffle(all_samples)

        return all_samples

    def save_to_file(self, samples: List[Tuple[str, str, float]], filepath: str):
        """訓練データをJSONファイルに保存"""
        data = [
            {
                'command': cmd,
                'category': cat,
                'confidence': conf
            }
            for cmd, cat, conf in samples
        ]

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"\n💾 訓練データ保存完了: {filepath}")
        print(f"📊 ファイルサイズ: {len(json.dumps(data)) / 1024 / 1024:.2f} MB")


def main():
    """メイン実行"""
    generator = TrainingDataGenerator()

    # 10万サンプル生成
    samples = generator.generate_all()

    # カテゴリー別統計
    from collections import Counter
    category_counts = Counter([cat for _, cat, _ in samples])

    print("\n📊 カテゴリー別サンプル数:")
    for cat, count in sorted(category_counts.items()):
        print(f"   {cat:20s}: {count:6,}件")

    # 長さ統計
    lengths = [len(cmd) for cmd, _, _ in samples]
    print(f"\n📏 プロンプト長統計:")
    print(f"   最小: {min(lengths)}文字")
    print(f"   最大: {max(lengths)}文字")
    print(f"   平均: {sum(lengths)/len(lengths):.0f}文字")
    print(f"   中央値: {sorted(lengths)[len(lengths)//2]}文字")

    # ファイル保存
    generator.save_to_file(samples, 'training_data_100k.json')

    print("\n🎉 訓練データ生成完了!")
    print("次のステップ: python3 train_with_100k_data.py")


if __name__ == '__main__':
    random.seed(42)  # 再現性のためのシード固定
    main()
