#!/usr/bin/env python3
"""
1000件テストパターン生成スクリプト
大規模評価用の多様な入力パターンを生成
"""

import json
import random

def generate_test_patterns():
    """1000件のテストパターンを生成"""

    patterns = []

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # カテゴリ1: Machine Learning (250件)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ml_frameworks = ["TensorFlow", "PyTorch", "Keras", "scikit-learn", "XGBoost"]
    ml_models = ["CNN", "LSTM", "ResNet", "BERT", "Transformer", "GAN", "VAE", "Autoencoder"]
    ml_tasks = ["画像分類", "物体検出", "自然言語処理", "音声認識", "時系列予測", "異常検知"]
    ml_datasets = ["MNIST", "CIFAR-10", "ImageNet", "COCO", "Wikipedia", "AudioSet"]

    for i in range(250):
        framework = random.choice(ml_frameworks)
        model = random.choice(ml_models)
        task = random.choice(ml_tasks)
        dataset = random.choice(ml_datasets)

        templates = [
            f"{framework}で{model}モデルを使って{task}を実装してください",
            f"{dataset}データセットを{framework}で訓練",
            f"{model}を{framework}で実装して精度を測定",
            f"{framework}を使用した{task}のための{model}",
            f"{task}タスク向けの{framework} {model}実装",
        ]

        command = random.choice(templates)
        patterns.append({
            "id": f"ml_{i+1}",
            "command": command,
            "category": "machine_learning",
            "framework": framework.lower(),
            "complexity": "high" if len(command) > 50 else "medium"
        })

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # カテゴリ2: Web App (200件)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    web_frameworks = ["React", "Vue", "Angular", "Next.js", "Svelte"]
    web_apps = ["Todo", "カレンダー", "チャット", "ダッシュボード", "ポートフォリオ", "ブログ"]
    web_features = ["認証", "リアルタイム更新", "レスポンシブ", "ダークモード", "多言語対応"]

    for i in range(200):
        framework = random.choice(web_frameworks)
        app = random.choice(web_apps)
        feature = random.choice(web_features)

        templates = [
            f"{framework}を使用して{app}アプリを作成してください",
            f"{framework}で{feature}機能付き{app}サイト",
            f"{app}Webアプリを{framework}で実装",
            f"{framework} + {feature}の{app}アプリケーション",
            f"{feature}対応の{framework} {app}アプリ",
        ]

        command = random.choice(templates)
        patterns.append({
            "id": f"web_{i+1}",
            "command": command,
            "category": "web_app",
            "framework": framework.lower().replace(".js", ""),
            "complexity": "medium"
        })

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # カテゴリ3: Visualization (150件)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    viz_libs = ["matplotlib", "seaborn", "plotly", "bokeh", "altair"]
    chart_types = ["折れ線グラフ", "棒グラフ", "散布図", "ヒートマップ", "ボックスプロット", "ヒストグラム"]
    data_types = ["時系列", "カテゴリ", "数値", "地理", "ネットワーク"]

    for i in range(150):
        lib = random.choice(viz_libs)
        chart = random.choice(chart_types)
        data = random.choice(data_types)

        templates = [
            f"{lib}で{chart}を作成してください",
            f"{data}データの{chart}を{lib}で可視化",
            f"{lib}を使った{chart}の実装",
            f"{chart}による{data}データ分析 ({lib})",
            f"{lib}で{data}データを{chart}表示",
        ]

        command = random.choice(templates)
        patterns.append({
            "id": f"viz_{i+1}",
            "command": command,
            "category": "visualization",
            "framework": lib,
            "complexity": "low"
        })

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # カテゴリ4: Data Analysis (150件)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    analysis_libs = ["pandas", "numpy", "dask", "polars"]
    operations = ["クレンジング", "集計", "統計分析", "相関分析", "欠損値処理", "外れ値検出"]
    formats = ["CSV", "Excel", "JSON", "Parquet", "SQLite"]

    for i in range(150):
        lib = random.choice(analysis_libs)
        op = random.choice(operations)
        fmt = random.choice(formats)

        templates = [
            f"{lib}で{fmt}データの{op}を実施",
            f"{fmt}ファイルを{lib}で{op}",
            f"{lib}を使用した{fmt}データの{op}",
            f"{op}を{lib}で実行 ({fmt}形式)",
            f"{lib}による{fmt}データ{op}",
        ]

        command = random.choice(templates)
        patterns.append({
            "id": f"data_{i+1}",
            "command": command,
            "category": "data_analysis",
            "framework": lib,
            "complexity": "medium"
        })

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # カテゴリ5: API (100件)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    api_frameworks = ["FastAPI", "Flask", "Django REST", "Express", "NestJS"]
    endpoints = ["ユーザー管理", "商品一覧", "認証", "ファイルアップロード", "通知"]
    features = ["CRUD操作", "JWT認証", "ページネーション", "キャッシング", "レート制限"]

    for i in range(100):
        framework = random.choice(api_frameworks)
        endpoint = random.choice(endpoints)
        feature = random.choice(features)

        templates = [
            f"{framework}で{endpoint}APIを作成",
            f"{framework}を使った{feature}付き{endpoint}エンドポイント",
            f"{endpoint}のREST APIを{framework}で実装",
            f"{framework} + {feature}の{endpoint}API",
            f"{feature}対応{endpoint}API ({framework})",
        ]

        command = random.choice(templates)
        patterns.append({
            "id": f"api_{i+1}",
            "command": command,
            "category": "api",
            "framework": framework.lower().replace(" rest", "").replace(".js", ""),
            "complexity": "high"
        })

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # カテゴリ6: Docker (50件)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    docker_tasks = ["イメージビルド", "コンテナ起動", "docker-compose設定", "マルチステージビルド"]
    services = ["PostgreSQL", "Redis", "MongoDB", "Nginx", "RabbitMQ"]

    for i in range(50):
        task = random.choice(docker_tasks)
        service = random.choice(services)

        templates = [
            f"Dockerで{service}の{task}",
            f"{service}コンテナを{task}",
            f"Docker {task} for {service}",
            f"{task}を使用した{service}のDocker環境構築",
        ]

        command = random.choice(templates)
        patterns.append({
            "id": f"docker_{i+1}",
            "command": command,
            "category": "docker",
            "framework": "docker",
            "complexity": "medium"
        })

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # カテゴリ7: Jupyter (50件)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    jupyter_tasks = ["データ探索", "可視化", "モデル訓練", "レポート作成", "インタラクティブ分析"]

    for i in range(50):
        task = random.choice(jupyter_tasks)

        templates = [
            f"Jupyter notebookで{task}",
            f"{task}をJupyter Labで実施",
            f"Jupyterを使った{task}",
            f"Notebook形式で{task}",
        ]

        command = random.choice(templates)
        patterns.append({
            "id": f"jupyter_{i+1}",
            "command": command,
            "category": "jupyter",
            "framework": "jupyter",
            "complexity": "low"
        })

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # カテゴリ8: General (50件)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    general_tasks = [
        "ファイル読み込みスクリプト",
        "データ処理パイプライン",
        "自動化スクリプト",
        "バッチ処理",
        "ログ解析",
        "設定ファイルパーサー",
    ]

    for i in range(50):
        task = random.choice(general_tasks)

        templates = [
            f"Pythonで{task}を作成",
            f"{task}の実装",
            f"{task}プログラム",
        ]

        command = random.choice(templates)
        patterns.append({
            "id": f"general_{i+1}",
            "command": command,
            "category": "general",
            "framework": "standard",
            "complexity": "low"
        })

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # エッジケース (50件)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    edge_cases = [
        # 短いコマンド
        "グラフ作成",
        "API作成",
        "モデル訓練",
        "データ分析",
        "アプリ作成",

        # 長いコマンド
        "TensorFlowとKerasを使用してMNISTデータセットで手書き数字認識のためのCNNモデルを構築し、訓練後に精度評価を実施してください。さらに、訓練履歴をmatplotlibでグラフ化し、混同行列も表示してください",
        "React.jsとTypeScriptを使用してレスポンシブデザインのTodoアプリケーションを作成してください。ローカルストレージでデータ永続化し、ダークモード対応、ドラッグ&ドロップ機能、フィルタリング機能を実装してください",

        # 曖昧なコマンド
        "何か作って",
        "プログラム書いて",
        "良い感じのやつ",

        # 複合コマンド
        "FlaskでREST APIを作成してReactでフロントエンド実装",
        "PandasでCSV読み込んでMatplotlibで可視化",
        "TensorFlowでモデル訓練してFastAPIでデプロイ",
    ]

    for i, cmd in enumerate(edge_cases[:50]):
        patterns.append({
            "id": f"edge_{i+1}",
            "command": cmd,
            "category": "unknown",  # 正解ラベルなし
            "framework": "mixed",
            "complexity": "variable"
        })

    return patterns

if __name__ == "__main__":
    patterns = generate_test_patterns()

    # JSONファイルに保存
    with open("test_patterns_1000.json", "w", encoding="utf-8") as f:
        json.dump(patterns, f, ensure_ascii=False, indent=2)

    # 統計情報表示
    print(f"✅ Generated {len(patterns)} test patterns")
    print("\nCategory distribution:")

    from collections import Counter
    categories = Counter(p["category"] for p in patterns)
    for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        print(f"  {cat}: {count}")

    print(f"\n💾 Saved to: test_patterns_1000.json")
