#!/bin/bash

# IPv6 6to4 Tunnel Setup for RemoteClaude External VPN (macOS Version)
# TP-Link Router Integration Script
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

echo "🌍 IPv6 6to4 Tunnel Configuration for RemoteClaude (macOS)"
echo "========================================================"

# Network configuration from TP-Link router
ROUTER_IPV4="192.168.11.108"
ROUTER_SUBNET_MASK="255.255.255.0"
ROUTER_GATEWAY="192.168.11.1"
TUNNEL_ADDRESS="2002:c0a8:b6c::c0a8:b6c/48"
EXTERNAL_IP="153.246.248.142"

log_info "=== Network Configuration ==="
echo "Router IPv4: $ROUTER_IPV4"
echo "Subnet Mask: $ROUTER_SUBNET_MASK"  
echo "Gateway: $ROUTER_GATEWAY"
echo "6to4 Tunnel: $TUNNEL_ADDRESS"
echo "External IP: $EXTERNAL_IP"

# Convert IPv4 to 6to4 format
log_info "=== Converting IPv4 to 6to4 format ==="

# Extract octets from external IP
IFS='.' read -r octet1 octet2 octet3 octet4 <<< "$EXTERNAL_IP"

# Convert to hexadecimal
hex1=$(printf "%02x" $octet1)
hex2=$(printf "%02x" $octet2)
hex3=$(printf "%02x" $octet3)
hex4=$(printf "%02x" $octet4)

# Create 6to4 prefix
IPV6_PREFIX="2002:${hex1}${hex2}:${hex3}${hex4}"
FULL_IPV6_ADDRESS="${IPV6_PREFIX}::1/48"

log_success "6to4 IPv6 Address: $FULL_IPV6_ADDRESS"

# Check if IPv6 is enabled
log_info "=== Checking IPv6 support on macOS ==="
if sysctl net.inet6.ip6.forwarding &>/dev/null; then
    log_success "IPv6 support detected"
else
    log_error "IPv6 not supported on this macOS system"
    exit 1
fi

# Create 6to4 tunnel interface using macOS ifconfig
log_info "=== Creating 6to4 tunnel interface (macOS) ==="

# Remove existing stf0 interface if exists (macOS 6to4 interface)
if ifconfig stf0 &>/dev/null; then
    log_info "Removing existing stf0 interface..."
    sudo ifconfig stf0 destroy || true
fi

# Create new 6to4 tunnel using macOS ifconfig
log_info "Creating 6to4 tunnel interface..."

# Create stf interface on macOS
sudo ifconfig stf0 create || log_warning "Could not create stf0 interface"

# Configure the tunnel
sudo ifconfig stf0 inet6 $FULL_IPV6_ADDRESS up
sudo route add -inet6 2000::/3 ::$ROUTER_GATEWAY -interface stf0

log_success "6to4 tunnel interface created (stf0)"

# Configure IPv6 forwarding for macOS
log_info "=== Configuring IPv6 forwarding (macOS) ==="
sudo sysctl -w net.inet6.ip6.forwarding=1

# Configure firewall rules for IPv6 (macOS pfctl)
log_info "=== Configuring IPv6 firewall rules (macOS pfctl) ==="

# Create pfctl rules file
cat > /tmp/ipv6_vpn_rules.conf << EOF
# IPv6 6to4 tunnel rules for RemoteClaude VPN
pass in inet6 on stf0
pass out inet6 on stf0
pass in inet6 on utun0
pass out inet6 on utun0
EOF

# Load pfctl rules (if pfctl is available)
if command -v pfctl &> /dev/null; then
    sudo pfctl -f /tmp/ipv6_vpn_rules.conf
    log_success "IPv6 firewall rules configured with pfctl"
else
    log_warning "pfctl not available, firewall rules not applied"
fi

# Test IPv6 connectivity
log_info "=== Testing IPv6 connectivity ==="
if ping6 -c 3 ipv6.google.com &>/dev/null; then
    log_success "IPv6 connectivity working"
else
    log_warning "IPv6 connectivity test failed - may need router configuration"
fi

# Show network configuration (macOS version)
log_info "=== Network Interface Status (macOS) ==="
echo "IPv4 interfaces:"
ifconfig | grep -A 1 "inet " | grep -v "127.0.0.1"

echo ""
echo "IPv6 interfaces:"
ifconfig | grep -A 1 "inet6 " | grep -v "::1"

echo ""
echo "6to4 tunnel interface:"
ifconfig stf0 || log_error "stf0 interface not found"

# Create launchd plist for persistent tunnel on macOS
log_info "=== Creating persistent 6to4 service (macOS launchd) ==="
cat > /tmp/com.remoteclaude.ipv6tunnel.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.remoteclaude.ipv6tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>ifconfig stf0 create; ifconfig stf0 inet6 $FULL_IPV6_ADDRESS up; route add -inet6 2000::/3 ::$ROUTER_GATEWAY -interface stf0</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>UserName</key>
    <string>root</string>
</dict>
</plist>
EOF

sudo mv /tmp/com.remoteclaude.ipv6tunnel.plist /Library/LaunchDaemons/
sudo launchctl load /Library/LaunchDaemons/com.remoteclaude.ipv6tunnel.plist

log_success "6to4 tunnel service installed and enabled (launchd)"

# Summary
log_info "=== Configuration Summary (macOS) ==="
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌍 External IPv4: $EXTERNAL_IP"
echo "🌈 6to4 IPv6: $FULL_IPV6_ADDRESS"
echo "🔗 6to4 Prefix: $IPV6_PREFIX"
echo "🖥️ Router IPv4: $ROUTER_IPV4"
echo "🌉 Tunnel Interface: stf0 (macOS)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_success "IPv6 6to4 tunnel setup completed (macOS)!"

echo ""
log_info "Next steps:"
echo "1. Run: ./start-external-server-macos.sh"
echo "2. Configure WireGuard clients with IPv6 support"
echo "3. Test dual-stack connectivity"