#!/bin/bash

# External VPN Server Startup Script (macOS Version)
# For TP-Link Router WireGuard Configuration
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

echo "🌐 RemoteClaude External VPN Server Setup (macOS)"
echo "=================================================="

# Configuration
EXTERNAL_IP="153.246.248.142"  # Your current external IP
ROUTER_IP="192.168.11.108"     # Router internal IP
VPN_NETWORK="10.5.5.0/24"      # VPN network range
VPN_SERVER_IP="10.5.5.1"       # VPN server IP
WIREGUARD_PORT="51820"          # WireGuard port
REMOTECLAUDE_PORT="8090"        # RemoteClaude app port

# Directories
EXTERNAL_DIR="/Users/suetaketakaya/1.prog/remote_manual/server/external-vpn"
CONFIG_DIR="$HOME/.remoteclaude/external-vpn"

log_info "=== Creating configuration directories ==="
mkdir -p "$CONFIG_DIR"
mkdir -p "$CONFIG_DIR/clients"

# Check if WireGuard is installed
if ! command -v wg &> /dev/null; then
    log_error "WireGuard not found. Please install with: brew install wireguard-tools"
    exit 1
fi

# Stop any existing WireGuard interfaces first
log_info "=== Checking for existing WireGuard interfaces ==="
existing_interfaces=$(sudo wg show 2>/dev/null | grep "interface:" | cut -d: -f1 || echo "")
if [[ -n "$existing_interfaces" ]]; then
    log_warning "Found existing WireGuard interfaces: $existing_interfaces"
    log_info "Stopping existing interfaces..."
    for interface in $existing_interfaces; do
        log_info "Stopping interface: $interface"
        sudo wg-quick down "$interface" || log_warning "Could not stop $interface"
    done
fi

# Check for existing utun interfaces that might conflict
log_info "=== Checking for existing utun interfaces ==="
existing_utun=$(ifconfig | grep "^utun" | cut -d: -f1 || echo "")
if [[ -n "$existing_utun" ]]; then
    log_info "Found existing utun interfaces: $existing_utun"
    # Don't automatically remove them as they might be system VPNs
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

# Create server configuration for macOS
log_info "=== Creating WireGuard server configuration (macOS) ==="
cat > "$CONFIG_DIR/wg0-external.conf" << EOF
[Interface]
Address = $VPN_SERVER_IP/24
ListenPort = $WIREGUARD_PORT
PrivateKey = $SERVER_PRIVATE_KEY

# Enable IP forwarding (macOS)
PostUp = sysctl -w net.inet.ip.forwarding=1
PostUp = sysctl -w net.inet6.ip6.forwarding=1

# macOS pfctl firewall rules (NAT and forwarding)
PostUp = echo "nat on en0 from $VPN_NETWORK to any -> (en0)" | sudo pfctl -f -
PostUp = echo "pass in on utun0" | sudo pfctl -f -
PostUp = echo "pass out on utun0" | sudo pfctl -f -
PostUp = sudo pfctl -e

# Cleanup rules (macOS)
PostDown = sudo pfctl -f /etc/pf.conf
PostDown = sudo pfctl -d

# DNS servers
DNS = 1.1.1.1, 8.8.8.8

EOF

log_success "WireGuard server configuration created for macOS"

# Generate client configuration
log_info "=== Generating client configuration ==="

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
Endpoint = $EXTERNAL_IP:$WIREGUARD_PORT
AllowedIPs = $VPN_NETWORK
PersistentKeepalive = 25
EOF

# Add client to server configuration
cat >> "$CONFIG_DIR/wg0-external.conf" << EOF

# Client: iPhone
[Peer]
PublicKey = $CLIENT_PUBLIC_KEY
AllowedIPs = $CLIENT_IP/32
PersistentKeepalive = 25
EOF

log_success "Client configuration generated: $CONFIG_DIR/clients/client-iphone.conf"

# Generate QR code for client
log_info "=== Generating client QR code ==="
if command -v qrencode &> /dev/null; then
    qrencode -t png -o "$CONFIG_DIR/clients/client-iphone-qr.png" < "$CONFIG_DIR/clients/client-iphone.conf"
    log_success "QR code generated: $CONFIG_DIR/clients/client-iphone-qr.png"
    
    # Also create ASCII QR code for terminal
    log_info "QR Code for iPhone WireGuard Client:"
    qrencode -t ansiutf8 < "$CONFIG_DIR/clients/client-iphone.conf"
else
    log_warning "qrencode not found. Install with: brew install qrencode"
    echo "Client configuration:"
    cat "$CONFIG_DIR/clients/client-iphone.conf"
fi

# Check for port conflicts before starting
log_info "=== Checking port availability ==="
if lsof -Pi :$REMOTECLAUDE_PORT -sTCP:LISTEN -t >/dev/null; then
    log_warning "Port $REMOTECLAUDE_PORT is already in use. Attempting to find free port..."
    REMOTECLAUDE_PORT=$((REMOTECLAUDE_PORT + 1))
    while lsof -Pi :$REMOTECLAUDE_PORT -sTCP:LISTEN -t >/dev/null; do
        REMOTECLAUDE_PORT=$((REMOTECLAUDE_PORT + 1))
        if [[ $REMOTECLAUDE_PORT -gt 8100 ]]; then
            log_error "Could not find available port between 8090-8100"
            exit 1
        fi
    done
    log_info "Using alternative port: $REMOTECLAUDE_PORT"
fi

# Start WireGuard interface with error handling
log_info "=== Starting WireGuard interface (macOS) ==="

# Try to start the interface with detailed error handling
if sudo wg-quick up "$CONFIG_DIR/wg0-external.conf" 2>&1; then
    log_success "WireGuard external interface started successfully"
else
    log_error "Failed to start WireGuard interface"
    log_info "Attempting alternative startup method..."
    
    # Alternative method: manual interface creation
    sudo wg genkey > /tmp/wg_private.key
    sudo wg pubkey < /tmp/wg_private.key > /tmp/wg_public.key
    
    # Find available utun interface
    utun_num=0
    while ifconfig utun$utun_num &>/dev/null; do
        utun_num=$((utun_num + 1))
    done
    
    UTUN_INTERFACE="utun$utun_num"
    log_info "Using interface: $UTUN_INTERFACE"
    
    # Create and configure interface manually
    sudo ifconfig $UTUN_INTERFACE create || true
    sudo ifconfig $UTUN_INTERFACE inet $VPN_SERVER_IP/24 up
    
    rm -f /tmp/wg_private.key /tmp/wg_public.key
fi

# Show interface status
log_info "=== WireGuard Status ==="
if command -v wg &> /dev/null; then
    sudo wg show || log_warning "Could not show WireGuard status"
fi

# Show network interfaces
log_info "=== Network Interface Status ==="
ifconfig | grep -A 5 "utun\|stf"

# Create RemoteClaude server startup script for VPN clients
log_info "=== Creating RemoteClaude VPN server script ==="
cat > "$CONFIG_DIR/start-remoteclaude-vpn.sh" << EOF
#!/bin/bash

echo "🚀 Starting RemoteClaude Server for External VPN (macOS)"
echo "VPN Network: $VPN_NETWORK"
echo "Server IP: $VPN_SERVER_IP"
echo "Client IP: $CLIENT_IP"
echo "Port: $REMOTECLAUDE_PORT"
echo ""

cd /Users/suetaketakaya/1.prog/remote_manual/server

# Check if RemoteClaude server binary exists
if [[ ! -f "./remoteclaude-server" ]]; then
    echo "Building RemoteClaude server..."
    go build -o remoteclaude-server .
fi

# Start server with VPN-specific settings
echo "Starting RemoteClaude server on port $REMOTECLAUDE_PORT..."
./remoteclaude-server \\
    --port $REMOTECLAUDE_PORT \\
    --host $VPN_SERVER_IP \\
    --external-vpn \\
    --allowed-networks "$VPN_NETWORK" \\
    --web-port 8080 \\
    --verbose
EOF

chmod +x "$CONFIG_DIR/start-remoteclaude-vpn.sh"

log_success "RemoteClaude VPN server script created"

# Network information
log_info "=== Network Configuration Summary (macOS) ==="
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌍 External IP: $EXTERNAL_IP"
echo "🏠 Router IP: $ROUTER_IP"
echo "🔒 VPN Server: $VPN_SERVER_IP"
echo "📱 Client IP: $CLIENT_IP"
echo "🚪 WireGuard Port: $WIREGUARD_PORT"
echo "📡 RemoteClaude Port: $REMOTECLAUDE_PORT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_info "=== Connection Instructions ==="
echo "1. 📱 Install WireGuard app on iPhone"
echo "2. 📷 Scan QR code: $CONFIG_DIR/clients/client-iphone-qr.png"
echo "3. 🔗 Connect to VPN in WireGuard app"
echo "4. 🚀 Use RemoteClaude with VPN connection:"
echo "   ws://$VPN_SERVER_IP:$REMOTECLAUDE_PORT/ws"

log_info "=== Starting RemoteClaude Server ==="
exec "$CONFIG_DIR/start-remoteclaude-vpn.sh"