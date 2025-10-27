#!/usr/bin/env python3
"""
テストデータを新カテゴリに再ラベリング
general → devops/testing/general
"""

import json

# 再ラベリングロジック（訓練データと同じ）
def classify_command(command: str) -> str:
    lower_cmd = command.lower()

    devops_keywords = [
        'ci/cd', 'cicd', 'jenkins', 'github actions', 'gitlab ci',
        'terraform', 'ansible', 'puppet', 'chef',
        'deploy', 'deployment', 'デプロイ', 'pipeline', 'パイプライン',
        'automation', '自動化', 'provisioning', 'argocd'
    ]

    testing_keywords = [
        'test', 'testing', 'テスト', 'unit test', 'integration test',
        'e2e', 'cypress', 'jest', 'mocha', 'junit', 'pytest',
        'selenium', 'playwright', 'qa', 'coverage'
    ]

    for kw in devops_keywords:
        if kw in lower_cmd:
            return 'devops'

    for kw in testing_keywords:
        if kw in lower_cmd:
            return 'testing'

    return 'general'

# テストデータ読み込み
print("🔄 Relabeling test data...")

with open('test_data_100k_large_scale.json', 'r', encoding='utf-8') as f:
    test_data = json.load(f)

print(f"✅ Loaded {len(test_data):,} test samples")

# general のみ再ラベリング
relabeled = 0
devops_count = 0
testing_count = 0
general_count = 0

for item in test_data:
    if item['category'] == 'general':
        new_cat = classify_command(item['command'])
        item['category'] = new_cat
        relabeled += 1

        if new_cat == 'devops':
            devops_count += 1
        elif new_cat == 'testing':
            testing_count += 1
        else:
            general_count += 1

print(f"\n✅ Relabeled {relabeled:,} general samples:")
print(f"   → devops: {devops_count:,}")
print(f"   → testing: {testing_count:,}")
print(f"   → general: {general_count:,}")

# 保存
output_file = "test_data_100k_relabeled.json"
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(test_data, f, indent=2, ensure_ascii=False)

print(f"\n💾 Saved to: {output_file}")

# 統計
from collections import Counter
cat_counts = Counter(item['category'] for item in test_data)

print(f"\n📊 Category Distribution:")
for cat, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
    print(f"   {cat:20s}: {count:6,} ({count/len(test_data)*100:5.1f}%)")
