#!/usr/bin/env python3
"""
Hybrid Model Evaluation on Real-World Data
ハイブリッドモデルの実世界データ評価
"""

import json
import sys
import time
import numpy as np
import joblib
import os

print("=" * 70)
print("🔬 Hybrid Model Evaluation")
print("=" * 70)

# Load test data
test_file = sys.argv[1] if len(sys.argv) > 1 else 'test_long_prompts_combined.json'
print(f"\n📂 Loading test data: {test_file}")

with open(test_file, 'r', encoding='utf-8') as f:
    test_data = json.load(f)

print(f"✅ Loaded {len(test_data)} test samples")

# Load models
model_dir = "/tmp/remoteclaude_models_hybrid"
print(f"\n📦 Loading models from: {model_dir}")

classifier = joblib.load(os.path.join(model_dir, "classifier.pkl"))
confidence_estimator = joblib.load(os.path.join(model_dir, "confidence_estimator.pkl"))
vectorizer = joblib.load(os.path.join(model_dir, "vectorizer.pkl"))
feature_extractor = joblib.load(os.path.join(model_dir, "feature_extractor.pkl"))

with open(os.path.join(model_dir, "categories.json"), 'r') as f:
    categories = json.load(f)

print(f"✅ Models loaded: {len(categories)} categories")

# Evaluate
results = []
correct = 0
total = 0

# Length buckets
length_buckets = {
    "short (<150)": {"total": 0, "correct": 0},
    "medium (150-300)": {"total": 0, "correct": 0},
    "long (300-500)": {"total": 0, "correct": 0},
    "very_long (500+)": {"total": 0, "correct": 0}
}

# Data source tracking
ai_generated = {"total": 0, "correct": 0}
real_world = {"total": 0, "correct": 0}

print("\n🔄 Evaluating...")

for i, item in enumerate(test_data, 1):
    command = item['command']
    expected = item['category']
    cmd_length = len(command)

    # Determine bucket
    if cmd_length < 150:
        bucket = "short (<150)"
    elif cmd_length < 300:
        bucket = "medium (150-300)"
    elif cmd_length < 500:
        bucket = "long (300-500)"
    else:
        bucket = "very_long (500+)"

    length_buckets[bucket]["total"] += 1

    # Track data source
    is_real_world = item['id'].startswith('realworld_')
    if is_real_world:
        real_world["total"] += 1
    else:
        ai_generated["total"] += 1

    # Extract features
    start_time = time.time()

    # TF-IDF
    X_tfidf = vectorizer.transform([command])

    # Engineered features
    X_engineered = feature_extractor.extract_features(command)
    X_engineered = X_engineered.reshape(1, -1)

    # Combine
    X_combined = np.hstack([X_tfidf.toarray(), X_engineered])

    # Predict
    predicted_idx = classifier.predict(X_combined)[0]
    predicted = categories[predicted_idx]

    # Confidence
    confidence = float(confidence_estimator.predict(X_combined)[0])
    confidence = max(0.0, min(1.0, confidence))

    latency_ms = (time.time() - start_time) * 1000

    is_correct = (predicted == expected)

    if is_correct:
        correct += 1
        length_buckets[bucket]["correct"] += 1
        if is_real_world:
            real_world["correct"] += 1
        else:
            ai_generated["correct"] += 1

    total += 1

    # Progress
    status = "✅" if is_correct else "❌"
    source = "[REAL]" if is_real_world else "[AI]  "
    print(f"{status} {source} [{i:3d}/{len(test_data)}] {bucket:20s} | "
          f"Expected: {expected:20s} | Predicted: {predicted:20s} | "
          f"Conf: {confidence:.2f} | {latency_ms:.0f}ms")

    results.append({
        "id": item['id'],
        "length": cmd_length,
        "expected": expected,
        "predicted": predicted,
        "confidence": confidence,
        "is_correct": is_correct,
        "latency_ms": latency_ms,
        "is_real_world": is_real_world
    })

# Calculate metrics
accuracy = (correct / total * 100) if total > 0 else 0

# Bucket accuracies
for bucket, stats in length_buckets.items():
    if stats["total"] > 0:
        stats["accuracy"] = stats["correct"] / stats["total"] * 100
    else:
        stats["accuracy"] = 0.0

# Source accuracies
ai_accuracy = (ai_generated["correct"] / ai_generated["total"] * 100) if ai_generated["total"] > 0 else 0
real_accuracy = (real_world["correct"] / real_world["total"] * 100) if real_world["total"] > 0 else 0

# Print summary
print("\n" + "=" * 70)
print("📊 EVALUATION SUMMARY")
print("=" * 70)

print(f"\n🎯 Overall Accuracy: {accuracy:.1f}% ({correct}/{total})")

print("\n📏 Accuracy by Length:")
for bucket, stats in length_buckets.items():
    if stats["total"] > 0:
        print(f"   {bucket:20s}: {stats['accuracy']:5.1f}% ({stats['correct']}/{stats['total']})")

print("\n📊 Accuracy by Data Source:")
print(f"   AI-Generated        : {ai_accuracy:5.1f}% ({ai_generated['correct']}/{ai_generated['total']})")
print(f"   Real-World          : {real_accuracy:5.1f}% ({real_world['correct']}/{real_world['total']})")

print("\n🔍 Real-World Performance Improvement:")
print(f"   Baseline (TF-IDF only): 9.5%")
print(f"   Hybrid Model         : {real_accuracy:.1f}%")
print(f"   Improvement          : +{real_accuracy - 9.5:.1f} percentage points")

# Category-wise for real-world
real_world_by_cat = {}
for r in results:
    if r['is_real_world']:
        cat = r['expected']
        if cat not in real_world_by_cat:
            real_world_by_cat[cat] = {"total": 0, "correct": 0}
        real_world_by_cat[cat]["total"] += 1
        if r['is_correct']:
            real_world_by_cat[cat]["correct"] += 1

if real_world_by_cat:
    print("\n📊 Real-World Performance by Category:")
    for cat in sorted(real_world_by_cat.keys()):
        stats = real_world_by_cat[cat]
        acc = (stats['correct'] / stats['total'] * 100) if stats['total'] > 0 else 0
        print(f"   {cat:20s}: {acc:5.1f}% ({stats['correct']}/{stats['total']})")

# Save results
output_file = "hybrid_model_evaluation_report.json"
report = {
    "test_file": test_file,
    "model_dir": model_dir,
    "total_tests": total,
    "correct": correct,
    "accuracy": accuracy,
    "length_buckets": length_buckets,
    "ai_generated": ai_generated,
    "real_world": real_world,
    "real_world_by_category": real_world_by_cat,
    "results": results
}

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2, ensure_ascii=False)

print(f"\n💾 Report saved to: {output_file}")
print("=" * 70)
