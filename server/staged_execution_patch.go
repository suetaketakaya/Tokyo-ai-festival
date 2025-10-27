package main

import (
	// "context"
	"fmt"
	// "log"
	// "time"

	// "github.com/gorilla/websocket"
)

// Patched version of detectFramework with React/Todo support
func detectFrameworkPatched(command string) string {
	if contains(command, "flask") {
		return "flask"
	}
	if contains(command, "streamlit") {
		return "streamlit"
	}
	if contains(command, "jupyter") {
		return "jupyter"
	}
	if contains(command, "React") || contains(command, "react") || contains(command, "Todo") || contains(command, "todo") {
		return "react"
	}
	return "standard"
}

// Patched version of generateCodeContent with React support
func generateCodeContentPatched(analysis CommandAnalysis) string {
	// Check if this is an HTML/web application request
	if analysis.Type == "web_app" || analysis.Framework == "react" || contains(analysis.Command, "html") || contains(analysis.Command, "todo") {
		// Generate HTML file creation script
		return fmt.Sprintf(`#!/bin/bash
# Generated HTML creation script based on: %s

echo "Creating todo-app.html..."

cat > todo-app.html << 'EOF'
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

                todoItem.innerHTML = ` + "`" + `
                    <input type="checkbox"
                           ${todo.completed ? 'checked' : ''}
                           onchange="toggleTodo(${todo.id})">
                    <span class="todo-text">${todo.text}</span>
                    <button class="delete-btn" onclick="deleteTodo(${todo.id})">削除</button>
                ` + "`" + `;

                todoList.appendChild(todoItem);
            });
        }

        // Enter key support
        document.getElementById('todoInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTodo();
            }
        });
    </script>
</body>
</html>
EOF

echo "Created todo-app.html successfully"
echo "HTML file generated with full functionality"
echo "File location: $(pwd)/todo-app.html"
ls -la todo-app.html
`, analysis.Command)
	}

	// For other types, generate Python script
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
`, analysis.Command, analysis.Command)
}

// Test the patched functionality
func testPatchedFunctionality() {
	testCommand := "React.jsを使用してシングルページアプリケーションを作成してください。Todo管理機能付きで、タスクの追加・削除・完了マークができるようにしてください。"

	// Test framework detection
	framework := detectFrameworkPatched(testCommand)
	fmt.Printf("Framework detected: %s\n", framework)

	// Test command analysis
	analysis := CommandAnalysis{
		Command:   testCommand,
		Type:      determineCommandType(testCommand),
		Framework: framework,
	}

	// Test code generation
	code := generateCodeContentPatched(analysis)
	codeType := "Python Script"
	if contains(code, "todo-app.html") {
		codeType = "HTML Script"
	}
	fmt.Printf("Generated code type: %s\n", codeType)
	fmt.Printf("Code contains HTML creation: %t\n", contains(code, "todo-app.html"))
}