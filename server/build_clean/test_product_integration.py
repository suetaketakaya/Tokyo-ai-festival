#!/usr/bin/env python3
"""
製品辞書統合のテスト
"""

import sys
import json
from wandb_local_model import RemoteClaudeMLModel

def test_product_detection():
    """製品名検出機能のテスト"""

    print("=" * 70)
    print(" 製品辞書統合テスト - wandb_local_model.py")
    print("=" * 70)

    # モデル初期化
    model = RemoteClaudeMLModel()

    # テストケース
    test_cases = [
        # 実世界データの典型例
        "Slackのようなチャットアプリを作って",
        "Stripe決済を統合",
        "Kaggleコンペ用のMLモデル作成",
        "Google Colabで訓練実行",
        "Tableauダッシュボード構築",
        "TwilioとSendGridで通知システム",
        "HuggingFaceのBERTモデル使用",
        "Reactアプリ作成",  # 製品名なし（技術名のみ）
        "matplotlibでグラフ作成",  # 製品名なし
    ]

    print("\n")
    for i, command in enumerate(test_cases, 1):
        print(f"\n{'─' * 70}")
        print(f"Test {i}: {command}")
        print(f"{'─' * 70}")

        # 予測実行
        result = model.predict(command)

        # 結果表示
        print(f"\n予測結果:")
        print(f"  カテゴリ: {result['command_type']}")
        print(f"  信頼度: {result['confidence']:.2%}")
        print(f"  予測ソース: {result['prediction_source']}")

        # 製品検出情報
        product_det = result.get('product_detection', {})
        if product_det.get('detected'):
            print(f"\n製品検出:")
            print(f"  検出数: {product_det['num_matches']}")
            for prod in product_det['products']:
                print(f"    - {prod['name']} ({prod['category']}, weight={prod['weight']})")
            print(f"  提案カテゴリ: {product_det['suggested_category']}")
            print(f"  ブースト: +{product_det['boost_applied']:.2%}")
        else:
            print(f"\n製品検出: なし（通常のML予測）")

        # ML予測情報
        if result.get('ml_category'):
            print(f"\nML予測:")
            print(f"  カテゴリ: {result['ml_category']}")
            print(f"  信頼度: {result['ml_confidence']:.2%}")

    print("\n" + "=" * 70)
    print(" テスト完了")
    print("=" * 70)

if __name__ == '__main__':
    test_product_detection()
