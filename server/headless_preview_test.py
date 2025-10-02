#!/usr/bin/env python3
"""
Headless Preview Test for RemoteClaudeOPS
非GUIバックエンドでのプレビューテスト用スクリプト
"""

import matplotlib
matplotlib.use('Agg')  # 非GUIバックエンドを強制
import matplotlib.pyplot as plt
import numpy as np
import os
from datetime import datetime

def create_test_plots():
    """プレビュー機能テスト用プロットを作成"""
    print("🎨 Creating headless test plots for RemoteClaudeOPS...")

    # 出力ディレクトリの作成
    os.makedirs('preview_test', exist_ok=True)

    # 1. シンプルなテストプロット
    x = np.linspace(0, 2*np.pi, 100)
    y = np.sin(x)

    plt.figure(figsize=(8, 5))
    plt.plot(x, y, 'b-', linewidth=2, label='sin(x)')
    plt.xlabel('X')
    plt.ylabel('Y')
    plt.title(f'Quick Test Plot - {datetime.now().strftime("%H:%M:%S")}')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig('preview_test/sine_wave.png', dpi=150, bbox_inches='tight')
    plt.close()

    print("✅ Sine wave plot created")

    # 2. ML風訓練カーブ
    epochs = np.arange(1, 21)
    train_loss = 2.0 * np.exp(-epochs/8) + 0.1 + np.random.normal(0, 0.03, len(epochs))
    val_loss = 2.2 * np.exp(-epochs/7) + 0.15 + np.random.normal(0, 0.05, len(epochs))

    plt.figure(figsize=(10, 6))
    plt.plot(epochs, train_loss, 'b-', label='Training Loss', linewidth=2, marker='o')
    plt.plot(epochs, val_loss, 'r--', label='Validation Loss', linewidth=2, marker='s')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.title('ML Training Progress - W&B Demo')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig('preview_test/training_progress.png', dpi=150, bbox_inches='tight')
    plt.close()

    print("✅ Training progress plot created")

    # 3. データ可視化
    np.random.seed(42)
    x = np.random.normal(0, 1, 200)
    y = np.random.normal(0, 1, 200)
    colors = x**2 + y**2

    plt.figure(figsize=(8, 8))
    scatter = plt.scatter(x, y, c=colors, cmap='viridis', alpha=0.7, s=50)
    plt.colorbar(scatter, label='Distance from Origin')
    plt.xlabel('X Coordinate')
    plt.ylabel('Y Coordinate')
    plt.title('Data Visualization Example')
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig('preview_test/data_viz.png', dpi=150, bbox_inches='tight')
    plt.close()

    print("✅ Data visualization plot created")

    # 4. ダッシュボード風
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(12, 10))

    # 精度
    acc = 0.3 + 0.6 * (1 - np.exp(-epochs/5)) + np.random.normal(0, 0.02, len(epochs))
    ax1.plot(epochs, acc, 'g-', linewidth=2, marker='o')
    ax1.set_title('Model Accuracy')
    ax1.set_xlabel('Epoch')
    ax1.set_ylabel('Accuracy')
    ax1.grid(True, alpha=0.3)

    # 学習率
    lr = 0.01 * np.exp(-epochs/10)
    ax2.semilogy(epochs, lr, 'purple', linewidth=2, marker='s')
    ax2.set_title('Learning Rate Schedule')
    ax2.set_xlabel('Epoch')
    ax2.set_ylabel('Learning Rate')
    ax2.grid(True, alpha=0.3)

    # ヒストグラム
    data = np.random.normal(100, 15, 1000)
    ax3.hist(data, bins=30, alpha=0.7, color='orange', edgecolor='black')
    ax3.set_title('Parameter Distribution')
    ax3.set_xlabel('Value')
    ax3.set_ylabel('Frequency')
    ax3.grid(True, alpha=0.3)

    # ROC風
    fpr = np.linspace(0, 1, 100)
    tpr = 1 - (1 - fpr) ** 1.5 + np.random.normal(0, 0.02, len(fpr))
    tpr = np.clip(tpr, 0, 1)
    ax4.plot(fpr, tpr, 'red', linewidth=3, label='ROC Curve')
    ax4.plot([0, 1], [0, 1], 'k--', alpha=0.5, label='Random')
    ax4.set_title('ROC Curve')
    ax4.set_xlabel('False Positive Rate')
    ax4.set_ylabel('True Positive Rate')
    ax4.legend()
    ax4.grid(True, alpha=0.3)

    plt.suptitle(f'RemoteClaudeOPS Dashboard - {datetime.now().strftime("%Y-%m-%d %H:%M")}',
                 fontsize=16, fontweight='bold')
    plt.tight_layout()
    plt.savefig('preview_test/dashboard.png', dpi=150, bbox_inches='tight')
    plt.close()

    print("✅ Dashboard plot created")

    # ファイルリスト表示
    files = os.listdir('preview_test')
    print(f"\n📁 Created {len(files)} preview test files:")
    for file in sorted(files):
        size = os.path.getsize(f'preview_test/{file}')
        print(f"   {file} ({size/1024:.1f} KB)")

    print("\n🚀 Preview test plots ready!")
    print("📱 These plots can be viewed in RemoteClaudeOPS Preview tab")
    print("🔬 Ready for W&B integration testing")

if __name__ == "__main__":
    create_test_plots()