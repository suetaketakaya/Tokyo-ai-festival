#!/usr/bin/env python3
"""
Enhanced Feature Extractor for Short Text Classification
短文（<150文字）に特化した特徴抽出器
"""

import json
import numpy as np
from typing import Dict, List, Tuple

class EnhancedFeatureExtractor:
    """拡張特徴抽出器"""

    def __init__(self, dictionary_path='product_tech_dictionary.json'):
        """
        Args:
            dictionary_path: 製品名・技術用語辞書のパス
        """
        with open(dictionary_path, 'r', encoding='utf-8') as f:
            self.dictionary = json.load(f)

    def extract_features(self, command: str, category: str = None) -> np.ndarray:
        """
        コマンドから拡張特徴量を抽出

        Args:
            command: 入力テキスト
            category: カテゴリ（訓練時のみ）

        Returns:
            特徴量ベクトル (約200次元)
        """
        features = []
        lower_cmd = command.lower()

        # ============================================================
        # 1. 基本統計特徴 (10)
        # ============================================================
        features.append(len(command))  # 文字数
        features.append(len(command.split()))  # 単語数
        features.append(command.count(' '))  # スペース数
        features.append(command.count('。'))  # 句点数
        features.append(command.count('、'))  # 読点数
        features.append(command.count('\n'))  # 改行数
        features.append(command.count('・'))  # 中黒数
        features.append(len(command) / (len(command.split()) + 1))  # 平均単語長
        features.append(sum(1 for c in command if c.isupper()) / (len(command) + 1))  # 大文字率
        features.append(sum(1 for c in command if c.isdigit()) / (len(command) + 1))  # 数字率

        # ============================================================
        # 2. 製品名・サービス名の検出 (80 = 8カテゴリ × 10サブカテゴリ)
        # ============================================================
        # 各カテゴリの製品名出現スコア
        for cat in ['web_app', 'api', 'machine_learning', 'visualization',
                    'data_analysis', 'docker', 'network', 'general']:
            if cat in self.dictionary:
                # カテゴリ内のサブカテゴリをチェック
                cat_score = 0
                subcategories = []
                for subcat, products in self.dictionary[cat].items():
                    if isinstance(products, list):
                        matches = sum(1 for prod in products if prod.lower() in lower_cmd)
                        features.append(matches)  # このサブカテゴリのマッチ数
                        cat_score += matches
                        subcategories.append(subcat)

                # 残りを0で埋める（最大10サブカテゴリと仮定）
                for _ in range(10 - len(subcategories)):
                    features.append(0)

        # ============================================================
        # 3. キーワードマッチング (80 = 8カテゴリ × 10キーワード)
        # ============================================================
        if 'keywords' in self.dictionary:
            for cat in ['web_app', 'api', 'machine_learning', 'visualization',
                        'data_analysis', 'docker', 'network', 'general']:
                if cat in self.dictionary['keywords']:
                    keywords = self.dictionary['keywords'][cat][:10]  # 最大10キーワード
                    for keyword in keywords:
                        features.append(1 if keyword.lower() in lower_cmd else 0)
                    # 残りを0で埋める
                    for _ in range(10 - len(keywords)):
                        features.append(0)

        # ============================================================
        # 4. 言語パターン (20)
        # ============================================================
        # 日本語パターン
        features.append(1 if 'を' in command else 0)
        features.append(1 if 'で' in command else 0)
        features.append(1 if 'に' in command else 0)
        features.append(1 if 'の' in command else 0)
        features.append(1 if 'が' in command else 0)
        features.append(command.count('を') + command.count('で') + command.count('に'))  # 助詞合計

        # 依頼・命令表現
        features.append(1 if 'ください' in command else 0)
        features.append(1 if 'お願い' in command else 0)
        features.append(1 if 'してください' in command else 0)
        features.append(1 if '作成' in command else 0)
        features.append(1 if '構築' in command else 0)
        features.append(1 if '開発' in command else 0)
        features.append(1 if '実装' in command else 0)
        features.append(1 if '設定' in command else 0)

        # 英語パターン
        features.append(1 if 'create' in lower_cmd else 0)
        features.append(1 if 'build' in lower_cmd else 0)
        features.append(1 if 'develop' in lower_cmd else 0)
        features.append(1 if 'implement' in lower_cmd else 0)
        features.append(1 if 'setup' in lower_cmd else 0)
        features.append(1 if 'configure' in lower_cmd else 0)

        # ============================================================
        # 5. 技術固有パターン (30)
        # ============================================================
        # フレームワーク・ライブラリ名の検出
        frameworks = ['react', 'vue', 'angular', 'django', 'flask', 'express',
                     'tensorflow', 'pytorch', 'docker', 'kubernetes']
        for fw in frameworks:
            features.append(1 if fw in lower_cmd else 0)

        # ファイル拡張子
        extensions = ['.js', '.py', '.go', '.java', '.ts', '.tsx', '.jsx',
                     '.json', '.yaml', '.yml', '.md', '.html', '.css']
        for ext in extensions:
            features.append(1 if ext in lower_cmd else 0)

        # プロトコル・技術用語
        tech_terms = ['api', 'rest', 'graphql', 'http', 'https', 'websocket', 'grpc']
        for term in tech_terms:
            features.append(1 if term in lower_cmd else 0)

        return np.array(features)

    def get_feature_dim(self) -> int:
        """特徴量の次元数を返す"""
        # 動的に計算
        dummy_features = self.extract_features("test command", "general")
        return len(dummy_features)

def test_feature_extractor():
    """特徴抽出器のテスト"""
    print("=" * 70)
    print("🧪 Enhanced Feature Extractor Test")
    print("=" * 70)

    extractor = EnhancedFeatureExtractor()

    test_commands = [
        "Slackのようなリアルタイムチャット機能",
        "Stripe APIを使用した決済処理実装",
        "TensorFlowでCNNモデルを訓練",
        "Tableauのようなダッシュボード作成",
        "Dockerでマイクロサービスデプロイ",
    ]

    print(f"\n📊 Feature Dimension: {extractor.get_feature_dim()}")

    print("\n📝 Test Commands:")
    for i, cmd in enumerate(test_commands, 1):
        features = extractor.extract_features(cmd)
        non_zero = np.count_nonzero(features)
        print(f"\n{i}. {cmd}")
        print(f"   Features: {len(features)} dims, {non_zero} non-zero")
        print(f"   Sample: {features[:10]}")

    print("\n" + "=" * 70)
    print("✅ Feature extraction test complete!")
    print("=" * 70)

if __name__ == "__main__":
    test_feature_extractor()
