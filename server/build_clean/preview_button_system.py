#!/usr/bin/env python3
"""
プレビューボタン生成・表示確認システム
大規模開発での評価結果をインタラクティブに確認
"""

import json
import sys
from typing import Dict, List
from collections import Counter

class PreviewButtonSystem:
    def __init__(self, evaluation_report_path: str):
        """評価レポートを読み込み"""
        with open(evaluation_report_path, 'r', encoding='utf-8') as f:
            self.report = json.load(f)

        self.results = self.report.get('results', [])

    def generate_summary_buttons(self) -> str:
        """サマリー表示ボタン生成"""
        total = self.report.get('total_tests', 0)
        correct = self.report.get('correct', 0)
        accuracy = self.report.get('accuracy', 0)

        html = f"""
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ML Model Evaluation Preview</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }}

        .container {{
            max-width: 1400px;
            margin: 0 auto;
        }}

        .header {{
            background: white;
            border-radius: 16px;
            padding: 40px;
            margin-bottom: 30px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }}

        .header h1 {{
            font-size: 36px;
            color: #2d3748;
            margin-bottom: 10px;
        }}

        .header .subtitle {{
            color: #718096;
            font-size: 18px;
        }}

        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}

        .stat-card {{
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            transition: transform 0.2s, box-shadow 0.2s;
        }}

        .stat-card:hover {{
            transform: translateY(-5px);
            box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        }}

        .stat-label {{
            color: #718096;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
        }}

        .stat-value {{
            font-size: 48px;
            font-weight: bold;
            color: #2d3748;
        }}

        .stat-value.success {{
            color: #48bb78;
        }}

        .stat-value.warning {{
            color: #ed8936;
        }}

        .stat-value.danger {{
            color: #f56565;
        }}

        .preview-buttons {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }}

        .preview-btn {{
            background: white;
            border: 2px solid transparent;
            border-radius: 12px;
            padding: 20px 30px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
        }}

        .preview-btn:hover {{
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }}

        .preview-btn.primary {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }}

        .preview-btn.success {{
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            color: white;
        }}

        .preview-btn.danger {{
            background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
            color: white;
        }}

        .preview-btn.info {{
            background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
            color: white;
        }}

        .results-section {{
            background: white;
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }}

        .results-section h2 {{
            font-size: 24px;
            color: #2d3748;
            margin-bottom: 20px;
        }}

        #resultsContainer {{
            display: none;
        }}

        .result-item {{
            padding: 15px;
            border-left: 4px solid #e2e8f0;
            margin-bottom: 10px;
            background: #f7fafc;
            border-radius: 4px;
        }}

        .result-item.correct {{
            border-left-color: #48bb78;
            background: #f0fff4;
        }}

        .result-item.incorrect {{
            border-left-color: #f56565;
            background: #fff5f5;
        }}

        .result-command {{
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 5px;
        }}

        .result-meta {{
            font-size: 14px;
            color: #718096;
        }}

        .category-pill {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin-right: 8px;
        }}

        .category-pill.expected {{
            background: #bee3f8;
            color: #2c5282;
        }}

        .category-pill.predicted {{
            background: #c6f6d5;
            color: #22543d;
        }}

        .category-pill.incorrect {{
            background: #fed7d7;
            color: #742a2a;
        }}

        .progress-bar {{
            width: 100%;
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
        }}

        .progress-fill {{
            height: 100%;
            background: linear-gradient(90deg, #48bb78 0%, #38a169 100%);
            transition: width 0.3s;
        }}

        @keyframes fadeIn {{
            from {{ opacity: 0; transform: translateY(20px); }}
            to {{ opacity: 1; transform: translateY(0); }}
        }}

        .fade-in {{
            animation: fadeIn 0.5s ease-out;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header fade-in">
            <h1>🔬 ML Model Evaluation Dashboard</h1>
            <p class="subtitle">RemoteClaudeOPS - Large Scale Test Results</p>
        </div>

        <div class="stats-grid fade-in">
            <div class="stat-card">
                <div class="stat-label">Total Tests</div>
                <div class="stat-value">{total:,}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 100%"></div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-label">Correct</div>
                <div class="stat-value success">{correct:,}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: {accuracy}%"></div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-label">Accuracy</div>
                <div class="stat-value {'success' if accuracy >= 80 else 'warning' if accuracy >= 60 else 'danger'}">
                    {accuracy:.1f}%
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: {accuracy}%"></div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-label">Errors</div>
                <div class="stat-value danger">{total - correct:,}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: {100-accuracy}%; background: #f56565;"></div>
                </div>
            </div>
        </div>

        <div class="preview-buttons fade-in">
            <button class="preview-btn primary" onclick="showAllResults()">
                📊 Show All Results
            </button>
            <button class="preview-btn success" onclick="showCorrectOnly()">
                ✅ Correct Only ({correct:,})
            </button>
            <button class="preview-btn danger" onclick="showErrorsOnly()">
                ❌ Errors Only ({total - correct:,})
            </button>
            <button class="preview-btn info" onclick="showCategoryBreakdown()">
                📈 Category Breakdown
            </button>
        </div>

        <div class="results-section fade-in">
            <h2 id="resultsTitle">Evaluation Results</h2>
            <div id="resultsContainer"></div>
        </div>
    </div>

    <script>
        const results = {json.dumps(self.results[:1000], ensure_ascii=False)};  // 最初の1000件のみ

        function showAllResults() {{
            const container = document.getElementById('resultsContainer');
            const title = document.getElementById('resultsTitle');
            title.textContent = 'All Evaluation Results (First 1000)';

            container.innerHTML = results.map(r => createResultHTML(r)).join('');
            container.style.display = 'block';
        }}

        function showCorrectOnly() {{
            const container = document.getElementById('resultsContainer');
            const title = document.getElementById('resultsTitle');
            const correct = results.filter(r => r.is_correct);
            title.textContent = `Correct Predictions (${'{'}correct.length{'}'})`;

            container.innerHTML = correct.map(r => createResultHTML(r)).join('');
            container.style.display = 'block';
        }}

        function showErrorsOnly() {{
            const container = document.getElementById('resultsContainer');
            const title = document.getElementById('resultsTitle');
            const errors = results.filter(r => !r.is_correct);
            title.textContent = `Prediction Errors (${'{'}errors.length{'}'})`;

            container.innerHTML = errors.map(r => createResultHTML(r)).join('');
            container.style.display = 'block';
        }}

        function showCategoryBreakdown() {{
            const container = document.getElementById('resultsContainer');
            const title = document.getElementById('resultsTitle');
            title.textContent = 'Category Performance Breakdown';

            const byCategory = {{}};
            results.forEach(r => {{
                if (!byCategory[r.expected]) {{
                    byCategory[r.expected] = {{ total: 0, correct: 0 }};
                }}
                byCategory[r.expected].total++;
                if (r.is_correct) byCategory[r.expected].correct++;
            }});

            const html = Object.entries(byCategory).map(([cat, stats]) => {{
                const accuracy = (stats.correct / stats.total * 100).toFixed(1);
                return `
                    <div class="result-item">
                        <div class="result-command">${'{'}cat{'}'}</div>
                        <div class="result-meta">
                            Accuracy: <strong>${'{'}accuracy{'}'}%</strong>
                            (${'{'}{stats.correct}{'}'} / ${'{'}{stats.total}{'}'})
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: $'{'}accuracy{'}'}%"></div>
                        </div>
                    </div>
                `;
            }}).join('');

            container.innerHTML = html;
            container.style.display = 'block';
        }}

        function createResultHTML(result) {{
            const isCorrect = result.is_correct;
            return `
                <div class="result-item $'{'}isCorrect ? 'correct' : 'incorrect'{'}">
                    <div class="result-command">${'{'}escapeHtml(result.command || 'N/A'){'}'}</div>
                    <div class="result-meta">
                        <span class="category-pill expected">Expected: $'{'}result.expected{'}'}</span>
                        <span class="category-pill $'{'}isCorrect ? 'predicted' : 'incorrect'{'}">
                            Predicted: $'{'}result.predicted{'}'}
                        </span>
                        <span style="margin-left: 10px;">Confidence: $'{'}(result.confidence * 100).toFixed(1){'}'}%</span>
                        <span style="margin-left: 10px;">Latency: $'{'}result.latency_ms.toFixed(1){'}'}ms</span>
                    </div>
                </div>
            `;
        }}

        function escapeHtml(text) {{
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }}
    </script>
</body>
</html>
"""
        return html

    def save_preview_html(self, output_path: str = "evaluation_preview.html"):
        """HTMLプレビューを保存"""
        html = self.generate_summary_buttons()

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)

        print(f"✅ Preview HTML saved to: {output_path}")
        return output_path

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 preview_button_system.py <evaluation_report.json>")
        sys.exit(1)

    report_path = sys.argv[1]
    preview_system = PreviewButtonSystem(report_path)
    html_path = preview_system.save_preview_html()

    print(f"\n🌐 Open in browser: file://{html_path}")
