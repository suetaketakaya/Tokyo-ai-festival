package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
)

// 人間らしい自然言語入力のテスト
func main() {
	// 人間らしいパターンを読み込み
	data, err := ioutil.ReadFile("test_patterns_human_like.json")
	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed to read patterns: %v\n", err)
		os.Exit(1)
	}

	var patterns []TestPattern
	if err := json.Unmarshal(data, &patterns); err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed to parse patterns: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
	fmt.Printf("🧪 人間らしい自然言語入力テスト\n")
	fmt.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
	fmt.Printf("📊 Total patterns: %d\n\n", len(patterns))

	// W&Bクライアントと動的ボタン生成器を初期化
	wandbClient := NewWandbModelClient()
	buttonGenerator := NewDynamicButtonGenerator()

	// 各スタイルから2パターンずつテスト
	styles := []string{"beginner_question", "casual", "polite", "contextual", "colloquial"}

	for _, style := range styles {
		fmt.Printf("\n📝 スタイル: %s\n", style)
		fmt.Printf("─────────────────────────────────────────────\n")

		tested := 0
		for _, pattern := range patterns {
			if pattern.Metadata != nil {
				if s, ok := pattern.Metadata["style"].(string); ok && s == style && tested < 3 {
					testPattern(pattern, wandbClient, buttonGenerator)
					tested++
				}
			}

			// Metadataがない場合、構造体フィールドで確認
			// (注: JSONから読み込んだ場合、カスタムフィールドが必要)
		}

		if tested == 0 {
			fmt.Printf("  (このスタイルのパターンがMetadataに含まれていません)\n")
		}
	}

	fmt.Printf("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
	fmt.Printf("✅ テスト完了\n")
}

func testPattern(pattern TestPattern, wandbClient *WandbModelClient, buttonGenerator *DynamicButtonGenerator) {
	fmt.Printf("\n💬 入力: \"%s\"\n", pattern.Command)

	// Claude CLI実行
	claudeResponse, err := ExecuteClaudeCLI(pattern.Command, "/tmp/test_project")
	if err != nil {
		fmt.Printf("   ❌ Claude CLI エラー: %v\n", err)
		return
	}

	// ML予測
	mlPrediction, err := wandbClient.Predict(pattern.Command, claudeResponse)
	if err != nil {
		fmt.Printf("   ❌ ML予測エラー: %v\n", err)
		return
	}

	// 結果表示
	fmt.Printf("   🤖 予測カテゴリ: %s (信頼度: %.1f%%)\n",
		mlPrediction.CommandType, mlPrediction.Confidence)
	fmt.Printf("   🎯 ML信頼度: %.1f%%\n", mlPrediction.MLConfidence)

	// ボタン生成
	buttons := buttonGenerator.GenerateButtons(mlPrediction, pattern.Command)
	fmt.Printf("   🎨 生成ボタン数: %d個\n", len(buttons))

	// トップ3ボタンを表示
	if len(buttons) > 0 {
		fmt.Printf("   📋 トップボタン:\n")
		topButtons := buttonGenerator.GetButtonsByPriority(buttons, 3)
		for i, btn := range topButtons {
			fmt.Printf("      %d. %s %s\n", i+1, btn.Icon, btn.Label)
		}
	}
}
