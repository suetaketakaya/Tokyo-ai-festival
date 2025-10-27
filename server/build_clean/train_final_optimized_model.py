#!/usr/bin/env python3
"""
最終最適化モデル訓練（実用的アプローチ）
- Sentence-BERT省略（時間短縮）
- TF-IDF + 手作り特徴量のみ
- 156kサンプル
- LightGBM最適化
"""

import json
import numpy as np
import joblib
import sys
import os
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
import time
import lightgbm as lgb

print("=" * 70)
print("🚀 Final Optimized Model Training (Target: 80%+)")
print("=" * 70)

# モデル保存先
MODEL_DIR = "/tmp/remoteclaude_models_final_optimized"
os.makedirs(MODEL_DIR, exist_ok=True)

# 1. データ統合
print("\n📂 Loading and merging training data...")

with open('training_data_refined_106k.json', 'r', encoding='utf-8') as f:
    refined_data = json.load(f)
print(f"✅ Refined data: {len(refined_data):,}")

with open('improvement_data_50k.json', 'r', encoding='utf-8') as f:
    improvement_data = json.load(f)
print(f"✅ Improvement data: {len(improvement_data):,}")

all_training_data = refined_data + improvement_data
print(f"✅ Total training data: {len(all_training_data):,} samples")

# 2. 特徴抽出
commands = [item['command'] for item in all_training_data]
categories = [item['category'] for item in all_training_data]

category_list = sorted(list(set(categories)))
category_to_idx = {cat: idx for idx, cat in enumerate(category_list)}
y = np.array([category_to_idx[cat] for cat in categories])

print(f"\n✅ Categories ({len(category_list)}): {category_list}")

# 3. TF-IDF（より高次元）
print("\n🔄 Extracting TF-IDF features...")
start_time = time.time()

vectorizer = TfidfVectorizer(
    max_features=2000,  # 1500 → 2000 に増加
    ngram_range=(1, 6),  # (1,5) → (1,6) に拡張
    analyzer='char_wb',
    max_df=0.95,
    min_df=2,  # 3 → 2 に緩和
    sublinear_tf=True
)
X_tfidf = vectorizer.fit_transform(commands)
print(f"✅ TF-IDF: {X_tfidf.shape} ({time.time() - start_time:.1f}s)")

# 4. 手作り特徴量
print("\n🔄 Extracting engineered features...")
start_time = time.time()

sys.path.insert(0, '/tmp/remoteclaude_models_final')
feature_extractor = joblib.load('/tmp/remoteclaude_models_final/feature_extractor.pkl')

X_engineered = np.array([
    feature_extractor.extract_features(cmd, cat)
    for cmd, cat in zip(commands, categories)
])
print(f"✅ Engineered: {X_engineered.shape} ({time.time() - start_time:.1f}s)")

# 5. 結合
X_combined = np.hstack([X_tfidf.toarray(), X_engineered])
print(f"\n✅ Combined features: {X_combined.shape}")

# 6. 訓練/テスト分割
X_train, X_test, y_train, y_test = train_test_split(
    X_combined, y, test_size=0.15, random_state=42, stratify=y
)

print(f"\n✅ Train: {X_train.shape[0]:,} samples")
print(f"✅ Test: {X_test.shape[0]:,} samples")

# 7. LightGBM訓練（ハイパーパラメータ最適化）
print("\n🔄 Training optimized LightGBM classifier...")
start_time = time.time()

train_data = lgb.Dataset(X_train, label=y_train)
test_data = lgb.Dataset(X_test, label=y_test, reference=train_data)

params = {
    'objective': 'multiclass',
    'num_class': len(category_list),
    'metric': 'multi_logloss',
    'boosting_type': 'gbdt',
    'num_leaves': 255,  # 127 → 255 に増加
    'learning_rate': 0.03,  # 0.05 → 0.03 に低下（過学習防止）
    'feature_fraction': 0.85,  # 0.9 → 0.85
    'bagging_fraction': 0.85,  # 0.8 → 0.85
    'bagging_freq': 5,
    'max_depth': 15,  # 深さ制限追加
    'min_data_in_leaf': 15,
    'lambda_l1': 0.1,  # L1正則化
    'lambda_l2': 0.1,  # L2正則化
    'verbose': 0,
    'num_threads': -1,
}

classifier = lgb.train(
    params,
    train_data,
    num_boost_round=1500,  # 1000 → 1500
    valid_sets=[test_data],
    callbacks=[lgb.early_stopping(stopping_rounds=150), lgb.log_evaluation(100)]
)

training_time = time.time() - start_time
print(f"\n✅ Training completed in {training_time:.1f}s")

# 8. 内部精度評価
y_pred = np.argmax(classifier.predict(X_test), axis=1)
accuracy = (y_pred == y_test).mean() * 100

print(f"\n🎯 Internal Test Accuracy: {accuracy:.2f}%")
print(f"   Correct: {(y_pred == y_test).sum():,} / {len(y_test):,}")

# カテゴリ別精度
print(f"\n📊 Category-wise Accuracy:")
for idx, cat in enumerate(category_list):
    cat_mask = y_test == idx
    if cat_mask.sum() > 0:
        cat_acc = (y_pred[cat_mask] == y_test[cat_mask]).mean() * 100
        print(f"   {cat:20s}: {cat_acc:5.1f}% ({(y_pred[cat_mask] == y_test[cat_mask]).sum()}/{cat_mask.sum()})")

# 9. モデル保存
print(f"\n💾 Saving models to: {MODEL_DIR}")

joblib.dump(classifier, f'{MODEL_DIR}/classifier.pkl')
joblib.dump(vectorizer, f'{MODEL_DIR}/vectorizer.pkl')
joblib.dump(feature_extractor, f'{MODEL_DIR}/feature_extractor.pkl')

with open(f'{MODEL_DIR}/categories.json', 'w', encoding='utf-8') as f:
    json.dump(category_list, f, ensure_ascii=False)

metadata = {
    'model_type': 'LightGBM Optimized',
    'training_samples': len(all_training_data),
    'feature_dimensions': X_combined.shape[1],
    'tfidf_dimensions': 2000,
    'engineered_dimensions': 220,
    'categories': category_list,
    'internal_accuracy': accuracy,
    'training_time_seconds': training_time,
}

with open(f'{MODEL_DIR}/metadata.json', 'w', encoding='utf-8') as f:
    json.dump(metadata, f, indent=2, ensure_ascii=False)

print("\n✅ Model files saved")
print("\n" + "=" * 70)
print("✅ Final optimized model training completed!")
print("=" * 70)
