#!/bin/bash

# RemoteClaude セットアップスクリプト
# Version: 4.0
# Author: RemoteClaude Team
# Description: ワンコマンドでサーバーセットアップを完了

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ロゴ表示
echo ""
echo -e "${BLUE}🚀 RemoteClaude Server v4.0 セットアップ${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Docker確認
echo -n "Checking Docker... "
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Failed${NC}"
    echo ""
    echo -e "${YELLOW}Dockerが起動していません。${NC}"
    echo ""

    # OS判定
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macOSを検出しました。Docker Desktopを起動しています..."
        open -a Docker

        echo "Dockerの起動を待っています..."
        for i in {1..30}; do
            if docker info > /dev/null 2>&1; then
                echo -e "${GREEN}✅ Docker起動完了${NC}"
                break
            fi
            echo -n "."
            sleep 2
        done

        if ! docker info > /dev/null 2>&1; then
            echo ""
            echo -e "${RED}❌ Dockerの起動に失敗しました${NC}"
            echo "手動でDocker Desktopを起動してから再実行してください。"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "Linuxを検出しました。Dockerサービスを起動しています..."
        sudo systemctl start docker

        if docker info > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Docker起動完了${NC}"
        else
            echo -e "${RED}❌ Dockerの起動に失敗しました${NC}"
            echo "手動で以下を実行してください:"
            echo "  sudo systemctl start docker"
            exit 1
        fi
    else
        echo -e "${RED}❌ 対応していないOSです${NC}"
        echo "Docker Desktopを手動で起動してから再実行してください。"
        exit 1
    fi
else
    echo -e "${GREEN}✅ OK${NC}"
fi

# 2. Claude API キー確認
echo -n "Checking Claude API Key... "
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  Not Set${NC}"
    echo ""
    echo "Claude API キーが設定されていません。"
    echo ""
    echo "APIキーは以下から取得できます:"
    echo "  https://console.anthropic.com/settings/keys"
    echo ""
    read -p "Claude API キーを入力してください: " -s api_key
    echo ""

    if [ -z "$api_key" ]; then
        echo -e "${RED}❌ APIキーが入力されませんでした${NC}"
        exit 1
    fi

    export ANTHROPIC_API_KEY="$api_key"

    # シェル設定ファイルに追加
    if [[ "$SHELL" == *"zsh"* ]]; then
        echo "export ANTHROPIC_API_KEY='$api_key'" >> ~/.zshrc
        echo -e "${GREEN}✅ ~/.zshrc にAPIキーを保存しました${NC}"
    elif [[ "$SHELL" == *"bash"* ]]; then
        echo "export ANTHROPIC_API_KEY='$api_key'" >> ~/.bashrc
        echo -e "${GREEN}✅ ~/.bashrc にAPIキーを保存しました${NC}"
    fi

    echo -e "${GREEN}✅ APIキー設定完了${NC}"
else
    echo -e "${GREEN}✅ OK${NC}"
fi

# 3. プロジェクトディレクトリ確認
echo -n "Checking Project Directory... "
if [ ! -d "./projects" ]; then
    mkdir -p ./projects
    echo -e "${GREEN}✅ Created${NC}"
else
    echo -e "${GREEN}✅ OK${NC}"
fi

# 4. ボタンデータベースディレクトリ確認
echo -n "Checking Button Database Directory... "
if [ ! -d "./button_database" ]; then
    mkdir -p ./button_database
    echo -e "${GREEN}✅ Created${NC}"
else
    echo -e "${GREEN}✅ OK${NC}"
fi

# 5. サーバーバイナリ確認
echo -n "Checking Server Binary... "
if [ ! -f "./remoteclaude-server-matplotlib-mgmt" ]; then
    echo -e "${RED}❌ Not Found${NC}"
    echo ""
    echo "サーバーバイナリが見つかりません。"
    echo "以下のコマンドでビルドしてください:"
    echo "  go build -o remoteclaude-server-matplotlib-mgmt"
    exit 1
else
    chmod +x ./remoteclaude-server-matplotlib-mgmt
    echo -e "${GREEN}✅ OK${NC}"
fi

# 6. ポート確認
echo -n "Checking Port 8090... "
if lsof -Pi :8090 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  In Use${NC}"
    echo ""
    echo "ポート8090が既に使用されています。"
    read -p "別のポートを使用しますか? (y/N): " use_different_port

    if [[ "$use_different_port" =~ ^[Yy]$ ]]; then
        read -p "使用するポート番号を入力してください (例: 8091): " custom_port
        PORT="$custom_port"
        echo -e "${GREEN}✅ ポート $PORT を使用します${NC}"
    else
        echo "ポート8090を使用しているプロセスを終了してから再実行してください。"
        echo ""
        echo "使用中のプロセス:"
        lsof -Pi :8090 -sTCP:LISTEN
        exit 1
    fi
else
    PORT="8090"
    echo -e "${GREEN}✅ OK${NC}"
fi

# 7. セットアップ完了
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ セットアップ完了！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}🔥 サーバーを起動しています...${NC}"
echo ""

# 8. サーバー起動
if [ -n "$PORT" ] && [ "$PORT" != "8090" ]; then
    ./remoteclaude-server-matplotlib-mgmt --port="$PORT"
else
    ./remoteclaude-server-matplotlib-mgmt --port=8090
fi
