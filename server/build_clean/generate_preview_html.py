#!/usr/bin/env python3
import json
import sys

with open(sys.argv[1]) as f:
    report = json.load(f)

total = report['total_tests']
correct = report['correct']
accuracy = report['accuracy']

# 簡易版HTML生成
html = f"""
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Evaluation Results</title>
<style>
body {{ font-family: sans-serif; padding: 20px; background: #f0f0f0; }}
.card {{ background: white; padding: 30px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
.stat {{ font-size: 48px; font-weight: bold; color: {'#48bb78' if accuracy >= 80 else '#ed8936' if accuracy >= 70 else '#f56565'}; }}
h1 {{ color: #333; }}
table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
th {{ background: #667eea; color: white; }}
</style></head><body>
<div class="card">
<h1>🔬 ML Model Evaluation Dashboard</h1>
<p>LightGBM High-Accuracy Model - 100k Test Results</p>
<div class="stat">{accuracy:.2f}%</div>
<p>Accuracy: {correct:,} / {total:,}</p>
</div>

<div class="card">
<h2>📊 Performance by Type</h2>
<table>
<tr><th>Type</th><th>Accuracy</th><th>Correct/Total</th></tr>
"""

for typ, stats in report['type_stats'].items():
    html += f"<tr><td>{typ}</td><td>{stats['accuracy']:.2f}%</td><td>{stats['correct']:,}/{stats['total']:,}</td></tr>\n"

html += """
</table>
</div>

<div class="card">
<h2>📊 Performance by Category</h2>
<table>
<tr><th>Category</th><th>Accuracy</th><th>Correct/Total</th></tr>
"""

for cat, stats in sorted(report['category_stats'].items()):
    html += f"<tr><td>{cat}</td><td>{stats['accuracy']:.2f}%</td><td>{stats['correct']:,}/{stats['total']:,}</td></tr>\n"

html += """
</table>
</div>
</body></html>
"""

with open('evaluation_preview.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("✅ Preview HTML saved to: evaluation_preview.html")
