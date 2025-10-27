
import json
import random

# Expanded product/feature combinations
products = {
    "web_app": [
        "Slack", "Discord", "Teams", "Zoom", "Notion", "Trello",
        "Jira", "Asana", "GitHub", "GitLab", "Figma", "Miro",
        "Twitter", "Facebook", "Instagram", "LinkedIn", "Netflix",
        "Spotify", "YouTube", "Shopify", "Airbnb", "Uber"
    ],
    "api": [
        "Stripe", "PayPal", "Twilio", "SendGrid", "OpenAI",
        "AWS", "Google Cloud", "Azure", "Auth0", "Firebase"
    ],
    "visualization": [
        "Tableau", "Grafana", "Kibana", "D3.js", "Chart.js",
        "Plotly", "Matplotlib", "Seaborn"
    ],
    "docker": [
        "Docker", "Kubernetes", "Docker Compose", "Helm",
        "Rancher", "OpenShift"
    ]
}

features = {
    "web_app": [
        "リアルタイムチャット", "通知システム", "ダッシュボード", "ファイル共有",
        "コメント機能", "いいね機能", "検索", "フィルタ", "ソート",
        "ユーザー認証", "権限管理", "プロフィール", "タイムライン",
        "投稿機能", "フォロー機能", "メッセージング", "タスク管理",
        "カンバンボード", "カレンダー", "予約システム"
    ]
}

samples = []

# Generate 3000 web_app samples (most problematic)
for _ in range(3000):
    prod = random.choice(products["web_app"])
    feat = random.choice(features["web_app"])
    templates = [
        f"{prod}風の{feat}",
        f"{prod}のような{feat}を実装",
        f"{prod}に似た{feat}機能",
        f"{prod}スタイルの{feat}開発",
    ]
    cmd = random.choice(templates)
    samples.append({"command": cmd, "category": "web_app", "confidence": round(random.uniform(0.75, 0.95), 2)})

# Generate 800 api samples
for _ in range(800):
    prod = random.choice(products["api"])
    templates = [
        f"{prod} API統合",
        f"{prod}を使用した決済処理",
        f"{prod}による認証実装",
        f"{prod} SDK導入",
    ]
    cmd = random.choice(templates)
    samples.append({"command": cmd, "category": "api", "confidence": round(random.uniform(0.75, 0.95), 2)})

# Generate 600 visualization samples
for _ in range(600):
    prod = random.choice(products["visualization"])
    templates = [
        f"{prod}でダッシュボード作成",
        f"{prod}による可視化",
        f"{prod}グラフ実装",
        f"{prod}チャート開発",
    ]
    cmd = random.choice(templates)
    samples.append({"command": cmd, "category": "visualization", "confidence": round(random.uniform(0.75, 0.95), 2)})

# Generate 600 docker samples
for _ in range(600):
    prod = random.choice(products["docker"])
    templates = [
        f"{prod}でコンテナ化",
        f"{prod}デプロイ設定",
        f"{prod}オーケストレーション",
        f"{prod}環境構築",
    ]
    cmd = random.choice(templates)
    samples.append({"command": cmd, "category": "docker", "confidence": round(random.uniform(0.75, 0.95), 2)})

random.shuffle(samples)

with open("additional_real_world_5k.json", "w", encoding="utf-8") as f:
    json.dump(samples, f, indent=2, ensure_ascii=False)

print(f"Generated {len(samples)} additional samples")
