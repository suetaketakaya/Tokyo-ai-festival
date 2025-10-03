#!/usr/bin/env python3
"""
Enhanced Preview Classifier - ML Model for Preview Button Detection
Improved accuracy for React, HTML, Todo apps, and various web frameworks
"""

import json
import re
from typing import Dict, List, Tuple
import pickle
import os

class EnhancedPreviewClassifier:
    """
    機械学習ベースのプレビュー検出分類器
    React、HTML、Todoアプリなどの多様なコード生成パターンに対応
    """

    def __init__(self):
        self.web_keywords = [
            # React/Frontend frameworks
            'react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt',
            # HTML/Web
            'html', 'webpage', 'website', 'web page', 'web app', 'web application',
            # Common app types
            'todo', 'タスク管理', 'task manager', 'single page', 'spa',
            'シングルページ', 'アプリ', 'app',
            # Web frameworks
            'streamlit', 'flask', 'fastapi', 'django', 'express',
            # Web technologies
            'javascript', 'typescript', 'css', 'bootstrap', 'tailwind',
            # Actions
            '作成', 'create', '生成', 'generate', '開発', 'develop', 'build',
        ]

        self.plot_keywords = [
            'matplotlib', 'plot', 'graph', 'chart', 'visualization',
            'グラフ', '可視化', 'プロット', 'seaborn', 'plotly',
            'figure', 'scatter', 'histogram', 'bar chart', 'line chart',
        ]

        self.jupyter_keywords = [
            'jupyter', 'notebook', 'ipynb', 'jupyterlab',
        ]

    def extract_features(self, command: str) -> Dict[str, float]:
        """
        コマンドから特徴量を抽出

        Returns:
            特徴量辞書
        """
        cmd_lower = command.lower()
        cmd_len = len(command)
        word_count = len(command.split())

        features = {
            # 基本特徴
            'command_length': cmd_len / 1000.0,  # 正規化
            'word_count': word_count / 100.0,

            # Web/HTML 関連
            'has_web_keywords': sum(1 for kw in self.web_keywords if kw in cmd_lower) / len(self.web_keywords),
            'has_html_tag': 1.0 if bool(re.search(r'<\w+>|<!doctype', cmd_lower)) else 0.0,
            'has_react_mention': 1.0 if 'react' in cmd_lower else 0.0,
            'has_todo_mention': 1.0 if 'todo' in cmd_lower else 0.0,
            'has_app_mention': 1.0 if any(x in cmd_lower for x in ['app', 'アプリ', 'application']) else 0.0,
            'has_spa_mention': 1.0 if any(x in cmd_lower for x in ['spa', 'single page', 'シングルページ']) else 0.0,

            # Framework 検出
            'has_web_framework': 1.0 if any(x in cmd_lower for x in ['streamlit', 'flask', 'fastapi', 'django']) else 0.0,

            # Action keywords
            'has_create_action': 1.0 if any(x in cmd_lower for x in ['create', 'generate', '作成', '生成', 'build']) else 0.0,

            # Plot/Visualization
            'has_plot_keywords': sum(1 for kw in self.plot_keywords if kw in cmd_lower) / len(self.plot_keywords),
            'has_matplotlib': 1.0 if 'matplotlib' in cmd_lower or 'plt.' in cmd_lower else 0.0,

            # Jupyter
            'has_jupyter_keywords': sum(1 for kw in self.jupyter_keywords if kw in cmd_lower) / len(self.jupyter_keywords),

            # 言語検出
            'has_japanese': 1.0 if bool(re.search(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]', command)) else 0.0,
        }

        return features

    def classify(self, command: str) -> Dict[str, any]:
        """
        コマンドを分類してプレビュータイプを決定

        Returns:
            {
                'needs_preview': bool,
                'preview_type': str,  # 'web', 'matplotlib', 'jupyter', 'unknown'
                'confidence': float,
                'features': dict
            }
        """
        features = self.extract_features(command)

        # Web/HTML 検出 (改善版)
        web_score = (
            features['has_web_keywords'] * 3.0 +
            features['has_html_tag'] * 5.0 +
            features['has_react_mention'] * 4.0 +
            features['has_todo_mention'] * 3.5 +
            features['has_app_mention'] * 2.5 +
            features['has_spa_mention'] * 4.0 +
            features['has_web_framework'] * 4.5 +
            features['has_create_action'] * 1.5
        )

        # Matplotlib/Plot 検出
        plot_score = (
            features['has_plot_keywords'] * 4.0 +
            features['has_matplotlib'] * 5.0
        )

        # Jupyter 検出
        jupyter_score = features['has_jupyter_keywords'] * 5.0

        # スコアに基づいて分類
        max_score = max(web_score, plot_score, jupyter_score)

        # 閾値設定 (調整可能)
        THRESHOLD = 2.0

        if max_score < THRESHOLD:
            return {
                'needs_preview': False,
                'preview_type': 'unknown',
                'confidence': 0.0,
                'features': features,
                'scores': {
                    'web': web_score,
                    'plot': plot_score,
                    'jupyter': jupyter_score,
                }
            }

        # 最高スコアのタイプを選択
        if max_score == web_score:
            preview_type = 'web'
            confidence = min(web_score / 10.0, 1.0)
        elif max_score == plot_score:
            preview_type = 'matplotlib'
            confidence = min(plot_score / 10.0, 1.0)
        else:
            preview_type = 'jupyter'
            confidence = min(jupyter_score / 5.0, 1.0)

        return {
            'needs_preview': True,
            'preview_type': preview_type,
            'confidence': confidence,
            'features': features,
            'scores': {
                'web': web_score,
                'plot': plot_score,
                'jupyter': jupyter_score,
            }
        }

    def save_model(self, filepath: str):
        """モデルを保存"""
        with open(filepath, 'wb') as f:
            pickle.dump(self, f)
        print(f"✅ Model saved to {filepath}")

    @staticmethod
    def load_model(filepath: str) -> 'EnhancedPreviewClassifier':
        """モデルを読み込み"""
        with open(filepath, 'rb') as f:
            model = pickle.load(f)
        print(f"✅ Model loaded from {filepath}")
        return model


def test_classifier():
    """分類器のテストとデモ"""
    classifier = EnhancedPreviewClassifier()

    # テストケース
    test_cases = [
        # Web/HTML/React cases
        "React.jsを使用してシングルページアプリケーションを作成してください。Todo管理機能付きで、タスクの追加・削除・完了マークができるようにしてください。",
        "Create a simple HTML todo app",
        "Webアプリケーションを作成してください",
        "Build a React dashboard with charts",
        "Streamlit でダッシュボードを作る",

        # Matplotlib cases
        "Matplotlibでグラフを作成してください",
        "Create a scatter plot using matplotlib",
        "データを可視化してプロットを表示",

        # Jupyter cases
        "Jupyter notebookを起動してください",
        "Create a new jupyter notebook",

        # Non-preview cases
        "Calculate 2 + 2",
        "List files in current directory",
        "Print hello world",
    ]

    print("=" * 80)
    print("Enhanced Preview Classifier - Test Results")
    print("=" * 80)

    for i, test_cmd in enumerate(test_cases, 1):
        result = classifier.classify(test_cmd)

        print(f"\n[Test {i}]")
        print(f"Command: {test_cmd[:60]}...")
        print(f"Needs Preview: {result['needs_preview']}")
        print(f"Preview Type: {result['preview_type']}")
        print(f"Confidence: {result['confidence']:.2%}")
        print(f"Scores: Web={result['scores']['web']:.2f}, "
              f"Plot={result['scores']['plot']:.2f}, "
              f"Jupyter={result['scores']['jupyter']:.2f}")

    # モデルを保存
    model_path = '/Users/suetaketakaya/1.prog/remote_manual/server/enhanced_preview_model.pkl'
    classifier.save_model(model_path)

    print("\n" + "=" * 80)
    print(f"✅ Enhanced Preview Classifier ready and saved to {model_path}")
    print("=" * 80)


if __name__ == "__main__":
    test_classifier()
