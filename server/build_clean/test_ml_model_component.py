#!/usr/bin/env python3
"""
Component Test for Python ML Model
Tests the 9-category classification accuracy
"""

import sys
from wandb_local_model import RemoteClaudeMLModel

def main():
    model = RemoteClaudeMLModel()

    # Test cases for all 9 categories
    test_cases = [
        ('TensorFlowでMNIST CNNモデルを訓練してください', 'machine_learning'),
        ('PyTorchでResNetを実装してください', 'machine_learning'),
        ('React.jsを使用してTodoアプリを作成してください', 'web_app'),
        ('Vue3 Composition APIでダッシュボード作成', 'web_app'),
        ('matplotlibでグラフを作成してください', 'visualization'),
        ('seabornでヒートマップを作成', 'visualization'),
        ('pandasでCSVデータを分析してください', 'data_analysis'),
        ('SQLクエリでデータ抽出してください', 'data_analysis'),
        ('FastAPIでREST APIを作成してください', 'api'),
        ('FlaskでWebサービスを実装', 'api'),
        ('Jupyter notebookで分析してください', 'jupyter'),
        ('ipynb形式でレポート作成', 'jupyter'),
        ('Dockerコンテナを作成してください', 'docker'),
        ('docker-composeでサービス起動', 'docker'),
        ('WebSocket通信を実装してください', 'network'),
        ('HTTP APIクライアントを作成', 'network'),
        ('Pythonスクリプトを作成してください', 'general'),
        ('ファイル読み込み処理を実装', 'general'),
    ]

    correct = 0
    total = len(test_cases)

    print('\n' + '=' * 120)
    print(' 📊 ML Model Component Test - 9-Category Classification')
    print('=' * 120)
    print()
    print(f"{'Command':<55} {'Expected':<18} {'Predicted':<18} {'Confidence':<12} {'Result':<8}")
    print('-' * 120)

    for command, expected_category in test_cases:
        result = model.predict(command)
        predicted_category = result['command_type']
        confidence = result['confidence']

        is_correct = predicted_category == expected_category
        if is_correct:
            correct += 1
            status = '✅ PASS'
        else:
            status = '❌ FAIL'

        # Truncate command if too long
        display_command = command[:50] + '...' if len(command) > 50 else command

        print(f"{display_command:<55} {expected_category:<18} {predicted_category:<18} {confidence:<12.4f} {status:<8}")

    accuracy = (correct / total) * 100
    print('-' * 120)
    print()
    print(f'✅ Overall Accuracy: {correct}/{total} ({accuracy:.1f}%)')
    print(f'🎯 Target Accuracy: ≥85.0%')
    print(f'📈 Status: {"PASS ✅" if accuracy >= 85.0 else "FAIL ❌"}')
    print()
    print('=' * 120)

    # Exit with error code if failed
    sys.exit(0 if accuracy >= 85.0 else 1)

if __name__ == "__main__":
    main()
