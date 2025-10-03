package main

import (
	"fmt"
	"strings"
)

func determineCommandType(command string) string {
	lowerCmd := strings.ToLower(command)

	// Matplotlib/Plot detection
	if strings.Contains(lowerCmd, "plot") || strings.Contains(lowerCmd, "matplotlib") || strings.Contains(lowerCmd, "グラフ") {
		return "visualization"
	}

	// Web/HTML/React detection - 12 patterns
	webKeywords := []string{
		"web", "アプリ", "app", "html", "todo", "react", "vue", "angular",
		"シングルページ", "spa", "website", "webpage", "サイト",
	}
	for _, kw := range webKeywords {
		if strings.Contains(lowerCmd, kw) {
			return "web_app"
		}
	}

	// Data analysis detection
	if strings.Contains(lowerCmd, "data") || strings.Contains(lowerCmd, "analysis") || strings.Contains(lowerCmd, "データ") {
		return "data_analysis"
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
		return generateTodoAppHTML(command)
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

                todoItem.innerHTML = \x60
                    <input type="checkbox"
                           \${todo.completed ? 'checked' : ''}
                           onchange="toggleTodo(\${todo.id})">
                    <span class="todo-text">\${todo.text}</span>
                    <button class="delete-btn" onclick="deleteTodo(\${todo.id})">削除</button>
                \x60;

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
`, command)
}
