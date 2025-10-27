#!/usr/bin/env python3
"""
完全自己完結型モデル訓練スクリプト
既存の訓練データを使用してゼロからモデルを構築
"""

import json
import numpy as np
import joblib
import sys
import os
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
import time

print("=" * 70)
print("🚀 Training ML Model from Scratch")
print("=" * 70)

# モデル保存先
MODEL_DIR = "/tmp/remoteclaude_models"
os.makedirs(MODEL_DIR, exist_ok=True)

# 1. 訓練データ読み込み
print("\n📂 Loading training data...")
data_files = [
    'training_data_final_106k.json',
    'training_data_refined_106k.json',
]

all_training_data = []
for file in data_files:
    if os.path.exists(file):
        with open(file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            all_training_data.extend(data)
            print(f"✅ Loaded {len(data):,} samples from {file}")

print(f"✅ Total training data: {len(all_training_data):,} samples")

if len(all_training_data) == 0:
    print("❌ No training data found!")
    sys.exit(1)

# 2. データ準備
commands = [item['command'] for item in all_training_data]
categories = [item['category'] for item in all_training_data]

# カテゴリをインデックスに
category_list = sorted(list(set(categories)))
category_to_idx = {cat: idx for idx, cat in enumerate(category_list)}
y = np.array([category_to_idx[cat] for cat in categories])

print(f"\n✅ Categories ({len(category_list)}): {category_list}")

# カテゴリ分布
category_counts = {}
for cat in categories:
    category_counts[cat] = category_counts.get(cat, 0) + 1

print("\n📊 Category distribution:")
for cat in sorted(category_counts.keys()):
    print(f"   {cat}: {category_counts[cat]:,} samples ({category_counts[cat]/len(categories)*100:.1f}%)")

# 3. 特徴抽出 - TF-IDF
print("\n🔄 Extracting TF-IDF features...")
start_time = time.time()

vectorizer = TfidfVectorizer(
    max_features=2000,
    ngram_range=(1, 5),
    analyzer='char_wb',
    max_df=0.95,
    min_df=3,
    sublinear_tf=True
)
X = vectorizer.fit_transform(commands)
print(f"✅ TF-IDF features: {X.shape} ({time.time() - start_time:.1f}s)")

# 4. 訓練/テスト分割
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.15, random_state=42, stratify=y
)

print(f"\n✅ Train: {X_train.shape[0]:,} samples")
print(f"✅ Test: {X_test.shape[0]:,} samples")

# 5. モデル訓練 - Random Forest
print("\n🔄 Training Random Forest classifier...")
start_time = time.time()

classifier = RandomForestClassifier(
    n_estimators=200,
    max_depth=30,
    min_samples_split=5,
    min_samples_leaf=2,
    max_features='sqrt',
    n_jobs=-1,
    random_state=42,
    verbose=1
)

classifier.fit(X_train, y_train)
training_time = time.time() - start_time
print(f"\n✅ Training completed in {training_time:.1f}s")

# 6. 精度評価
print("\n🔄 Evaluating model...")
y_pred = classifier.predict(X_test)
accuracy = (y_pred == y_test).mean() * 100

print(f"\n🎯 Overall Test Accuracy: {accuracy:.2f}%")
print(f"   Correct: {(y_pred == y_test).sum():,} / {len(y_test):,}")

# カテゴリ別精度
print("\n📊 Per-category accuracy:")
for i, cat in enumerate(category_list):
    cat_mask = y_test == i
    if cat_mask.sum() > 0:
        cat_acc = (y_pred[cat_mask] == y_test[cat_mask]).mean() * 100
        print(f"   {cat}: {cat_acc:.1f}% ({cat_mask.sum()} samples)")

# 7. モデル保存
print(f"\n💾 Saving models to: {MODEL_DIR}")

joblib.dump(classifier, f'{MODEL_DIR}/classifier.pkl')
joblib.dump(vectorizer, f'{MODEL_DIR}/vectorizer.pkl')

with open(f'{MODEL_DIR}/categories.json', 'w', encoding='utf-8') as f:
    json.dump(category_list, f, ensure_ascii=False)

# メタデータ
metadata = {
    'model_type': 'RandomForest',
    'training_samples': len(all_training_data),
    'feature_dimensions': X.shape[1],
    'categories': category_list,
    'overall_accuracy': accuracy,
    'training_time_seconds': training_time,
    'n_estimators': 200,
    'max_depth': 30,
}

with open(f'{MODEL_DIR}/metadata.json', 'w', encoding='utf-8') as f:
    json.dump(metadata, f, indent=2, ensure_ascii=False)

print("\n✅ Model files saved:")
print(f"   - classifier.pkl")
print(f"   - vectorizer.pkl")
print(f"   - categories.json")
print(f"   - metadata.json")

print("\n" + "=" * 70)
print("✅ Model training completed successfully!")
print(f"🎯 Overall Accuracy: {accuracy:.2f}%")
print("=" * 70)

# 8. 簡単なテスト
print("\n🧪 Quick test:")
test_commands = [
    "Flaskでウェブアプリを作成",
    "matplotlibでグラフ表示",
    "pandasでデータ分析",
    "Dockerコンテナを起動",
]

for cmd in test_commands:
    X_test_cmd = vectorizer.transform([cmd])
    pred_idx = classifier.predict(X_test_cmd)[0]
    pred_cat = category_list[pred_idx]
    proba = classifier.predict_proba(X_test_cmd)[0]
    confidence = proba[pred_idx] * 100
    print(f"   \"{cmd}\" -> {pred_cat} ({confidence:.1f}%)")
