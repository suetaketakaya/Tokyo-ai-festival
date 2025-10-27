# 実世界データ精度改善：詳細実装プラン

## 現状分析

### 深刻な問題
- **AI生成データ**: 70.8%
- **実世界データ**: 9.5% ❌
- **短文（<150文字）**: 15.8% ⚠️

### 根本原因
1. テンプレートベース訓練データと実世界の言語的ギャップ
2. 製品名・サービス名の欠如（Slack, Notion, Stripe等）
3. 短文での特徴抽出不足
4. カテゴリ境界の曖昧性

---

## 改善フロー（優先度順）

## 🔥 Phase 1: 即効性のある改善（1-2週間）

### 1.1 製品名辞書の構築と統合

**目的**: 実世界の製品名・サービス名を認識できるようにする

**実装ステップ**:

#### Step 1: 製品名辞書の作成

```python
# server/build_clean/product_mapping_dictionary.py

PRODUCT_MAPPINGS = {
    # Web App / Collaboration
    'slack': {'category': 'web_app', 'subcategory': 'collaboration', 'weight': 0.95},
    'notion': {'category': 'web_app', 'subcategory': 'productivity', 'weight': 0.95},
    'figma': {'category': 'web_app', 'subcategory': 'design', 'weight': 0.90},
    'miro': {'category': 'web_app', 'subcategory': 'collaboration', 'weight': 0.90},
    'asana': {'category': 'web_app', 'subcategory': 'project_management', 'weight': 0.90},
    'trello': {'category': 'web_app', 'subcategory': 'project_management', 'weight': 0.90},

    # Web App / Media & Entertainment
    'spotify': {'category': 'web_app', 'subcategory': 'media', 'weight': 0.95},
    'netflix': {'category': 'web_app', 'subcategory': 'media', 'weight': 0.95},
    'youtube': {'category': 'web_app', 'subcategory': 'media', 'weight': 0.95},

    # API / Payment
    'stripe': {'category': 'api', 'subcategory': 'payment', 'weight': 0.95},
    'paypal': {'category': 'api', 'subcategory': 'payment', 'weight': 0.90},
    'square': {'category': 'api', 'subcategory': 'payment', 'weight': 0.90},

    # API / Communication
    'twilio': {'category': 'api', 'subcategory': 'communication', 'weight': 0.95},
    'sendgrid': {'category': 'api', 'subcategory': 'email', 'weight': 0.90},
    'mailchimp': {'category': 'api', 'subcategory': 'email', 'weight': 0.85},

    # API / Maps & Location
    'google maps': {'category': 'api', 'subcategory': 'maps', 'weight': 0.95},
    'mapbox': {'category': 'api', 'subcategory': 'maps', 'weight': 0.90},

    # API / Cloud & Infrastructure
    'aws': {'category': 'api', 'subcategory': 'cloud', 'weight': 0.90},
    'azure': {'category': 'api', 'subcategory': 'cloud', 'weight': 0.90},
    'gcp': {'category': 'api', 'subcategory': 'cloud', 'weight': 0.90},

    # ML Platforms
    'kaggle': {'category': 'machine_learning', 'subcategory': 'platform', 'weight': 0.95},
    'huggingface': {'category': 'machine_learning', 'subcategory': 'platform', 'weight': 0.95},
    'colab': {'category': 'jupyter', 'subcategory': 'notebook', 'weight': 0.90},
    'wandb': {'category': 'machine_learning', 'subcategory': 'mlops', 'weight': 0.90},

    # ML APIs
    'openai': {'category': 'api', 'subcategory': 'ai', 'weight': 0.95},
    'anthropic': {'category': 'api', 'subcategory': 'ai', 'weight': 0.95},
    'claude': {'category': 'api', 'subcategory': 'ai', 'weight': 0.95},

    # Visualization Tools
    'tableau': {'category': 'visualization', 'subcategory': 'bi', 'weight': 0.95},
    'grafana': {'category': 'visualization', 'subcategory': 'monitoring', 'weight': 0.90},
    'canva': {'category': 'visualization', 'subcategory': 'design', 'weight': 0.85},
    'powerbi': {'category': 'visualization', 'subcategory': 'bi', 'weight': 0.90},

    # Development Tools
    'github': {'category': 'web_app', 'subcategory': 'dev_tools', 'weight': 0.90},
    'gitlab': {'category': 'web_app', 'subcategory': 'dev_tools', 'weight': 0.90},
    'postman': {'category': 'api', 'subcategory': 'testing', 'weight': 0.95},

    # Communication Platforms
    'zoom': {'category': 'web_app', 'subcategory': 'video_conference', 'weight': 0.90},
    'discord': {'category': 'web_app', 'subcategory': 'chat', 'weight': 0.90},
    'teams': {'category': 'web_app', 'subcategory': 'collaboration', 'weight': 0.90},
}

def get_product_category(text: str) -> dict:
    """
    テキストから製品名を検出し、カテゴリを返す

    Returns:
        {
            'detected_products': [{'name': str, 'category': str, 'weight': float}],
            'suggested_category': str,
            'confidence_boost': float
        }
    """
    text_lower = text.lower()
    detected = []

    for product, info in PRODUCT_MAPPINGS.items():
        if product in text_lower:
            detected.append({
                'name': product,
                'category': info['category'],
                'weight': info['weight']
            })

    if not detected:
        return {'detected_products': [], 'suggested_category': None, 'confidence_boost': 0.0}

    # 最も高いweightの製品を採用
    best_match = max(detected, key=lambda x: x['weight'])

    return {
        'detected_products': detected,
        'suggested_category': best_match['category'],
        'confidence_boost': best_match['weight']
    }
```

#### Step 2: モデルへの統合

```python
# server/build_clean/wandb_local_model.py に追加

from product_mapping_dictionary import get_product_category

class RemoteClaudeMLModel:
    def predict(self, command, claude_cli_result=None):
        """
        製品名辞書を活用した予測
        """
        # Step 1: 製品名検出
        product_info = get_product_category(command)

        # Step 2: 通常のML予測
        X_text = self.vectorizer.transform([command])
        X_manual = np.array([self._extract_features(command)])
        X_combined = np.hstack([X_text.toarray(), X_manual])

        ml_category_proba = self.classifier.predict_proba(X_combined)[0]
        ml_category_idx = np.argmax(ml_category_proba)
        ml_category = self.categories[ml_category_idx]
        ml_confidence = self.confidence_estimator.predict(X_combined)[0]

        # Step 3: 製品名検出がある場合、信頼度を大幅にブースト
        if product_info['suggested_category']:
            suggested_cat = product_info['suggested_category']
            boost = product_info['confidence_boost']

            # 製品名が示すカテゴリが予測と一致 → 信頼度ブースト
            if suggested_cat == ml_category:
                final_category = ml_category
                final_confidence = min(1.0, ml_confidence + 0.15)  # +15%ブースト
                prediction_source = "ml_with_product_boost"

            # 製品名が示すカテゴリが予測と不一致 → 製品名を優先
            else:
                final_category = suggested_cat
                final_confidence = boost  # 製品のweightを信頼度として使用
                prediction_source = "product_override"

        # Step 4: Claude CLI結果とブレンド（従来通り）
        elif claude_cli_result:
            # ... 既存のブレンディングロジック
            pass

        else:
            final_category = ml_category
            final_confidence = ml_confidence
            prediction_source = "ml_only"

        return {
            "command_type": final_category,
            "confidence": float(final_confidence),
            "product_detection": product_info,
            "prediction_source": prediction_source,
            "ml_prediction": {
                "category": ml_category,
                "confidence": float(ml_confidence)
            }
        }
```

**期待効果**:
- 実世界データでの精度: 9.5% → **40-50%**
- 特に製品名を含むクエリで大幅改善

---

### 1.2 短文特化の特徴エンジニアリング

**問題**: 短文（<150文字）で15.8%と極端に低い

**解決策**: 短文専用の特徴量を追加

```python
# server/build_clean/enhanced_feature_extractor.py

def extract_short_text_features(command: str) -> list:
    """
    短文（<150文字）専用の特徴量抽出

    Returns:
        50次元の特徴量ベクトル
    """
    features = []
    lower_cmd = command.lower()
    length = len(command)

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # グループ1: 固有名詞検出（20次元）
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    # Web App製品名
    web_products = ['slack', 'notion', 'figma', 'trello', 'asana',
                   'spotify', 'netflix', 'youtube', 'zoom', 'discord']
    features.extend([1 if prod in lower_cmd else 0 for prod in web_products])

    # API サービス名
    api_services = ['stripe', 'twilio', 'sendgrid', 'aws', 'azure',
                   'openai', 'google maps', 'mailchimp', 'paypal', 'postman']
    features.extend([1 if srv in lower_cmd else 0 for srv in api_services])

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # グループ2: 動詞パターン（10次元）
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    action_verbs = {
        'build': ['build', 'create', '構築', '作成'],
        'implement': ['implement', 'develop', '実装', '開発'],
        'train': ['train', 'learn', '訓練', '学習'],
        'analyze': ['analyze', 'examine', '分析', '調査'],
        'visualize': ['visualize', 'plot', 'chart', '可視化', 'グラフ'],
        'deploy': ['deploy', 'launch', 'デプロイ', '起動'],
        'test': ['test', 'validate', 'テスト', '検証'],
        'optimize': ['optimize', 'improve', '最適化', '改善'],
        'integrate': ['integrate', 'connect', '統合', '連携'],
        'monitor': ['monitor', 'track', '監視', '追跡']
    }

    for verb_group in action_verbs.values():
        features.append(1 if any(v in lower_cmd for v in verb_group) else 0)

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # グループ3: 技術スタック明示（10次元）
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    tech_stacks = [
        'react', 'vue', 'angular', 'python', 'javascript',
        'tensorflow', 'pytorch', 'docker', 'kubernetes', 'fastapi'
    ]
    features.extend([1 if tech in lower_cmd else 0 for tech in tech_stacks])

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # グループ4: 文の構造パターン（5次元）
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    # 疑問文
    features.append(1 if any(q in command for q in ['?', 'どう', 'どのように', 'how']) else 0)

    # 命令形
    features.append(1 if any(imp in lower_cmd for imp in ['please', 'してください', 'して', 'create', 'build']) else 0)

    # APIキーワード
    features.append(1 if any(api in lower_cmd for api in ['api', 'endpoint', 'rest', 'graphql']) else 0)

    # データキーワード
    features.append(1 if any(data in lower_cmd for data in ['data', 'database', 'csv', 'データ']) else 0)

    # UIキーワード
    features.append(1 if any(ui in lower_cmd for ui in ['ui', 'interface', '画面', 'page', 'ページ']) else 0)

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # グループ5: 短文メタ特徴（5次元）
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
    features.append(1 if any(domain in lower_cmd for domain in ['.com', '.io', '.ai', 'http']) else 0)

    return features  # 合計50次元
```

**モデルへの統合**:

```python
class RemoteClaudeMLModel:
    def _extract_features(self, command, category=None):
        """
        既存の86次元特徴量 + 短文特化50次元 = 136次元
        """
        # 既存特徴量（86次元）
        base_features = self._extract_base_features(command, category)

        # 短文の場合、追加特徴量を結合
        if len(command) < 150:
            from enhanced_feature_extractor import extract_short_text_features
            short_features = extract_short_text_features(command)
            return base_features + short_features  # 136次元
        else:
            # 長文の場合、ゼロパディング
            return base_features + [0] * 50
```

**期待効果**:
- 短文精度: 15.8% → **35-45%**

---

### 1.3 実世界データ収集と拡張訓練

**目的**: テンプレートデータのバイアスを減らす

#### Step 1: 実世界サンプル収集

```python
# server/build_clean/collect_real_world_samples.py

def generate_real_world_training_data():
    """
    実世界のユースケースに基づく訓練データ生成
    """

    real_world_samples = []

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Web App（短文）
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    web_app_short = [
        "Slackのようなチャットアプリを作って",
        "Notionクローンを構築",
        "Spotifyみたいな音楽アプリ",
        "Figmaで使えるプラグイン開発",
        "Trelloボードの実装",
        "Zoom代替のビデオ会議",
        "Discord風のコミュニティアプリ",
        "Asanaのタスク管理機能",
        "NetflixのUI実装",
        "YouTubeプレイヤー作成",
        # ... さらに100件
    ]

    for cmd in web_app_short:
        real_world_samples.append((cmd, 'web_app', 0.85))

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # API（短文・製品名中心）
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    api_short = [
        "Stripe決済を統合",
        "Twilio SMS送信",
        "SendGrid メール API",
        "Google Maps 地図表示",
        "OpenAI API 連携",
        "AWS S3 ファイルアップロード",
        "Postman で API テスト",
        "PayPal 支払い実装",
        "Mailchimp メルマガ",
        "Anthropic Claude API",
        # ... さらに100件
    ]

    for cmd in api_short:
        real_world_samples.append((cmd, 'api', 0.85))

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Machine Learning（短文・プラットフォーム名）
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ml_short = [
        "Kaggle コンペ用モデル",
        "HuggingFace モデル実装",
        "Colab でGPU訓練",
        "Weights & Biases 統合",
        "OpenAI ファインチューニング",
        "BERT 日本語モデル",
        "Stable Diffusion 画像生成",
        "ChatGPT API 使用",
        "LLM プロンプトエンジニアリング",
        "YOLO 物体検出",
        # ... さらに100件
    ]

    for cmd in ml_short:
        real_world_samples.append((cmd, 'machine_learning', 0.85))

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Visualization（短文・ツール名）
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    viz_short = [
        "Tableau ダッシュボード",
        "Grafana 監視グラフ",
        "Canva デザイン作成",
        "Power BI レポート",
        "D3.js チャート",
        "Plotly インタラクティブグラフ",
        "Chart.js 棒グラフ",
        "matplotlib 折れ線",
        "seaborn ヒートマップ",
        "Highcharts 実装",
        # ... さらに100件
    ]

    for cmd in viz_short:
        real_world_samples.append((cmd, 'visualization', 0.85))

    # 合計500件の実世界サンプル
    return real_world_samples
```

#### Step 2: 既存データとマージして再訓練

```python
# server/build_clean/retrain_with_real_world.py

def retrain_model_with_real_world_data():
    """
    実世界データを含めた再訓練
    """

    # Step 1: 既存の100K訓練データ読み込み
    with open('training_data_100k.json') as f:
        existing_data = json.load(f)

    # Step 2: 実世界サンプル生成
    real_world_data = generate_real_world_training_data()

    # Step 3: マージ（実世界データを5倍に増強）
    combined_data = existing_data + (real_world_data * 5)  # 2,500件の実世界データ

    # Step 4: シャッフル
    random.shuffle(combined_data)

    # Step 5: モデル訓練
    model = RemoteClaudeMLModel()
    model.train(combined_data)

    print(f"✅ Retrained with {len(combined_data)} samples")
    print(f"   - Original: {len(existing_data)}")
    print(f"   - Real-world: {len(real_world_data) * 5}")
```

**期待効果**:
- 実世界データ精度: 9.5% → **50-60%**
- 全体精度: 87.1% → **85-88%**（若干低下するが実用性向上）

---

## 🚀 Phase 2: 中期改善（2-4週間）

### 2.1 Few-shot Learning の導入

**目的**: 少数の実例から学習する能力を付与

```python
# server/build_clean/few_shot_learner.py

from sklearn.neighbors import KNeighborsClassifier

class FewShotLearner:
    """
    ユーザー固有のパターンをFew-shotで学習
    """

    def __init__(self, base_model):
        self.base_model = base_model
        self.user_examples = {}  # user_id -> examples
        self.knn_models = {}  # user_id -> KNN model

    def add_user_example(self, user_id: str, command: str, category: str):
        """
        ユーザーの正解例を追加
        """
        if user_id not in self.user_examples:
            self.user_examples[user_id] = []

        # 特徴量抽出
        X = self.base_model._extract_combined_features(command)

        self.user_examples[user_id].append({
            'command': command,
            'category': category,
            'features': X
        })

        # 5件以上集まったらKNNモデル作成
        if len(self.user_examples[user_id]) >= 5:
            self._build_knn_model(user_id)

    def _build_knn_model(self, user_id: str):
        """
        ユーザー専用のKNNモデル構築
        """
        examples = self.user_examples[user_id]

        X = np.array([ex['features'] for ex in examples])
        y = [ex['category'] for ex in examples]

        # KNN (k=3)
        knn = KNeighborsClassifier(n_neighbors=min(3, len(examples)))
        knn.fit(X, y)

        self.knn_models[user_id] = knn

    def predict_with_user_context(self, user_id: str, command: str):
        """
        ユーザーコンテキストを考慮した予測
        """
        # ベースモデルの予測
        base_pred = self.base_model.predict(command)

        # ユーザー専用モデルがない場合
        if user_id not in self.knn_models:
            return base_pred

        # Few-shot予測
        X = self.base_model._extract_combined_features(command)
        knn_category = self.knn_models[user_id].predict([X])[0]
        knn_proba = self.knn_models[user_id].predict_proba([X])[0]
        knn_confidence = np.max(knn_proba)

        # ブレンディング
        if knn_confidence > 0.7:
            # Few-shot の信頼度が高い → 優先
            return {
                'command_type': knn_category,
                'confidence': knn_confidence,
                'source': 'few_shot_primary'
            }
        else:
            # ベースモデル優先、Few-shotは参考
            if knn_category == base_pred['command_type']:
                # 一致時は信頼度ブースト
                base_pred['confidence'] = min(1.0, base_pred['confidence'] + 0.1)
                base_pred['source'] = 'base_with_few_shot_boost'

            return base_pred
```

**期待効果**:
- ユーザー固有の用語・パターンに適応
- 継続使用で精度向上（+5-10%）

---

### 2.2 BERT系モデルへの段階的移行

**問題**: TF-IDFは単語の意味を理解できない

**解決策**: BERTで意味埋め込みを取得

```python
# server/build_clean/bert_feature_extractor.py

from transformers import BertJapaneseTokenizer, BertModel
import torch

class BERTFeatureExtractor:
    """
    BERT-base-japaneseで特徴量抽出
    """

    def __init__(self):
        self.tokenizer = BertJapaneseTokenizer.from_pretrained('cl-tohoku/bert-base-japanese')
        self.model = BertModel.from_pretrained('cl-tohoku/bert-base-japanese')
        self.model.eval()  # 推論モード

    def extract_embedding(self, text: str) -> np.ndarray:
        """
        テキストから768次元のBERT埋め込みを抽出

        Returns:
            768次元のベクトル
        """
        # トークン化
        inputs = self.tokenizer(
            text,
            return_tensors='pt',
            max_length=128,
            truncation=True,
            padding=True
        )

        # BERT推論
        with torch.no_grad():
            outputs = self.model(**inputs)

        # [CLS]トークンの埋め込みを使用
        embedding = outputs.last_hidden_state[:, 0, :].numpy()[0]  # (768,)

        return embedding

# ハイブリッドモデル：TF-IDF + 手作り特徴 + BERT
class HybridFeatureModel:
    def __init__(self):
        self.tfidf_dim = 100  # TF-IDF
        self.manual_dim = 86  # 手作り特徴
        self.bert_dim = 768   # BERT
        # 合計: 954次元

        self.bert_extractor = BERTFeatureExtractor()

    def extract_features(self, command: str) -> np.ndarray:
        """
        3種類の特徴量を結合
        """
        # TF-IDF（既存）
        tfidf_features = self.vectorizer.transform([command]).toarray()[0]

        # 手作り特徴（既存）
        manual_features = self._extract_manual_features(command)

        # BERT埋め込み（新規）
        bert_features = self.bert_extractor.extract_embedding(command)

        # 結合
        combined = np.concatenate([
            tfidf_features,    # 100次元
            manual_features,   # 86次元
            bert_features      # 768次元
        ])  # 合計954次元

        return combined
```

**段階的導入計画**:

1. **Week 1-2**: BERT特徴量の追加（既存モデルと並行）
2. **Week 3**: ハイブリッドモデルの訓練
3. **Week 4**: A/Bテストで比較
4. **Week 5**: 最良モデルへ切り替え

**期待効果**:
- 意味理解の向上
- 全体精度: 87.1% → **90-92%**
- 実世界データ: 9.5% → **60-70%**

---

## 🎯 Phase 3: 長期改善（1-3ヶ月）

### 3.1 マルチラベル分類への拡張

**問題**: 1つのコマンドが複数カテゴリに該当するケース

例:
- "matplotlibでデータを可視化" → `data_analysis` + `visualization`
- "FastAPIでREST API作成" → `api` + `web_app`

**解決策**:

```python
from sklearn.multioutput import MultiOutputClassifier

class MultiLabelCategoryModel:
    def __init__(self):
        # 各カテゴリを二値分類
        self.binary_classifiers = {
            'machine_learning': RandomForestClassifier(...),
            'web_app': RandomForestClassifier(...),
            'api': RandomForestClassifier(...),
            'visualization': RandomForestClassifier(...),
            'data_analysis': RandomForestClassifier(...),
            # ...
        }

    def predict(self, command: str) -> dict:
        """
        複数カテゴリを予測

        Returns:
            {
                'primary_category': str,
                'secondary_categories': [str],
                'category_scores': {cat: float}
            }
        """
        X = self._extract_features(command)

        scores = {}
        for category, clf in self.binary_classifiers.items():
            proba = clf.predict_proba([X])[0][1]  # クラス1の確率
            scores[category] = proba

        # スコア降順ソート
        sorted_cats = sorted(scores.items(), key=lambda x: x[1], reverse=True)

        # プライマリ（最高スコア）
        primary = sorted_cats[0][0]

        # セカンダリ（スコア > 0.3）
        secondary = [cat for cat, score in sorted_cats[1:] if score > 0.3]

        return {
            'primary_category': primary,
            'secondary_categories': secondary,
            'category_scores': scores
        }
```

---

## 📊 改善効果の予測

### 予測精度推移

| 段階 | 施策 | AI生成データ | 実世界データ | 短文 | 全体 |
|------|------|-------------|-------------|------|------|
| **現状** | - | 70.8% | 9.5% | 15.8% | 53.4% |
| **Phase 1完了** | 製品辞書+短文特徴+実世界データ | 75% | 45-50% | 35-40% | 65-70% |
| **Phase 2完了** | Few-shot+BERT | 80% | 60-70% | 50-60% | 75-80% |
| **Phase 3完了** | マルチラベル | 85% | 75-80% | 65-75% | 82-87% |

---

## 🛠️ 実装優先度とタイムライン

### Week 1: 緊急対応
- [ ] 製品名辞書の構築（50製品）
- [ ] モデルへの製品辞書統合
- [ ] 短文特化特徴量の実装

### Week 2: 実世界データ収集
- [ ] 実世界サンプル500件作成
- [ ] 既存データとマージ
- [ ] モデル再訓練・評価

### Week 3-4: Few-shot Learning
- [ ] Few-shot学習システム構築
- [ ] ユーザーフィードバックループ実装
- [ ] A/Bテスト開始

### Week 5-8: BERT導入
- [ ] BERT特徴抽出器実装
- [ ] ハイブリッドモデル訓練
- [ ] パフォーマンス比較

### Month 3: マルチラベル対応
- [ ] マルチラベル分類器実装
- [ ] 評価データセット拡充
- [ ] 本番環境デプロイ

---

## ✅ 成功指標（KPI）

| 指標 | 現状 | 目標（Phase 1後） | 目標（Phase 3後） |
|------|------|------------------|------------------|
| **実世界データ精度** | 9.5% | **45%** | **75%** |
| **短文精度** | 15.8% | **35%** | **65%** |
| **全体精度** | 53.4% | **68%** | **85%** |
| **ユーザー満足度（5段階）** | - | **3.5** | **4.5** |

---

このプランを段階的に実装することで、実世界データでの精度を大幅に改善できます。まずはPhase 1（製品辞書+短文特徴）から始めることをお勧めします。

何か質問や追加の詳細が必要でしたらお申し付けください！
