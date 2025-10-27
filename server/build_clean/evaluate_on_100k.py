#!/usr/bin/env python3
"""
10万件大規模テストデータでの評価
LightGBMモデル対応
"""

import json
import sys
import time
import numpy as np
import joblib
import os

print("=" * 70)
print("🔬 Large-Scale Evaluation (100k samples)")
print("=" * 70)

# LightGBM
import lightgbm as lgb

# テストデータ読み込み
test_file = sys.argv[1] if len(sys.argv) > 1 else 'test_data_100k_large_scale.json'
print(f"\n📂 Loading test data: {test_file}")

with open(test_file, 'r', encoding='utf-8') as f:
    test_data = json.load(f)

print(f"✅ Loaded {len(test_data):,} test samples")

# モデル読み込み
model_dir = "/tmp/remoteclaude_models_high_accuracy"
print(f"\n📦 Loading models from: {model_dir}")

classifier = joblib.load(os.path.join(model_dir, "classifier.pkl"))
vectorizer = joblib.load(os.path.join(model_dir, "vectorizer.pkl"))
feature_extractor = joblib.load(os.path.join(model_dir, "feature_extractor.pkl"))

with open(os.path.join(model_dir, "categories.json"), 'r') as f:
    categories = json.load(f)

print(f"✅ Models loaded: {len(categories)} categories")

# バッチ評価（高速化）
print(f"\n🔄 Evaluating on {len(test_data):,} samples...")
print("   (Using batch processing for speed)")

start_time = time.time()

# バッチ特徴抽出
commands = [item['command'] for item in test_data]
expected_categories = [item['category'] for item in test_data]

# TF-IDF（バッチ）
print("\n   Extracting TF-IDF features...")
X_tfidf = vectorizer.transform(commands)

# 手作り特徴量（バッチ）
print("   Extracting engineered features...")
X_engineered = np.array([
    feature_extractor.extract_features(cmd)
    for cmd in commands
])

# 結合
X_combined = np.hstack([X_tfidf.toarray(), X_engineered])

# 予測（バッチ）
print("   Predicting...")
y_pred_proba = classifier.predict(X_combined)
y_pred_idx = np.argmax(y_pred_proba, axis=1)
predicted_categories = [categories[idx] for idx in y_pred_idx]

# 信頼度（最大確率）
confidences = np.max(y_pred_proba, axis=1)

total_time = time.time() - start_time
print(f"\n✅ Evaluation completed in {total_time:.1f}s")
print(f"   Throughput: {len(test_data) / total_time:.0f} samples/sec")

# 結果集計
results = []
correct = 0
total = 0

# タイプ別統計
type_stats = {}
scale_stats = {}
category_stats = {}

for i, (item, pred, conf) in enumerate(zip(test_data, predicted_categories, confidences)):
    expected = item['category']
    is_correct = (pred == expected)

    if is_correct:
        correct += 1
    total += 1

    # タイプ別
    item_type = item.get('type', 'unknown')
    if item_type not in type_stats:
        type_stats[item_type] = {'total': 0, 'correct': 0}
    type_stats[item_type]['total'] += 1
    if is_correct:
        type_stats[item_type]['correct'] += 1

    # スケール別
    scale = item.get('scale', 'unknown')
    if scale not in scale_stats:
        scale_stats[scale] = {'total': 0, 'correct': 0}
    scale_stats[scale]['total'] += 1
    if is_correct:
        scale_stats[scale]['correct'] += 1

    # カテゴリ別
    if expected not in category_stats:
        category_stats[expected] = {'total': 0, 'correct': 0}
    category_stats[expected]['total'] += 1
    if is_correct:
        category_stats[expected]['correct'] += 1

    # 最初の1000件のみ詳細保存（ファイルサイズ削減）
    if i < 1000:
        results.append({
            "id": item.get('id', f'test_{i}'),
            "command": item['command'][:200],  # 最大200文字
            "expected": expected,
            "predicted": pred,
            "confidence": float(conf),
            "is_correct": is_correct,
            "type": item_type,
            "scale": scale
        })

# 精度計算
accuracy = (correct / total * 100) if total > 0 else 0

# タイプ別精度
for typ, stats in type_stats.items():
    if stats['total'] > 0:
        stats['accuracy'] = stats['correct'] / stats['total'] * 100
    else:
        stats['accuracy'] = 0.0

# スケール別精度
for scale, stats in scale_stats.items():
    if stats['total'] > 0:
        stats['accuracy'] = stats['correct'] / stats['total'] * 100
    else:
        stats['accuracy'] = 0.0

# カテゴリ別精度
for cat, stats in category_stats.items():
    if stats['total'] > 0:
        stats['accuracy'] = stats['correct'] / stats['total'] * 100
    else:
        stats['accuracy'] = 0.0

# 結果表示
print("\n" + "=" * 70)
print("📊 EVALUATION SUMMARY")
print("=" * 70)

print(f"\n🎯 Overall Accuracy: {accuracy:.2f}% ({correct:,}/{total:,})")

if accuracy >= 80:
    print("\n🎉 ✅ TARGET ACHIEVED: 80%+ accuracy!")
elif accuracy >= 70:
    print("\n⚠️  Close to target (70-80%)")
else:
    print("\n❌ Below target (<70%)")

print(f"\n📊 Accuracy by Type:")
for typ in sorted(type_stats.keys()):
    stats = type_stats[typ]
    print(f"   {typ:20s}: {stats['accuracy']:6.2f}% ({stats['correct']:,}/{stats['total']:,})")

print(f"\n📊 Accuracy by Scale:")
for scale in sorted(scale_stats.keys()):
    stats = scale_stats[scale]
    print(f"   {scale:20s}: {stats['accuracy']:6.2f}% ({stats['correct']:,}/{stats['total']:,})")

print(f"\n📊 Accuracy by Category:")
for cat in sorted(category_stats.keys()):
    stats = category_stats[cat]
    print(f"   {cat:20s}: {stats['accuracy']:6.2f}% ({stats['correct']:,}/{stats['total']:,})")

# レポート保存
output_file = "evaluation_100k_report.json"
report = {
    "test_file": test_file,
    "model_dir": model_dir,
    "total_tests": total,
    "correct": correct,
    "accuracy": accuracy,
    "evaluation_time_seconds": total_time,
    "throughput_samples_per_sec": len(test_data) / total_time,
    "type_stats": type_stats,
    "scale_stats": scale_stats,
    "category_stats": category_stats,
    "results_sample": results  # 最初の1000件のみ
}

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2, ensure_ascii=False)

print(f"\n💾 Report saved to: {output_file}")
print("=" * 70)
