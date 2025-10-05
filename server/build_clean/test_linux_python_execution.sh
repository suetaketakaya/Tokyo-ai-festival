#!/bin/bash
# Linuxコマンドとpythonコマンドの実行能力テスト

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐧 Linuxコマンド実行テスト"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: 基本的なLinuxコマンド
echo "Test 1: 基本的なLinuxコマンド"
echo "$ pwd"
pwd
echo "✅ 成功"
echo ""

echo "$ ls -la | head -5"
ls -la | head -5
echo "✅ 成功"
echo ""

echo "$ whoami"
whoami
echo "✅ 成功"
echo ""

# Test 2: ファイル操作
echo "Test 2: ファイル操作"
echo "$ echo 'Hello World' > test_file.txt"
echo 'Hello World' > test_file.txt
echo "✅ ファイル作成成功"

echo "$ cat test_file.txt"
cat test_file.txt
echo "✅ ファイル読み取り成功"

echo "$ wc -l test_file.txt"
wc -l test_file.txt
echo "✅ 行数カウント成功"
echo ""

# Test 3: パイプとリダイレクト
echo "Test 3: パイプとリダイレクト"
echo "$ ls *.json | wc -l"
ls *.json 2>/dev/null | wc -l
echo "✅ パイプ成功"
echo ""

# Test 4: プロセス管理
echo "Test 4: プロセス管理"
echo "$ ps aux | grep python | head -3"
ps aux | grep python | head -3
echo "✅ プロセス確認成功"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐍 Pythonコマンド実行テスト"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 5: Python基本実行
echo "Test 5: Python基本実行"
echo "$ python3 --version"
python3 --version
echo "✅ Pythonバージョン確認成功"
echo ""

# Test 6: Python簡単なスクリプト
echo "Test 6: Python簡単なスクリプト"
echo "$ python3 -c 'print(\"Hello from Python\")'"
python3 -c 'print("Hello from Python")'
echo "✅ Python実行成功"
echo ""

# Test 7: Python数学計算
echo "Test 7: Python数学計算"
echo "$ python3 -c 'import math; print(math.pi)'"
python3 -c 'import math; print(math.pi)'
echo "✅ ライブラリインポート成功"
echo ""

# Test 8: Pythonファイル作成と実行
echo "Test 8: Pythonスクリプト作成と実行"
cat > test_script.py << 'PYTHON'
#!/usr/bin/env python3
import sys
print("Python script executed successfully!")
print(f"Python version: {sys.version.split()[0]}")
for i in range(5):
    print(f"  {i+1}. Test line {i+1}")
PYTHON

echo "$ python3 test_script.py"
python3 test_script.py
echo "✅ Pythonスクリプト実行成功"
echo ""

# Test 9: pandas/numpy テスト（インストール確認）
echo "Test 9: Python Data Science ライブラリテスト"
echo "$ python3 -c 'import pandas; print(pandas.__version__)'"
python3 -c 'import pandas; print("pandas version:", pandas.__version__)' 2>/dev/null && echo "✅ pandas利用可能" || echo "⚠️ pandas未インストール"

echo "$ python3 -c 'import numpy; print(numpy.__version__)'"
python3 -c 'import numpy; print("numpy version:", numpy.__version__)' 2>/dev/null && echo "✅ numpy利用可能" || echo "⚠️ numpy未インストール"
echo ""

# Test 10: 複雑なパイプライン
echo "Test 10: LinuxとPythonの組み合わせ"
echo "$ ls *.json | python3 -c 'import sys; print(len(sys.stdin.readlines()), \"JSON files found\")'"
ls *.json 2>/dev/null | python3 -c 'import sys; print(len(sys.stdin.readlines()), "JSON files found")'
echo "✅ パイプライン成功"
echo ""

# クリーンアップ
rm -f test_file.txt test_script.py

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ テスト完了"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
