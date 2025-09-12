#!/bin/bash

# External VPN Server Startup Script (WSL2 Version)
# For WSL2 with Windows Host WireGuard Configuration
# Date: 2025-09-11

set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🌐 RemoteClaude External VPN Server Setup (WSL2)"
echo "=================================================="

# Check if running in WSL2
if ! grep -q "microsoft" /proc/version 2>/dev/null; then
    log_error "This script is designed for WSL2 environment only."
    log_info "Use start-external-server.sh for native Linux environments."
    exit 1
fi

# Configuration
EXTERNAL_IP="153.246.248.142"  # Your current external IP
ROUTER_IP="192.168.11.108"     # Router internal IP
VPN_NETWORK="10.5.5.0/24"      # VPN network range
VPN_SERVER_IP="10.5.5.1"       # VPN server IP (Windows WireGuard)
WSL_IP=$(hostname -I | awk '{print $1}')
REMOTECLAUDE_PORT="8090"        # RemoteClaude app port

# Directories
EXTERNAL_DIR="/mnt/c/RemoteClaude/external-vpn"  # Windows path
CONFIG_DIR="$HOME/.remoteclaude/external-vpn"
WINDOWS_CONFIG_DIR="/mnt/c/Users/$USER/.remoteclaude/external-vpn"

log_info "=== WSL2 Environment Detection ==="
echo "WSL2 IP: $WSL_IP"
echo "External IP: $EXTERNAL_IP"
echo "Router IP: $ROUTER_IP"
echo "VPN Network: $VPN_NETWORK"
echo ""

log_warning "🪟 WSL2 VPN Setup Requirements:"
echo "1. WireGuard must be installed on Windows host"
echo "2. Router port forwarding must be configured on Windows side"
echo "3. WSL2 port forwarding must be set up"
echo ""

# Create configuration directories
log_info "=== Creating configuration directories ==="
mkdir -p "$CONFIG_DIR"
mkdir -p "$CONFIG_DIR/clients"

# Create Windows directories if accessible
if [[ -d "/mnt/c/Users/$USER" ]]; then
    mkdir -p "$WINDOWS_CONFIG_DIR" 2>/dev/null || log_warning "Could not create Windows config directory"
    mkdir -p "$WINDOWS_CONFIG_DIR/clients" 2>/dev/null || true
fi

# Generate WireGuard configuration for Windows
log_info "=== Generating WireGuard configuration for Windows ==="

# Check if WireGuard tools are available
if ! command -v wg &> /dev/null; then
    log_warning "WireGuard tools not found in WSL2. Installing..."
    sudo apt update && sudo apt install -y wireguard-tools qrencode || {
        log_error "Could not install WireGuard tools"
        exit 1
    }
fi

# Generate server keys if not exists
if [[ ! -f "$CONFIG_DIR/server_private.key" ]]; then
    log_info "Generating WireGuard server keys..."
    wg genkey > "$CONFIG_DIR/server_private.key"
    wg pubkey < "$CONFIG_DIR/server_private.key" > "$CONFIG_DIR/server_public.key"
    log_success "Server keys generated"
else
    log_info "Using existing server keys"
fi

SERVER_PRIVATE_KEY=$(cat "$CONFIG_DIR/server_private.key")
SERVER_PUBLIC_KEY=$(cat "$CONFIG_DIR/server_public.key")

log_info "Server Public Key: $SERVER_PUBLIC_KEY"

# Create Windows WireGuard server configuration
log_info "=== Creating Windows WireGuard server configuration ==="
cat > "$CONFIG_DIR/wg0-windows.conf" << EOF
# Windows WireGuard Server Configuration for RemoteClaude
# Install this configuration in WireGuard for Windows

[Interface]
Address = $VPN_SERVER_IP/24
ListenPort = 51820
PrivateKey = $SERVER_PRIVATE_KEY

# DNS servers
DNS = 1.1.1.1, 8.8.8.8

EOF

# Generate client keys
CLIENT_PRIVATE_KEY=$(wg genkey)
CLIENT_PUBLIC_KEY=$(echo "$CLIENT_PRIVATE_KEY" | wg pubkey)

# Client IP assignment
CLIENT_IP="10.5.5.10"

# Create client configuration
cat > "$CONFIG_DIR/clients/client-iphone.conf" << EOF
[Interface]
PrivateKey = $CLIENT_PRIVATE_KEY
Address = $CLIENT_IP/24
DNS = 1.1.1.1, 8.8.8.8

[Peer]
PublicKey = $SERVER_PUBLIC_KEY
Endpoint = $EXTERNAL_IP:51820
AllowedIPs = $VPN_NETWORK
PersistentKeepalive = 25
EOF

# Add client to server configuration
cat >> "$CONFIG_DIR/wg0-windows.conf" << EOF

# Client: iPhone
[Peer]
PublicKey = $CLIENT_PUBLIC_KEY
AllowedIPs = $CLIENT_IP/32
PersistentKeepalive = 25
EOF

log_success "WireGuard configurations generated"

# Copy to Windows directory if possible
if [[ -d "/mnt/c/Users/$USER" ]]; then
    cp "$CONFIG_DIR/wg0-windows.conf" "$WINDOWS_CONFIG_DIR/" 2>/dev/null || true
    cp -r "$CONFIG_DIR/clients" "$WINDOWS_CONFIG_DIR/" 2>/dev/null || true
fi

# Generate QR code
log_info "=== Generating client QR code ==="
if command -v qrencode &> /dev/null; then
    qrencode -t ansiutf8 < "$CONFIG_DIR/clients/client-iphone.conf"
    qrencode -t png -o "$CONFIG_DIR/clients/client-iphone-qr.png" < "$CONFIG_DIR/clients/client-iphone.conf"
    log_success "QR code generated: $CONFIG_DIR/clients/client-iphone-qr.png"
else
    log_warning "qrencode not found"
    echo "Client configuration:"
    cat "$CONFIG_DIR/clients/client-iphone.conf"
fi

# Create Windows setup instructions
log_info "=== Creating Windows setup instructions ==="
cat > "$CONFIG_DIR/windows-setup-instructions.md" << EOF
# Windows WireGuard Setup Instructions for RemoteClaude External VPN

## Prerequisites
1. Install WireGuard for Windows from https://www.wireguard.com/install/
2. Ensure router port forwarding is configured (UDP 51820 -> Windows IP)

## Setup Steps

### 1. Install WireGuard Configuration
1. Open WireGuard for Windows
2. Click "Add Tunnel" -> "Add empty tunnel..."
3. Replace the generated configuration with the contents of: \`wg0-windows.conf\`
4. Name the tunnel: "RemoteClaude-VPN"
5. Save and activate the tunnel

### 2. Configure Windows Port Forwarding (PowerShell as Administrator)
\`\`\`powershell
# Forward RemoteClaude server port from Windows to WSL2
netsh interface portproxy add v4tov4 listenport=8090 listenaddress=0.0.0.0 connectport=8090 connectaddress=$WSL_IP

# Forward Web UI port
netsh interface portproxy add v4tov4 listenport=8080 listenaddress=0.0.0.0 connectport=8080 connectaddress=$WSL_IP

# Allow through Windows Firewall
netsh advfirewall firewall add rule name="RemoteClaude Server" dir=in action=allow protocol=TCP localport=8090
netsh advfirewall firewall add rule name="RemoteClaude Web UI" dir=in action=allow protocol=TCP localport=8080
\`\`\`

### 3. Router Configuration
Ensure your router has port forwarding configured:
- External Port: 51820 (UDP) -> Windows IP:51820
- External Port: 8090 (TCP) -> Windows IP:8090 (optional, for direct access)

### 4. iPhone Setup
1. Install WireGuard app from App Store
2. Scan the QR code generated by this script
3. Connect to the VPN
4. Use RemoteClaude with: ws://10.5.5.1:8090/ws

## Testing
1. Activate WireGuard tunnel on Windows
2. Start RemoteClaude server in WSL2: \`$CONFIG_DIR/start-remoteclaude-wsl2.sh\`
3. Connect iPhone to VPN
4. Test connection to: ws://10.5.5.1:8090/ws

## Troubleshooting
- Ensure Windows firewall allows WireGuard and port forwarding
- Check WSL2 IP hasn't changed: \`hostname -I\`
- Update port forwarding if WSL2 IP changes
- Verify router port forwarding configuration
EOF

# Create RemoteClaude WSL2 startup script
cat > "$CONFIG_DIR/start-remoteclaude-wsl2.sh" << EOF
#!/bin/bash

echo "🚀 Starting RemoteClaude Server for WSL2 External VPN"
echo "=================================================="
echo "WSL2 IP: $WSL_IP"
echo "VPN Server IP: $VPN_SERVER_IP"
echo "Client IP: $CLIENT_IP"
echo "Port: $REMOTECLAUDE_PORT"
echo ""

cd /home/\$(whoami)/remoteclaude/server 2>/dev/null || cd /mnt/c/RemoteClaude/server

# Check if server binary exists
if [[ ! -f "./remoteclaude-server" ]]; then
    echo "Building RemoteClaude server..."
    go build -o remoteclaude-server .
fi

echo "Starting RemoteClaude server..."
echo "Access via VPN: ws://10.5.5.1:$REMOTECLAUDE_PORT/ws"
echo "Local access: ws://$WSL_IP:$REMOTECLAUDE_PORT/ws"
echo ""

# Start server bound to all interfaces for VPN access
./remoteclaude-server \\
    --port $REMOTECLAUDE_PORT \\
    --host 0.0.0.0 \\
    --external-vpn \\
    --allowed-networks "$VPN_NETWORK,192.168.0.0/16" \\
    --web-port 8080 \\
    --verbose
EOF

chmod +x "$CONFIG_DIR/start-remoteclaude-wsl2.sh"

# Create Windows PowerShell setup script
cat > "$CONFIG_DIR/setup-windows-forwarding.ps1" << 'EOF'
# Windows Port Forwarding Setup for RemoteClaude WSL2 External VPN
# Run as Administrator in PowerShell

Write-Host "🪟 Setting up Windows port forwarding for RemoteClaude WSL2" -ForegroundColor Cyan

# Get WSL2 IP
$wslIP = (wsl hostname -I).Trim()
Write-Host "WSL2 IP detected: $wslIP" -ForegroundColor Green

# Remove existing port forwarding rules
Write-Host "Removing existing port forwarding rules..." -ForegroundColor Yellow
netsh interface portproxy delete v4tov4 listenport=8090 listenaddress=0.0.0.0 2>$null
netsh interface portproxy delete v4tov4 listenport=8080 listenaddress=0.0.0.0 2>$null

# Add new port forwarding rules
Write-Host "Adding port forwarding rules..." -ForegroundColor Green
netsh interface portproxy add v4tov4 listenport=8090 listenaddress=0.0.0.0 connectport=8090 connectaddress=$wslIP
netsh interface portproxy add v4tov4 listenport=8080 listenaddress=0.0.0.0 connectport=8080 connectaddress=$wslIP

# Configure Windows Firewall
Write-Host "Configuring Windows Firewall..." -ForegroundColor Green
netsh advfirewall firewall delete rule name="RemoteClaude Server" 2>$null
netsh advfirewall firewall delete rule name="RemoteClaude Web UI" 2>$null
netsh advfirewall firewall add rule name="RemoteClaude Server" dir=in action=allow protocol=TCP localport=8090
netsh advfirewall firewall add rule name="RemoteClaude Web UI" dir=in action=allow protocol=TCP localport=8080

# Show current port forwarding
Write-Host "`nCurrent port forwarding rules:" -ForegroundColor Cyan
netsh interface portproxy show all

Write-Host "`n✅ Windows setup completed!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Install WireGuard configuration from: $env:USERPROFILE\.remoteclaude\external-vpn\wg0-windows.conf"
Write-Host "2. Start RemoteClaude server in WSL2"
Write-Host "3. Connect iPhone to VPN and use: ws://10.5.5.1:8090/ws"
EOF

# Copy to Windows if possible
if [[ -d "/mnt/c/Users/$USER" ]]; then
    cp "$CONFIG_DIR/setup-windows-forwarding.ps1" "$WINDOWS_CONFIG_DIR/" 2>/dev/null || true
fi

log_success "WSL2 external VPN setup completed"

# Display setup information
log_info "=== WSL2 Setup Summary ==="
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🖥️  WSL2 IP: $WSL_IP"
echo "🌍 External IP: $EXTERNAL_IP"
echo "🔒 VPN Server: $VPN_SERVER_IP (Windows)"
echo "📱 Client IP: $CLIENT_IP"
echo "🚪 WireGuard Port: 51820 (Windows)"
echo "📡 RemoteClaude Port: $REMOTECLAUDE_PORT (WSL2)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_info "=== Required Windows Setup Steps ==="
echo "1. 🪟 Run in Windows PowerShell (as Administrator):"
echo "   $WINDOWS_CONFIG_DIR/setup-windows-forwarding.ps1"
echo ""
echo "2. 🔒 Install WireGuard configuration:"
echo "   Open WireGuard for Windows"
echo "   Import: $WINDOWS_CONFIG_DIR/wg0-windows.conf"
echo ""
echo "3. 📱 iPhone setup:"
echo "   Install WireGuard app"
echo "   Scan QR code: $CONFIG_DIR/clients/client-iphone-qr.png"
echo ""
echo "4. 🚀 Start RemoteClaude:"
echo "   $CONFIG_DIR/start-remoteclaude-wsl2.sh"
echo ""

log_info "=== Connection URLs ==="
echo "VPN access: ws://10.5.5.1:$REMOTECLAUDE_PORT/ws"
echo "Local access: ws://$WSL_IP:$REMOTECLAUDE_PORT/ws"
echo "Web UI (local): http://$WSL_IP:8080"
echo ""

log_success "WSL2 external VPN configuration completed!"
echo ""
log_warning "⚠️  Important Notes:"
echo "• WireGuard must run on Windows host, not WSL2"
echo "• Windows port forwarding needed for external access"
echo "• Router must forward UDP 51820 to Windows host"
echo "• WSL2 IP may change on Windows restart"