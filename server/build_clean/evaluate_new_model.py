#!/usr/bin/env python3
"""
新モデルの評価スクリプト
実世界データでの精度を測定
"""

import json
import numpy as np
import joblib
import sys
import os

print("=" * 70)
print("🔍 Evaluating New ML Model")
print("=" * 70)

# モデル読み込み
MODEL_DIR = "/tmp/remoteclaude_models"
print(f"\n📂 Loading model from: {MODEL_DIR}")

try:
    classifier = joblib.load(f'{MODEL_DIR}/classifier.pkl')
    vectorizer = joblib.load(f'{MODEL_DIR}/vectorizer.pkl')
    with open(f'{MODEL_DIR}/categories.json', 'r', encoding='utf-8') as f:
        categories = json.load(f)
    with open(f'{MODEL_DIR}/metadata.json', 'r', encoding='utf-8') as f:
        metadata = json.load(f)

    print(f"✅ Model loaded: {metadata['model_type']}")
    print(f"✅ Training samples: {metadata['training_samples']:,}")
    print(f"✅ Training accuracy: {metadata['overall_accuracy']:.2f}%")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    sys.exit(1)

# テストデータ読み込み
print("\n📂 Loading test data...")
test_files = [
    'test_patterns_1000_filtered.json',
    'real_world_webapp_test_data.json',
]

all_test_data = []
for file in test_files:
    if os.path.exists(file):
        with open(file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            all_test_data.extend(data)
            print(f"✅ Loaded {len(data):,} test samples from {file}")

if len(all_test_data) == 0:
    print("⚠️  No test data found, creating sample test data...")
    all_test_data = [
        {"command": "Flaskでウェブアプリを作成してください", "category": "web_app"},
        {"command": "matplotlibでグラフを表示", "category": "visualization"},
        {"command": "pandasでCSVを読み込んで分析", "category": "data_analysis"},
        {"command": "Dockerコンテナを起動", "category": "docker"},
        {"command": "TensorFlowでモデル訓練", "category": "machine_learning"},
        {"command": "REST APIエンドポイント作成", "category": "api"},
        {"command": "ネットワーク接続確認", "category": "network"},
        {"command": "pytestでユニットテスト", "category": "general"},
        {"command": "CI/CDパイプライン構築", "category": "devops"},
    ]

print(f"✅ Total test samples: {len(all_test_data):,}")

# 評価実行
print("\n🔄 Running evaluation...")
commands = [item['command'] for item in all_test_data]
true_categories = [item['category'] for item in all_test_data]

# 予測
X_test = vectorizer.transform(commands)
pred_indices = classifier.predict(X_test)
probabilities = classifier.predict_proba(X_test)

# インデックスをカテゴリ名に変換
predictions = [categories[idx] if idx < len(categories) else 'unknown' for idx in pred_indices]

# 全体精度
correct = sum(1 for pred, true in zip(predictions, true_categories) if pred == true)
accuracy = correct / len(all_test_data) * 100

print(f"\n🎯 Overall Accuracy: {accuracy:.2f}%")
print(f"   Correct: {correct:,} / {len(all_test_data):,}")

# カテゴリ別精度
print("\n📊 Per-category accuracy:")
category_stats = {}
for pred, true, proba in zip(predictions, true_categories, probabilities):
    if true not in category_stats:
        category_stats[true] = {'total': 0, 'correct': 0, 'confidences': []}
    category_stats[true]['total'] += 1
    if pred == true:
        category_stats[true]['correct'] += 1
    # 信頼度を取得
    pred_idx = categories.index(pred) if pred in categories else 0
    category_stats[true]['confidences'].append(proba[pred_idx])

for cat in sorted(category_stats.keys()):
    stats = category_stats[cat]
    cat_accuracy = stats['correct'] / stats['total'] * 100
    avg_confidence = np.mean(stats['confidences']) * 100
    print(f"   {cat}: {cat_accuracy:.1f}% ({stats['correct']}/{stats['total']}) - Avg confidence: {avg_confidence:.1f}%")

# サンプル予測表示
print("\n🧪 Sample predictions:")
sample_size = min(20, len(all_test_data))
for i in range(sample_size):
    cmd = commands[i]
    pred = predictions[i]
    true = true_categories[i]
    pred_idx = categories.index(pred) if pred in categories else 0
    confidence = probabilities[i][pred_idx] * 100

    status = "✅" if pred == true else "❌"
    cmd_short = cmd[:50] + "..." if len(cmd) > 50 else cmd
    print(f"   {status} \"{cmd_short}\"")
    print(f"      Predicted: {pred} ({confidence:.1f}%) | True: {true}")

# 誤分類の分析
print("\n🔍 Misclassification analysis:")
misclassified = []
for i, (pred, true) in enumerate(zip(predictions, true_categories)):
    if pred != true:
        pred_idx = categories.index(pred) if pred in categories else 0
        misclassified.append({
            'command': commands[i],
            'predicted': pred,
            'true': true,
            'confidence': probabilities[i][pred_idx] * 100
        })

if misclassified:
    print(f"   Total misclassified: {len(misclassified)}")
    print(f"   Showing first 10:")
    for item in misclassified[:10]:
        cmd_short = item['command'][:50] + "..." if len(item['command']) > 50 else item['command']
        print(f"   - \"{cmd_short}\"")
        print(f"     Predicted: {item['predicted']} ({item['confidence']:.1f}%) | True: {item['true']}")
else:
    print("   🎉 No misclassifications!")

print("\n" + "=" * 70)
print("✅ Evaluation completed!")
print(f"🎯 Final Accuracy: {accuracy:.2f}%")
print("=" * 70)
