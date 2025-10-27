#!/usr/bin/env python3
"""
10万サンプル大規模訓練データでのモデル訓練
"""

import json
import sys
import os
import time
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib

print("=" * 70)
print("🎓 RemoteClaudeOPS 大規模ML訓練システム")
print("=" * 70)

# 訓練データ読み込み
print("\n📂 訓練データ読み込み中...")
start_time = time.time()

with open('training_data_100k.json', 'r', encoding='utf-8') as f:
    training_data = json.load(f)

print(f"✅ {len(training_data):,}件のサンプル読み込み完了 ({time.time()-start_time:.1f}秒)")

# データ準備
commands = [item['command'] for item in training_data]
categories = [item['category'] for item in training_data]
confidences = [item['confidence'] for item in training_data]

# カテゴリーマッピング
unique_categories = sorted(list(set(categories)))
category_to_idx = {cat: idx for idx, cat in enumerate(unique_categories)}
y = np.array([category_to_idx[cat] for cat in categories])

print(f"\n📊 データ統計:")
print(f"   カテゴリー数: {len(unique_categories)}")
print(f"   カテゴリー: {unique_categories}")

from collections import Counter
cat_counts = Counter(categories)
for cat in sorted(cat_counts.keys()):
    print(f"   {cat:20s}: {cat_counts[cat]:6,}件")

# TF-IDF ベクトライゼーション
print("\n🔧 TF-IDF特徴抽出中...")
start_time = time.time()

vectorizer = TfidfVectorizer(
    max_features=1000,       # 10万サンプル用に1000次元に拡張
    ngram_range=(1, 5),
    analyzer='char_wb',
    max_df=0.95,
    min_df=5,                # 最低5回出現
    sublinear_tf=True
)

X_text = vectorizer.fit_transform(commands)
print(f"✅ TF-IDF完了: {X_text.shape} ({time.time()-start_time:.1f}秒)")

# 訓練/テスト分割
print("\n📊 訓練/テスト分割中...")
X_train, X_test, y_train, y_test, conf_train, conf_test = train_test_split(
    X_text, y, confidences, test_size=0.2, random_state=42, stratify=y
)
print(f"   訓練データ: {X_train.shape[0]:,}件")
print(f"   テストデータ: {X_test.shape[0]:,}件")

# モデル訓練
print("\n🎓 RandomForestClassifier訓練中...")
print("   (10万サンプルのため数分かかる場合があります)")
start_time = time.time()

classifier = RandomForestClassifier(
    n_estimators=200,        # 100→200に増加
    max_depth=20,            # 15→20に増加
    random_state=42,
    min_samples_split=10,    # 5→10に増加（過学習防止）
    min_samples_leaf=5,      # 追加（過学習防止）
    n_jobs=-1,               # 全CPUコア使用
    verbose=1                # 進捗表示
)

classifier.fit(X_train, y_train)
training_time = time.time() - start_time
print(f"✅ 訓練完了 ({training_time:.1f}秒 = {training_time/60:.1f}分)")

# 評価
print("\n📊 モデル評価中...")
y_pred = classifier.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"\n🎯 テストデータ精度: {accuracy*100:.2f}%")

# カテゴリー別詳細
print("\n📊 カテゴリー別性能:")
print(classification_report(
    y_test, y_pred,
    target_names=unique_categories,
    digits=3
))

# 信頼度推定モデル訓練
print("\n🎓 GradientBoostingRegressor (信頼度推定) 訓練中...")
start_time = time.time()

confidence_estimator = GradientBoostingRegressor(
    n_estimators=100,
    max_depth=5,
    random_state=42,
    learning_rate=0.1,
    verbose=1
)

# 信頼度用の訓練データは既にtrain_test_splitで分割済み
confidence_estimator.fit(X_train, conf_train)

print(f"✅ 信頼度推定モデル訓練完了 ({time.time()-start_time:.1f}秒)")

# モデル保存
print("\n💾 モデル保存中...")
model_dir = "/tmp/remoteclaude_models"
os.makedirs(model_dir, exist_ok=True)

joblib.dump(classifier, os.path.join(model_dir, "classifier.pkl"))
joblib.dump(confidence_estimator, os.path.join(model_dir, "confidence_estimator.pkl"))
joblib.dump(vectorizer, os.path.join(model_dir, "vectorizer.pkl"))

# カテゴリーマッピングも保存
with open(os.path.join(model_dir, "categories.json"), 'w') as f:
    json.dump(unique_categories, f)

print(f"✅ モデル保存完了: {model_dir}")

# 最終サマリ
print("\n" + "=" * 70)
print("🎉 訓練完了サマリー")
print("=" * 70)
print(f"📊 訓練データ: {len(training_data):,}件")
print(f"📊 テストデータ: {len(y_test):,}件")
print(f"🎯 テスト精度: {accuracy*100:.2f}%")
print(f"⏱️  総訓練時間: {training_time/60:.1f}分")
print(f"📁 モデル保存先: {model_dir}")
print("=" * 70)

print("\n次のステップ:")
print("  python3 evaluate_long_prompts.py test_long_prompts_100.json")
print("  または")
print("  python3 -c \"from wandb_local_model import RemoteClaudeMLModel; m = RemoteClaudeMLModel(); print(m.predict('TensorFlowでCNNモデルを訓練'))\"")
