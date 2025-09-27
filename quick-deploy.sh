#!/bin/bash

# Firebase + AdSense クイックデプロイ
# ワンコマンドで設定からデプロイまで実行

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Firebase + AdSense クイックデプロイ開始${NC}"

# 1. プロファイル切り替え
echo -e "${YELLOW}Firebase特化プロファイルに切り替え...${NC}"
./profile-manager.sh switch firebase-deploy

# 2. 完全デプロイ実行
echo -e "${YELLOW}完全デプロイ実行...${NC}"
./firebase-workflow.sh full-deploy

echo -e "${GREEN}🎉 クイックデプロイ完了！${NC}"