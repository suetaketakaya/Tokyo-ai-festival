#!/bin/bash
# 人間らしい入力のサンプルテスト

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 人間らしい自然言語入力のテスト"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 5つの異なるスタイルをテスト
echo "1️⃣  初心者の質問スタイル:"
echo "   入力: 「画像認識ができるAIを作りたいんですが、どうすればいいですか？」"
python3 wandb_local_model.py "画像認識ができるAIを作りたいんですが、どうすればいいですか？" | grep -E "command_type|confidence"
echo ""

echo "2️⃣  カジュアルな依頼スタイル:"
echo "   入力: 「TensorFlow使って何か面白いの作りたいな」"
python3 wandb_local_model.py "TensorFlow使って何か面白いの作りたいな" | grep -E "command_type|confidence"
echo ""

echo "3️⃣  丁寧な依頼文スタイル:"
echo "   入力: 「Reactを使ったTodoアプリを作成していただけますか？」"
python3 wandb_local_model.py "Reactを使ったTodoアプリを作成していただけますか？" | grep -E "command_type|confidence"
echo ""

echo "4️⃣  文脈・背景説明付きスタイル:"
echo "   入力: 「大学の課題で画像分類をやることになったんですが、TensorFlowで簡単なコードを書いてもらえますか？」"
python3 wandb_local_model.py "大学の課題で画像分類をやることになったんですが、TensorFlowで簡単なコードを書いてもらえますか？" | grep -E "command_type|confidence"
echo ""

echo "5️⃣  口語的・くだけた表現スタイル:"
echo "   入力: 「機械学習って何から始めればいいかわかんないんだけど、とりあえずコード見せて」"
python3 wandb_local_model.py "機械学習って何から始めればいいかわかんないんだけど、とりあえずコード見せて" | grep -E "command_type|confidence"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ テスト完了"
