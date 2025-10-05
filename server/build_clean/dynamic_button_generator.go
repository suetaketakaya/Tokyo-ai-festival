package main

import (
	"log"
	"strings"
	"time"
)

// DynamicButton represents a UI button generated from ML prediction
type DynamicButton struct {
	ID          string                 `json:"id"`
	Label       string                 `json:"label"`
	Icon        string                 `json:"icon"`
	Action      string                 `json:"action"`
	Category    string                 `json:"category"`
	Command     string                 `json:"command"`
	Description string                 `json:"description"`
	Color       string                 `json:"color"`
	Priority    int                    `json:"priority"`
	Metadata    map[string]interface{} `json:"metadata"`
}

// ButtonTemplate represents a reusable button template for a category
type ButtonTemplate struct {
	Category    string
	Templates   []DynamicButton
	Icon        string
	Color       string
	Description string
}

// DynamicButtonGenerator generates UI buttons from ML predictions
type DynamicButtonGenerator struct {
	templates map[string]ButtonTemplate
}

// NewDynamicButtonGenerator creates a new button generator
func NewDynamicButtonGenerator() *DynamicButtonGenerator {
	gen := &DynamicButtonGenerator{
		templates: make(map[string]ButtonTemplate),
	}
	gen.initializeTemplates()
	return gen
}

// initializeTemplates sets up category-specific button templates
func (g *DynamicButtonGenerator) initializeTemplates() {
	// Machine Learning Category
	g.templates["machine_learning"] = ButtonTemplate{
		Category:    "machine_learning",
		Icon:        "🤖",
		Color:       "#FF6B6B",
		Description: "AI・機械学習タスク",
		Templates: []DynamicButton{
			{
				ID:          "ml_train",
				Label:       "モデルを訓練",
				Icon:        "🎯",
				Action:      "train_model",
				Category:    "machine_learning",
				Description: "機械学習モデルを訓練します",
				Color:       "#FF6B6B",
				Priority:    1,
			},
			{
				ID:          "ml_visualize",
				Label:       "結果を可視化",
				Icon:        "📊",
				Action:      "visualize_results",
				Category:    "machine_learning",
				Description: "訓練結果をグラフで表示",
				Color:       "#FF6B6B",
				Priority:    2,
			},
			{
				ID:          "ml_export",
				Label:       "モデルを保存",
				Icon:        "💾",
				Action:      "export_model",
				Category:    "machine_learning",
				Description: "訓練済みモデルを保存",
				Color:       "#FF6B6B",
				Priority:    3,
			},
			{
				ID:          "ml_predict",
				Label:       "予測を実行",
				Icon:        "🔮",
				Action:      "run_prediction",
				Category:    "machine_learning",
				Description: "新しいデータで予測",
				Color:       "#FF6B6B",
				Priority:    4,
			},
		},
	}

	// Web App Category
	g.templates["web_app"] = ButtonTemplate{
		Category:    "web_app",
		Icon:        "🌐",
		Color:       "#4ECDC4",
		Description: "Webアプリケーション",
		Templates: []DynamicButton{
			{
				ID:          "web_preview",
				Label:       "プレビュー表示",
				Icon:        "👁️",
				Action:      "show_preview",
				Category:    "web_app",
				Description: "Webアプリをプレビュー",
				Color:       "#4ECDC4",
				Priority:    1,
			},
			{
				ID:          "web_deploy",
				Label:       "デプロイ",
				Icon:        "🚀",
				Action:      "deploy_app",
				Category:    "web_app",
				Description: "アプリを公開",
				Color:       "#4ECDC4",
				Priority:    2,
			},
			{
				ID:          "web_edit",
				Label:       "コード編集",
				Icon:        "✏️",
				Action:      "edit_code",
				Category:    "web_app",
				Description: "ソースコードを編集",
				Color:       "#4ECDC4",
				Priority:    3,
			},
			{
				ID:          "web_share",
				Label:       "共有",
				Icon:        "🔗",
				Action:      "share_app",
				Category:    "web_app",
				Description: "アプリを共有",
				Color:       "#4ECDC4",
				Priority:    4,
			},
		},
	}

	// Visualization Category
	g.templates["visualization"] = ButtonTemplate{
		Category:    "visualization",
		Icon:        "📊",
		Color:       "#95E1D3",
		Description: "データ可視化",
		Templates: []DynamicButton{
			{
				ID:          "viz_show",
				Label:       "グラフを表示",
				Icon:        "📈",
				Action:      "show_chart",
				Category:    "visualization",
				Description: "生成されたグラフを表示",
				Color:       "#95E1D3",
				Priority:    1,
			},
			{
				ID:          "viz_download",
				Label:       "画像保存",
				Icon:        "💾",
				Action:      "download_image",
				Category:    "visualization",
				Description: "グラフを画像で保存",
				Color:       "#95E1D3",
				Priority:    2,
			},
			{
				ID:          "viz_customize",
				Label:       "カスタマイズ",
				Icon:        "🎨",
				Action:      "customize_chart",
				Category:    "visualization",
				Description: "グラフをカスタマイズ",
				Color:       "#95E1D3",
				Priority:    3,
			},
			{
				ID:          "viz_export_data",
				Label:       "データ出力",
				Icon:        "📤",
				Action:      "export_data",
				Category:    "visualization",
				Description: "データをCSVで出力",
				Color:       "#95E1D3",
				Priority:    4,
			},
		},
	}

	// Data Analysis Category
	g.templates["data_analysis"] = ButtonTemplate{
		Category:    "data_analysis",
		Icon:        "📊",
		Color:       "#F38181",
		Description: "データ分析",
		Templates: []DynamicButton{
			{
				ID:          "data_show_stats",
				Label:       "統計を表示",
				Icon:        "📊",
				Action:      "show_statistics",
				Category:    "data_analysis",
				Description: "データの統計情報を表示",
				Color:       "#F38181",
				Priority:    1,
			},
			{
				ID:          "data_visualize",
				Label:       "可視化",
				Icon:        "📈",
				Action:      "visualize_data",
				Category:    "data_analysis",
				Description: "データをグラフ化",
				Color:       "#F38181",
				Priority:    2,
			},
			{
				ID:          "data_export",
				Label:       "結果を保存",
				Icon:        "💾",
				Action:      "export_results",
				Category:    "data_analysis",
				Description: "分析結果を保存",
				Color:       "#F38181",
				Priority:    3,
			},
			{
				ID:          "data_filter",
				Label:       "フィルター",
				Icon:        "🔍",
				Action:      "filter_data",
				Category:    "data_analysis",
				Description: "データをフィルタリング",
				Color:       "#F38181",
				Priority:    4,
			},
		},
	}

	// API Category
	g.templates["api"] = ButtonTemplate{
		Category:    "api",
		Icon:        "🔌",
		Color:       "#A8E6CF",
		Description: "API開発",
		Templates: []DynamicButton{
			{
				ID:          "api_test",
				Label:       "APIテスト",
				Icon:        "🧪",
				Action:      "test_api",
				Category:    "api",
				Description: "APIエンドポイントをテスト",
				Color:       "#A8E6CF",
				Priority:    1,
			},
			{
				ID:          "api_docs",
				Label:       "ドキュメント",
				Icon:        "📚",
				Action:      "show_docs",
				Category:    "api",
				Description: "API仕様書を表示",
				Color:       "#A8E6CF",
				Priority:    2,
			},
			{
				ID:          "api_deploy",
				Label:       "デプロイ",
				Icon:        "🚀",
				Action:      "deploy_api",
				Category:    "api",
				Description: "APIをデプロイ",
				Color:       "#A8E6CF",
				Priority:    3,
			},
			{
				ID:          "api_monitor",
				Label:       "モニタリング",
				Icon:        "📡",
				Action:      "monitor_api",
				Category:    "api",
				Description: "API使用状況を監視",
				Color:       "#A8E6CF",
				Priority:    4,
			},
		},
	}

	// Docker Category
	g.templates["docker"] = ButtonTemplate{
		Category:    "docker",
		Icon:        "🐳",
		Color:       "#84B1ED",
		Description: "Docker環境",
		Templates: []DynamicButton{
			{
				ID:          "docker_build",
				Label:       "ビルド",
				Icon:        "🔨",
				Action:      "build_container",
				Category:    "docker",
				Description: "Dockerイメージをビルド",
				Color:       "#84B1ED",
				Priority:    1,
			},
			{
				ID:          "docker_run",
				Label:       "実行",
				Icon:        "▶️",
				Action:      "run_container",
				Category:    "docker",
				Description: "コンテナを起動",
				Color:       "#84B1ED",
				Priority:    2,
			},
			{
				ID:          "docker_logs",
				Label:       "ログ確認",
				Icon:        "📋",
				Action:      "show_logs",
				Category:    "docker",
				Description: "コンテナログを表示",
				Color:       "#84B1ED",
				Priority:    3,
			},
			{
				ID:          "docker_stop",
				Label:       "停止",
				Icon:        "⏹️",
				Action:      "stop_container",
				Category:    "docker",
				Description: "コンテナを停止",
				Color:       "#84B1ED",
				Priority:    4,
			},
		},
	}

	// Jupyter Category
	g.templates["jupyter"] = ButtonTemplate{
		Category:    "jupyter",
		Icon:        "📓",
		Color:       "#FFD93D",
		Description: "Jupyter Notebook",
		Templates: []DynamicButton{
			{
				ID:          "jupyter_open",
				Label:       "ノートブックを開く",
				Icon:        "📂",
				Action:      "open_notebook",
				Category:    "jupyter",
				Description: "Jupyterノートブックを開く",
				Color:       "#FFD93D",
				Priority:    1,
			},
			{
				ID:          "jupyter_run",
				Label:       "実行",
				Icon:        "▶️",
				Action:      "run_notebook",
				Category:    "jupyter",
				Description: "全セルを実行",
				Color:       "#FFD93D",
				Priority:    2,
			},
			{
				ID:          "jupyter_export",
				Label:       "HTMLで保存",
				Icon:        "💾",
				Action:      "export_html",
				Category:    "jupyter",
				Description: "HTML形式でエクスポート",
				Color:       "#FFD93D",
				Priority:    3,
			},
			{
				ID:          "jupyter_share",
				Label:       "共有",
				Icon:        "🔗",
				Action:      "share_notebook",
				Category:    "jupyter",
				Description: "ノートブックを共有",
				Color:       "#FFD93D",
				Priority:    4,
			},
		},
	}

	// General Category
	g.templates["general"] = ButtonTemplate{
		Category:    "general",
		Icon:        "⚙️",
		Color:       "#C7CEEA",
		Description: "一般的なタスク",
		Templates: []DynamicButton{
			{
				ID:          "general_run",
				Label:       "実行",
				Icon:        "▶️",
				Action:      "run_code",
				Category:    "general",
				Description: "コードを実行",
				Color:       "#C7CEEA",
				Priority:    1,
			},
			{
				ID:          "general_save",
				Label:       "保存",
				Icon:        "💾",
				Action:      "save_code",
				Category:    "general",
				Description: "コードを保存",
				Color:       "#C7CEEA",
				Priority:    2,
			},
			{
				ID:          "general_edit",
				Label:       "編集",
				Icon:        "✏️",
				Action:      "edit_code",
				Category:    "general",
				Description: "コードを編集",
				Color:       "#C7CEEA",
				Priority:    3,
			},
			{
				ID:          "general_copy",
				Label:       "コピー",
				Icon:        "📋",
				Action:      "copy_code",
				Category:    "general",
				Description: "コードをコピー",
				Color:       "#C7CEEA",
				Priority:    4,
			},
		},
	}
}

// GenerateButtons creates dynamic buttons from ML prediction
func (g *DynamicButtonGenerator) GenerateButtons(prediction *WandbMLPrediction, command string) []DynamicButton {
	startTime := time.Now()

	category := prediction.CommandType
	template, exists := g.templates[category]

	if !exists {
		log.Printf("⚠️ No template for category: %s, using general", category)
		template = g.templates["general"]
	}

	// Clone templates and customize with command context
	buttons := make([]DynamicButton, len(template.Templates))
	for i, tmpl := range template.Templates {
		buttons[i] = tmpl
		buttons[i].Command = command

		// Create metadata map
		metadata := map[string]interface{}{
			"confidence":          prediction.Confidence,
			"ml_confidence":       prediction.MLConfidence,
			"generated_at":        time.Now().Format(time.RFC3339),
			"command_summary":     truncateString(command, 50),
			"auto_generated":      true,
			"generation_duration": time.Since(startTime).Milliseconds(),
		}

		// Add optional fields if present
		if prediction.CategoryProbabilities != nil {
			metadata["category_probs"] = prediction.CategoryProbabilities
		}
		if prediction.ClaudeCategory != nil {
			metadata["claude_category"] = *prediction.ClaudeCategory
		}
		if prediction.ClaudeConfidence != nil {
			metadata["claude_confidence"] = *prediction.ClaudeConfidence
		}

		buttons[i].Metadata = metadata
	}

	// Add context-specific buttons based on command content
	buttons = g.addContextualButtons(buttons, command, category, prediction)

	log.Printf("🎨 Generated %d dynamic buttons for category: %s (%.1f%% confidence)",
		len(buttons), category, prediction.Confidence*100)

	return buttons
}

// addContextualButtons adds additional buttons based on command context
func (g *DynamicButtonGenerator) addContextualButtons(buttons []DynamicButton, command string, category string, prediction *WandbMLPrediction) []DynamicButton {
	lower := strings.ToLower(command)

	// TensorFlow specific
	if strings.Contains(lower, "tensorflow") || strings.Contains(lower, "keras") {
		buttons = append(buttons, DynamicButton{
			ID:          "tf_tensorboard",
			Label:       "TensorBoard起動",
			Icon:        "📊",
			Action:      "launch_tensorboard",
			Category:    category,
			Command:     command,
			Description: "TensorBoardで訓練状況を確認",
			Color:       g.templates[category].Color,
			Priority:    5,
			Metadata: map[string]interface{}{
				"framework": "tensorflow",
				"contextual": true,
			},
		})
	}

	// React specific
	if strings.Contains(lower, "react") {
		buttons = append(buttons, DynamicButton{
			ID:          "react_dev_server",
			Label:       "開発サーバー起動",
			Icon:        "🔥",
			Action:      "start_dev_server",
			Category:    category,
			Command:     command,
			Description: "React開発サーバーを起動",
			Color:       g.templates[category].Color,
			Priority:    5,
			Metadata: map[string]interface{}{
				"framework": "react",
				"contextual": true,
			},
		})
	}

	// Matplotlib/Seaborn specific
	if strings.Contains(lower, "matplotlib") || strings.Contains(lower, "seaborn") {
		buttons = append(buttons, DynamicButton{
			ID:          "viz_interactive",
			Label:       "インタラクティブ表示",
			Icon:        "🖱️",
			Action:      "show_interactive",
			Category:    category,
			Command:     command,
			Description: "インタラクティブグラフを表示",
			Color:       g.templates[category].Color,
			Priority:    5,
			Metadata: map[string]interface{}{
				"visualization_type": "matplotlib",
				"contextual":         true,
			},
		})
	}

	// Pandas/CSV specific
	if strings.Contains(lower, "pandas") || strings.Contains(lower, "csv") {
		buttons = append(buttons, DynamicButton{
			ID:          "data_preview",
			Label:       "データプレビュー",
			Icon:        "👀",
			Action:      "preview_data",
			Category:    category,
			Command:     command,
			Description: "データの最初の行を表示",
			Color:       g.templates[category].Color,
			Priority:    5,
			Metadata: map[string]interface{}{
				"data_type": "tabular",
				"contextual": true,
			},
		})
	}

	return buttons
}

// GetButtonsByPriority returns buttons sorted by priority
func (g *DynamicButtonGenerator) GetButtonsByPriority(buttons []DynamicButton, limit int) []DynamicButton {
	// Simple bubble sort by priority
	for i := 0; i < len(buttons); i++ {
		for j := i + 1; j < len(buttons); j++ {
			if buttons[j].Priority < buttons[i].Priority {
				buttons[i], buttons[j] = buttons[j], buttons[i]
			}
		}
	}

	if limit > 0 && limit < len(buttons) {
		return buttons[:limit]
	}
	return buttons
}

// GetCategoryInfo returns template info for a category
func (g *DynamicButtonGenerator) GetCategoryInfo(category string) ButtonTemplate {
	if template, exists := g.templates[category]; exists {
		return template
	}
	return g.templates["general"]
}
