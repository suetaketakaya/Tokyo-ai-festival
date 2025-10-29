"""
短文特化特徴量抽出器

短文（<150文字）での精度向上のため、追加の50次元特徴量を提供します。

目標: 短文精度 15.8% → 35-45%

使用例:
    from short_text_features import extract_short_text_features

    features = extract_short_text_features("Slackのようなチャットアプリ作成")
    # => 50次元のリスト
"""

def extract_short_text_features(command: str) -> list:
    """
    短文（<150文字）専用の特徴量抽出

    特徴量グループ:
    1. 固有名詞検出（20次元）: Web製品名、APIサービス名
    2. 動詞パターン（10次元）: build, create, train等のアクション
    3. 技術スタック明示（10次元）: React, Python, TensorFlow等
    4. 文の構造パターン（5次元）: 疑問文、命令形、キーワード
    5. 短文メタ特徴（5次元）: 単語密度、大文字率、記号率

    Args:
        command: 分析対象のコマンドテキスト

    Returns:
        50次元の特徴量ベクトル（リスト）

    Examples:
        >>> features = extract_short_text_features("Slackアプリ作成")
        >>> len(features)
        50
        >>> features[0]  # slack検出
        1
    """
    features = []
    lower_cmd = command.lower()
    length = len(command)

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # グループ1: 固有名詞検出（20次元）
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    # Web App製品名（10次元）
    web_products = [
        'slack', 'notion', 'figma', 'trello', 'asana',
        'spotify', 'netflix', 'youtube', 'zoom', 'discord'
    ]
    features.extend([1 if prod in lower_cmd else 0 for prod in web_products])

    # API サービス名（10次元）
    api_services = [
        'stripe', 'twilio', 'sendgrid', 'aws', 'azure',
        'openai', 'google maps', 'mailchimp', 'paypal', 'postman'
    ]
    features.extend([1 if srv in lower_cmd else 0 for srv in api_services])

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # グループ2: 動詞パターン（10次元）
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    action_verbs = {
        'build': ['build', 'create', '構築', '作成', '作って', '作る'],
        'implement': ['implement', 'develop', '実装', '開発'],
        'train': ['train', 'learn', '訓練', '学習'],
        'analyze': ['analyze', 'examine', '分析', '調査'],
        'visualize': ['visualize', 'plot', 'chart', '可視化', 'グラフ', '表示'],
        'deploy': ['deploy', 'launch', 'デプロイ', '起動'],
        'test': ['test', 'validate', 'テスト', '検証'],
        'optimize': ['optimize', 'improve', '最適化', '改善'],
        'integrate': ['integrate', 'connect', '統合', '連携'],
        'monitor': ['monitor', 'track', '監視', '追跡']
    }

    for verb_group in action_verbs.values():
        features.append(1 if any(v in lower_cmd for v in verb_group) else 0)

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # グループ3: 技術スタック明示（10次元）
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    tech_stacks = [
        'react', 'vue', 'angular', 'python', 'javascript',
        'tensorflow', 'pytorch', 'docker', 'kubernetes', 'fastapi'
    ]
    features.extend([1 if tech in lower_cmd else 0 for tech in tech_stacks])

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # グループ4: 文の構造パターン（5次元）
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    # 疑問文
    features.append(1 if any(q in command for q in ['?', 'どう', 'どのように', 'how', 'what']) else 0)

    # 命令形
    features.append(1 if any(imp in lower_cmd for imp in ['please', 'してください', 'して', 'create', 'build', '作って']) else 0)

    # APIキーワード
    features.append(1 if any(api in lower_cmd for api in ['api', 'endpoint', 'rest', 'graphql']) else 0)

    # データキーワード
    features.append(1 if any(data in lower_cmd for data in ['data', 'database', 'csv', 'データ', 'db']) else 0)

    # UIキーワード
    features.append(1 if any(ui in lower_cmd for ui in ['ui', 'interface', '画面', 'page', 'ページ', 'アプリ']) else 0)

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # グループ5: 短文メタ特徴（5次元）
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    # 単語密度（情報量）
    words = command.split()
    features.append(len(words) / max(length, 1))  # 単語密度

    # 大文字の割合（技術名が多い）
    features.append(sum(1 for c in command if c.isupper()) / max(length, 1))

    # 記号の割合
    features.append(sum(1 for c in command if c in '.,!?-_/()[]{}') / max(length, 1))

    # 数字の有無
    features.append(1 if any(c.isdigit() for c in command) else 0)

    # URL/ドメインの有無
    features.append(1 if any(domain in lower_cmd for domain in ['.com', '.io', '.ai', 'http', 'https', 'www']) else 0)

    assert len(features) == 50, f"Expected 50 features, got {len(features)}"
    return features


def get_feature_names() -> list:
    """
    特徴量の名前リストを返す（デバッグ・解釈用）

    Returns:
        50個の特徴量名のリスト
    """
    names = []

    # グループ1: Web製品名（10）
    web_products = ['slack', 'notion', 'figma', 'trello', 'asana',
                   'spotify', 'netflix', 'youtube', 'zoom', 'discord']
    names.extend([f'web_prod_{prod}' for prod in web_products])

    # グループ1: APIサービス名（10）
    api_services = ['stripe', 'twilio', 'sendgrid', 'aws', 'azure',
                   'openai', 'google_maps', 'mailchimp', 'paypal', 'postman']
    names.extend([f'api_svc_{svc}' for svc in api_services])

    # グループ2: 動詞パターン（10）
    verbs = ['build', 'implement', 'train', 'analyze', 'visualize',
            'deploy', 'test', 'optimize', 'integrate', 'monitor']
    names.extend([f'verb_{v}' for v in verbs])

    # グループ3: 技術スタック（10）
    tech_stacks = ['react', 'vue', 'angular', 'python', 'javascript',
                  'tensorflow', 'pytorch', 'docker', 'kubernetes', 'fastapi']
    names.extend([f'tech_{t}' for t in tech_stacks])

    # グループ4: 文の構造（5）
    names.extend(['question', 'imperative', 'api_keyword', 'data_keyword', 'ui_keyword'])

    # グループ5: メタ特徴（5）
    names.extend(['word_density', 'uppercase_ratio', 'symbol_ratio', 'has_digit', 'has_url'])

    assert len(names) == 50, f"Expected 50 feature names, got {len(names)}"
    return names


def analyze_short_text(command: str) -> dict:
    """
    短文の詳細分析（デバッグ用）

    Args:
        command: 分析対象のテキスト

    Returns:
        分析結果の辞書

    Examples:
        >>> result = analyze_short_text("Slackアプリ作成")
        >>> result['length']
        11
        >>> result['is_short']
        True
        >>> 'slack' in result['detected_products']
        True
    """
    features = extract_short_text_features(command)
    feature_names = get_feature_names()

    # アクティブな特徴量（値が1のもの）を抽出
    active_features = [
        feature_names[i]
        for i in range(len(features))
        if features[i] == 1 or (isinstance(features[i], float) and features[i] > 0.1)
    ]

    return {
        'command': command,
        'length': len(command),
        'is_short': len(command) < 150,
        'num_words': len(command.split()),
        'features': features,
        'feature_names': feature_names,
        'active_features': active_features,
        'num_active': len(active_features)
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# テスト・デバッグ用
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if __name__ == '__main__':
    # テストケース
    test_cases = [
        # 短文（実世界データの典型例）
        "Slackアプリ作成",
        "Stripe決済統合",
        "Kaggleモデル訓練",
        "Reactで画面作って",
        "matplotlibグラフ",
        "APIテスト",
        "データ分析",

        # やや長め
        "Slackのようなチャットアプリを作成してください",
        "StripeとTwilioで決済と通知機能を実装",
    ]

    print("=" * 70)
    print(" 短文特化特徴量抽出テスト")
    print("=" * 70)

    for i, test_text in enumerate(test_cases, 1):
        print(f"\n{'─' * 70}")
        print(f"Test {i}: {test_text}")
        print(f"{'─' * 70}")

        # 分析実行
        result = analyze_short_text(test_text)

        print(f"  文字数: {result['length']}")
        print(f"  単語数: {result['num_words']}")
        print(f"  短文判定: {'Yes' if result['is_short'] else 'No'}")
        print(f"  アクティブ特徴量: {result['num_active']}/50")

        if result['active_features']:
            print(f"\n  検出された特徴:")
            for feat in result['active_features'][:10]:  # 最初の10個のみ表示
                print(f"    - {feat}")
            if len(result['active_features']) > 10:
                print(f"    ... and {len(result['active_features']) - 10} more")

    print("\n" + "=" * 70)
    print(f" テスト完了")
    print("=" * 70)
    print(f"\n特徴量次元: 50")
    print(f"特徴量グループ:")
    print(f"  - 固有名詞検出: 20次元")
    print(f"  - 動詞パターン: 10次元")
    print(f"  - 技術スタック: 10次元")
    print(f"  - 文の構造: 5次元")
    print(f"  - メタ特徴: 5次元")
