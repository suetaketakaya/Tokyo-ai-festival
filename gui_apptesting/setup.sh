#!/bin/bash

# RemoteClaude v3.7.1 Setup Script
# 🛠️ Complete Environment Setup & Configuration

set -e  # Exit on any error

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ディレクトリ定義
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")/server"
EXPO_DIR="$(dirname "$SCRIPT_DIR")/RemoteClaudeApp"

# 関数定義
print_header() {
    echo -e "${BLUE}================================================================================================${NC}"
    echo -e "${CYAN}🛠️ RemoteClaude v3.7.1 - Complete Environment Setup Script${NC}"
    echo -e "${BLUE}================================================================================================${NC}"
    echo -e "${YELLOW}📦 Automated Development Environment Configuration${NC}"
    echo -e "${BLUE}================================================================================================${NC}"
}

print_section() {
    echo ""
    echo -e "${PURPLE}📋 $1${NC}"
    echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# システム環境チェック
check_system() {
    print_section "System Environment Check"

    # OS チェック
    if [[ "$OSTYPE" == "darwin"* ]]; then
        print_success "macOS detected"
        PLATFORM="macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        print_success "Linux detected"
        PLATFORM="linux"
    else
        print_warning "Unsupported OS: $OSTYPE"
        PLATFORM="unknown"
    fi

    # アーキテクチャチェック
    ARCH=$(uname -m)
    print_info "Architecture: $ARCH"

    # ホームディレクトリ確認
    print_info "Home directory: $HOME"
    print_info "Current user: $(whoami)"
}

# 必要なツールのインストール確認
check_tools() {
    print_section "Required Tools Installation Check"

    local tools_missing=false

    # Xcode Command Line Tools (macOS)
    if [[ "$PLATFORM" == "macos" ]]; then
        if ! xcode-select -p &> /dev/null; then
            print_warning "Xcode Command Line Tools not installed"
            print_info "Installing Xcode Command Line Tools..."
            xcode-select --install
            print_info "Please complete Xcode installation and re-run this script"
            exit 1
        else
            print_success "Xcode Command Line Tools: Installed"
        fi
    fi

    # Homebrew (macOS)
    if [[ "$PLATFORM" == "macos" ]]; then
        if ! command -v brew &> /dev/null; then
            print_warning "Homebrew not installed"
            print_info "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            print_success "Homebrew installed"
        else
            print_success "Homebrew: $(brew --version | head -n1)"
        fi
    fi

    # Node.js
    if ! command -v node &> /dev/null; then
        print_warning "Node.js not found"
        if [[ "$PLATFORM" == "macos" ]]; then
            print_info "Installing Node.js via Homebrew..."
            brew install node
        else
            print_error "Please install Node.js manually: https://nodejs.org/"
            tools_missing=true
        fi
    else
        local node_version=$(node --version)
        local node_major=$(echo $node_version | cut -d'.' -f1 | sed 's/v//')
        if [ "$node_major" -ge 18 ]; then
            print_success "Node.js: $node_version (Compatible)"
        else
            print_warning "Node.js: $node_version (Please upgrade to v18+)"
        fi
    fi

    # npm
    if ! command -v npm &> /dev/null; then
        print_error "npm not found (should come with Node.js)"
        tools_missing=true
    else
        print_success "npm: v$(npm --version)"
    fi

    # Go
    if ! command -v go &> /dev/null; then
        print_warning "Go not found"
        if [[ "$PLATFORM" == "macos" ]]; then
            print_info "Installing Go via Homebrew..."
            brew install go
        else
            print_warning "Please install Go manually: https://golang.org/dl/"
        fi
    else
        print_success "Go: $(go version | awk '{print $3}')"
    fi

    # Git
    if ! command -v git &> /dev/null; then
        print_error "Git not found"
        tools_missing=true
    else
        print_success "Git: $(git --version)"
    fi

    # Docker
    if ! command -v docker &> /dev/null; then
        print_warning "Docker not found"
        print_info "Please install Docker Desktop manually if needed"
    else
        if docker info &> /dev/null; then
            print_success "Docker: Running"
        else
            print_warning "Docker installed but not running"
        fi
    fi

    if [ "$tools_missing" = true ]; then
        print_error "Some required tools are missing. Please install them and re-run this script."
        exit 1
    fi
}

# プロジェクト構造作成
create_project_structure() {
    print_section "Creating Project Structure"

    # 必要なディレクトリ作成
    local dirs=("logs" "pids" "reports" "config" "temp")

    for dir in "${dirs[@]}"; do
        if [ ! -d "$SCRIPT_DIR/$dir" ]; then
            mkdir -p "$SCRIPT_DIR/$dir"
            print_success "Created directory: $dir"
        else
            print_info "Directory exists: $dir"
        fi
    done

    # .gitignore 作成
    if [ ! -f "$SCRIPT_DIR/.gitignore" ]; then
        cat > "$SCRIPT_DIR/.gitignore" << 'EOF'
# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Temporary folders
temp/
tmp/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Environment variables
.env
.env.local
.env.production

# Test reports
reports/*.json
reports/*.html
EOF
        print_success "Created .gitignore"
    else
        print_info ".gitignore already exists"
    fi
}

# 依存関係インストール
install_dependencies() {
    print_section "Installing Dependencies"

    cd "$SCRIPT_DIR"

    # package.json 存在確認
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in $SCRIPT_DIR"
        exit 1
    fi

    # npm install 実行
    print_info "Running npm install..."
    if npm install --timeout=300000; then
        print_success "Dependencies installed successfully"
    else
        print_warning "npm install had issues, but continuing..."
    fi

    # グローバルパッケージ確認
    print_info "Checking global packages..."

    if ! npm list -g expo-cli &> /dev/null; then
        print_info "Installing Expo CLI globally..."
        npm install -g expo-cli || print_warning "Expo CLI installation failed (may need sudo)"
    else
        print_success "Expo CLI: Available globally"
    fi

    # Expo アプリディレクトリの依存関係
    if [ -d "$EXPO_DIR" ]; then
        print_info "Installing Expo app dependencies..."
        cd "$EXPO_DIR"
        if npm install --timeout=300000; then
            print_success "Expo app dependencies installed"
        else
            print_warning "Expo app npm install had issues"
        fi
        cd "$SCRIPT_DIR"
    else
        print_warning "Expo app directory not found: $EXPO_DIR"
    fi
}

# Go サーバーバイナリ確認
check_go_server() {
    print_section "Go Server Binary Check"

    if [ -f "$SERVER_DIR/remoteclaude-server" ]; then
        print_success "Go server binary found"
        # 実行権限確認
        if [ -x "$SERVER_DIR/remoteclaude-server" ]; then
            print_success "Go server binary is executable"
        else
            print_info "Making Go server binary executable..."
            chmod +x "$SERVER_DIR/remoteclaude-server"
            print_success "Execution permission granted"
        fi
    else
        print_warning "Go server binary not found at $SERVER_DIR/remoteclaude-server"

        # Go ソースコードがある場合はビルド
        if [ -f "$SERVER_DIR/main.go" ] || [ -f "$SERVER_DIR/go.mod" ]; then
            print_info "Attempting to build Go server..."
            cd "$SERVER_DIR"
            if go build -o remoteclaude-server .; then
                print_success "Go server built successfully"
            else
                print_error "Failed to build Go server"
            fi
            cd "$SCRIPT_DIR"
        else
            print_warning "No Go source files found for building"
        fi
    fi
}

# 設定ファイル作成
create_config_files() {
    print_section "Creating Configuration Files"

    # 環境設定ファイル
    local config_file="$SCRIPT_DIR/config/environment.json"
    if [ ! -f "$config_file" ]; then
        cat > "$config_file" << 'EOF'
{
  "environment": "development",
  "servers": {
    "go_primary": {
      "port": 8090,
      "host": "localhost"
    },
    "go_secondary": {
      "port": 8091,
      "host": "localhost"
    },
    "expo_primary": {
      "port": 8081,
      "host": "localhost"
    },
    "expo_secondary": {
      "port": 8082,
      "host": "localhost"
    },
    "gui_monitor": {
      "port": 3002,
      "host": "localhost"
    },
    "command_tester": {
      "port": 3005,
      "host": "localhost"
    }
  },
  "logging": {
    "level": "info",
    "directory": "./logs"
  },
  "testing": {
    "timeout": 30000,
    "retries": 3
  }
}
EOF
        print_success "Created environment configuration"
    else
        print_info "Environment configuration already exists"
    fi

    # スクリプト設定ファイル
    local script_config="$SCRIPT_DIR/config/scripts.json"
    if [ ! -f "$script_config" ]; then
        cat > "$script_config" << 'EOF'
{
  "startup_delay": 2,
  "health_check_timeout": 30,
  "process_kill_timeout": 10,
  "cleanup_on_exit": true,
  "auto_restart": false,
  "log_rotation": {
    "enabled": true,
    "max_size": "10MB",
    "max_files": 5
  }
}
EOF
        print_success "Created script configuration"
    else
        print_info "Script configuration already exists"
    fi
}

# 権限設定
set_permissions() {
    print_section "Setting File Permissions"

    # Shell スクリプトを実行可能にする
    local scripts=("start-servers.sh" "stop-servers.sh" "setup.sh")

    for script in "${scripts[@]}"; do
        if [ -f "$SCRIPT_DIR/$script" ]; then
            chmod +x "$SCRIPT_DIR/$script"
            print_success "Made $script executable"
        fi
    done

    # ログディレクトリの権限
    if [ -d "$SCRIPT_DIR/logs" ]; then
        chmod 755 "$SCRIPT_DIR/logs"
        print_success "Set logs directory permissions"
    fi

    # PIDディレクトリの権限
    if [ -d "$SCRIPT_DIR/pids" ]; then
        chmod 755 "$SCRIPT_DIR/pids"
        print_success "Set pids directory permissions"
    fi
}

# セットアップ検証
verify_setup() {
    print_section "Setup Verification"

    local verification_passed=true

    # 必要ファイル確認
    local required_files=(
        "package.json"
        "fixed-command-tester.js"
        "reliable-gui-monitor.js"
        "comprehensive-gui-test.js"
        "start-servers.sh"
        "stop-servers.sh"
    )

    for file in "${required_files[@]}"; do
        if [ -f "$SCRIPT_DIR/$file" ]; then
            print_success "Found: $file"
        else
            print_error "Missing: $file"
            verification_passed=false
        fi
    done

    # ディレクトリ確認
    local required_dirs=("logs" "pids" "reports" "config")

    for dir in "${required_dirs[@]}"; do
        if [ -d "$SCRIPT_DIR/$dir" ]; then
            print_success "Directory: $dir"
        else
            print_error "Missing directory: $dir"
            verification_passed=false
        fi
    done

    # Node modules 確認
    if [ -d "$SCRIPT_DIR/node_modules" ]; then
        print_success "Node modules installed"
    else
        print_warning "Node modules not found"
        verification_passed=false
    fi

    return $([ "$verification_passed" = true ] && echo 0 || echo 1)
}

# 使用方法表示
show_usage() {
    print_section "Setup Complete - Usage Instructions"

    echo -e "${CYAN}🚀 Server Management:${NC}"
    echo "  Start all servers:      ./start-servers.sh"
    echo "  Stop all servers:       ./stop-servers.sh"
    echo "  Force stop servers:     ./stop-servers.sh --force"
    echo ""
    echo -e "${CYAN}🧪 Testing:${NC}"
    echo "  Run comprehensive test: node comprehensive-gui-test.js"
    echo "  Check GUI monitor:      http://localhost:3002"
    echo "  Command tester:         http://localhost:3005"
    echo ""
    echo -e "${CYAN}📊 Monitoring:${NC}"
    echo "  View logs:              tail -f logs/*.log"
    echo "  Check processes:        ps aux | grep remoteclaude"
    echo "  Check ports:            lsof -i :8080,8081,8082,8090,8091,3002,3005"
    echo ""
    echo -e "${CYAN}🔧 Configuration:${NC}"
    echo "  Environment config:     config/environment.json"
    echo "  Script config:          config/scripts.json"
    echo ""
    echo -e "${CYAN}🌐 Web Interfaces:${NC}"
    echo "  Go Server Web UI:       http://localhost:8080"
    echo "  Expo Primary:           http://localhost:8081"
    echo "  Expo Secondary:         http://localhost:8082"
    echo "  GUI Monitor:            http://localhost:3002"
    echo "  Command Tester:         http://localhost:3005"
}

# メイン実行
main() {
    print_header

    # システム環境チェック
    check_system

    # 必要ツールの確認・インストール
    check_tools

    # プロジェクト構造作成
    create_project_structure

    # 依存関係インストール
    install_dependencies

    # Go サーバー確認
    check_go_server

    # 設定ファイル作成
    create_config_files

    # 権限設定
    set_permissions

    # セットアップ検証
    if verify_setup; then
        print_success "Setup verification passed!"
    else
        print_warning "Setup verification had issues, but basic setup is complete"
    fi

    # 使用方法表示
    show_usage

    echo ""
    echo -e "${GREEN}🎉 RemoteClaude v3.7.1 Setup Complete!${NC}"
    echo -e "${BLUE}================================================================================================${NC}"
    echo ""
    echo -e "${CYAN}💡 Next Steps:${NC}"
    echo "1. Run ./start-servers.sh to start all services"
    echo "2. Open http://localhost:3002 for GUI monitoring"
    echo "3. Run node comprehensive-gui-test.js to verify everything works"
    echo ""
}

# 強制セットアップオプション
if [ "$1" = "--force" ] || [ "$1" = "-f" ]; then
    print_header
    print_warning "Force setup mode - will overwrite existing configurations"
    echo ""
    read -p "Are you sure you want to continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Setup cancelled"
        exit 0
    fi

    # 既存設定のバックアップ
    if [ -d "$SCRIPT_DIR/config" ]; then
        cp -r "$SCRIPT_DIR/config" "$SCRIPT_DIR/config.backup.$(date +%Y%m%d_%H%M%S)"
        print_info "Backed up existing configuration"
    fi
fi

# ヘルプ表示
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    print_header
    echo -e "${CYAN}Usage:${NC}"
    echo "  ./setup.sh          # Normal setup"
    echo "  ./setup.sh --force  # Force setup (overwrite configs)"
    echo "  ./setup.sh --help   # Show this help"
    echo ""
    echo -e "${CYAN}Description:${NC}"
    echo "  Complete environment setup for RemoteClaude v3.7.1"
    echo "  - System dependency checks"
    echo "  - Tool installation (Node.js, Go, etc.)"
    echo "  - Project structure creation"
    echo "  - Configuration file generation"
    echo "  - Permission setup"
    echo ""
    exit 0
fi

# 通常実行
main "$@"