#!/usr/bin/env python3
"""
Quick Preview Test for RemoteClaudeOPS
シンプルで高速なプレビューテスト用スクリプト
"""

import matplotlib.pyplot as plt
import numpy as np
import time
from datetime import datetime

def quick_test():
    """高速プレビューテスト"""
    print("⚡ Quick Preview Test for RemoteClaudeOPS")

    # シンプルなサインカーブ
    x = np.linspace(0, 4*np.pi, 100)
    y = np.sin(x) * np.exp(-x/10)

    plt.figure(figsize=(8, 5))
    plt.plot(x, y, 'b-', linewidth=2, label='Damped Sine Wave')
    plt.xlabel('X')
    plt.ylabel('Y')
    plt.title(f'📊 Quick Test - {datetime.now().strftime("%H:%M:%S")}')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.show()

    print("✅ Quick test plot created")
    print("📱 Check RemoteClaudeOPS Preview tab")

if __name__ == "__main__":
    quick_test()