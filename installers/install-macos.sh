#!/bin/bash

# RemoteClaude v3.7.1 - macOS Automatic Installer
# Enterprise Mobile-Driven Multi-Server Claude Development Platform
# Date: 2025-09-11

set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${PURPLE}[STEP]${NC} $1"; }
log_header() { echo -e "${WHITE}${CYAN}$1${NC}"; }

# Configuration
REMOTECLAUDE_VERSION="v3.7.1"
INSTALL_DIR="$HOME/remoteclaude"
CONFIG_DIR="$HOME/.remoteclaude"
REPO_URL="https://github.com/suetaketakaya/Tokyo-ai-festival.git"

# System requirements
MIN_MACOS_VERSION="10.15"
REQUIRED_GO_VERSION="1.21"
REQUIRED_NODE_VERSION="18"

# Welcome banner
clear
log_header "
╔══════════════════════════════════════════════════════════════════════════════╗
║                          🚀 RemoteClaude v3.7.1                             ║
║      Enterprise Mobile-Driven Multi-Server Development Platform             ║
║                            macOS Automatic Installer                        ║
╚══════════════════════════════════════════════════════════════════════════════╝
"

log_info "Starting RemoteClaude v3.7.1 installation for macOS..."
log_info "This installer will set up everything needed for RemoteClaude server."
echo ""

# Function: Check if running as root (not recommended)
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "Running as root is not recommended for this installer."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Installation cancelled."
            exit 1
        fi
    fi
}

# Function: System requirements check
check_system_requirements() {
    log_step "Checking system requirements..."
    
    # Check macOS version
    macos_version=$(sw_vers -productVersion)
    log_info "macOS version: $macos_version"
    
    # Convert version to comparable format (e.g., 10.15.7 -> 101507)
    current_version_num=$(echo "$macos_version" | sed 's/\.//' | sed 's/\.//')
    min_version_num=$(echo "$MIN_MACOS_VERSION" | sed 's/\.//')
    
    if [[ "$current_version_num" -lt "$min_version_num" ]]; then
        log_error "macOS $MIN_MACOS_VERSION or later required. Current: $macos_version"
        exit 1
    fi
    
    # Check architecture
    arch=$(uname -m)
    log_info "Architecture: $arch"
    
    # Check available disk space (minimum 5GB)
    available_space=$(df -h / | awk 'NR==2{print $4}' | sed 's/Gi//')
    log_info "Available disk space: ${available_space}GB"
    
    if [[ "$available_space" -lt 5 ]]; then
        log_warning "Low disk space. At least 5GB recommended."
    fi
    
    # Check network connectivity
    log_info "Checking network connectivity..."
    if ! curl -s --connect-timeout 10 https://google.com > /dev/null; then
        log_error "Network connectivity check failed. Please check your internet connection."
        exit 1
    fi
    
    log_success "System requirements check passed"
}

# Function: Install Homebrew
install_homebrew() {
    log_step "Installing/Updating Homebrew..."
    
    if command -v brew >/dev/null 2>&1; then
        log_info "Homebrew already installed. Updating..."
        brew update || log_warning "Homebrew update failed, continuing..."
    else
        log_info "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # Add Homebrew to PATH
        if [[ "$arch" == "arm64" ]]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
        else
            eval "$(/usr/local/bin/brew shellenv)"
            echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zshrc
        fi
    fi
    
    # Verify Homebrew installation
    if command -v brew >/dev/null 2>&1; then
        brew_version=$(brew --version | head -1)
        log_success "Homebrew installed: $brew_version"
    else
        log_error "Homebrew installation failed"
        exit 1
    fi
}

# Function: Install dependencies via Homebrew
install_dependencies() {
    log_step "Installing dependencies via Homebrew..."
    
    # List of required packages
    packages=(
        "go"
        "node"
        "git"
        "wget"
        "qrencode"
        "wireguard-tools"
    )
    
    log_info "Installing packages: ${packages[*]}"
    
    for package in "${packages[@]}"; do
        log_info "Installing $package..."
        if brew list "$package" &>/dev/null; then
            log_info "$package already installed, upgrading..."
            brew upgrade "$package" || log_warning "$package upgrade failed, continuing..."
        else
            brew install "$package" || {
                log_error "Failed to install $package"
                exit 1
            }
        fi
    done
    
    log_success "Dependencies installed via Homebrew"
}

# Function: Install Docker Desktop
install_docker() {
    log_step "Setting up Docker Desktop..."
    
    if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
        docker_version=$(docker --version)
        log_info "Docker already installed and running: $docker_version"
    else
        if command -v docker >/dev/null 2>&1; then
            log_info "Docker installed but not running. Starting Docker Desktop..."
            open -a Docker || {
                log_warning "Could not start Docker Desktop automatically."
                log_info "Please start Docker Desktop manually from Applications folder."
                read -p "Press Enter once Docker Desktop is running..."
            }
        else
            log_info "Installing Docker Desktop..."
            
            # Download and install Docker Desktop
            if [[ "$arch" == "arm64" ]]; then
                docker_url="https://desktop.docker.com/mac/main/arm64/Docker.dmg"
            else
                docker_url="https://desktop.docker.com/mac/main/amd64/Docker.dmg"
            fi
            
            temp_dir=$(mktemp -d)
            docker_dmg="$temp_dir/Docker.dmg"
            
            log_info "Downloading Docker Desktop..."
            curl -L "$docker_url" -o "$docker_dmg" || {
                log_error "Failed to download Docker Desktop"
                exit 1
            }
            
            # Mount and install
            log_info "Installing Docker Desktop..."
            hdiutil attach "$docker_dmg" -nobrowse -quiet
            cp -R "/Volumes/Docker/Docker.app" "/Applications/"
            hdiutil detach "/Volumes/Docker" -quiet
            
            # Start Docker
            log_info "Starting Docker Desktop..."
            open -a Docker
            
            # Clean up
            rm -rf "$temp_dir"
        fi
        
        # Wait for Docker to start
        log_info "Waiting for Docker to start..."
        timeout=60
        counter=0
        while ! docker info >/dev/null 2>&1; do
            if [[ $counter -ge $timeout ]]; then
                log_error "Docker failed to start within $timeout seconds"
                exit 1
            fi
            sleep 2
            counter=$((counter + 2))
            echo -n "."
        done
        echo ""
        
        docker_version=$(docker --version)
        log_success "Docker installed and running: $docker_version"
    fi
}

# Function: Install Claude CLI
install_claude_cli() {
    log_step "Installing Claude CLI..."
    
    if command -v claude >/dev/null 2>&1; then
        claude_version=$(claude --version 2>/dev/null || echo "unknown")
        log_info "Claude CLI already installed: $claude_version"
    else
        log_info "Installing Claude CLI..."
        curl -fsSL https://claude.ai/install.sh | sh || {
            log_warning "Claude CLI installation failed. You can install it manually later."
            log_info "Manual installation: curl -fsSL https://claude.ai/install.sh | sh"
        }
        
        # Add to PATH
        export PATH="$HOME/.local/bin:$PATH"
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
        
        if command -v claude >/dev/null 2>&1; then
            claude_version=$(claude --version 2>/dev/null || echo "installed")
            log_success "Claude CLI installed: $claude_version"
        else
            log_warning "Claude CLI installation verification failed, but continuing..."
        fi
    fi
}

# Function: Verify all dependencies
verify_dependencies() {
    log_step "Verifying all dependencies..."
    
    # Check Go version
    if command -v go >/dev/null 2>&1; then
        go_version=$(go version | awk '{print $3}' | sed 's/go//')
        log_info "Go version: $go_version"
    else
        log_error "Go not found in PATH"
        exit 1
    fi
    
    # Check Node version
    if command -v node >/dev/null 2>&1; then
        node_version=$(node --version | sed 's/v//')
        log_info "Node.js version: $node_version"
    else
        log_error "Node.js not found in PATH"
        exit 1
    fi
    
    # Check Docker
    if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
        docker_version=$(docker --version | awk '{print $3}' | sed 's/,//')
        log_info "Docker version: $docker_version"
    else
        log_error "Docker not available"
        exit 1
    fi
    
    # Check WireGuard tools
    if command -v wg >/dev/null 2>&1; then
        log_info "WireGuard tools: installed"
    else
        log_warning "WireGuard tools not found, VPN features may not work"
    fi
    
    # Check QR code generator
    if command -v qrencode >/dev/null 2>&1; then
        log_info "QR code generator: installed"
    else
        log_warning "qrencode not found, QR codes may not generate"
    fi
    
    log_success "Dependency verification completed"
}

# Function: Clone RemoteClaude repository
clone_repository() {
    log_step "Cloning RemoteClaude repository..."
    
    # Remove existing directory if it exists
    if [[ -d "$INSTALL_DIR" ]]; then
        log_info "Removing existing installation directory..."
        rm -rf "$INSTALL_DIR"
    fi
    
    # Clone repository
    log_info "Cloning repository to $INSTALL_DIR..."
    git clone "$REPO_URL" "$INSTALL_DIR" || {
        log_error "Failed to clone repository"
        exit 1
    }
    
    # Change to server directory
    cd "$INSTALL_DIR/server" || {
        log_error "Server directory not found"
        exit 1
    }
    
    log_success "Repository cloned successfully"
}

# Function: Build RemoteClaude server
build_server() {
    log_step "Building RemoteClaude server..."
    
    cd "$INSTALL_DIR/server" || exit 1
    
    # Initialize Go modules
    log_info "Initializing Go modules..."
    go mod tidy || {
        log_error "Go module initialization failed"
        exit 1
    }
    
    # Build server
    log_info "Building server binary..."
    go build -o remoteclaude-server . || {
        log_error "Server build failed"
        exit 1
    }
    
    # Make executable
    chmod +x remoteclaude-server
    
    # Verify build
    if [[ -x "remoteclaude-server" ]]; then
        log_success "Server built successfully"
    else
        log_error "Server build verification failed"
        exit 1
    fi
}

# Function: Create configuration directories
create_config_directories() {
    log_step "Creating configuration directories..."
    
    # Main config directory
    mkdir -p "$CONFIG_DIR"
    mkdir -p "$CONFIG_DIR/logs"
    mkdir -p "$CONFIG_DIR/keys"
    mkdir -p "$CONFIG_DIR/external-vpn"
    mkdir -p "$CONFIG_DIR/external-vpn/clients"
    
    log_success "Configuration directories created"
}

# Function: Run auto-setup if available
run_auto_setup() {
    log_step "Running auto-setup scripts..."
    
    cd "$INSTALL_DIR/server" || exit 1
    
    if [[ -x "scripts/auto-setup.sh" ]]; then
        log_info "Running auto-setup script..."
        ./scripts/auto-setup.sh || log_warning "Auto-setup script failed, continuing..."
    else
        log_warning "Auto-setup script not found, running manual setup..."
        
        # Manual Docker image build (if needed)
        if [[ -f "docker/Dockerfile" ]]; then
            log_info "Building Docker image..."
            docker build -t remoteclaude-ubuntu-claude:latest docker/ || {
                log_warning "Docker image build failed"
            }
        fi
    fi
    
    log_success "Setup scripts completed"
}

# Function: Configure firewall
configure_firewall() {
    log_step "Configuring firewall settings..."
    
    # Check if macOS firewall is enabled
    firewall_status=$(sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate)
    
    if echo "$firewall_status" | grep -q "enabled"; then
        log_info "macOS firewall is enabled, adding RemoteClaude exception..."
        
        # Add firewall exception for RemoteClaude
        sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add "$INSTALL_DIR/server/remoteclaude-server" --unblock
        
        log_success "Firewall configured"
    else
        log_info "macOS firewall is disabled, no configuration needed"
    fi
}

# Function: Create launch daemon for auto-start
create_launch_daemon() {
    log_step "Creating launch daemon for auto-start (optional)..."
    
    read -p "Would you like RemoteClaude to start automatically at boot? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        plist_path="/Library/LaunchDaemons/com.remoteclaude.server.plist"
        
        log_info "Creating launch daemon..."
        
        sudo tee "$plist_path" > /dev/null << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.remoteclaude.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>$INSTALL_DIR/server/remoteclaude-server</string>
        <string>--port=8090</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>$INSTALL_DIR/server</string>
    <key>StandardOutPath</key>
    <string>$CONFIG_DIR/logs/server.log</string>
    <key>StandardErrorPath</key>
    <string>$CONFIG_DIR/logs/server-error.log</string>
    <key>UserName</key>
    <string>$(whoami)</string>
</dict>
</plist>
EOF
        
        # Load the launch daemon
        sudo launchctl load "$plist_path" || {
            log_warning "Failed to load launch daemon"
        }
        
        log_success "Launch daemon created and loaded"
    else
        log_info "Skipping auto-start setup"
    fi
}

# Function: Setup external VPN (optional)
setup_external_vpn() {
    log_step "Setting up external VPN support (optional)..."
    
    read -p "Would you like to set up external VPN access? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd "$INSTALL_DIR/server/external-vpn" || {
            log_warning "External VPN directory not found"
            return
        }
        
        if [[ -x "setup-ipv6-tunnel-macos.sh" ]]; then
            log_info "Setting up IPv6 tunnel..."
            chmod +x setup-ipv6-tunnel-macos.sh
            sudo ./setup-ipv6-tunnel-macos.sh || {
                log_warning "IPv6 tunnel setup failed"
            }
        fi
        
        if [[ -x "start-external-server-macos.sh" ]]; then
            log_info "Setting up external VPN server..."
            chmod +x start-external-server-macos.sh
            # Note: Don't run automatically as it requires configuration
            log_info "External VPN scripts are ready. Run manually when needed:"
            log_info "  cd $INSTALL_DIR/server/external-vpn"
            log_info "  sudo ./start-external-server-macos.sh"
        fi
        
        log_success "External VPN setup completed"
    else
        log_info "Skipping external VPN setup"
    fi
}

# Function: Test installation
test_installation() {
    log_step "Testing installation..."
    
    cd "$INSTALL_DIR/server" || exit 1
    
    # Test server binary
    if [[ -x "remoteclaude-server" ]]; then
        log_info "Testing server binary..."
        timeout 10s ./remoteclaude-server --help > /dev/null 2>&1 && {
            log_success "Server binary test passed"
        } || {
            log_warning "Server binary test failed, but may still work"
        }
    fi
    
    # Test Docker
    if command -v docker >/dev/null 2>&1; then
        log_info "Testing Docker..."
        docker run --rm hello-world > /dev/null 2>&1 && {
            log_success "Docker test passed"
        } || {
            log_warning "Docker test failed"
        }
    fi
    
    log_success "Installation tests completed"
}

# Function: Create convenience scripts
create_convenience_scripts() {
    log_step "Creating convenience scripts..."
    
    # Create start script
    cat > "$INSTALL_DIR/start-server.sh" << EOF
#!/bin/bash
cd "$INSTALL_DIR/server"
echo "Starting RemoteClaude Server..."
echo "Web interface will be available at: http://localhost:8080"
echo "Server endpoint: ws://localhost:8090/ws"
echo ""
./remoteclaude-server --port=8090
EOF
    chmod +x "$INSTALL_DIR/start-server.sh"
    
    # Create stop script
    cat > "$INSTALL_DIR/stop-server.sh" << EOF
#!/bin/bash
echo "Stopping RemoteClaude Server..."
pkill -f "remoteclaude-server"
echo "Server stopped."
EOF
    chmod +x "$INSTALL_DIR/stop-server.sh"
    
    # Create status script
    cat > "$INSTALL_DIR/status.sh" << EOF
#!/bin/bash
echo "=== RemoteClaude Status ==="
echo ""
echo "Server process:"
pgrep -f "remoteclaude-server" > /dev/null && echo "✅ Running" || echo "❌ Not running"
echo ""
echo "Docker status:"
docker info > /dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running"
echo ""
echo "Port 8090 status:"
lsof -i :8090 > /dev/null 2>&1 && echo "✅ In use" || echo "❌ Available"
echo ""
echo "Installation directory: $INSTALL_DIR"
echo "Configuration directory: $CONFIG_DIR"
EOF
    chmod +x "$INSTALL_DIR/status.sh"
    
    log_success "Convenience scripts created"
}

# Function: Display completion message
display_completion_message() {
    log_header "
╔══════════════════════════════════════════════════════════════════════════════╗
║                     🎉 Installation Complete! 🎉                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
"
    
    echo ""
    log_success "RemoteClaude v3.7.1 has been successfully installed!"
    echo ""
    
    log_info "📂 Installation directory: $INSTALL_DIR"
    log_info "⚙️  Configuration directory: $CONFIG_DIR"
    echo ""
    
    log_info "🚀 Quick start commands:"
    echo "  Start server:  $INSTALL_DIR/start-server.sh"
    echo "  Stop server:   $INSTALL_DIR/stop-server.sh" 
    echo "  Check status:  $INSTALL_DIR/status.sh"
    echo ""
    
    log_info "🌐 Access points:"
    echo "  Web Interface: http://localhost:8080"
    echo "  Server Endpoint: ws://localhost:8090/ws"
    echo ""
    
    log_info "📱 Next steps:"
    echo "  1. Install 'ClaudeOps Remote' from the App Store on your iPhone"
    echo "  2. Start the server: $INSTALL_DIR/start-server.sh"
    echo "  3. Open the web interface: http://localhost:8080"
    echo "  4. Scan the QR code with your iPhone app"
    echo "  5. Start developing remotely!"
    echo ""
    
    if command -v claude >/dev/null 2>&1; then
        log_info "🤖 Claude CLI is ready for AI development assistance"
    else
        log_warning "⚠️  Claude CLI installation failed. Install manually if needed:"
        echo "     curl -fsSL https://claude.ai/install.sh | sh"
    fi
    
    echo ""
    log_info "📖 Documentation: https://github.com/suetaketakaya/RemoteClaude/wiki"
    log_info "🐛 Issues: https://github.com/suetaketakaya/RemoteClaude/issues"
    echo ""
    
    log_success "Welcome to the future of mobile-first development! 🚀"
}

# Main installation function
main() {
    log_info "RemoteClaude v3.7.1 - macOS Automatic Installer"
    echo ""
    
    # Run installation steps
    check_root
    check_system_requirements
    install_homebrew
    install_dependencies
    install_docker
    install_claude_cli
    verify_dependencies
    clone_repository
    build_server
    create_config_directories
    run_auto_setup
    configure_firewall
    create_launch_daemon
    setup_external_vpn
    test_installation
    create_convenience_scripts
    display_completion_message
    
    log_success "Installation completed successfully!"
    
    # Ask if user wants to start the server
    echo ""
    read -p "Would you like to start the RemoteClaude server now? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        log_info "Starting RemoteClaude server..."
        exec "$INSTALL_DIR/start-server.sh"
    fi
}

# Handle Ctrl+C gracefully
trap 'echo ""; log_warning "Installation interrupted by user"; exit 1' INT

# Run main installation
main "$@"