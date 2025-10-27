#!/bin/bash

# RemoteClaude バージョンアップスクリプト
# Usage: ./bump-version.sh [version]
# Example: ./bump-version.sh 4.0.0-beta.1

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 RemoteClaude Version Bump Tool${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 現在のバージョン取得
if [ -f version.txt ]; then
    CURRENT_VERSION=$(cat version.txt)
    echo -e "Current version: ${YELLOW}$CURRENT_VERSION${NC}"
else
    CURRENT_VERSION="unknown"
    echo -e "${YELLOW}⚠️  version.txt not found${NC}"
fi

# 新しいバージョンを引数から取得、なければ対話的に入力
if [ -z "$1" ]; then
    echo ""
    read -p "Enter new version (e.g., 4.0.0-beta.1): " NEW_VERSION
else
    NEW_VERSION="$1"
fi

# バージョン検証
if [ -z "$NEW_VERSION" ]; then
    echo -e "${RED}❌ Error: Version cannot be empty${NC}"
    exit 1
fi

echo ""
echo -e "New version: ${GREEN}$NEW_VERSION${NC}"
echo ""

# 確認
read -p "Proceed with version bump? (y/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Updating version files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. version.txt 更新
echo -n "Updating version.txt... "
echo "$NEW_VERSION" > version.txt
echo -e "${GREEN}✓${NC}"

# 2. package.json 更新 (存在する場合)
if [ -f package.json ]; then
    echo -n "Updating package.json... "
    npm version "$NEW_VERSION" --no-git-tag-version --allow-same-version > /dev/null 2>&1
    echo -e "${GREEN}✓${NC}"
fi

# 3. RemoteClaudeApp/package.json 更新 (存在する場合)
if [ -f RemoteClaudeApp/package.json ]; then
    echo -n "Updating RemoteClaudeApp/package.json... "
    cd RemoteClaudeApp
    npm version "$NEW_VERSION" --no-git-tag-version --allow-same-version > /dev/null 2>&1
    cd ..
    echo -e "${GREEN}✓${NC}"
fi

# 4. App.tsx 更新 (存在する場合)
APP_TSX="RemoteClaudeApp/App.tsx"
if [ -f "$APP_TSX" ]; then
    echo -n "Updating App.tsx... "
    # macOS/BSD sed 互換
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/const APP_VERSION = '[^']*'/const APP_VERSION = '$NEW_VERSION'/" "$APP_TSX"
    else
        sed -i "s/const APP_VERSION = '[^']*'/const APP_VERSION = '$NEW_VERSION'/" "$APP_TSX"
    fi
    echo -e "${GREEN}✓${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Creating Git commit and tag..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Git コミット
echo -n "Creating commit... "
git add version.txt package.json RemoteClaudeApp/package.json RemoteClaudeApp/App.tsx 2>/dev/null || true
git commit -m "chore: bump version to v$NEW_VERSION" > /dev/null 2>&1
echo -e "${GREEN}✓${NC}"

# Git タグ作成
echo ""
echo "Creating annotated tag v$NEW_VERSION..."
echo ""
echo "Enter release notes (Ctrl+D when done):"
echo "---"

# リリースノートを一時ファイルに保存
TEMP_FILE=$(mktemp)
cat > "$TEMP_FILE"

# タグ作成
git tag -a "v$NEW_VERSION" -F "$TEMP_FILE"
rm "$TEMP_FILE"

echo ""
echo -e "${GREEN}✓ Tag created${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Version bump complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Review changes:"
echo "     git log -1"
echo "     git show v$NEW_VERSION"
echo ""
echo "  2. Push to remote:"
echo "     git push origin main"
echo "     git push origin v$NEW_VERSION"
echo ""
echo "  3. Create GitHub Release:"
echo "     https://github.com/your-org/remoteclaude/releases/new"
echo ""
