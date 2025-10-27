#!/usr/bin/env python3
"""
Long Prompt Evaluation Tool
Tests enhanced ML model with long-form prompts (300+ characters)
"""

import json
import sys
import time
from wandb_local_model import RemoteClaudeMLModel

def evaluate_long_prompts(test_file='test_long_prompts.json'):
    """
    Evaluate ML model on long prompts

    Args:
        test_file: JSON file with test prompts
    """

    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("📏 Long Prompt Evaluation")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    # Load test data
    with open(test_file, 'r', encoding='utf-8') as f:
        test_data = json.load(f)

    print(f"📊 Loaded {len(test_data)} test prompts\n")

    # Initialize model
    print("🔧 Initializing ML model...")
    model = RemoteClaudeMLModel()
    print("✅ Model loaded\n")

    # Evaluation results
    results = []
    correct = 0
    total = 0

    latencies = []
    chunk_counts = []

    # Length buckets
    length_buckets = {
        "short (<150)": {"total": 0, "correct": 0},
        "medium (150-300)": {"total": 0, "correct": 0},
        "long (300-500)": {"total": 0, "correct": 0},
        "very_long (500+)": {"total": 0, "correct": 0}
    }

    print("🔄 Evaluating prompts...\n")

    for i, item in enumerate(test_data, 1):
        command = item['command']
        expected = item['category']
        cmd_length = len(command)

        # Determine length bucket
        if cmd_length < 150:
            bucket = "short (<150)"
        elif cmd_length < 300:
            bucket = "medium (150-300)"
        elif cmd_length < 500:
            bucket = "long (300-500)"
        else:
            bucket = "very_long (500+)"

        length_buckets[bucket]["total"] += 1

        # Predict
        start_time = time.time()
        prediction = model.predict(command, None)
        latency_ms = (time.time() - start_time) * 1000

        predicted = prediction['command_type']
        confidence = prediction['confidence']
        is_correct = (predicted == expected)

        # Track chunks if available
        chunks = prediction.get('chunks_processed', 1)
        chunk_counts.append(chunks)

        if is_correct:
            correct += 1
            length_buckets[bucket]["correct"] += 1

        total += 1
        latencies.append(latency_ms)

        # Progress
        status = "✅" if is_correct else "❌"
        print(f"{status} [{i}/{len(test_data)}] Length: {cmd_length} chars | "
              f"Chunks: {chunks} | Expected: {expected} | "
              f"Predicted: {predicted} ({confidence:.2f}) | "
              f"Latency: {latency_ms:.0f}ms")

        # Store result
        results.append({
            "id": item['id'],
            "length": cmd_length,
            "chunks": chunks,
            "expected": expected,
            "predicted": predicted,
            "confidence": confidence,
            "is_correct": is_correct,
            "latency_ms": latency_ms
        })

    # Calculate metrics
    accuracy = (correct / total * 100) if total > 0 else 0
    avg_latency = sum(latencies) / len(latencies) if latencies else 0
    avg_chunks = sum(chunk_counts) / len(chunk_counts) if chunk_counts else 0

    # Length bucket accuracies
    for bucket, stats in length_buckets.items():
        if stats["total"] > 0:
            stats["accuracy"] = stats["correct"] / stats["total"] * 100
        else:
            stats["accuracy"] = 0.0

    # Print summary
    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("📊 EVALUATION SUMMARY")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"\n🎯 Overall Accuracy: {accuracy:.1f}% ({correct}/{total})")
    print(f"⏱️  Average Latency: {avg_latency:.0f}ms")
    print(f"📦 Average Chunks: {avg_chunks:.1f}")

    print("\n📏 Accuracy by Length:")
    for bucket, stats in length_buckets.items():
        if stats["total"] > 0:
            print(f"   {bucket:20s}: {stats['accuracy']:5.1f}% "
                  f"({stats['correct']}/{stats['total']})")

    print("\n⏱️  Latency Distribution:")
    print(f"   Min: {min(latencies):.0f}ms")
    print(f"   Max: {max(latencies):.0f}ms")
    print(f"   P50: {sorted(latencies)[len(latencies)//2]:.0f}ms")
    print(f"   P95: {sorted(latencies)[int(len(latencies)*0.95)]:.0f}ms")

    # Save results
    report = {
        "test_file": test_file,
        "total_tests": total,
        "correct": correct,
        "accuracy": accuracy,
        "average_latency_ms": avg_latency,
        "average_chunks": avg_chunks,
        "length_buckets": length_buckets,
        "latency_stats": {
            "min": min(latencies),
            "max": max(latencies),
            "p50": sorted(latencies)[len(latencies)//2],
            "p95": sorted(latencies)[int(len(latencies)*0.95)]
        },
        "results": results
    }

    output_file = "long_prompt_evaluation_report.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"\n💾 Report saved to: {output_file}")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

    return report


if __name__ == "__main__":
    test_file = sys.argv[1] if len(sys.argv) > 1 else 'test_long_prompts.json'
    evaluate_long_prompts(test_file)
