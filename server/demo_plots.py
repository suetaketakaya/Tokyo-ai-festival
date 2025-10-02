#!/usr/bin/env python3
"""
RemoteClaudeOPS Preview Demo Script
W&B統合機能とMatplotlibプレビューのデモンストレーション
"""

import matplotlib.pyplot as plt
import numpy as np
import os
import datetime

def create_sample_plots():
    """複数のMatplotlibプロットを生成してプレビュー機能をテストする"""

    # 出力ディレクトリの作成
    os.makedirs('plots', exist_ok=True)

    print("🎨 Creating sample plots for RemoteClaudeOPS preview...")

    # 1. 線グラフ - ML訓練曲線シミュレーション
    plt.figure(figsize=(10, 6))
    epochs = np.arange(1, 51)
    train_loss = 2.5 * np.exp(-epochs/15) + 0.1 + np.random.normal(0, 0.05, len(epochs))
    val_loss = 2.3 * np.exp(-epochs/12) + 0.15 + np.random.normal(0, 0.08, len(epochs))

    plt.plot(epochs, train_loss, 'b-', label='Training Loss', linewidth=2)
    plt.plot(epochs, val_loss, 'r--', label='Validation Loss', linewidth=2)
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.title('🤖 ML Training Progress - W&B Integration Demo')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig('plots/training_curve.png', dpi=150, bbox_inches='tight')
    plt.show()
    print("✅ Training curve plot created")

    # 2. 散布図 - データ分布可視化
    plt.figure(figsize=(8, 8))
    np.random.seed(42)
    x1 = np.random.normal(2, 0.8, 100)
    y1 = np.random.normal(3, 0.8, 100)
    x2 = np.random.normal(6, 1.2, 150)
    y2 = np.random.normal(7, 1.0, 150)

    plt.scatter(x1, y1, alpha=0.6, c='blue', s=60, label='Cluster A')
    plt.scatter(x2, y2, alpha=0.6, c='red', s=60, label='Cluster B')
    plt.xlabel('Feature X')
    plt.ylabel('Feature Y')
    plt.title('📊 Data Clustering Analysis')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig('plots/clustering_analysis.png', dpi=150, bbox_inches='tight')
    plt.show()
    print("✅ Clustering analysis plot created")

    # 3. ヒートマップ - 相関行列
    plt.figure(figsize=(9, 7))
    features = ['Feature_A', 'Feature_B', 'Feature_C', 'Feature_D', 'Target']
    correlation_matrix = np.random.rand(5, 5)
    correlation_matrix = (correlation_matrix + correlation_matrix.T) / 2
    np.fill_diagonal(correlation_matrix, 1)

    im = plt.imshow(correlation_matrix, cmap='coolwarm', aspect='auto')
    plt.colorbar(im)
    plt.xticks(range(len(features)), features, rotation=45)
    plt.yticks(range(len(features)), features)
    plt.title('🔥 Feature Correlation Heatmap')

    # 相関値を表示
    for i in range(len(features)):
        for j in range(len(features)):
            plt.text(j, i, f'{correlation_matrix[i, j]:.2f}',
                    ha='center', va='center', color='white' if correlation_matrix[i, j] < 0.5 else 'black')

    plt.tight_layout()
    plt.savefig('plots/correlation_heatmap.png', dpi=150, bbox_inches='tight')
    plt.show()
    print("✅ Correlation heatmap created")

    # 4. 複数サブプロット - ダッシュボード風
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(12, 10))

    # サブプロット1: 精度推移
    epochs = np.arange(1, 21)
    accuracy = 0.3 + 0.6 * (1 - np.exp(-epochs/5)) + np.random.normal(0, 0.02, len(epochs))
    ax1.plot(epochs, accuracy, 'g-', linewidth=2, marker='o', markersize=4)
    ax1.set_title('📈 Model Accuracy')
    ax1.set_xlabel('Epoch')
    ax1.set_ylabel('Accuracy')
    ax1.grid(True, alpha=0.3)

    # サブプロット2: 学習率スケジュール
    lr_values = 0.01 * np.exp(-epochs/10)
    ax2.semilogy(epochs, lr_values, 'purple', linewidth=2, marker='s', markersize=4)
    ax2.set_title('🎯 Learning Rate Schedule')
    ax2.set_xlabel('Epoch')
    ax2.set_ylabel('Learning Rate (log scale)')
    ax2.grid(True, alpha=0.3)

    # サブプロット3: バッチサイズ分布
    batch_sizes = np.random.normal(32, 8, 1000)
    ax3.hist(batch_sizes, bins=30, alpha=0.7, color='orange', edgecolor='black')
    ax3.set_title('📦 Batch Size Distribution')
    ax3.set_xlabel('Batch Size')
    ax3.set_ylabel('Frequency')
    ax3.grid(True, alpha=0.3)

    # サブプロット4: ROC曲線
    fpr = np.linspace(0, 1, 100)
    tpr = 1 - (1 - fpr) ** 2 + np.random.normal(0, 0.02, len(fpr))
    tpr = np.clip(tpr, 0, 1)
    ax4.plot(fpr, tpr, 'red', linewidth=3, label='ROC Curve (AUC=0.85)')
    ax4.plot([0, 1], [0, 1], 'k--', alpha=0.5, label='Random Classifier')
    ax4.set_title('🎭 ROC Curve Analysis')
    ax4.set_xlabel('False Positive Rate')
    ax4.set_ylabel('True Positive Rate')
    ax4.legend()
    ax4.grid(True, alpha=0.3)

    plt.suptitle(f'🚀 RemoteClaudeOPS Dashboard - {datetime.datetime.now().strftime("%Y-%m-%d %H:%M")}',
                 fontsize=16, fontweight='bold')
    plt.tight_layout()
    plt.savefig('plots/ml_dashboard.png', dpi=150, bbox_inches='tight')
    plt.show()
    print("✅ ML Dashboard created")

    # 5. 3Dプロット
    fig = plt.figure(figsize=(10, 8))
    ax = fig.add_subplot(111, projection='3d')

    # 3Dデータ生成
    x = np.random.normal(0, 1, 200)
    y = np.random.normal(0, 1, 200)
    z = x**2 + y**2 + np.random.normal(0, 0.1, 200)

    scatter = ax.scatter(x, y, z, c=z, cmap='viridis', s=50, alpha=0.7)
    ax.set_xlabel('X Coordinate')
    ax.set_ylabel('Y Coordinate')
    ax.set_zlabel('Z Response')
    ax.set_title('🌌 3D Data Visualization')
    plt.colorbar(scatter)
    plt.tight_layout()
    plt.savefig('plots/3d_visualization.png', dpi=150, bbox_inches='tight')
    plt.show()
    print("✅ 3D visualization created")

    print("\n🎉 All demo plots created successfully!")
    print("📁 Plots saved in: ./plots/")
    print("📱 Check RemoteClaudeOPS Preview tab to see W&B integration")
    print("🔬 W&B experiment tracking demo ready")

if __name__ == "__main__":
    create_sample_plots()