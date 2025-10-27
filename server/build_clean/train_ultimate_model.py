#!/usr/bin/env python3
"""
究極モデル訓練（目標: 80%+）
- 再ラベリングデータ: 106k
- 改善データ: 50k
- 合計: 156k
- Sentence-BERT統合 (384次元)
- LightGBM
"""

import json
import numpy as np
import joblib
import sys
import os
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
import time

print("=" * 70)
print("🚀 Ultimate Model Training (Target: 80%+)")
print("=" * 70)

# Sentence-BERT インストール
try:
    from sentence_transformers import SentenceTransformer
    print("✅ sentence-transformers available")
except ImportError:
    print("⚠️  sentence-transformers not found, installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "sentence-transformers"])
    from sentence_transformers import SentenceTransformer

import lightgbm as lgb

# モデル保存先
MODEL_DIR = "/tmp/remoteclaude_models_ultimate"
os.makedirs(MODEL_DIR, exist_ok=True)

# 1. データ統合
print("\n📂 Loading and merging training data...")

# 再ラベリングデータ
with open('training_data_refined_106k.json', 'r', encoding='utf-8') as f:
    refined_data = json.load(f)
print(f"✅ Refined data: {len(refined_data):,}")

# 改善データ
with open('improvement_data_50k.json', 'r', encoding='utf-8') as f:
    improvement_data = json.load(f)
print(f"✅ Improvement data: {len(improvement_data):,}")

# 統合
all_training_data = refined_data + improvement_data
print(f"✅ Total training data: {len(all_training_data):,} samples")

# 2. 特徴抽出準備
commands = [item['command'] for item in all_training_data]
categories = [item['category'] for item in all_training_data]

# カテゴリをインデックスに
category_list = sorted(list(set(categories)))
category_to_idx = {cat: idx for idx, cat in enumerate(category_list)}
y = np.array([category_to_idx[cat] for cat in categories])

print(f"\n✅ Categories ({len(category_list)}): {category_list}")

# 3. TF-IDF特徴
print("\n🔄 Extracting TF-IDF features...")
start_time = time.time()

vectorizer = TfidfVectorizer(
    max_features=1500,
    ngram_range=(1, 5),
    analyzer='char_wb',
    max_df=0.95,
    min_df=3,
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

# 5. Sentence-BERT特徴
print("\n🔄 Extracting Sentence-BERT embeddings...")
print("   Loading model: all-MiniLM-L6-v2 (multilingual)")
start_time = time.time()

# 軽量な多言語モデル
sbert_model = SentenceTransformer('all-MiniLM-L6-v2')

# バッチエンコーディング（高速化）
batch_size = 256
embeddings_list = []

for i in range(0, len(commands), batch_size):
    batch = commands[i:i+batch_size]
    batch_embeddings = sbert_model.encode(batch, show_progress_bar=False)
    embeddings_list.append(batch_embeddings)

    if (i // batch_size + 1) % 100 == 0:
        print(f"   Processed {i+len(batch):,}/{len(commands):,} samples...")

X_sbert = np.vstack(embeddings_list)
print(f"✅ Sentence-BERT: {X_sbert.shape} ({time.time() - start_time:.1f}s)")

# 6. 全特徴結合
X_combined = np.hstack([
    X_tfidf.toarray(),  # 1500
    X_engineered,       # 220
    X_sbert             # 384
])
print(f"\n✅ Combined features: {X_combined.shape}")
print(f"   - TF-IDF: 1500")
print(f"   - Engineered: 220")
print(f"   - Sentence-BERT: 384")
print(f"   - Total: {X_combined.shape[1]}")

# 7. 訓練/テスト分割
X_train, X_test, y_train, y_test = train_test_split(
    X_combined, y, test_size=0.15, random_state=42, stratify=y
)

print(f"\n✅ Train: {X_train.shape[0]:,} samples")
print(f"✅ Test: {X_test.shape[0]:,} samples")

# 8. LightGBM訓練
print("\n🔄 Training ultimate LightGBM classifier...")
start_time = time.time()

train_data = lgb.Dataset(X_train, label=y_train)
test_data = lgb.Dataset(X_test, label=y_test, reference=train_data)

params = {
    'objective': 'multiclass',
    'num_class': len(category_list),
    'metric': 'multi_logloss',
    'boosting_type': 'gbdt',
    'num_leaves': 127,  # より複雑なモデル
    'learning_rate': 0.05,
    'feature_fraction': 0.9,
    'bagging_fraction': 0.8,
    'bagging_freq': 5,
    'verbose': 0,
    'num_threads': -1,
    'min_data_in_leaf': 20,
}

classifier = lgb.train(
    params,
    train_data,
    num_boost_round=1000,
    valid_sets=[test_data],
    callbacks=[lgb.early_stopping(stopping_rounds=100), lgb.log_evaluation(100)]
)

training_time = time.time() - start_time
print(f"\n✅ Training completed in {training_time:.1f}s")

# 9. 内部精度評価
y_pred = np.argmax(classifier.predict(X_test), axis=1)
accuracy = (y_pred == y_test).mean() * 100

print(f"\n🎯 Internal Test Accuracy: {accuracy:.2f}%")
print(f"   Correct: {(y_pred == y_test).sum():,} / {len(y_test):,}")

if accuracy >= 99:
    print("   ✅ Excellent internal accuracy!")
elif accuracy >= 95:
    print("   ✅ Good internal accuracy")
else:
    print("   ⚠️  Lower than expected")

# 10. モデル保存
print(f"\n💾 Saving models to: {MODEL_DIR}")

joblib.dump(classifier, f'{MODEL_DIR}/classifier.pkl')
joblib.dump(vectorizer, f'{MODEL_DIR}/vectorizer.pkl')
joblib.dump(feature_extractor, f'{MODEL_DIR}/feature_extractor.pkl')
joblib.dump(sbert_model, f'{MODEL_DIR}/sbert_model.pkl')

with open(f'{MODEL_DIR}/categories.json', 'w', encoding='utf-8') as f:
    json.dump(category_list, f, ensure_ascii=False)

# メタデータ
metadata = {
    'model_type': 'LightGBM + Sentence-BERT',
    'training_samples': len(all_training_data),
    'feature_dimensions': X_combined.shape[1],
    'tfidf_dimensions': 1500,
    'engineered_dimensions': 220,
    'sbert_dimensions': 384,
    'categories': category_list,
    'internal_accuracy': accuracy,
    'training_time_seconds': training_time,
    'target_accuracy': '80%+',
}

with open(f'{MODEL_DIR}/metadata.json', 'w', encoding='utf-8') as f:
    json.dump(metadata, f, indent=2, ensure_ascii=False)

print("\n✅ Model files saved:")
print(f"   - classifier.pkl")
print(f"   - vectorizer.pkl")
print(f"   - feature_extractor.pkl")
print(f"   - sbert_model.pkl")
print(f"   - categories.json")
print(f"   - metadata.json")

print("\n" + "=" * 70)
print("✅ Ultimate model training completed!")
print(f"🎯 Ready for 100k evaluation targeting 80%+ accuracy")
print("=" * 70)
