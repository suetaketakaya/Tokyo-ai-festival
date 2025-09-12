#!/bin/bash

# RemoteClaude v3.7.1 - Ubuntu/WSL2 Automatic Installer
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
MIN_UBUNTU_VERSION="18.04"
REQUIRED_GO_VERSION="1.21.0"
REQUIRED_NODE_VERSION="18"

# Detect WSL2
IS_WSL2=false
if grep -q "microsoft" /proc/version 2>/dev/null; then
    IS_WSL2=true
    log_info "WSL2 environment detected"
fi

# Welcome banner
clear
log_header "
╔══════════════════════════════════════════════════════════════════════════════╗
║                          🚀 RemoteClaude v3.7.1                             ║
║      Enterprise Mobile-Driven Multi-Server Development Platform             ║
║                         Ubuntu/WSL2 Automatic Installer                     ║
╚══════════════════════════════════════════════════════════════════════════════╝
"

if $IS_WSL2; then
    log_info "Starting RemoteClaude v3.7.1 installation for WSL2..."
    log_info "This installer will configure RemoteClaude for Windows Subsystem for Linux 2."
else
    log_info "Starting RemoteClaude v3.7.1 installation for Ubuntu..."
    log_info "This installer will set up everything needed for RemoteClaude server."
fi

echo ""

# Function: Check if running as root (not recommended)
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "This installer should not be run as root!"
        log_error "Please run as regular user. Sudo will be used when needed."
        exit 1
    fi
    
    # Check if sudo is available
    if ! command -v sudo >/dev/null 2>&1; then
        log_error "sudo is required but not found. Please install sudo first."
        exit 1
    fi
}

# Function: System requirements check
check_system_requirements() {
    log_step "Checking system requirements..."
    
    # Check Ubuntu version
    if [[ -f /etc/os-release ]]; then
        source /etc/os-release
        ubuntu_version="$VERSION_ID"
        log_info "Ubuntu/Distribution version: $ubuntu_version"
        
        # Simple version comparison
        if [[ "$ubuntu_version" < "$MIN_UBUNTU_VERSION" ]]; then
            log_warning "Ubuntu $MIN_UBUNTU_VERSION or later recommended. Current: $ubuntu_version"
        fi
    fi
    
    # Check architecture
    arch=$(uname -m)
    log_info "Architecture: $arch"
    
    # Check available disk space (minimum 5GB)
    available_space=$(df -h / | awk 'NR==2{print $4}' | sed 's/G//' | cut -d'.' -f1)
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
    
    # WSL2 specific checks
    if $IS_WSL2; then
        log_info "Performing WSL2-specific checks..."
        
        # Check if systemctl is available (systemd in WSL2)
        if command -v systemctl >/dev/null 2>&1; then
            log_info "systemd available in WSL2"
        else
            log_warning "systemd not available. Some services may need manual management."
        fi
    fi
    
    log_success "System requirements check passed"
}

# Function: Update system packages
update_system() {
    log_step "Updating system packages..."
    
    log_info "Updating package lists..."
    sudo apt update || {
        log_error "Failed to update package lists"
        exit 1
    }
    
    log_info "Upgrading existing packages..."
    sudo apt upgrade -y || {
        log_warning "Package upgrade encountered issues, continuing..."
    }
    
    log_success "System packages updated"
}

# Function: Install basic dependencies
install_basic_dependencies() {
    log_step "Installing basic dependencies..."
    
    # List of basic packages
    basic_packages=(
        "curl"
        "wget"
        "git"
        "build-essential"
        "software-properties-common"
        "apt-transport-https"
        "ca-certificates"
        "gnupg"
        "lsb-release"
        "unzip"
        "tar"
        "jq"
        "qrencode"
    )
    
    log_info "Installing basic packages: ${basic_packages[*]}"
    
    for package in "${basic_packages[@]}"; do
        log_info "Installing $package..."
        sudo apt install -y "$package" || {
            log_error "Failed to install $package"
            exit 1
        }
    done
    
    log_success "Basic dependencies installed"
}

# Function: Install Go
install_go() {
    log_step "Installing Go programming language..."
    
    if command -v go >/dev/null 2>&1; then
        go_version=$(go version | awk '{print $3}' | sed 's/go//')
        log_info "Go already installed: $go_version"
        
        # Check if version is recent enough
        if [[ "$(printf '%s\n' "$REQUIRED_GO_VERSION" "$go_version" | sort -V | head -n1)" == "$REQUIRED_GO_VERSION" ]]; then
            log_success "Go version is sufficient"
            return
        else
            log_info "Upgrading Go to newer version..."
        fi
    fi
    
    # Remove old Go installation
    if [[ -d "/usr/local/go" ]]; then
        log_info "Removing old Go installation..."
        sudo rm -rf /usr/local/go
    fi
    
    # Determine architecture
    case "$arch" in
        "x86_64")
            go_arch="amd64"
            ;;
        "aarch64" | "arm64")
            go_arch="arm64"
            ;;
        *)
            log_error "Unsupported architecture: $arch"
            exit 1
            ;;
    esac
    
    # Download and install Go
    go_version_latest="1.21.0"
    go_tarball="go${go_version_latest}.linux-${go_arch}.tar.gz"
    go_url="https://golang.org/dl/$go_tarball"
    
    log_info "Downloading Go $go_version_latest..."
    temp_dir=$(mktemp -d)
    curl -L "$go_url" -o "$temp_dir/$go_tarball" || {
        log_error "Failed to download Go"
        exit 1
    }
    
    log_info "Installing Go..."
    sudo tar -C /usr/local -xzf "$temp_dir/$go_tarball"
    
    # Add Go to PATH
    export PATH=$PATH:/usr/local/go/bin
    echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
    
    # Clean up
    rm -rf "$temp_dir"
    
    # Verify installation
    if command -v go >/dev/null 2>&1; then
        go_version=$(go version | awk '{print $3}' | sed 's/go//')
        log_success "Go installed successfully: $go_version"
    else
        log_error "Go installation verification failed"
        exit 1
    fi
}

# Function: Install Node.js
install_nodejs() {
    log_step "Installing Node.js..."
    
    if command -v node >/dev/null 2>&1; then
        node_version=$(node --version | sed 's/v//')
        log_info "Node.js already installed: $node_version"
        
        # Check version
        major_version=$(echo "$node_version" | cut -d. -f1)
        if [[ "$major_version" -ge "$REQUIRED_NODE_VERSION" ]]; then
            log_success "Node.js version is sufficient"
            return
        else
            log_info "Upgrading Node.js..."
        fi
    fi
    
    # Install NodeSource repository
    log_info "Adding NodeSource repository..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - || {
        log_error "Failed to add NodeSource repository"
        exit 1
    }
    
    # Install Node.js
    log_info "Installing Node.js..."
    sudo apt-get install -y nodejs || {
        log_error "Failed to install Node.js"
        exit 1
    }
    
    # Verify installation
    if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
        node_version=$(node --version | sed 's/v//')
        npm_version=$(npm --version)
        log_success "Node.js installed: $node_version (npm: $npm_version)"
    else
        log_error "Node.js installation verification failed"
        exit 1
    fi
}

# Function: Install Docker
install_docker() {
    log_step "Installing Docker..."
    
    if command -v docker >/dev/null 2>&1; then
        docker_version=$(docker --version | awk '{print $3}' | sed 's/,//')
        log_info "Docker already installed: $docker_version"
        
        # Check if Docker daemon is running
        if docker info >/dev/null 2>&1; then
            log_success "Docker is running"
            return
        else
            log_info "Docker installed but not running, starting..."
        fi
    else
        # Install Docker using official script
        log_info "Installing Docker using official installation script..."
        curl -fsSL https://get.docker.com -o get-docker.sh || {
            log_error "Failed to download Docker installation script"
            exit 1
        }
        
        sudo sh get-docker.sh || {
            log_error "Docker installation failed"
            exit 1
        }
        
        rm get-docker.sh
    fi
    
    # Add user to docker group
    log_info "Adding user to docker group..."
    sudo usermod -aG docker "$USER" || {
        log_warning "Failed to add user to docker group"
    }
    
    # Start Docker service
    if command -v systemctl >/dev/null 2>&1; then
        log_info "Starting Docker service..."
        sudo systemctl enable docker || log_warning "Could not enable Docker service"
        sudo systemctl start docker || log_warning "Could not start Docker service"
    elif $IS_WSL2; then
        log_info "WSL2: Starting Docker manually..."
        sudo dockerd > /dev/null 2>&1 &
        sleep 5
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
    
    docker_version=$(docker --version | awk '{print $3}' | sed 's/,//')
    log_success "Docker installed and running: $docker_version"
    
    # Test Docker
    log_info "Testing Docker installation..."
    if docker run --rm hello-world > /dev/null 2>&1; then
        log_success "Docker test passed"
    else
        log_warning "Docker test failed, but installation may still work"
    fi
}

# Function: Install WireGuard
install_wireguard() {
    log_step "Installing WireGuard..."
    
    if command -v wg >/dev/null 2>&1; then
        log_info "WireGuard already installed"
        wg --version || log_info "WireGuard tools installed"
    else
        log_info "Installing WireGuard..."
        sudo apt install -y wireguard qrencode || {
            log_warning "WireGuard installation failed. VPN features may not work."
        }
    fi
    
    if command -v wg >/dev/null 2>&1; then
        log_success "WireGuard installed successfully"
    else
        log_warning "WireGuard installation verification failed"
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
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
        
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
    
    # Check Go
    if command -v go >/dev/null 2>&1; then
        go_version=$(go version | awk '{print $3}' | sed 's/go//')
        log_info "Go version: $go_version"
    else
        log_error "Go not found"
        exit 1
    fi
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        node_version=$(node --version | sed 's/v//')
        log_info "Node.js version: $node_version"
    else
        log_error "Node.js not found"
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
    
    # Check WireGuard
    if command -v wg >/dev/null 2>&1; then
        log_info "WireGuard tools: installed"
    else
        log_warning "WireGuard tools not found"
    fi
    
    # Check Claude CLI
    if command -v claude >/dev/null 2>&1; then
        log_info "Claude CLI: installed"
    else
        log_warning "Claude CLI not found"
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

# Function: Configure firewall
configure_firewall() {
    log_step "Configuring firewall..."
    
    if command -v ufw >/dev/null 2>&1; then
        log_info "Configuring UFW firewall..."
        
        # Enable UFW if not already enabled
        sudo ufw --force enable || log_warning "Could not enable UFW"
        
        # Allow RemoteClaude ports
        sudo ufw allow 8090/tcp comment "RemoteClaude Server" || log_warning "Could not add UFW rule for port 8090"
        sudo ufw allow 8080/tcp comment "RemoteClaude Web UI" || log_warning "Could not add UFW rule for port 8080"
        
        # Allow WireGuard port
        sudo ufw allow 51820/udp comment "WireGuard VPN" || log_warning "Could not add UFW rule for WireGuard"
        
        log_success "Firewall configured"
    else
        log_warning "UFW not found. You may need to configure firewall manually."
    fi
}

# Function: Create systemd service
create_systemd_service() {
    log_step "Creating systemd service..."
    
    if ! command -v systemctl >/dev/null 2>&1; then
        log_warning "systemd not available. Skipping service creation."
        return
    fi
    
    read -p "Would you like RemoteClaude to start automatically at boot? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Creating systemd service..."
        
        sudo tee /etc/systemd/system/remoteclaude.service > /dev/null << EOF
[Unit]
Description=RemoteClaude Server v3.7.1
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR/server
ExecStart=$INSTALL_DIR/server/remoteclaude-server --port=8090
Restart=always
RestartSec=10
Environment=HOME=$HOME
Environment=PATH=$PATH
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
        
        # Reload systemd and enable service
        sudo systemctl daemon-reload
        sudo systemctl enable remoteclaude.service
        
        log_success "Systemd service created and enabled"
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
        
        if [[ -x "setup-ipv6-tunnel.sh" ]]; then
            log_info "Setting up IPv6 tunnel..."
            chmod +x setup-ipv6-tunnel.sh
            sudo ./setup-ipv6-tunnel.sh || {
                log_warning "IPv6 tunnel setup failed"
            }
        fi
        
        if [[ -x "start-external-server.sh" ]]; then
            log_info "Setting up external VPN server..."
            chmod +x start-external-server.sh
            log_info "External VPN scripts are ready. Run manually when needed:"
            log_info "  cd $INSTALL_DIR/server/external-vpn"
            log_info "  sudo ./start-external-server.sh"
        fi
        
        log_success "External VPN setup completed"
    else
        log_info "Skipping external VPN setup"
    fi
}

# Function: Configure WSL2 specific settings
configure_wsl2() {
    if ! $IS_WSL2; then
        return
    fi
    
    log_step "Configuring WSL2 specific settings..."
    
    # Get WSL2 IP address
    wsl_ip=$(hostname -I | awk '{print $1}')
    log_info "WSL2 IP address: $wsl_ip"
    
    # Create WSL2 helper script
    cat > "$INSTALL_DIR/wsl2-helper.sh" << EOF
#!/bin/bash

# WSL2 Helper Script for RemoteClaude
echo "=== WSL2 Helper for RemoteClaude ==="
echo ""

# Get WSL2 IP
WSL_IP=\$(hostname -I | awk '{print \$1}')
echo "WSL2 IP: \$WSL_IP"

# Windows port forwarding commands (run in Windows PowerShell as Administrator)
echo ""
echo "To access RemoteClaude from Windows host, run these commands in PowerShell (as Administrator):"
echo ""
echo "# Add port forwarding for RemoteClaude server"
echo "netsh interface portproxy add v4tov4 listenport=8090 listenaddress=0.0.0.0 connectport=8090 connectaddress=\$WSL_IP"
echo ""
echo "# Add port forwarding for Web UI"  
echo "netsh interface portproxy add v4tov4 listenport=8080 listenaddress=0.0.0.0 connectport=8080 connectaddress=\$WSL_IP"
echo ""
echo "# Remove port forwarding (when no longer needed)"
echo "netsh interface portproxy delete v4tov4 listenport=8090 listenaddress=0.0.0.0"
echo "netsh interface portproxy delete v4tov4 listenport=8080 listenaddress=0.0.0.0"
echo ""
echo "After setting up port forwarding, access RemoteClaude at:"
echo "  Web UI: http://localhost:8080"
echo "  Server: ws://localhost:8090/ws"
EOF
    
    chmod +x "$INSTALL_DIR/wsl2-helper.sh"
    
    log_success "WSL2 configuration completed"
    log_info "Run '$INSTALL_DIR/wsl2-helper.sh' for Windows port forwarding instructions"
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
        timeout 30s docker run --rm hello-world > /dev/null 2>&1 && {
            log_success "Docker test passed"
        } || {
            log_warning "Docker test failed, but may work after logout/login"
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

# WSL2 specific info
if grep -q "microsoft" /proc/version 2>/dev/null; then
    WSL_IP=\$(hostname -I | awk '{print \$1}')
    echo "WSL2 detected. From Windows host, use:"
    echo "  http://\$WSL_IP:8080 (after setting up port forwarding)"
    echo "  Run '$INSTALL_DIR/wsl2-helper.sh' for port forwarding instructions"
    echo ""
fi

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

# Server process
echo "Server process:"
pgrep -f "remoteclaude-server" > /dev/null && echo "✅ Running" || echo "❌ Not running"
echo ""

# Docker status
echo "Docker status:"
docker info > /dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running"
echo ""

# Port status
echo "Port 8090 status:"
ss -tuln | grep :8090 > /dev/null 2>&1 && echo "✅ In use" || echo "❌ Available"
echo ""

# System info
echo "Installation directory: $INSTALL_DIR"
echo "Configuration directory: $CONFIG_DIR"

# WSL2 specific info
if grep -q "microsoft" /proc/version 2>/dev/null; then
    WSL_IP=\$(hostname -I | awk '{print \$1}')
    echo "WSL2 IP: \$WSL_IP"
fi
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
    
    if $IS_WSL2; then
        echo "  WSL2 helper:   $INSTALL_DIR/wsl2-helper.sh"
    fi
    echo ""
    
    log_info "🌐 Access points:"
    if $IS_WSL2; then
        wsl_ip=$(hostname -I | awk '{print $1}')
        echo "  Web Interface: http://$wsl_ip:8080 (or localhost:8080 with port forwarding)"
        echo "  Server Endpoint: ws://$wsl_ip:8090/ws (or localhost:8090 with port forwarding)"
    else
        echo "  Web Interface: http://localhost:8080"
        echo "  Server Endpoint: ws://localhost:8090/ws"
    fi
    echo ""
    
    log_info "📱 Next steps:"
    echo "  1. Install 'ClaudeOps Remote' from the App Store on your iPhone"
    echo "  2. Start the server: $INSTALL_DIR/start-server.sh"
    echo "  3. Open the web interface to get the QR code"
    echo "  4. Scan the QR code with your iPhone app"
    
    if $IS_WSL2; then
        echo "  5. For Windows host access, run: $INSTALL_DIR/wsl2-helper.sh"
    fi
    echo "  5. Start developing remotely!"
    echo ""
    
    if command -v claude >/dev/null 2>&1; then
        log_info "🤖 Claude CLI is ready for AI development assistance"
    else
        log_warning "⚠️  Claude CLI installation failed. Install manually if needed:"
        echo "     curl -fsSL https://claude.ai/install.sh | sh"
    fi
    
    echo ""
    
    if $IS_WSL2; then
        log_warning "🪟 WSL2 Note:"
        echo "  - You may need to logout and login again for Docker group permissions"
        echo "  - Use $INSTALL_DIR/wsl2-helper.sh for Windows host access setup"
        echo ""
    fi
    
    log_info "📖 Documentation: https://github.com/suetaketakaya/RemoteClaude/wiki"
    log_info "🐛 Issues: https://github.com/suetaketakaya/RemoteClaude/issues"
    echo ""
    
    log_success "Welcome to the future of mobile-first development! 🚀"
}

# Main installation function
main() {
    log_info "RemoteClaude v3.7.1 - Ubuntu/WSL2 Automatic Installer"
    echo ""
    
    # Run installation steps
    check_root
    check_system_requirements
    update_system
    install_basic_dependencies
    install_go
    install_nodejs
    install_docker
    install_wireguard
    install_claude_cli
    verify_dependencies
    clone_repository
    build_server
    create_config_directories
    configure_firewall
    create_systemd_service
    configure_wsl2
    setup_external_vpn
    test_installation
    create_convenience_scripts
    display_completion_message
    
    log_success "Installation completed successfully!"
    
    # Note about Docker group
    if ! docker info >/dev/null 2>&1; then
        log_warning "You may need to logout and login again for Docker group permissions to take effect."
    fi
    
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