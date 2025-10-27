"""
製品名・サービス名マッピング辞書

実世界データでの精度向上のため、主要な製品・サービス名を
カテゴリにマッピングします。

使用例:
    from product_mapping_dictionary import get_product_category

    result = get_product_category("Slackのようなチャットアプリを作って")
    # => {'suggested_category': 'web_app', 'confidence_boost': 0.95, ...}
"""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 製品名マッピング辞書
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRODUCT_MAPPINGS = {
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Web App / Collaboration & Communication
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    'slack': {'category': 'web_app', 'subcategory': 'collaboration', 'weight': 0.95},
    'discord': {'category': 'web_app', 'subcategory': 'chat', 'weight': 0.95},
    'teams': {'category': 'web_app', 'subcategory': 'collaboration', 'weight': 0.95},
    'zoom': {'category': 'web_app', 'subcategory': 'video_conference', 'weight': 0.95},
    'meet': {'category': 'web_app', 'subcategory': 'video_conference', 'weight': 0.90},
    'miro': {'category': 'web_app', 'subcategory': 'whiteboard', 'weight': 0.90},
    'mural': {'category': 'web_app', 'subcategory': 'whiteboard', 'weight': 0.90},

    # Web App / Productivity
    'notion': {'category': 'web_app', 'subcategory': 'productivity', 'weight': 0.95},
    'evernote': {'category': 'web_app', 'subcategory': 'note_taking', 'weight': 0.90},
    'onenote': {'category': 'web_app', 'subcategory': 'note_taking', 'weight': 0.90},
    'obsidian': {'category': 'web_app', 'subcategory': 'note_taking', 'weight': 0.90},
    'roam': {'category': 'web_app', 'subcategory': 'note_taking', 'weight': 0.85},

    # Web App / Project Management
    'asana': {'category': 'web_app', 'subcategory': 'project_management', 'weight': 0.95},
    'trello': {'category': 'web_app', 'subcategory': 'project_management', 'weight': 0.95},
    'jira': {'category': 'web_app', 'subcategory': 'project_management', 'weight': 0.95},
    'monday': {'category': 'web_app', 'subcategory': 'project_management', 'weight': 0.90},
    'clickup': {'category': 'web_app', 'subcategory': 'project_management', 'weight': 0.90},
    'basecamp': {'category': 'web_app', 'subcategory': 'project_management', 'weight': 0.90},

    # Web App / Design
    'figma': {'category': 'web_app', 'subcategory': 'design', 'weight': 0.95},
    'sketch': {'category': 'web_app', 'subcategory': 'design', 'weight': 0.90},
    'invision': {'category': 'web_app', 'subcategory': 'design', 'weight': 0.85},
    'adobe xd': {'category': 'web_app', 'subcategory': 'design', 'weight': 0.90},

    # Web App / Media & Entertainment
    'spotify': {'category': 'web_app', 'subcategory': 'media', 'weight': 0.95},
    'netflix': {'category': 'web_app', 'subcategory': 'media', 'weight': 0.95},
    'youtube': {'category': 'web_app', 'subcategory': 'media', 'weight': 0.95},
    'twitch': {'category': 'web_app', 'subcategory': 'streaming', 'weight': 0.95},
    'soundcloud': {'category': 'web_app', 'subcategory': 'media', 'weight': 0.90},

    # Web App / Developer Tools
    'github': {'category': 'web_app', 'subcategory': 'dev_tools', 'weight': 0.95},
    'gitlab': {'category': 'web_app', 'subcategory': 'dev_tools', 'weight': 0.95},
    'bitbucket': {'category': 'web_app', 'subcategory': 'dev_tools', 'weight': 0.90},

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # API / Payment
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    'stripe': {'category': 'api', 'subcategory': 'payment', 'weight': 0.95},
    'paypal': {'category': 'api', 'subcategory': 'payment', 'weight': 0.95},
    'square': {'category': 'api', 'subcategory': 'payment', 'weight': 0.90},
    'braintree': {'category': 'api', 'subcategory': 'payment', 'weight': 0.85},
    'razorpay': {'category': 'api', 'subcategory': 'payment', 'weight': 0.85},

    # API / Communication
    'twilio': {'category': 'api', 'subcategory': 'communication', 'weight': 0.95},
    'sendgrid': {'category': 'api', 'subcategory': 'email', 'weight': 0.95},
    'mailgun': {'category': 'api', 'subcategory': 'email', 'weight': 0.90},
    'mailchimp': {'category': 'api', 'subcategory': 'email_marketing', 'weight': 0.90},
    'vonage': {'category': 'api', 'subcategory': 'communication', 'weight': 0.85},

    # API / Maps & Location
    'google maps': {'category': 'api', 'subcategory': 'maps', 'weight': 0.95},
    'mapbox': {'category': 'api', 'subcategory': 'maps', 'weight': 0.95},
    'here maps': {'category': 'api', 'subcategory': 'maps', 'weight': 0.85},

    # API / Cloud & Infrastructure
    'aws': {'category': 'api', 'subcategory': 'cloud', 'weight': 0.95},
    'azure': {'category': 'api', 'subcategory': 'cloud', 'weight': 0.95},
    'gcp': {'category': 'api', 'subcategory': 'cloud', 'weight': 0.95},
    'digitalocean': {'category': 'api', 'subcategory': 'cloud', 'weight': 0.90},
    'heroku': {'category': 'api', 'subcategory': 'paas', 'weight': 0.90},
    'vercel': {'category': 'api', 'subcategory': 'deployment', 'weight': 0.90},
    'netlify': {'category': 'api', 'subcategory': 'deployment', 'weight': 0.90},

    # API / AI & ML
    'openai': {'category': 'api', 'subcategory': 'ai', 'weight': 0.95},
    'anthropic': {'category': 'api', 'subcategory': 'ai', 'weight': 0.95},
    'claude': {'category': 'api', 'subcategory': 'ai', 'weight': 0.95},
    'chatgpt': {'category': 'api', 'subcategory': 'ai', 'weight': 0.95},
    'gpt': {'category': 'api', 'subcategory': 'ai', 'weight': 0.90},
    'cohere': {'category': 'api', 'subcategory': 'ai', 'weight': 0.90},

    # API / Testing & Development
    'postman': {'category': 'api', 'subcategory': 'testing', 'weight': 0.95},
    'insomnia': {'category': 'api', 'subcategory': 'testing', 'weight': 0.90},
    'swagger': {'category': 'api', 'subcategory': 'documentation', 'weight': 0.90},

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Machine Learning / Platforms
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    'kaggle': {'category': 'machine_learning', 'subcategory': 'platform', 'weight': 0.95},
    'huggingface': {'category': 'machine_learning', 'subcategory': 'platform', 'weight': 0.95},
    'hugging face': {'category': 'machine_learning', 'subcategory': 'platform', 'weight': 0.95},
    'wandb': {'category': 'machine_learning', 'subcategory': 'mlops', 'weight': 0.95},
    'weights & biases': {'category': 'machine_learning', 'subcategory': 'mlops', 'weight': 0.95},
    'mlflow': {'category': 'machine_learning', 'subcategory': 'mlops', 'weight': 0.90},
    'clearml': {'category': 'machine_learning', 'subcategory': 'mlops', 'weight': 0.85},

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Jupyter / Notebooks
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    'colab': {'category': 'jupyter', 'subcategory': 'notebook', 'weight': 0.95},
    'google colab': {'category': 'jupyter', 'subcategory': 'notebook', 'weight': 0.95},
    'jupyterlab': {'category': 'jupyter', 'subcategory': 'notebook', 'weight': 0.95},
    'jupyter': {'category': 'jupyter', 'subcategory': 'notebook', 'weight': 0.95},
    'databricks': {'category': 'jupyter', 'subcategory': 'notebook', 'weight': 0.90},
    'deepnote': {'category': 'jupyter', 'subcategory': 'notebook', 'weight': 0.85},

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Visualization / BI & Analytics
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    'tableau': {'category': 'visualization', 'subcategory': 'bi', 'weight': 0.95},
    'power bi': {'category': 'visualization', 'subcategory': 'bi', 'weight': 0.95},
    'powerbi': {'category': 'visualization', 'subcategory': 'bi', 'weight': 0.95},
    'looker': {'category': 'visualization', 'subcategory': 'bi', 'weight': 0.90},
    'qlik': {'category': 'visualization', 'subcategory': 'bi', 'weight': 0.85},
    'metabase': {'category': 'visualization', 'subcategory': 'bi', 'weight': 0.85},

    # Visualization / Monitoring & Dashboards
    'grafana': {'category': 'visualization', 'subcategory': 'monitoring', 'weight': 0.95},
    'kibana': {'category': 'visualization', 'subcategory': 'monitoring', 'weight': 0.90},
    'datadog': {'category': 'visualization', 'subcategory': 'monitoring', 'weight': 0.90},
    'new relic': {'category': 'visualization', 'subcategory': 'monitoring', 'weight': 0.85},

    # Visualization / Design Tools
    'canva': {'category': 'visualization', 'subcategory': 'design', 'weight': 0.90},
    'adobe': {'category': 'visualization', 'subcategory': 'design', 'weight': 0.85},

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Data Analysis / Databases
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    'snowflake': {'category': 'data_analysis', 'subcategory': 'database', 'weight': 0.90},
    'bigquery': {'category': 'data_analysis', 'subcategory': 'database', 'weight': 0.90},
    'redshift': {'category': 'data_analysis', 'subcategory': 'database', 'weight': 0.90},
    'postgres': {'category': 'data_analysis', 'subcategory': 'database', 'weight': 0.85},
    'mysql': {'category': 'data_analysis', 'subcategory': 'database', 'weight': 0.85},
    'mongodb': {'category': 'data_analysis', 'subcategory': 'database', 'weight': 0.85},

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Docker / Container & Orchestration
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    'kubernetes': {'category': 'docker', 'subcategory': 'orchestration', 'weight': 0.95},
    'k8s': {'category': 'docker', 'subcategory': 'orchestration', 'weight': 0.95},
    'docker-compose': {'category': 'docker', 'subcategory': 'compose', 'weight': 0.95},
    'docker': {'category': 'docker', 'subcategory': 'container', 'weight': 0.95},
    'podman': {'category': 'docker', 'subcategory': 'container', 'weight': 0.85},

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Network / Networking Tools
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    'nginx': {'category': 'network', 'subcategory': 'web_server', 'weight': 0.90},
    'apache': {'category': 'network', 'subcategory': 'web_server', 'weight': 0.85},
    'cloudflare': {'category': 'network', 'subcategory': 'cdn', 'weight': 0.90},
}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ヘルパー関数
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def get_product_category(text: str) -> dict:
    """
    テキストから製品名を検出し、カテゴリを返す

    Args:
        text: 分析対象のテキスト

    Returns:
        {
            'detected_products': [
                {'name': str, 'category': str, 'subcategory': str, 'weight': float}
            ],
            'suggested_category': str or None,
            'confidence_boost': float,
            'num_matches': int
        }

    Examples:
        >>> result = get_product_category("Slackのようなチャットアプリを作って")
        >>> result['suggested_category']
        'web_app'
        >>> result['confidence_boost']
        0.95

        >>> result = get_product_category("StripeとTwilioを使って決済と通知")
        >>> result['num_matches']
        2
        >>> result['suggested_category']
        'api'
    """
    text_lower = text.lower()
    detected = []

    # 製品名検出
    for product, info in PRODUCT_MAPPINGS.items():
        if product in text_lower:
            detected.append({
                'name': product,
                'category': info['category'],
                'subcategory': info.get('subcategory', ''),
                'weight': info['weight']
            })

    # 検出なし
    if not detected:
        return {
            'detected_products': [],
            'suggested_category': None,
            'confidence_boost': 0.0,
            'num_matches': 0
        }

    # 最も高いweightの製品を採用
    best_match = max(detected, key=lambda x: x['weight'])

    return {
        'detected_products': detected,
        'suggested_category': best_match['category'],
        'confidence_boost': best_match['weight'],
        'num_matches': len(detected)
    }


def get_all_products_by_category(category: str) -> list:
    """
    特定のカテゴリに属する製品を全て取得

    Args:
        category: カテゴリ名（'web_app', 'api', 'machine_learning'等）

    Returns:
        製品名のリスト

    Examples:
        >>> products = get_all_products_by_category('api')
        >>> 'stripe' in products
        True
        >>> 'openai' in products
        True
    """
    return [
        product
        for product, info in PRODUCT_MAPPINGS.items()
        if info['category'] == category
    ]


def get_product_info(product_name: str) -> dict:
    """
    製品名から詳細情報を取得

    Args:
        product_name: 製品名（小文字）

    Returns:
        製品情報の辞書、見つからない場合はNone

    Examples:
        >>> info = get_product_info('slack')
        >>> info['category']
        'web_app'
        >>> info['subcategory']
        'collaboration'
    """
    return PRODUCT_MAPPINGS.get(product_name.lower())


def get_category_stats() -> dict:
    """
    各カテゴリの製品数を集計

    Returns:
        カテゴリ別の製品数

    Examples:
        >>> stats = get_category_stats()
        >>> stats['web_app'] > 10
        True
    """
    category_counts = {}
    for info in PRODUCT_MAPPINGS.values():
        category = info['category']
        category_counts[category] = category_counts.get(category, 0) + 1

    return category_counts


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# テスト・デバッグ用
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if __name__ == '__main__':
    # テストケース
    test_cases = [
        "Slackのようなチャットアプリを作って",
        "Stripe決済を統合",
        "KaggleコンペのためのMLモデル",
        "Google Colabで訓練",
        "Tableau ダッシュボード作成",
        "React と TypeScript で Web アプリ",
        "StripeとTwilioを使って決済と通知機能",
    ]

    print("=" * 70)
    print(" 製品名辞書テスト")
    print("=" * 70)

    for test_text in test_cases:
        result = get_product_category(test_text)
        print(f"\nInput: {test_text}")
        print(f"  Detected: {len(result['detected_products'])} products")
        for prod in result['detected_products']:
            print(f"    - {prod['name']} ({prod['category']}/{prod['subcategory']}, weight={prod['weight']})")
        print(f"  Suggested: {result['suggested_category']} (boost: {result['confidence_boost']})")

    # カテゴリ統計
    print("\n" + "=" * 70)
    print(" カテゴリ別製品数")
    print("=" * 70)
    stats = get_category_stats()
    for category, count in sorted(stats.items(), key=lambda x: x[1], reverse=True):
        print(f"  {category}: {count} products")

    print(f"\n合計: {sum(stats.values())} products")
