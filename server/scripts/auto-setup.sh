#!/bin/bash

# RemoteClaude v3.6.0 Auto-Setup Script
# Automatically sets up WireGuard VPN and dependencies

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTECLAUDE_CONFIG_DIR="$HOME/.remoteclaude"
WIREGUARD_CONFIG_DIR="$REMOTECLAUDE_CONFIG_DIR/wireguard"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_banner() {
    echo "
🚀 RemoteClaude v3.6.0 Auto-Setup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Enterprise Mobile-Driven Multi-Server Platform
with Advanced WireGuard VPN Integration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"
}

check_macos() {
    if [[ "$OSTYPE" != "darwin"* ]]; then
        log_error "This script is designed for macOS. For Ubuntu, please use the manual setup instructions."
        exit 1
    fi
    log_success "macOS detected"
}

check_homebrew() {
    log_info "Checking Homebrew installation..."
    
    if ! command -v brew &> /dev/null; then
        log_warning "Homebrew not found. Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # Add Homebrew to PATH
        if [[ -d "/opt/homebrew" ]]; then
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi
    fi
    
    log_success "Homebrew is available"
}

install_dependencies() {
    log_info "Installing required dependencies..."
    
    # List of required packages
    PACKAGES=(
        "wireguard-tools"
        "qrencode"
        "docker"
    )
    
    for package in "${PACKAGES[@]}"; do
        if brew list "$package" &>/dev/null; then
            log_info "$package is already installed"
        else
            log_info "Installing $package..."
            brew install "$package"
        fi
    done
    
    log_success "All dependencies installed"
}

setup_directories() {
    log_info "Setting up configuration directories..."
    
    mkdir -p "$REMOTECLAUDE_CONFIG_DIR"
    mkdir -p "$WIREGUARD_CONFIG_DIR"
    
    log_success "Directories created: $REMOTECLAUDE_CONFIG_DIR"
}

generate_wireguard_keys() {
    log_info "Generating WireGuard encryption keys..."
    
    cd "$WIREGUARD_CONFIG_DIR"
    
    # Generate server keys
    wg genkey | tee server_private.key | wg pubkey > server_public.key
    
    # Generate client keys
    wg genkey | tee client_private.key | wg pubkey > client_public.key
    
    # Set secure permissions
    chmod 600 *.key
    
    log_success "WireGuard keys generated and secured"
}

create_wireguard_config() {
    log_info "Creating WireGuard server configuration..."
    
    cd "$WIREGUARD_CONFIG_DIR"
    
    # Read generated keys
    SERVER_PRIVATE_KEY=$(cat server_private.key)
    CLIENT_PUBLIC_KEY=$(cat client_public.key)
    
    # Create server configuration
    cat > wg0.conf << EOF
[Interface]
PrivateKey = $SERVER_PRIVATE_KEY
Address = 10.0.0.1/24
ListenPort = 51820
PostUp = echo "net.inet.ip.forwarding=1" | sudo sysctl -w -
PostDown = echo "net.inet.ip.forwarding=0" | sudo sysctl -w -

[Peer]
PublicKey = $CLIENT_PUBLIC_KEY
AllowedIPs = 10.0.0.2/32
PersistentKeepalive = 25
EOF
    
    log_success "WireGuard server configuration created"
}

create_client_config() {
    log_info "Creating iPhone client configuration..."
    
    cd "$WIREGUARD_CONFIG_DIR"
    
    # Get public IP address
    PUBLIC_IP=$(curl -s ifconfig.me)
    if [[ -z "$PUBLIC_IP" ]]; then
        log_warning "Could not determine public IP. Using placeholder."
        PUBLIC_IP="YOUR_PUBLIC_IP"
    fi
    
    # Read generated keys
    CLIENT_PRIVATE_KEY=$(cat client_private.key)
    SERVER_PUBLIC_KEY=$(cat server_public.key)
    
    # Create client configuration
    cat > client.conf << EOF
[Interface]
PrivateKey = $CLIENT_PRIVATE_KEY
Address = 10.0.0.2/32
DNS = 8.8.8.8, 8.8.4.4

[Peer]
PublicKey = $SERVER_PUBLIC_KEY
Endpoint = $PUBLIC_IP:51820
AllowedIPs = 10.0.0.0/24
PersistentKeepalive = 25
EOF
    
    log_success "iPhone client configuration created"
}

generate_qr_codes() {
    log_info "Generating QR codes..."
    
    cd "$WIREGUARD_CONFIG_DIR"
    
    # Generate QR code for iPhone WireGuard app
    qrencode -t png -o wireguard-qr.png -r client.conf
    qrencode -t ansiutf8 -r client.conf > wireguard-qr.txt
    
    log_success "QR codes generated"
}

setup_launchd_service() {
    log_info "Setting up auto-start service (optional)..."
    
    read -p "Do you want RemoteClaude to start automatically at boot? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        PLIST_PATH="/Library/LaunchDaemons/com.remoteclaude.server.plist"
        REMOTECLAUDE_PATH="$(pwd)/remoteclaude-server"
        
        sudo tee "$PLIST_PATH" > /dev/null << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.remoteclaude.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>$REMOTECLAUDE_PATH</string>
        <string>--port=8090</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>$(dirname "$REMOTECLAUDE_PATH")</string>
    <key>StandardOutPath</key>
    <string>/var/log/remoteclaude.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/remoteclaude.error.log</string>
</dict>
</plist>
EOF
        
        sudo launchctl load "$PLIST_PATH"
        log_success "Auto-start service configured"
    else
        log_info "Auto-start service skipped"
    fi
}

configure_firewall() {
    log_info "Configuring macOS firewall..."
    
    # Check if firewall is enabled
    FIREWALL_STATUS=$(sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate)
    
    if [[ "$FIREWALL_STATUS" == *"enabled"* ]]; then
        log_warning "Firewall is enabled. Adding RemoteClaude to allowed applications..."
        
        # Add RemoteClaude server to firewall exceptions
        sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add "$(pwd)/remoteclaude-server"
        sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock "$(pwd)/remoteclaude-server"
        
        log_success "Firewall configured for RemoteClaude"
    else
        log_info "Firewall is disabled. No configuration needed."
    fi
}

show_next_steps() {
    cd "$WIREGUARD_CONFIG_DIR"
    PUBLIC_IP=$(curl -s ifconfig.me)
    
    echo "
🎉 RemoteClaude v3.6.0 Setup Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 Configuration Files:
   ~/.remoteclaude/wireguard/

🔧 Next Steps:

1. 📱 iPhone Setup:
   • Install WireGuard app from App Store (free)
   • Open WireGuard app → '+' → 'Create from QR Code'
   • Scan the QR code below:

$(cat wireguard-qr.txt)

2. 🚀 Start RemoteClaude Server:
   cd $(dirname "$0")/..
   ./remoteclaude-server

3. 🌐 Access Web Management:
   http://$(ipconfig getifaddr en0):8080

4. 🔗 Connection Methods:
   • VPN Mode: ws://10.0.0.1:8090/ws
   • Local Mode: ws://$(ipconfig getifaddr en0):8090/ws

📋 Quick Commands:
   • Start VPN: sudo wg-quick up ~/.remoteclaude/wireguard/wg0
   • Stop VPN:  sudo wg-quick down ~/.remoteclaude/wireguard/wg0
   • Check VPN: sudo wg show

🆘 Support:
   • Web Interface: http://$(ipconfig getifaddr en0):8080
   • Documentation: README.md
   • Logs: /var/log/remoteclaude.log

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Ready for secure mobile development! 🚀
"
}

main() {
    show_banner
    
    log_info "Starting RemoteClaude v3.6.0 automatic setup..."
    
    check_macos
    check_homebrew
    install_dependencies
    setup_directories
    generate_wireguard_keys
    create_wireguard_config
    create_client_config
    generate_qr_codes
    configure_firewall
    setup_launchd_service
    
    show_next_steps
    
    log_success "Setup completed successfully!"
    
    # Ask if user wants to start the server now
    echo
    read -p "Would you like to start the RemoteClaude server now? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Starting RemoteClaude server..."
        cd "$(dirname "$0")/.."
        exec ./remoteclaude-server
    else
        log_info "You can start the server later with: ./remoteclaude-server"
    fi
}

# Run main function
main "$@"