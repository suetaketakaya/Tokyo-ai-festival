#!/bin/bash
# Go言語とC++の実行能力テスト

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔷 Go言語実行テスト"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Go バージョン確認
echo "Test 1: Go バージョン確認"
echo "$ go version"
go version 2>/dev/null && echo "✅ Go利用可能" || echo "⚠️ Go未インストール"
echo ""

# Test 2: 簡単なGoプログラム作成と実行
if command -v go &> /dev/null; then
    echo "Test 2: Goプログラム作成と実行"
    cat > hello.go << 'GO'
package main

import "fmt"

func main() {
    fmt.Println("Hello from Go!")
    fmt.Println("Go is running successfully")
    
    // 簡単な計算
    sum := 0
    for i := 1; i <= 10; i++ {
        sum += i
    }
    fmt.Printf("Sum 1-10: %d\n", sum)
}
GO

    echo "$ go run hello.go"
    go run hello.go
    echo "✅ Goプログラム実行成功"
    echo ""

    echo "Test 3: Goビルド"
    echo "$ go build hello.go"
    go build hello.go
    echo "$ ./hello"
    ./hello
    echo "✅ Goビルド成功"
    rm -f hello hello.go
    echo ""
else
    echo "⚠️ Go未インストールのため、Test 2-3 スキップ"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔶 C++実行テスト"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 4: C++ コンパイラ確認
echo "Test 4: C++ コンパイラ確認"
echo "$ g++ --version"
g++ --version 2>/dev/null | head -2 && echo "✅ g++利用可能" || echo "⚠️ g++未インストール"
echo ""

echo "$ clang++ --version"
clang++ --version 2>/dev/null | head -2 && echo "✅ clang++利用可能" || echo "⚠️ clang++未インストール"
echo ""

# Test 5: 簡単なC++プログラム作成とコンパイル
if command -v clang++ &> /dev/null || command -v g++ &> /dev/null; then
    echo "Test 5: C++プログラム作成とコンパイル"
    cat > hello.cpp << 'CPP'
#include <iostream>
#include <vector>
#include <string>

int main() {
    std::cout << "Hello from C++!" << std::endl;
    std::cout << "C++ is running successfully" << std::endl;
    
    // STLベクター使用
    std::vector<int> numbers = {1, 2, 3, 4, 5};
    int sum = 0;
    for(int n : numbers) {
        sum += n;
    }
    std::cout << "Sum of vector: " << sum << std::endl;
    
    // 文字列操作
    std::string message = "C++ Standard Library works!";
    std::cout << message << std::endl;
    
    return 0;
}
CPP

    # clang++を優先、なければg++
    if command -v clang++ &> /dev/null; then
        COMPILER="clang++"
    else
        COMPILER="g++"
    fi

    echo "$ $COMPILER hello.cpp -o hello"
    $COMPILER hello.cpp -o hello -std=c++11
    echo "✅ C++コンパイル成功"
    
    echo "$ ./hello"
    ./hello
    echo "✅ C++プログラム実行成功"
    rm -f hello hello.cpp
    echo ""
else
    echo "⚠️ C++コンパイラ未インストールのため、Test 5 スキップ"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 その他の言語テスト"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 6: Rust
echo "Test 6: Rust確認"
echo "$ rustc --version"
rustc --version 2>/dev/null && echo "✅ Rust利用可能" || echo "⚠️ Rust未インストール"
echo ""

# Test 7: Java
echo "Test 7: Java確認"
echo "$ java --version"
java --version 2>/dev/null | head -1 && echo "✅ Java利用可能" || echo "⚠️ Java未インストール"
echo ""

# Test 8: Node.js/JavaScript
echo "Test 8: Node.js確認"
echo "$ node --version"
node --version 2>/dev/null && echo "✅ Node.js利用可能" || echo "⚠️ Node.js未インストール"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 サポート言語サマリー"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "利用可能な言語:"
python3 --version 2>/dev/null && echo "  ✅ Python $(python3 --version 2>&1 | cut -d' ' -f2)"
go version 2>/dev/null && echo "  ✅ Go $(go version 2>&1 | cut -d' ' -f3)"
clang++ --version 2>/dev/null >/dev/null && echo "  ✅ C++ (clang++)"
g++ --version 2>/dev/null >/dev/null && echo "  ✅ C++ (g++)"
rustc --version 2>/dev/null && echo "  ✅ Rust $(rustc --version 2>&1 | cut -d' ' -f2)"
java --version 2>/dev/null >/dev/null && echo "  ✅ Java $(java --version 2>&1 | head -1 | cut -d' ' -f2)"
node --version 2>/dev/null && echo "  ✅ Node.js $(node --version 2>&1)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ テスト完了"
