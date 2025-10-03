package main

import (
	"fmt"
	"strings"
)

func determineCommandType(command string) string {
	lowerCmd := strings.ToLower(command)

	// Machine Learning detection
	mlKeywords := []string{"機械学習", "ml", "scikit-learn", "sklearn", "tensorflow", "keras", "pytorch",
		"モデル訓練", "分類", "回帰", "クラスタリング", "ニューラルネットワーク", "cnn", "rnn", "lstm",
		"アイリス", "mnist", "深層学習", "ハイパーパラメータ"}
	for _, kw := range mlKeywords {
		if strings.Contains(lowerCmd, kw) {
			return "machine_learning"
		}
	}

	// Matplotlib/Plot/Visualization detection
	vizKeywords := []string{"plot", "matplotlib", "seaborn", "グラフ", "可視化", "visualization",
		"売上", "ヒートマップ", "散布図", "ヒストグラム", "円グラフ", "棒グラフ", "line plot", "bar chart",
		"subplot", "heatmap", "scatter", "boxplot"}
	for _, kw := range vizKeywords {
		if strings.Contains(lowerCmd, kw) {
			return "visualization"
		}
	}

	// Data Science/Analysis detection (pandas, csv, データ分析)
	dataKeywords := []string{"pandas", "csv", "データ分析", "data analysis", "dataframe", "統計", "相関"}
	for _, kw := range dataKeywords {
		if strings.Contains(lowerCmd, kw) {
			return "data_analysis"
		}
	}

	// Docker/Container detection
	if strings.Contains(lowerCmd, "docker") || strings.Contains(lowerCmd, "dockerfile") ||
	   strings.Contains(lowerCmd, "container") || strings.Contains(lowerCmd, "コンテナ") ||
	   strings.Contains(lowerCmd, "docker-compose") {
		return "docker"
	}

	// Jupyter Notebook detection
	if strings.Contains(lowerCmd, "jupyter") || strings.Contains(lowerCmd, "notebook") ||
	   strings.Contains(lowerCmd, "jupyterlab") {
		return "jupyter"
	}

	// Testing detection
	if strings.Contains(lowerCmd, "pytest") || strings.Contains(lowerCmd, "test") ||
	   strings.Contains(lowerCmd, "selenium") || strings.Contains(lowerCmd, "テスト") ||
	   strings.Contains(lowerCmd, "unittest") || strings.Contains(lowerCmd, "coverage") {
		return "testing"
	}

	// Database detection
	dbKeywords := []string{"database", "データベース", "sqlite", "mongodb", "postgres", "mysql",
		"redis", "sql", "nosql", "キャッシュ"}
	for _, kw := range dbKeywords {
		if strings.Contains(lowerCmd, kw) {
			return "database"
		}
	}

	// API detection - FastAPI, Flask, Django
	if strings.Contains(lowerCmd, "api") || strings.Contains(lowerCmd, "fastapi") ||
	   strings.Contains(lowerCmd, "restful") || strings.Contains(lowerCmd, "swagger") {
		return "api"
	}

	// Web Framework detection (Flask specific without "API")
	if strings.Contains(lowerCmd, "flask") && !strings.Contains(lowerCmd, "api") {
		return "web_app"
	}

	// Web/HTML/React detection
	webKeywords := []string{
		"web", "アプリ", "app", "html", "todo", "react", "vue", "angular",
		"シングルページ", "spa", "website", "webpage", "サイト", "フロントエンド",
		"react native", "モバイル",
	}
	for _, kw := range webKeywords {
		if strings.Contains(lowerCmd, kw) {
			return "web_app"
		}
	}

	return "general"
}

func detectFramework(command string) string {
	lowerCmd := strings.ToLower(command)

	if strings.Contains(lowerCmd, "flask") {
		return "flask"
	}
	if strings.Contains(lowerCmd, "streamlit") {
		return "streamlit"
	}
	if strings.Contains(lowerCmd, "jupyter") {
		return "jupyter"
	}
	if strings.Contains(lowerCmd, "django") {
		return "django"
	}
	if strings.Contains(lowerCmd, "fastapi") {
		return "fastapi"
	}

	// React/HTML/Todo detection
	reactKeywords := []string{"react", "todo", "html", "シングルページ", "spa", "アプリ", "vue", "angular"}
	for _, kw := range reactKeywords {
		if strings.Contains(lowerCmd, kw) {
			return "react"
		}
	}

	return "standard"
}

func generateCodeContent(command, cmdType, framework string) string {
	lowerCmd := strings.ToLower(command)

	// Machine Learning, Visualization, Data Analysis
	if cmdType == "machine_learning" || cmdType == "visualization" || cmdType == "data_analysis" {
		return generateMLCode(command, cmdType)
	}

	// Check if this is a web application request
	isWebApp := cmdType == "web_app" ||
		framework == "react" ||
		strings.Contains(lowerCmd, "html") ||
		strings.Contains(lowerCmd, "todo") ||
		strings.Contains(lowerCmd, "react") ||
		strings.Contains(lowerCmd, "アプリ") ||
		strings.Contains(lowerCmd, "シングルページ") ||
		strings.Contains(lowerCmd, "web")

	if isWebApp {
		// Detect specific web app type
		appType := detectWebAppType(command)
		return generateWebAppHTML(command, appType)
	}

	// Default: Python script
	return fmt.Sprintf(`# Generated code based on: %s
import sys
import os

def main():
    print("Executing: %s")
    # Generated implementation here
    return "Success"

if __name__ == "__main__":
    result = main()
    print(f"Result: {result}")
`, command, command)
}

func generateTodoAppHTML(command string) string {
	return fmt.Sprintf(`#!/bin/bash
# Generated HTML creation script based on: %s

echo "Creating todo-app.html..."

cat > todo-app.html << 'HTMLEOF'
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Todo App</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
        }
        .input-section {
            display: flex;
            margin-bottom: 20px;
        }
        input[type="text"] {
            flex: 1;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
        }
        button {
            padding: 10px 20px;
            margin-left: 10px;
            background: #007AFF;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover {
            background: #0056b3;
        }
        .todo-item {
            display: flex;
            align-items: center;
            padding: 10px;
            margin: 5px 0;
            background: #f9f9f9;
            border-radius: 4px;
            border-left: 4px solid #007AFF;
        }
        .todo-item.completed {
            opacity: 0.6;
            text-decoration: line-through;
            border-left-color: #28a745;
        }
        .todo-text {
            flex: 1;
            margin-left: 10px;
        }
        .delete-btn {
            background: #dc3545;
            padding: 5px 10px;
            font-size: 12px;
            margin-left: 10px;
        }
        .delete-btn:hover {
            background: #c82333;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📝 Todo アプリ</h1>
        <div class="input-section">
            <input type="text" id="todoInput" placeholder="新しいタスクを入力...">
            <button onclick="addTodo()">追加</button>
        </div>
        <div id="todoList"></div>
    </div>

    <script>
        let todos = [];
        let nextId = 1;

        function addTodo() {
            const input = document.getElementById('todoInput');
            const text = input.value.trim();

            if (text === '') return;

            todos.push({
                id: nextId++,
                text: text,
                completed: false
            });

            input.value = '';
            renderTodos();
        }

        function toggleTodo(id) {
            const todo = todos.find(t => t.id === id);
            if (todo) {
                todo.completed = !todo.completed;
                renderTodos();
            }
        }

        function deleteTodo(id) {
            todos = todos.filter(t => t.id !== id);
            renderTodos();
        }

        function renderTodos() {
            const todoList = document.getElementById('todoList');
            todoList.innerHTML = '';

            todos.forEach(todo => {
                const todoItem = document.createElement('div');
                todoItem.className = 'todo-item' + (todo.completed ? ' completed' : '');

                todoItem.innerHTML =
                    '<input type="checkbox" ' +
                    (todo.completed ? 'checked' : '') +
                    ' onchange="toggleTodo(' + todo.id + ')">' +
                    '<span class="todo-text">' + todo.text + '</span>' +
                    '<button class="delete-btn" onclick="deleteTodo(' + todo.id + ')">削除</button>';

                todoList.appendChild(todoItem);
            });
        }

        document.getElementById('todoInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTodo();
            }
        });
    </script>
</body>
</html>
HTMLEOF

echo "Created todo-app.html successfully"
echo "File location: $(pwd)/todo-app.html"
ls -la todo-app.html
echo ""
echo "HTML file will be served by RemoteClaude server"
echo "No need to start separate HTTP server"
`, command)
}
