#!/usr/bin/env python3
"""
カテゴリ再定義: general → devops + testing + general に分割
既存データを再ラベリング
"""

import json
import re

# 新カテゴリ定義
CATEGORY_DEFINITIONS = {
    'devops': {
        'keywords': [
            'ci/cd', 'cicd', 'jenkins', 'github actions', 'gitlab ci',
            'terraform', 'ansible', 'puppet', 'chef', 'saltstack',
            'infrastructure as code', 'iac', 'cloudformation',
            'deploy', 'deployment', 'デプロイ', 'リリース',
            'pipeline', 'パイプライン', 'automation', '自動化',
            'provisioning', 'プロビジョニング'
        ],
        'products': [
            'Jenkins', 'CircleCI', 'Travis CI', 'GitHub Actions',
            'GitLab CI', 'Terraform', 'Ansible', 'Puppet', 'Chef',
            'ArgoCD', 'Bamboo', 'TeamCity', 'Drone'
        ]
    },
    'testing': {
        'keywords': [
            'test', 'testing', 'テスト', 'unit test', 'integration test',
            'e2e', 'end-to-end', 'cypress', 'jest', 'mocha', 'junit',
            'pytest', 'selenium', 'playwright', 'qa', 'quality',
            'coverage', 'カバレッジ', 'assertion', 'mock'
        ],
        'products': [
            'Jest', 'Cypress', 'Playwright', 'Selenium', 'Mocha',
            'JUnit', 'pytest', 'TestNG', 'Karma', 'Jasmine'
        ]
    },
    'general': {
        'keywords': [
            'git', 'github', 'gitlab', 'version control', 'バージョン管理',
            'code review', 'レビュー', 'documentation', 'ドキュメント',
            'monorepo', 'モノレポ', 'linter', 'formatter', 'eslint',
            'prettier', 'editor', 'エディタ', 'ide', 'vscode'
        ],
        'products': [
            'Git', 'GitHub', 'GitLab', 'Bitbucket', 'VS Code',
            'IntelliJ', 'PyCharm', 'ESLint', 'Prettier', 'SonarQube'
        ]
    }
}

def classify_command(command: str) -> str:
    """コマンドを新カテゴリに分類"""
    lower_cmd = command.lower()

    # devops チェック
    for keyword in CATEGORY_DEFINITIONS['devops']['keywords']:
        if keyword.lower() in lower_cmd:
            return 'devops'
    for product in CATEGORY_DEFINITIONS['devops']['products']:
        if product.lower() in lower_cmd:
            return 'devops'

    # testing チェック
    for keyword in CATEGORY_DEFINITIONS['testing']['keywords']:
        if keyword.lower() in lower_cmd:
            return 'testing'
    for product in CATEGORY_DEFINITIONS['testing']['products']:
        if product.lower() in lower_cmd:
            return 'testing'

    # general（デフォルト）
    return 'general'

# 既存訓練データを再ラベリング
print("=" * 70)
print("🔄 Category Refinement: general → devops + testing + general")
print("=" * 70)

print("\n📂 Loading training data...")
with open('training_data_final_106k.json', 'r', encoding='utf-8') as f:
    training_data = json.load(f)

print(f"✅ Loaded {len(training_data):,} samples")

# general カテゴリのみ再分類
relabeled_count = 0
devops_count = 0
testing_count = 0
general_count = 0

for item in training_data:
    if item['category'] == 'general':
        new_category = classify_command(item['command'])
        item['category'] = new_category
        relabeled_count += 1

        if new_category == 'devops':
            devops_count += 1
        elif new_category == 'testing':
            testing_count += 1
        else:
            general_count += 1

print(f"\n✅ Relabeled {relabeled_count:,} general samples:")
print(f"   → devops: {devops_count:,}")
print(f"   → testing: {testing_count:,}")
print(f"   → general (remaining): {general_count:,}")

# 保存
output_file = "training_data_refined_106k.json"
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(training_data, f, indent=2, ensure_ascii=False)

print(f"\n💾 Saved to: {output_file}")

# カテゴリ分布
from collections import Counter
cat_counts = Counter(item['category'] for item in training_data)

print(f"\n📊 New Category Distribution:")
for cat, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
    print(f"   {cat:20s}: {count:6,} ({count/len(training_data)*100:5.1f}%)")

print("\n✅ Category refinement completed!")
