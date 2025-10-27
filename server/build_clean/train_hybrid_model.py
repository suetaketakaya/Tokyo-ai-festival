#!/usr/bin/env python3
"""
Hybrid Model Training with Enhanced Features
ハイブリッドモデル訓練: TF-IDF (1000) + エンジニアリング特徴 (220) = 1220次元
"""

import json
import time
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os
from enhanced_feature_extractor import EnhancedFeatureExtractor

print("=" * 70)
print("🚀 Hybrid ML Model Training System")
print("=" * 70)

# 訓練データ読み込み
print("\n📂 Loading training data...")
start_time = time.time()

with open('training_data_hybrid_101k.json', 'r', encoding='utf-8') as f:
    training_data = json.load(f)

print(f"✅ Loaded {len(training_data):,} samples ({time.time()-start_time:.1f}s)")

# データ準備
commands = [item['command'] for item in training_data]
categories = [item['category'] for item in training_data]
confidences = [item['confidence'] for item in training_data]

# カテゴリーマッピング
unique_categories = sorted(list(set(categories)))
category_to_idx = {cat: idx for idx, cat in enumerate(unique_categories)}
y = np.array([category_to_idx[cat] for cat in categories])

print(f"\n📊 Data Statistics:")
print(f"   Categories: {len(unique_categories)}")
print(f"   Categories: {unique_categories}")

from collections import Counter
cat_counts = Counter(categories)
for cat in sorted(cat_counts.keys()):
    print(f"   {cat:20s}: {cat_counts[cat]:6,} samples")

# ============================================================
# Part 1: TF-IDF Features (1000 dims)
# ============================================================
print("\n🔧 Extracting TF-IDF features (1000 dims)...")
start_time = time.time()

vectorizer = TfidfVectorizer(
    max_features=1000,
    ngram_range=(1, 5),
    analyzer='char_wb',
    max_df=0.95,
    min_df=5,
    sublinear_tf=True
)

X_tfidf = vectorizer.fit_transform(commands)
print(f"✅ TF-IDF complete: {X_tfidf.shape} ({time.time()-start_time:.1f}s)")

# ============================================================
# Part 2: Engineered Features (220 dims)
# ============================================================
print("\n🔧 Extracting engineered features (220 dims)...")
start_time = time.time()

feature_extractor = EnhancedFeatureExtractor()

X_engineered = []
for i, (cmd, cat) in enumerate(zip(commands, categories)):
    if (i + 1) % 10000 == 0:
        print(f"   Processed {i+1:,}/{len(commands):,} samples...")
    features = feature_extractor.extract_features(cmd, cat)
    X_engineered.append(features)

X_engineered = np.array(X_engineered)
print(f"✅ Engineered features: {X_engineered.shape} ({time.time()-start_time:.1f}s)")

# ============================================================
# Part 3: Combine Features (1220 dims)
# ============================================================
print("\n🔗 Combining features...")
start_time = time.time()

X_combined = np.hstack([X_tfidf.toarray(), X_engineered])
print(f"✅ Combined shape: {X_combined.shape} ({time.time()-start_time:.1f}s)")

# ============================================================
# Part 4: Train/Test Split
# ============================================================
print("\n📊 Splitting train/test data...")
X_train, X_test, y_train, y_test, conf_train, conf_test = train_test_split(
    X_combined, y, confidences, test_size=0.2, random_state=42, stratify=y
)
print(f"   Training: {X_train.shape[0]:,} samples")
print(f"   Testing:  {X_test.shape[0]:,} samples")

# ============================================================
# Part 5: Train Classifier
# ============================================================
print("\n🎓 Training RandomForestClassifier...")
print("   (This may take several minutes with 101k samples and 1220 features)")
start_time = time.time()

classifier = RandomForestClassifier(
    n_estimators=200,
    max_depth=20,
    random_state=42,
    min_samples_split=10,
    min_samples_leaf=5,
    n_jobs=-1,
    verbose=1
)

classifier.fit(X_train, y_train)
training_time = time.time() - start_time
print(f"✅ Training complete ({training_time:.1f}s = {training_time/60:.1f}min)")

# ============================================================
# Part 6: Evaluate
# ============================================================
print("\n📊 Evaluating model...")
y_pred = classifier.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"\n🎯 Test Accuracy: {accuracy*100:.2f}%")

# Category-wise performance
print("\n📊 Category-wise Performance:")
print(classification_report(
    y_test, y_pred,
    target_names=unique_categories,
    digits=3
))

# ============================================================
# Part 7: Train Confidence Estimator
# ============================================================
print("\n🎓 Training GradientBoostingRegressor (confidence)...")
start_time = time.time()

confidence_estimator = GradientBoostingRegressor(
    n_estimators=100,
    max_depth=5,
    random_state=42,
    learning_rate=0.1,
    verbose=1
)

confidence_estimator.fit(X_train, conf_train)
print(f"✅ Confidence estimator trained ({time.time()-start_time:.1f}s)")

# ============================================================
# Part 8: Save Models
# ============================================================
print("\n💾 Saving models...")
model_dir = "/tmp/remoteclaude_models_hybrid"
os.makedirs(model_dir, exist_ok=True)

joblib.dump(classifier, os.path.join(model_dir, "classifier.pkl"))
joblib.dump(confidence_estimator, os.path.join(model_dir, "confidence_estimator.pkl"))
joblib.dump(vectorizer, os.path.join(model_dir, "vectorizer.pkl"))
joblib.dump(feature_extractor, os.path.join(model_dir, "feature_extractor.pkl"))

# Save categories
with open(os.path.join(model_dir, "categories.json"), 'w') as f:
    json.dump(unique_categories, f)

print(f"✅ Models saved to: {model_dir}")

# ============================================================
# Final Summary
# ============================================================
print("\n" + "=" * 70)
print("🎉 Training Complete Summary")
print("=" * 70)
print(f"📊 Training Data: {len(training_data):,} samples")
print(f"📊 Test Data: {len(y_test):,} samples")
print(f"🎯 Test Accuracy: {accuracy*100:.2f}%")
print(f"⏱️  Total Training Time: {training_time/60:.1f}min")
print(f"📁 Model Directory: {model_dir}")
print(f"📐 Feature Dimensions: 1220 (TF-IDF 1000 + Engineered 220)")
print("=" * 70)

print("\n✨ Next Steps:")
print("  1. Evaluate on real-world test data (148 samples)")
print("  2. Compare with baseline (pure TF-IDF) model")
print("  3. Analyze improvement on short text (<150 chars)")
