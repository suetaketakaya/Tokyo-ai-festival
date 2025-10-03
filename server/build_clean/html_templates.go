package main

import (
	"fmt"
	"strings"
)

// Detect specific web app type based on command
func detectWebAppType(command string) string {
	lowerCmd := strings.ToLower(command)

	// Calculator app
	if strings.Contains(lowerCmd, "calculator") || strings.Contains(lowerCmd, "計算機") ||
		strings.Contains(lowerCmd, "電卓") {
		return "calculator"
	}

	// Timer/Stopwatch app
	if strings.Contains(lowerCmd, "timer") || strings.Contains(lowerCmd, "タイマー") ||
		strings.Contains(lowerCmd, "stopwatch") || strings.Contains(lowerCmd, "ストップウォッチ") {
		return "timer"
	}

	// Note/Memo app
	if strings.Contains(lowerCmd, "note") || strings.Contains(lowerCmd, "memo") ||
		strings.Contains(lowerCmd, "メモ") || strings.Contains(lowerCmd, "ノート") {
		return "notes"
	}

	// Weather app
	if strings.Contains(lowerCmd, "weather") || strings.Contains(lowerCmd, "天気") {
		return "weather"
	}

	// Counter app
	if strings.Contains(lowerCmd, "counter") || strings.Contains(lowerCmd, "カウンター") {
		return "counter"
	}

	// Quiz app
	if strings.Contains(lowerCmd, "quiz") || strings.Contains(lowerCmd, "クイズ") {
		return "quiz"
	}

	// Todo app (default for generic app requests)
	if strings.Contains(lowerCmd, "todo") || strings.Contains(lowerCmd, "タスク") ||
		strings.Contains(lowerCmd, "やること") {
		return "todo"
	}

	// Form/Survey
	if strings.Contains(lowerCmd, "form") || strings.Contains(lowerCmd, "フォーム") ||
		strings.Contains(lowerCmd, "survey") || strings.Contains(lowerCmd, "アンケート") {
		return "form"
	}

	// Dashboard
	if strings.Contains(lowerCmd, "dashboard") || strings.Contains(lowerCmd, "ダッシュボード") {
		return "dashboard"
	}

	// Default: generic web app
	return "generic"
}

// Extract file name from generated code output
func extractGeneratedFileName(output string) string {
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		if strings.Contains(line, "File location:") || strings.Contains(line, "Created") {
			// Extract filename from patterns like "Created todo-app.html" or "File location: /workspace/app.html"
			parts := strings.Fields(line)
			for _, part := range parts {
				if strings.HasSuffix(part, ".html") || strings.HasSuffix(part, ".png") ||
					strings.HasSuffix(part, ".jpg") || strings.HasSuffix(part, ".svg") {
					// Extract just the filename
					lastSlash := strings.LastIndex(part, "/")
					if lastSlash >= 0 {
						return part[lastSlash+1:]
					}
					return part
				}
			}
		}
	}
	return "index.html" // default
}

// Generate HTML content based on app type
func generateWebAppHTML(command, appType string) string {
	switch appType {
	case "calculator":
		return generateCalculatorHTML(command)
	case "timer":
		return generateTimerHTML(command)
	case "notes":
		return generateNotesHTML(command)
	case "counter":
		return generateCounterHTML(command)
	case "quiz":
		return generateQuizHTML(command)
	case "form":
		return generateFormHTML(command)
	case "dashboard":
		return generateDashboardHTML(command)
	case "todo":
		return generateTodoAppHTML(command)
	default:
		return generateGenericHTML(command)
	}
}

func generateCalculatorHTML(command string) string {
	return fmt.Sprintf(`#!/bin/bash
# Calculator App based on: %s

echo "Creating calculator.html..."

cat > calculator.html << 'HTMLEOF'
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calculator</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
        }
        .calculator {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            width: 300px;
        }
        .display {
            width: 100%%;
            height: 60px;
            margin-bottom: 10px;
            text-align: right;
            font-size: 2em;
            padding: 10px;
            box-sizing: border-box;
            border: 2px solid #ddd;
            border-radius: 5px;
        }
        .buttons {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
        }
        button {
            height: 60px;
            font-size: 1.5em;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            background: #f0f0f0;
            transition: background 0.3s;
        }
        button:hover {
            background: #e0e0e0;
        }
        button.operator {
            background: #667eea;
            color: white;
        }
        button.operator:hover {
            background: #5568d3;
        }
        button.equals {
            background: #764ba2;
            color: white;
        }
        button.equals:hover {
            background: #6a4291;
        }
    </style>
</head>
<body>
    <div class="calculator">
        <input type="text" class="display" id="display" readonly value="0">
        <div class="buttons">
            <button onclick="clearDisplay()">C</button>
            <button onclick="appendToDisplay('(')">(</button>
            <button onclick="appendToDisplay(')')">)</button>
            <button class="operator" onclick="appendToDisplay('/')">÷</button>

            <button onclick="appendToDisplay('7')">7</button>
            <button onclick="appendToDisplay('8')">8</button>
            <button onclick="appendToDisplay('9')">9</button>
            <button class="operator" onclick="appendToDisplay('*')">×</button>

            <button onclick="appendToDisplay('4')">4</button>
            <button onclick="appendToDisplay('5')">5</button>
            <button onclick="appendToDisplay('6')">6</button>
            <button class="operator" onclick="appendToDisplay('-')">-</button>

            <button onclick="appendToDisplay('1')">1</button>
            <button onclick="appendToDisplay('2')">2</button>
            <button onclick="appendToDisplay('3')">3</button>
            <button class="operator" onclick="appendToDisplay('+')">+</button>

            <button onclick="appendToDisplay('0')">0</button>
            <button onclick="appendToDisplay('.')">.</button>
            <button class="equals" onclick="calculate()" style="grid-column: span 2">=</button>
        </div>
    </div>

    <script>
        function appendToDisplay(value) {
            const display = document.getElementById('display');
            if (display.value === '0' || display.value === 'Error') {
                display.value = value;
            } else {
                display.value += value;
            }
        }

        function clearDisplay() {
            document.getElementById('display').value = '0';
        }

        function calculate() {
            const display = document.getElementById('display');
            try {
                display.value = eval(display.value);
            } catch (e) {
                display.value = 'Error';
            }
        }
    </script>
</body>
</html>
HTMLEOF

echo "Created calculator.html successfully"
echo "File location: $(pwd)/calculator.html"
ls -la calculator.html
`, command)
}

func generateCounterHTML(command string) string {
	return fmt.Sprintf(`#!/bin/bash
# Counter App based on: %s

echo "Creating counter.html..."

cat > counter.html << 'HTMLEOF'
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Counter App</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            text-align: center;
        }
        h1 {
            color: #333;
            margin-bottom: 30px;
        }
        #counter {
            font-size: 6em;
            font-weight: bold;
            color: #667eea;
            margin: 30px 0;
        }
        button {
            font-size: 1.5em;
            padding: 15px 30px;
            margin: 10px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .increment {
            background: #667eea;
            color: white;
        }
        .increment:hover {
            background: #5568d3;
            transform: scale(1.05);
        }
        .decrement {
            background: #764ba2;
            color: white;
        }
        .decrement:hover {
            background: #6a4291;
            transform: scale(1.05);
        }
        .reset {
            background: #f0f0f0;
            color: #333;
        }
        .reset:hover {
            background: #e0e0e0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔢 カウンター</h1>
        <div id="counter">0</div>
        <div>
            <button class="increment" onclick="increment()">+</button>
            <button class="decrement" onclick="decrement()">-</button>
        </div>
        <div>
            <button class="reset" onclick="reset()">リセット</button>
        </div>
    </div>

    <script>
        let count = 0;

        function updateDisplay() {
            document.getElementById('counter').textContent = count;
        }

        function increment() {
            count++;
            updateDisplay();
        }

        function decrement() {
            count--;
            updateDisplay();
        }

        function reset() {
            count = 0;
            updateDisplay();
        }
    </script>
</body>
</html>
HTMLEOF

echo "Created counter.html successfully"
echo "File location: $(pwd)/counter.html"
ls -la counter.html
`, command)
}

func generateTimerHTML(command string) string {
	return generateGenericHTML(command) // Placeholder for now
}

func generateNotesHTML(command string) string {
	return generateGenericHTML(command) // Placeholder for now
}

func generateQuizHTML(command string) string {
	return generateGenericHTML(command) // Placeholder for now
}

func generateFormHTML(command string) string {
	return generateGenericHTML(command) // Placeholder for now
}

func generateDashboardHTML(command string) string {
	return generateGenericHTML(command) // Placeholder for now
}

func generateGenericHTML(command string) string {
	return fmt.Sprintf(`#!/bin/bash
# Generic Web App based on: %s

echo "Creating index.html..."

cat > index.html << 'HTMLEOF'
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Web Application</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
            min-height: 100vh;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        h1 {
            color: #333;
            text-align: center;
        }
        .content {
            margin: 20px 0;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌐 Web Application</h1>
        <div class="content">
            <p>%s</p>
            <p>このアプリケーションは正常に生成されました。</p>
        </div>
    </div>
</body>
</html>
HTMLEOF

echo "Created index.html successfully"
echo "File location: $(pwd)/index.html"
ls -la index.html
`, command, command)
}
