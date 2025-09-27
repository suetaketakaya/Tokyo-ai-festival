#!/bin/bash

# RemoteClaude v3.7.1 Dependencies Installation Script
# 📦 Automated Package & Tool Installation

set -e

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

print_header() {
    echo -e "${BLUE}================================================================================================${NC}"
    echo -e "${CYAN}📦 RemoteClaude v3.7.1 - Dependencies Installation Script${NC}"
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

# システム依存関係インストール
install_system_dependencies() {
    print_section "System Dependencies Installation"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        print_info "Installing macOS dependencies..."

        # Homebrew が必要
        if ! command -v brew &> /dev/null; then
            print_info "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi

        # 必要なパッケージ
        local packages=("node" "go" "git" "curl" "wget")

        for package in "${packages[@]}"; do
            if ! command -v "$package" &> /dev/null; then
                print_info "Installing $package..."
                brew install "$package"
                print_success "$package installed"
            else
                print_success "$package already installed"
            fi
        done

        # Optional tools
        print_info "Installing optional development tools..."
        brew install --cask docker || print_warning "Docker installation skipped"
        brew install watchman || print_warning "Watchman installation skipped"

    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        print_info "Installing Linux dependencies..."

        # パッケージマネージャー判定
        if command -v apt-get &> /dev/null; then
            # Ubuntu/Debian
            print_info "Detected apt package manager"
            sudo apt-get update
            sudo apt-get install -y curl wget git build-essential

            # Node.js (NodeSource repository)
            if ! command -v node &> /dev/null; then
                curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
                sudo apt-get install -y nodejs
            fi

            # Go
            if ! command -v go &> /dev/null; then
                wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
                sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
                export PATH=$PATH:/usr/local/go/bin
                echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
            fi

        elif command -v yum &> /dev/null; then
            # CentOS/RHEL
            print_info "Detected yum package manager"
            sudo yum update -y
            sudo yum install -y curl wget git gcc gcc-c++ make

            # Node.js
            if ! command -v node &> /dev/null; then
                curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
                sudo yum install -y nodejs
            fi

        else
            print_warning "Unknown Linux distribution. Please install dependencies manually."
        fi

    else
        print_warning "Unsupported operating system: $OSTYPE"
    fi
}

# Node.js 依存関係インストール
install_node_dependencies() {
    print_section "Node.js Dependencies Installation"

    cd "$SCRIPT_DIR"

    # package.json 確認
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Creating basic package.json..."

        cat > package.json << 'EOF'
{
  "name": "remoteclaude-gui-testing",
  "version": "3.7.1",
  "description": "RemoteClaude GUI Application Testing Environment",
  "main": "comprehensive-gui-test.js",
  "scripts": {
    "test": "node comprehensive-gui-test.js",
    "monitor": "node reliable-gui-monitor.js",
    "command-test": "node fixed-command-tester.js",
    "start": "bash start-servers.sh",
    "stop": "bash stop-servers.sh",
    "setup": "bash setup.sh"
  },
  "keywords": ["remoteclaude", "gui", "testing", "websocket", "expo"],
  "author": "RemoteClaude Team",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.13.0",
    "axios": "^1.4.0",
    "cors": "^2.8.5",
    "compression": "^1.7.4",
    "helmet": "^7.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.4.0",
    "@types/express": "^4.17.17",
    "@types/ws": "^8.5.5",
    "@types/cors": "^2.8.13",
    "nodemon": "^3.0.1",
    "jest": "^29.6.1",
    "eslint": "^8.44.0",
    "prettier": "^3.0.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
EOF
        print_success "Created package.json"
    fi

    # npm キャッシュクリア
    print_info "Clearing npm cache..."
    npm cache clean --force || true

    # npm install 実行
    print_info "Installing Node.js dependencies..."
    if npm install --timeout=600000; then
        print_success "Node.js dependencies installed successfully"
    else
        print_warning "npm install had issues, trying with legacy peer deps..."
        npm install --legacy-peer-deps --timeout=600000 || print_error "Failed to install dependencies"
    fi

    # グローバルパッケージ
    print_info "Installing global packages..."

    local global_packages=("expo-cli" "@expo/cli" "nodemon" "pm2")

    for package in "${global_packages[@]}"; do
        if ! npm list -g "$package" &> /dev/null; then
            print_info "Installing global package: $package"
            npm install -g "$package" || print_warning "Failed to install $package globally"
        else
            print_success "Global package already installed: $package"
        fi
    done
}

# Expo アプリ依存関係
install_expo_dependencies() {
    print_section "Expo App Dependencies Installation"

    if [ -d "$EXPO_DIR" ]; then
        cd "$EXPO_DIR"

        print_info "Installing Expo app dependencies..."

        # Expo キャッシュクリア
        if command -v expo &> /dev/null; then
            expo install --fix || true
        fi

        # npm install
        if npm install --timeout=600000; then
            print_success "Expo app dependencies installed"
        else
            print_warning "Expo app npm install had issues"
        fi

        # Expo specific packages
        print_info "Installing Expo specific packages..."
        local expo_packages=(
            "expo-status-bar"
            "react-native-web"
            "@expo/webpack-config"
            "expo-dev-client"
        )

        for package in "${expo_packages[@]}"; do
            npm install "$package" || print_warning "Failed to install $package"
        done

        cd "$SCRIPT_DIR"
    else
        print_warning "Expo app directory not found: $EXPO_DIR"
    fi
}

# Go 依存関係
install_go_dependencies() {
    print_section "Go Dependencies Installation"

    if [ -d "$SERVER_DIR" ]; then
        cd "$SERVER_DIR"

        if [ -f "go.mod" ]; then
            print_info "Installing Go dependencies..."

            if go mod download; then
                print_success "Go dependencies downloaded"
            else
                print_warning "Go mod download had issues"
            fi

            if go mod tidy; then
                print_success "Go dependencies tidied"
            else
                print_warning "Go mod tidy had issues"
            fi

            # Go サーバービルド
            print_info "Building Go server..."
            if go build -o remoteclaude-server .; then
                print_success "Go server built successfully"
                chmod +x remoteclaude-server
            else
                print_error "Failed to build Go server"
            fi

        else
            print_warning "go.mod not found in server directory"
        fi

        cd "$SCRIPT_DIR"
    else
        print_warning "Server directory not found: $SERVER_DIR"
    fi
}

# 開発ツールセットアップ
setup_development_tools() {
    print_section "Development Tools Setup"

    # VS Code extensions (if VS Code is installed)
    if command -v code &> /dev/null; then
        print_info "Setting up VS Code extensions..."

        local extensions=(
            "ms-vscode.vscode-typescript-next"
            "esbenp.prettier-vscode"
            "ms-vscode.vscode-eslint"
            "golang.go"
            "ms-vscode.vscode-json"
        )

        for ext in "${extensions[@]}"; do
            code --install-extension "$ext" || print_warning "Failed to install extension: $ext"
        done

        print_success "VS Code extensions setup complete"
    else
        print_info "VS Code not found, skipping extension setup"
    fi

    # Git hooks setup
    if [ -d ".git" ]; then
        print_info "Setting up Git hooks..."

        # Pre-commit hook
        cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# RemoteClaude pre-commit hook

echo "Running pre-commit checks..."

# Check for large files
find . -size +10M -not -path './node_modules/*' -not -path './.git/*' | while read file; do
    echo "Warning: Large file detected: $file"
done

# Basic syntax check for JavaScript files
find . -name "*.js" -not -path './node_modules/*' | head -10 | while read file; do
    if ! node -c "$file" 2>/dev/null; then
        echo "Syntax error in: $file"
        exit 1
    fi
done

echo "Pre-commit checks passed"
EOF

        chmod +x .git/hooks/pre-commit
        print_success "Git hooks setup complete"
    fi
}

# 環境変数セットアップ
setup_environment() {
    print_section "Environment Variables Setup"

    local env_file="$SCRIPT_DIR/.env"

    if [ ! -f "$env_file" ]; then
        cat > "$env_file" << 'EOF'
# RemoteClaude Environment Configuration
NODE_ENV=development
LOG_LEVEL=info

# Server Ports
GO_SERVER_PORT_PRIMARY=8090
GO_SERVER_PORT_SECONDARY=8091
EXPO_PORT_PRIMARY=8081
EXPO_PORT_SECONDARY=8082
GUI_MONITOR_PORT=3002
COMMAND_TESTER_PORT=3005

# WebSocket Configuration
WS_TIMEOUT=30000
WS_RETRY_ATTEMPTS=3

# Testing Configuration
TEST_TIMEOUT=30000
TEST_RETRIES=3

# Logging
LOG_DIRECTORY=./logs
LOG_MAX_SIZE=10MB
LOG_MAX_FILES=5

# Development
AUTO_RESTART=false
WATCH_FILES=true
DEBUG_MODE=false
EOF
        print_success "Created environment file"
    else
        print_info "Environment file already exists"
    fi

    # Shell profile setup
    local profile_additions=""

    # Go PATH
    if command -v go &> /dev/null; then
        local go_path=$(go env GOPATH)
        if [ -n "$go_path" ]; then
            profile_additions="export GOPATH=$go_path\nexport PATH=\$PATH:\$GOPATH/bin\n"
        fi
    fi

    # Node.js PATH (if using nvm)
    if [ -d "$HOME/.nvm" ]; then
        profile_additions="${profile_additions}export NVM_DIR=\"\$HOME/.nvm\"\n[ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\"\n"
    fi

    # RemoteClaude specific
    profile_additions="${profile_additions}export REMOTECLAUDE_HOME=\"$SCRIPT_DIR\"\nexport PATH=\$PATH:\$REMOTECLAUDE_HOME\n"

    if [ -n "$profile_additions" ]; then
        local shell_profile=""
        if [ -n "$BASH_VERSION" ]; then
            shell_profile="$HOME/.bashrc"
        elif [ -n "$ZSH_VERSION" ]; then
            shell_profile="$HOME/.zshrc"
        fi

        if [ -n "$shell_profile" ] && [ -f "$shell_profile" ]; then
            if ! grep -q "REMOTECLAUDE_HOME" "$shell_profile"; then
                echo -e "\n# RemoteClaude Environment" >> "$shell_profile"
                echo -e "$profile_additions" >> "$shell_profile"
                print_success "Added environment variables to $shell_profile"
            else
                print_info "Environment variables already in $shell_profile"
            fi
        fi
    fi
}

# 依存関係確認
verify_dependencies() {
    print_section "Dependencies Verification"

    local verification_passed=true

    # System tools
    local system_tools=("node" "npm" "go" "git" "curl")

    for tool in "${system_tools[@]}"; do
        if command -v "$tool" &> /dev/null; then
            local version=$($tool --version 2>/dev/null | head -n1 || echo "unknown")
            print_success "$tool: $version"
        else
            print_error "$tool: Not found"
            verification_passed=false
        fi
    done

    # Node.js packages
    if [ -f "$SCRIPT_DIR/package.json" ] && [ -d "$SCRIPT_DIR/node_modules" ]; then
        print_success "Node.js packages: Installed"
    else
        print_error "Node.js packages: Missing"
        verification_passed=false
    fi

    # Go server
    if [ -f "$SERVER_DIR/remoteclaude-server" ]; then
        print_success "Go server binary: Available"
    else
        print_warning "Go server binary: Not found"
    fi

    # Expo
    if command -v expo &> /dev/null; then
        print_success "Expo CLI: $(expo --version 2>/dev/null || echo 'Available')"
    else
        print_warning "Expo CLI: Not found globally"
    fi

    return $([ "$verification_passed" = true ] && echo 0 || echo 1)
}

# メイン実行
main() {
    print_header

    # System dependencies
    install_system_dependencies

    # Node.js dependencies
    install_node_dependencies

    # Expo dependencies
    install_expo_dependencies

    # Go dependencies
    install_go_dependencies

    # Development tools
    setup_development_tools

    # Environment setup
    setup_environment

    # Verification
    if verify_dependencies; then
        print_success "All dependencies installed and verified!"
        echo ""
        echo -e "${GREEN}🎉 Dependencies installation complete!${NC}"
        echo ""
        echo -e "${CYAN}Next steps:${NC}"
        echo "1. Run source ~/.bashrc (or ~/.zshrc) to reload environment"
        echo "2. Run ./setup.sh to complete the setup"
        echo "3. Run ./start-servers.sh to start all services"
    else
        print_warning "Some dependencies may have issues, but installation is complete"
        echo ""
        echo -e "${YELLOW}⚠️  Please check the issues above and install missing dependencies manually${NC}"
    fi

    echo -e "${BLUE}================================================================================================${NC}"
}

# エラーハンドリング
trap 'echo -e "\n${RED}❌ Installation interrupted${NC}"; exit 1' INT TERM

# 実行
main "$@"