#!/bin/bash

# External VPN Server Startup Script
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

echo "🌐 RemoteClaude External VPN Server Setup"
echo "==========================================="

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

# Create server configuration
log_info "=== Creating WireGuard server configuration ==="
cat > "$CONFIG_DIR/wg0-external.conf" << EOF
[Interface]
Address = $VPN_SERVER_IP/24
ListenPort = $WIREGUARD_PORT
PrivateKey = $SERVER_PRIVATE_KEY

# Enable IP forwarding
PostUp = sysctl -w net.ipv4.ip_forward=1
PostUp = sysctl -w net.ipv6.conf.all.forwarding=1

# IPv4 NAT rules
PostUp = iptables -A FORWARD -i %i -j ACCEPT
PostUp = iptables -A FORWARD -o %i -j ACCEPT
PostUp = iptables -t nat -A POSTROUTING -o en0 -j MASQUERADE

# IPv6 NAT rules (6to4 tunnel support)
PostUp = ip6tables -A FORWARD -i %i -j ACCEPT
PostUp = ip6tables -A FORWARD -o %i -j ACCEPT

# Cleanup rules
PostDown = iptables -D FORWARD -i %i -j ACCEPT
PostDown = iptables -D FORWARD -o %i -j ACCEPT
PostDown = iptables -t nat -D POSTROUTING -o en0 -j MASQUERADE
PostDown = ip6tables -D FORWARD -i %i -j ACCEPT
PostDown = ip6tables -D FORWARD -o %i -j ACCEPT

# DNS servers
DNS = 1.1.1.1, 8.8.8.8

EOF

log_success "WireGuard server configuration created"

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
else
    log_warning "qrencode not found. Install with: brew install qrencode"
    echo "Client configuration:"
    cat "$CONFIG_DIR/clients/client-iphone.conf"
fi

# Start WireGuard interface
log_info "=== Starting WireGuard interface ==="

# Stop existing interface if running
if ip link show wg0-external &>/dev/null; then
    log_info "Stopping existing wg0-external interface..."
    sudo wg-quick down "$CONFIG_DIR/wg0-external.conf" || true
fi

# Start new interface
sudo wg-quick up "$CONFIG_DIR/wg0-external.conf"
log_success "WireGuard external interface started"

# Show interface status
log_info "=== WireGuard Status ==="
sudo wg show

# Start RemoteClaude server for external VPN
log_info "=== Starting RemoteClaude Server for External VPN ==="

# Create RemoteClaude server for VPN clients
cat > "$CONFIG_DIR/start-remoteclaude-vpn.sh" << EOF
#!/bin/bash

echo "🚀 Starting RemoteClaude Server for External VPN"
echo "VPN Network: $VPN_NETWORK"
echo "Server IP: $VPN_SERVER_IP"
echo "Client IP: $CLIENT_IP"
echo ""

cd /Users/suetaketakaya/1.prog/remote_manual/server

# Start server with VPN-specific settings
./remoteclaude-server \\
    --port $REMOTECLAUDE_PORT \\
    --host $VPN_SERVER_IP \\
    --external-vpn \\
    --allowed-networks "$VPN_NETWORK" \\
    --web-port 8080
EOF

chmod +x "$CONFIG_DIR/start-remoteclaude-vpn.sh"

log_success "RemoteClaude VPN server script created"

# Network information
log_info "=== Network Configuration Summary ==="
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