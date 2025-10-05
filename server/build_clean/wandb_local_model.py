#!/usr/bin/env python3
"""
W&B Local ML Model for RemoteClaudeOps
Stage 2: ML-Enhanced Command Classification

Target Accuracy: 96% (up from 92% in Stage 1)
- RandomForest for 8-category classification
- GradientBoosting for confidence estimation
- Feature extraction from Claude CLI output
"""

import sys
import json
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.feature_extraction.text import TfidfVectorizer
import joblib
import os
from datetime import datetime

class RemoteClaudeMLModel:
    """
    ML Model for command classification and confidence estimation

    Classification Categories (8):
    - machine_learning
    - web_app
    - visualization
    - data_analysis
    - api
    - jupyter
    - docker
    - general
    """

    def __init__(self, model_dir="/tmp/remoteclaude_models"):
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)

        # Classification model
        self.classifier = RandomForestClassifier(
            n_estimators=100,
            max_depth=15,
            random_state=42,
            min_samples_split=5
        )

        # Confidence estimation model
        self.confidence_estimator = GradientBoostingRegressor(
            n_estimators=50,
            max_depth=5,
            random_state=42,
            learning_rate=0.1
        )

        # Text vectorizer for command analysis
        self.vectorizer = TfidfVectorizer(
            max_features=100,
            ngram_range=(1, 3),
            analyzer='char_wb'
        )

        # Category mapping
        self.categories = [
            "machine_learning",
            "web_app",
            "visualization",
            "data_analysis",
            "api",
            "jupyter",
            "docker",
            "general"
        ]

        self.category_to_idx = {cat: idx for idx, cat in enumerate(self.categories)}

        # Load or initialize models
        self._load_or_initialize()

    def _load_or_initialize(self):
        """Load existing models or initialize with training data"""
        classifier_path = os.path.join(self.model_dir, "classifier.pkl")
        confidence_path = os.path.join(self.model_dir, "confidence_estimator.pkl")
        vectorizer_path = os.path.join(self.model_dir, "vectorizer.pkl")

        if os.path.exists(classifier_path):
            print(f"📂 Loading existing models from {self.model_dir}", file=sys.stderr)
            self.classifier = joblib.load(classifier_path)
            self.confidence_estimator = joblib.load(confidence_path)
            self.vectorizer = joblib.load(vectorizer_path)
        else:
            print(f"🎓 Initializing new models with training data", file=sys.stderr)
            self._train_initial_models()

    def _train_initial_models(self):
        """Train initial models with synthetic + Stage 1 test data"""

        # Training data from Stage 1 + expanded synthetic data
        training_data = [
            # Machine Learning (20 samples)
            ("TensorFlowでMNIST CNNモデルを訓練してください", "machine_learning", 0.95),
            ("PyTorchでResNetを実装", "machine_learning", 0.93),
            ("kerasで画像分類モデル作成", "machine_learning", 0.94),
            ("scikit-learnでランダムフォレスト", "machine_learning", 0.90),
            ("深層学習でNLP", "machine_learning", 0.88),
            ("CNNモデルを訓練", "machine_learning", 0.92),
            ("LSTMで時系列予測", "machine_learning", 0.91),
            ("GANで画像生成", "machine_learning", 0.89),
            ("BERTファインチューニング", "machine_learning", 0.93),
            ("強化学習でゲームAI", "machine_learning", 0.87),
            ("transform model implementation", "machine_learning", 0.90),
            ("neural network training", "machine_learning", 0.91),
            ("deep learning model", "machine_learning", 0.89),
            ("machine learning pipeline", "machine_learning", 0.88),
            ("model training tensorflow", "machine_learning", 0.92),
            ("pytorch neural net", "machine_learning", 0.90),
            ("keras sequential model", "machine_learning", 0.91),
            ("autoencoder implementation", "machine_learning", 0.87),
            ("gradient descent optimization", "machine_learning", 0.85),
            ("convolutional layer setup", "machine_learning", 0.89),

            # Web App (15 samples)
            ("React.jsを使用してTodoアプリを作成", "web_app", 0.92),
            ("Vueでダッシュボード作成", "web_app", 0.90),
            ("Next.jsでブログサイト", "web_app", 0.91),
            ("HTMLでランディングページ", "web_app", 0.88),
            ("Angularでフォーム", "web_app", 0.87),
            ("レスポンシブWebサイト作成", "web_app", 0.89),
            ("SPAアプリケーション", "web_app", 0.85),
            ("React Todo application", "web_app", 0.90),
            ("Vue.js dashboard", "web_app", 0.88),
            ("create landing page", "web_app", 0.86),
            ("responsive website", "web_app", 0.87),
            ("single page app", "web_app", 0.85),
            ("interactive web form", "web_app", 0.84),
            ("bootstrap layout", "web_app", 0.83),
            ("tailwind css design", "web_app", 0.86),

            # Visualization (12 samples)
            ("matplotlibでグラフを作成", "visualization", 0.90),
            ("seabornでヒートマップ", "visualization", 0.88),
            ("plotlyでインタラクティブグラフ", "visualization", 0.89),
            ("データ可視化ダッシュボード", "visualization", 0.87),
            ("時系列データのプロット", "visualization", 0.86),
            ("散布図作成", "visualization", 0.85),
            ("matplotlib bar chart", "visualization", 0.88),
            ("seaborn correlation plot", "visualization", 0.87),
            ("plotly 3d visualization", "visualization", 0.86),
            ("data visualization dashboard", "visualization", 0.85),
            ("interactive chart", "visualization", 0.84),
            ("graph plotting", "visualization", 0.83),

            # Data Analysis (12 samples)
            ("pandasでCSVデータを分析", "data_analysis", 0.88),
            ("numpyで統計分析", "data_analysis", 0.86),
            ("データクレンジング", "data_analysis", 0.85),
            ("探索的データ分析", "data_analysis", 0.87),
            ("相関分析実施", "data_analysis", 0.84),
            ("pandas dataframe analysis", "data_analysis", 0.86),
            ("numpy statistical calculation", "data_analysis", 0.85),
            ("data cleaning pipeline", "data_analysis", 0.84),
            ("exploratory data analysis", "data_analysis", 0.87),
            ("correlation matrix", "data_analysis", 0.83),
            ("feature engineering", "data_analysis", 0.82),
            ("data preprocessing", "data_analysis", 0.81),

            # API (10 samples)
            ("FastAPIでREST API作成", "api", 0.89),
            ("FlaskでWebサービス", "api", 0.87),
            ("DjangoでAPI実装", "api", 0.88),
            ("GraphQL APIサーバー", "api", 0.86),
            ("FastAPI REST endpoint", "api", 0.87),
            ("Flask web service", "api", 0.85),
            ("Django REST framework", "api", 0.86),
            ("API authentication", "api", 0.84),
            ("REST API CRUD", "api", 0.85),
            ("GraphQL schema", "api", 0.83),

            # Jupyter (8 samples)
            ("Jupyter notebookで分析", "jupyter", 0.85),
            ("ノートブックでデータ可視化", "jupyter", 0.84),
            ("jupyterで探索的分析", "jupyter", 0.83),
            ("ipynb形式でレポート", "jupyter", 0.82),
            ("jupyter notebook analysis", "jupyter", 0.84),
            ("ipython interactive", "jupyter", 0.82),
            ("notebook visualization", "jupyter", 0.81),
            ("jupyter lab setup", "jupyter", 0.80),

            # Docker (8 samples)
            ("Dockerコンテナ作成", "docker", 0.86),
            ("docker-composeでサービス起動", "docker", 0.85),
            ("コンテナ環境構築", "docker", 0.84),
            ("Dockerfileを作成", "docker", 0.83),
            ("docker container setup", "docker", 0.85),
            ("docker-compose config", "docker", 0.84),
            ("container orchestration", "docker", 0.82),
            ("dockerfile build", "docker", 0.81),

            # General (15 samples)
            ("Pythonスクリプト作成", "general", 0.75),
            ("ファイル読み込み処理", "general", 0.72),
            ("データ処理スクリプト", "general", 0.73),
            ("自動化スクリプト", "general", 0.74),
            ("バッチ処理実装", "general", 0.71),
            ("python script", "general", 0.74),
            ("file processing", "general", 0.72),
            ("automation task", "general", 0.73),
            ("batch job", "general", 0.71),
            ("data pipeline", "general", 0.70),
            ("utility function", "general", 0.69),
            ("helper script", "general", 0.68),
            ("general purpose code", "general", 0.67),
            ("simple script", "general", 0.66),
            ("basic implementation", "general", 0.65),
        ]

        # Extract features and labels
        commands = [item[0] for item in training_data]
        categories = [item[1] for item in training_data]
        confidences = [item[2] for item in training_data]

        # Vectorize commands
        X_text = self.vectorizer.fit_transform(commands)

        # Extract additional features
        X_features = self._extract_features_batch(commands, categories)

        # Combine text and engineered features
        X_combined = np.hstack([X_text.toarray(), X_features])

        # Train classifier
        y_categories = [self.category_to_idx[cat] for cat in categories]
        self.classifier.fit(X_combined, y_categories)

        # Train confidence estimator
        self.confidence_estimator.fit(X_combined, confidences)

        # Save models
        self._save_models()

        print(f"✅ Models trained on {len(training_data)} samples", file=sys.stderr)

    def _extract_features_batch(self, commands, categories):
        """Extract engineered features for batch of commands"""
        features = []
        for cmd, cat in zip(commands, categories):
            features.append(self._extract_features(cmd, cat))
        return np.array(features)

    def _extract_features(self, command, category=None):
        """Extract 86+ engineered features from command text"""
        lower_cmd = command.lower()

        features = []

        # Length features (3)
        features.append(len(command))
        features.append(len(command.split()))
        features.append(len(command) / max(len(command.split()), 1))  # avg word length

        # Language indicators (10)
        features.append(1 if any(c > '\u3000' for c in command) else 0)  # Japanese
        features.append(1 if 'tensorflow' in lower_cmd else 0)
        features.append(1 if 'pytorch' in lower_cmd else 0)
        features.append(1 if 'keras' in lower_cmd else 0)
        features.append(1 if 'react' in lower_cmd else 0)
        features.append(1 if 'vue' in lower_cmd else 0)
        features.append(1 if 'matplotlib' in lower_cmd else 0)
        features.append(1 if 'pandas' in lower_cmd else 0)
        features.append(1 if 'fastapi' in lower_cmd else 0)
        features.append(1 if 'flask' in lower_cmd else 0)

        # ML keywords (15)
        ml_keywords = ['model', 'train', 'neural', 'deep', 'learning', 'cnn', 'lstm',
                       'bert', 'transformer', 'モデル', '訓練', '学習', '深層', 'gan', 'resnet']
        features.extend([1 if kw in lower_cmd else 0 for kw in ml_keywords])

        # Web keywords (12)
        web_keywords = ['html', 'css', 'javascript', 'react', 'vue', 'angular',
                        'アプリ', 'web', 'site', 'page', 'responsive', 'spa']
        features.extend([1 if kw in lower_cmd else 0 for kw in web_keywords])

        # Viz keywords (10)
        viz_keywords = ['graph', 'plot', 'chart', 'グラフ', '可視化', 'visualization',
                        'matplotlib', 'seaborn', 'plotly', 'dashboard']
        features.extend([1 if kw in lower_cmd else 0 for kw in viz_keywords])

        # Data keywords (10)
        data_keywords = ['data', 'csv', 'pandas', 'numpy', 'データ', '分析',
                         'analysis', 'dataframe', 'statistics', '統計']
        features.extend([1 if kw in lower_cmd else 0 for kw in data_keywords])

        # API keywords (8)
        api_keywords = ['api', 'rest', 'fastapi', 'flask', 'django',
                        'graphql', 'endpoint', 'service']
        features.extend([1 if kw in lower_cmd else 0 for kw in api_keywords])

        # Docker keywords (6)
        docker_keywords = ['docker', 'container', 'dockerfile',
                          'コンテナ', 'compose', 'kubernetes']
        features.extend([1 if kw in lower_cmd else 0 for kw in docker_keywords])

        # Jupyter keywords (5)
        jupyter_keywords = ['jupyter', 'notebook', 'ipynb',
                           'ノートブック', 'ipython']
        features.extend([1 if kw in lower_cmd else 0 for kw in jupyter_keywords])

        # Action verbs (7)
        action_keywords = ['create', '作成', 'build', '構築', 'implement',
                          '実装', 'develop']
        features.extend([1 if kw in lower_cmd else 0 for kw in action_keywords])

        # Complexity indicators (10)
        features.append(1 if '?' in command else 0)
        features.append(1 if '!' in command else 0)
        features.append(command.count(','))
        features.append(command.count('と'))
        features.append(command.count('で'))
        features.append(command.count('を'))
        features.append(1 if 'please' in lower_cmd else 0)
        features.append(1 if 'ください' in command else 0)
        features.append(1 if 'してください' in command else 0)
        features.append(1 if 'お願い' in command else 0)

        return features

    def predict(self, command, claude_cli_result=None):
        """
        Predict category and confidence for a command

        Args:
            command: User input command text
            claude_cli_result: Optional dict with Claude CLI output

        Returns:
            dict with predicted category, confidence, and metadata
        """
        # Vectorize command
        X_text = self.vectorizer.transform([command])

        # Extract features
        temp_category = claude_cli_result.get('command_type', 'general') if claude_cli_result else 'general'
        X_features = np.array([self._extract_features(command, temp_category)])

        # Combine features
        X_combined = np.hstack([X_text.toarray(), X_features])

        # Predict category
        category_idx = self.classifier.predict(X_combined)[0]
        category_proba = self.classifier.predict_proba(X_combined)[0]
        predicted_category = self.categories[category_idx]

        # Predict confidence
        predicted_confidence = float(self.confidence_estimator.predict(X_combined)[0])
        predicted_confidence = max(0.0, min(1.0, predicted_confidence))  # Clamp to [0, 1]

        # If Claude CLI result exists, blend predictions
        if claude_cli_result:
            claude_category = claude_cli_result.get('command_type', predicted_category)
            claude_confidence = claude_cli_result.get('confidence', predicted_confidence)

            # Weighted blend (70% ML, 30% Claude CLI)
            if claude_category == predicted_category:
                # Agreement: boost confidence
                final_confidence = min(1.0, predicted_confidence * 0.7 + claude_confidence * 0.3 + 0.05)
                final_category = predicted_category
            else:
                # Disagreement: use higher confidence source
                if predicted_confidence > claude_confidence:
                    final_category = predicted_category
                    final_confidence = predicted_confidence
                else:
                    final_category = claude_category
                    final_confidence = claude_confidence
        else:
            final_category = predicted_category
            final_confidence = predicted_confidence

        return {
            "command_type": final_category,
            "confidence": final_confidence,
            "ml_category": predicted_category,
            "ml_confidence": predicted_confidence,
            "category_probabilities": {
                self.categories[i]: float(category_proba[i])
                for i in range(len(self.categories))
            },
            "claude_category": claude_cli_result.get('command_type') if claude_cli_result else None,
            "claude_confidence": claude_cli_result.get('confidence') if claude_cli_result else None,
            "timestamp": datetime.now().isoformat()
        }

    def _save_models(self):
        """Save trained models to disk"""
        joblib.dump(self.classifier, os.path.join(self.model_dir, "classifier.pkl"))
        joblib.dump(self.confidence_estimator, os.path.join(self.model_dir, "confidence_estimator.pkl"))
        joblib.dump(self.vectorizer, os.path.join(self.model_dir, "vectorizer.pkl"))
        print(f"💾 Models saved to {self.model_dir}", file=sys.stderr)

    def retrain(self, new_data):
        """
        Retrain models with new feedback data

        Args:
            new_data: List of (command, true_category, observed_confidence) tuples
        """
        commands = [item[0] for item in new_data]
        categories = [item[1] for item in new_data]
        confidences = [item[2] for item in new_data]

        # Vectorize
        X_text = self.vectorizer.transform(commands)
        X_features = self._extract_features_batch(commands, categories)
        X_combined = np.hstack([X_text.toarray(), X_features])

        # Retrain (incremental)
        y_categories = [self.category_to_idx[cat] for cat in categories]

        # For incremental learning, we'd need partial_fit or retrain from scratch
        # For now, we'll retrain from scratch with combined data
        print(f"🔄 Retraining with {len(new_data)} new samples", file=sys.stderr)

        self.classifier.fit(X_combined, y_categories)
        self.confidence_estimator.fit(X_combined, confidences)

        self._save_models()
        print(f"✅ Models retrained successfully", file=sys.stderr)

    def retrain_from_feedback_file(self, feedback_file):
        """
        Retrain models from user feedback JSON file

        Args:
            feedback_file: Path to JSON file with training examples
                Format: [{"command": "...", "category": "...", "confidence": 0.9}, ...]
        """
        import json

        # Load feedback data
        with open(feedback_file, 'r') as f:
            feedback_data = json.load(f)

        if not feedback_data:
            print(f"⚠️ No feedback data found in {feedback_file}", file=sys.stderr)
            return

        # Convert to training format
        new_data = []
        for item in feedback_data:
            command = item.get('command', '')
            category = item.get('category', 'general')
            confidence = item.get('confidence', 0.75)

            if command and category in self.category_to_idx:
                new_data.append((command, category, confidence))

        if not new_data:
            print(f"⚠️ No valid training data extracted", file=sys.stderr)
            return

        print(f"📚 Loaded {len(new_data)} training examples from {feedback_file}", file=sys.stderr)
        self.retrain(new_data)

    def evaluate_on_feedback(self, feedback_file):
        """
        Evaluate model accuracy on feedback data

        Args:
            feedback_file: Path to JSON file with feedback examples

        Returns:
            dict with accuracy metrics
        """
        import json

        with open(feedback_file, 'r') as f:
            feedback_data = json.load(f)

        if not feedback_data:
            return {"accuracy": 0.0, "total": 0}

        correct = 0
        total = 0

        for item in feedback_data:
            command = item.get('command', '')
            true_category = item.get('category', '')

            if not command or not true_category:
                continue

            # Predict
            result = self.predict(command, None)
            predicted_category = result['command_type']

            if predicted_category == true_category:
                correct += 1
            total += 1

        accuracy = (correct / total * 100) if total > 0 else 0.0

        print(f"📊 Evaluation: {correct}/{total} correct ({accuracy:.1f}%)", file=sys.stderr)

        return {
            "accuracy": accuracy,
            "correct": correct,
            "total": total
        }


def main():
    """CLI interface for ML model predictions"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: python wandb_local_model.py <command> [claude_cli_json]",
            "command_type": "general",
            "confidence": 0.5
        }))
        sys.exit(1)

    command = sys.argv[1]
    claude_cli_result = None

    if len(sys.argv) >= 3:
        try:
            claude_cli_result = json.loads(sys.argv[2])
        except json.JSONDecodeError:
            pass

    # Initialize model
    model = RemoteClaudeMLModel()

    # Predict
    result = model.predict(command, claude_cli_result)

    # Output JSON
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
