#!/usr/bin/env python3
"""
サーバー統合テスト
RemoteClaude サーバーがMLモデルを正しく読み込めるかテスト
"""

import json
import numpy as np
import joblib
import sys
import os

print("=" * 70)
print("🔌 Testing Server Integration with ML Model")
print("=" * 70)

# 1. モデル読み込みテスト
MODEL_DIR = "/tmp/remoteclaude_models"
print(f"\n📂 Testing model loading from: {MODEL_DIR}")

try:
    classifier = joblib.load(f'{MODEL_DIR}/classifier.pkl')
    vectorizer = joblib.load(f'{MODEL_DIR}/vectorizer.pkl')

    with open(f'{MODEL_DIR}/categories.json', 'r', encoding='utf-8') as f:
        categories = json.load(f)

    with open(f'{MODEL_DIR}/metadata.json', 'r', encoding='utf-8') as f:
        metadata = json.load(f)

    print("✅ All model files loaded successfully")
    print(f"   - Classifier: {metadata['model_type']}")
    print(f"   - Categories: {len(categories)}")
    print(f"   - Features: {metadata['feature_dimensions']}")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    sys.exit(1)

# 2. 予測テスト（RemoteClaude実際のユースケース）
print("\n🧪 Testing predictions with real RemoteClaude use cases:")

test_cases = [
    {
        "command": "Flaskでウェブアプリを作成してください",
        "expected": "web_app",
        "description": "Flask web app creation"
    },
    {
        "command": "matplotlibでグラフを表示してプレビュー",
        "expected": "visualization",
        "description": "Matplotlib visualization with preview"
    },
    {
        "command": "pandasでCSVファイルを読み込んで分析",
        "expected": "data_analysis",
        "description": "Pandas data analysis"
    },
    {
        "command": "Dockerコンテナを起動してアプリを実行",
        "expected": "docker",
        "description": "Docker container execution"
    },
    {
        "command": "TensorFlowで画像分類モデルを訓練",
        "expected": "machine_learning",
        "description": "TensorFlow ML training"
    },
    {
        "command": "REST APIエンドポイントを作成",
        "expected": "api",
        "description": "REST API creation"
    },
    {
        "command": "ネットワーク接続を確認",
        "expected": "network",
        "description": "Network connection check"
    },
    {
        "command": "pytestでユニットテストを実行",
        "expected": "general",
        "description": "Unit testing"
    },
    {
        "command": "React.jsを使用してシングルページアプリケーションを作成してください。Todo管理機能付きで、タスクの追加・削除・完了マークができるようにしてください。",
        "expected": "web_app",
        "description": "Complex React Todo app (from real RemoteClaude usage)"
    },
]

correct = 0
total = len(test_cases)

for i, test in enumerate(test_cases, 1):
    # 予測
    X = vectorizer.transform([test['command']])
    pred_idx = classifier.predict(X)[0]
    prediction = categories[pred_idx]
    proba = classifier.predict_proba(X)[0]
    confidence = proba[pred_idx] * 100

    # 結果判定
    is_correct = prediction == test['expected']
    if is_correct:
        correct += 1
        status = "✅"
    else:
        status = "❌"

    # 表示
    cmd_short = test['command'][:60] + "..." if len(test['command']) > 60 else test['command']
    print(f"\n{i}. {status} {test['description']}")
    print(f"   Command: \"{cmd_short}\"")
    print(f"   Predicted: {prediction} ({confidence:.1f}%)")
    print(f"   Expected: {test['expected']}")

    if not is_correct:
        print(f"   ⚠️  Mismatch detected!")

# 3. 統計サマリー
accuracy = correct / total * 100
print("\n" + "=" * 70)
print(f"🎯 Integration Test Results: {correct}/{total} ({accuracy:.1f}%)")
print("=" * 70)

if accuracy >= 80:
    print("✅ Integration test PASSED - Model is ready for server deployment")
else:
    print("⚠️  Integration test MARGINAL - Consider model improvements")

# 4. パフォーマンステスト
print("\n⏱️  Performance test:")
import time

num_predictions = 100
start_time = time.time()

for _ in range(num_predictions):
    X = vectorizer.transform(["Flaskでウェブアプリを作成"])
    _ = classifier.predict(X)
    _ = classifier.predict_proba(X)

elapsed = time.time() - start_time
avg_time_ms = (elapsed / num_predictions) * 1000

print(f"   {num_predictions} predictions in {elapsed:.2f}s")
print(f"   Average: {avg_time_ms:.2f}ms per prediction")

if avg_time_ms < 50:
    print("   ✅ Performance EXCELLENT (<50ms)")
elif avg_time_ms < 100:
    print("   ✅ Performance GOOD (<100ms)")
else:
    print("   ⚠️  Performance ACCEPTABLE but consider optimization")

# 5. メモリ使用量
print("\n💾 Memory footprint:")
import subprocess
result = subprocess.run(['ls', '-lh', MODEL_DIR], capture_output=True, text=True)
print(result.stdout)

print("\n" + "=" * 70)
print("✅ Server integration test completed!")
print("=" * 70)
