#!/bin/bash

# Claude Code プロファイル管理スクリプト
# 用途別に最適化されたClaude Code設定を切り替えるツール

CLAUDE_DIR=".claude"
PROFILES_FILE="$CLAUDE_DIR/profiles.json"
SETTINGS_FILE="$CLAUDE_DIR/settings.local.json"
BACKUP_DIR="$CLAUDE_DIR/backups"

# カラー設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ディレクトリ作成
mkdir -p "$BACKUP_DIR"

# ヘルプ表示
show_help() {
    echo -e "${BLUE}Claude Code プロファイル管理ツール${NC}"
    echo ""
    echo "使用方法:"
    echo "  ./profile-manager.sh [コマンド] [オプション]"
    echo ""
    echo "コマンド:"
    echo -e "  ${GREEN}list${NC}                  利用可能なプロファイル一覧を表示"
    echo -e "  ${GREEN}current${NC}               現在のプロファイルを表示"
    echo -e "  ${GREEN}switch <profile>${NC}      指定プロファイルに切り替え"
    echo -e "  ${GREEN}info <profile>${NC}        プロファイル詳細情報を表示"
    echo -e "  ${GREEN}backup${NC}                現在の設定をバックアップ"
    echo -e "  ${GREEN}restore${NC}               バックアップから設定を復元"
    echo -e "  ${GREEN}reset${NC}                 デフォルト設定にリセット"
    echo ""
    echo "利用可能なプロファイル:"
    echo -e "  ${YELLOW}blog${NC}          - ブログ記述特化（SEO重視、創造的な文章）"
    echo -e "  ${YELLOW}responsive-dev${NC} - レスポンシブ開発特化（モバイルファースト、パフォーマンス重視）"
    echo -e "  ${YELLOW}performance${NC}   - 高速レスポンス（最小限の回答、効率重視）"
    echo -e "  ${YELLOW}analysis${NC}      - コード解析特化（詳細分析、ドキュメント作成）"
}

# プロファイル一覧表示
list_profiles() {
    if [[ ! -f "$PROFILES_FILE" ]]; then
        echo -e "${RED}プロファイルファイルが見つかりません: $PROFILES_FILE${NC}"
        return 1
    fi

    echo -e "${BLUE}利用可能なプロファイル:${NC}"

    local current_profile=$(jq -r '.current_profile' "$PROFILES_FILE" 2>/dev/null)

    jq -r '.profiles | to_entries[] | "\(.key):\(.value.name):\(.value.description)"' "$PROFILES_FILE" | while IFS=: read -r key name desc; do
        if [[ "$key" == "$current_profile" ]]; then
            echo -e "  ${GREEN}★ $key${NC} - $name"
        else
            echo -e "  ${YELLOW}  $key${NC} - $name"
        fi
        echo -e "    ${BLUE}$desc${NC}"
    done
}

# 現在のプロファイル表示
show_current() {
    if [[ ! -f "$PROFILES_FILE" ]]; then
        echo -e "${RED}プロファイルファイルが見つかりません${NC}"
        return 1
    fi

    local current_profile=$(jq -r '.current_profile' "$PROFILES_FILE")
    local profile_name=$(jq -r ".profiles.$current_profile.name" "$PROFILES_FILE")

    echo -e "${GREEN}現在のプロファイル:${NC} $current_profile ($profile_name)"
}

# プロファイル詳細情報表示
show_profile_info() {
    local profile="$1"

    if [[ ! -f "$PROFILES_FILE" ]]; then
        echo -e "${RED}プロファイルファイルが見つかりません${NC}"
        return 1
    fi

    if ! jq -e ".profiles.$profile" "$PROFILES_FILE" >/dev/null 2>&1; then
        echo -e "${RED}プロファイル '$profile' が見つかりません${NC}"
        return 1
    fi

    echo -e "${BLUE}プロファイル詳細: $profile${NC}"
    echo -e "${GREEN}名前:${NC} $(jq -r ".profiles.$profile.name" "$PROFILES_FILE")"
    echo -e "${GREEN}説明:${NC} $(jq -r ".profiles.$profile.description" "$PROFILES_FILE")"
    echo -e "${GREEN}モデル:${NC} $(jq -r ".profiles.$profile.settings.model" "$PROFILES_FILE")"
    echo -e "${GREEN}出力スタイル:${NC} $(jq -r ".profiles.$profile.settings.outputStyle" "$PROFILES_FILE")"
    echo ""
    echo -e "${YELLOW}システムプロンプト:${NC}"
    jq -r ".profiles.$profile.system_prompt" "$PROFILES_FILE" | fold -w 80 -s
}

# 設定のバックアップ
backup_settings() {
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$BACKUP_DIR/settings_$timestamp.json"

    if [[ -f "$SETTINGS_FILE" ]]; then
        cp "$SETTINGS_FILE" "$backup_file"
        echo -e "${GREEN}設定をバックアップしました:${NC} $backup_file"
    else
        echo -e "${YELLOW}バックアップする設定ファイルが見つかりません${NC}"
    fi
}

# プロファイル切り替え
switch_profile() {
    local target_profile="$1"

    if [[ ! -f "$PROFILES_FILE" ]]; then
        echo -e "${RED}プロファイルファイルが見つかりません${NC}"
        return 1
    fi

    if ! jq -e ".profiles.$target_profile" "$PROFILES_FILE" >/dev/null 2>&1; then
        echo -e "${RED}プロファイル '$target_profile' が見つかりません${NC}"
        list_profiles
        return 1
    fi

    # 現在の設定をバックアップ
    backup_settings

    # プロファイル設定を取得
    local model=$(jq -r ".profiles.$target_profile.settings.model" "$PROFILES_FILE")
    local output_style=$(jq -r ".profiles.$target_profile.settings.outputStyle" "$PROFILES_FILE")

    # settings.local.jsonを更新
    local temp_settings=$(mktemp)

    if [[ -f "$SETTINGS_FILE" ]]; then
        cp "$SETTINGS_FILE" "$temp_settings"
    else
        echo '{"permissions":{"allow":[],"deny":[],"ask":[]}}' > "$temp_settings"
    fi

    # モデルとアウトプットスタイルを設定
    jq --arg model "$model" --arg output_style "$output_style" \
       '. + {model: $model, outputStyle: $output_style}' \
       "$temp_settings" > "$SETTINGS_FILE"

    # プロファイルの現在設定を更新
    jq --arg profile "$target_profile" '.current_profile = $profile' "$PROFILES_FILE" > "$PROFILES_FILE.tmp"
    mv "$PROFILES_FILE.tmp" "$PROFILES_FILE"

    local profile_name=$(jq -r ".profiles.$target_profile.name" "$PROFILES_FILE")
    echo -e "${GREEN}プロファイルを切り替えました:${NC} $target_profile ($profile_name)"
    echo -e "${YELLOW}Claude Codeを再起動して設定を反映してください${NC}"

    rm -f "$temp_settings"
}

# デフォルト設定にリセット
reset_settings() {
    backup_settings

    cat > "$SETTINGS_FILE" << 'EOF'
{
  "permissions": {
    "allow": [],
    "deny": [],
    "ask": []
  }
}
EOF

    jq '.current_profile = "responsive-dev"' "$PROFILES_FILE" > "$PROFILES_FILE.tmp"
    mv "$PROFILES_FILE.tmp" "$PROFILES_FILE"

    echo -e "${GREEN}設定をデフォルトにリセットしました${NC}"
}

# バックアップから復元
restore_settings() {
    if [[ ! -d "$BACKUP_DIR" ]] || [[ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]]; then
        echo -e "${RED}復元可能なバックアップが見つかりません${NC}"
        return 1
    fi

    echo -e "${BLUE}利用可能なバックアップ:${NC}"
    ls -1t "$BACKUP_DIR"/settings_*.json | head -5 | while read -r backup; do
        local filename=$(basename "$backup")
        local timestamp=${filename#settings_}
        timestamp=${timestamp%.json}
        echo "  $filename ($(date -d "${timestamp:0:8} ${timestamp:9:2}:${timestamp:11:2}:${timestamp:13:2}" 2>/dev/null || echo "$timestamp"))"
    done

    echo ""
    read -p "復元するバックアップファイル名を入力してください: " backup_name

    local backup_path="$BACKUP_DIR/$backup_name"
    if [[ -f "$backup_path" ]]; then
        cp "$backup_path" "$SETTINGS_FILE"
        echo -e "${GREEN}設定を復元しました:${NC} $backup_name"
    else
        echo -e "${RED}指定されたバックアップファイルが見つかりません${NC}"
        return 1
    fi
}

# メイン処理
main() {
    case "$1" in
        "list"|"ls")
            list_profiles
            ;;
        "current"|"cur")
            show_current
            ;;
        "switch"|"sw")
            if [[ -z "$2" ]]; then
                echo -e "${RED}エラー: プロファイル名を指定してください${NC}"
                show_help
                return 1
            fi
            switch_profile "$2"
            ;;
        "info"|"show")
            if [[ -z "$2" ]]; then
                echo -e "${RED}エラー: プロファイル名を指定してください${NC}"
                show_help
                return 1
            fi
            show_profile_info "$2"
            ;;
        "backup"|"bak")
            backup_settings
            ;;
        "restore"|"res")
            restore_settings
            ;;
        "reset")
            reset_settings
            ;;
        "help"|"--help"|"-h"|"")
            show_help
            ;;
        *)
            echo -e "${RED}エラー: 無効なコマンド '$1'${NC}"
            show_help
            return 1
            ;;
    esac
}

# jqの存在確認
if ! command -v jq &> /dev/null; then
    echo -e "${RED}エラー: jqがインストールされていません${NC}"
    echo "macOSの場合: brew install jq"
    echo "Ubuntu/Debianの場合: sudo apt install jq"
    exit 1
fi

# メイン処理実行
main "$@"