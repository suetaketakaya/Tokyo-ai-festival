#!/bin/bash

# IPv6 6to4 Tunnel Setup for RemoteClaude External VPN
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

echo "🌍 IPv6 6to4 Tunnel Configuration for RemoteClaude"
echo "=================================================="

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

# Check if sit module is available
log_info "=== Checking IPv6 6to4 support ==="
if ! lsmod | grep -q sit; then
    log_info "Loading sit module..."
    sudo modprobe sit || log_warning "Could not load sit module"
fi

# Create 6to4 tunnel interface
log_info "=== Creating 6to4 tunnel interface ==="

# Remove existing sit0 interface if exists
if ip link show sit0 &>/dev/null; then
    log_info "Removing existing sit0 interface..."
    sudo ip link set sit0 down || true
    sudo ip tunnel del sit0 || true
fi

# Create new 6to4 tunnel
log_info "Creating 6to4 tunnel..."
sudo ip tunnel add sit0 mode sit ttl 64
sudo ip link set sit0 up
sudo ip addr add $FULL_IPV6_ADDRESS dev sit0
sudo ip route add 2000::/3 via ::$ROUTER_GATEWAY dev sit0

log_success "6to4 tunnel interface created"

# Configure IPv6 forwarding
log_info "=== Configuring IPv6 forwarding ==="
sudo sysctl -w net.ipv6.conf.all.forwarding=1
sudo sysctl -w net.ipv6.conf.sit0.forwarding=1

# Configure firewall rules for IPv6
log_info "=== Configuring IPv6 firewall rules ==="

# Allow IPv6 forwarding through sit0
sudo ip6tables -A FORWARD -i sit0 -j ACCEPT
sudo ip6tables -A FORWARD -o sit0 -j ACCEPT

# Allow IPv6 traffic to/from VPN interface
sudo ip6tables -A FORWARD -i wg0-external -o sit0 -j ACCEPT
sudo ip6tables -A FORWARD -i sit0 -o wg0-external -j ACCEPT

# NAT IPv6 traffic
sudo ip6tables -t nat -A POSTROUTING -o sit0 -j MASQUERADE

log_success "IPv6 firewall rules configured"

# Test IPv6 connectivity
log_info "=== Testing IPv6 connectivity ==="
if ping6 -c 3 ipv6.google.com &>/dev/null; then
    log_success "IPv6 connectivity working"
else
    log_warning "IPv6 connectivity test failed"
fi

# Show network configuration
log_info "=== Network Interface Status ==="
echo "IPv4 interfaces:"
ip addr show | grep inet | grep -v 127.0.0.1

echo ""
echo "IPv6 interfaces:"
ip addr show | grep inet6 | grep -v ::1

echo ""
echo "6to4 tunnel interface:"
ip addr show sit0 || log_error "sit0 interface not found"

# Create systemd service for persistent tunnel
log_info "=== Creating persistent 6to4 service ==="
cat > /tmp/remoteclaude-6to4.service << EOF
[Unit]
Description=RemoteClaude 6to4 Tunnel
After=network.target
Wants=network.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/bash -c 'ip tunnel add sit0 mode sit ttl 64; ip link set sit0 up; ip addr add $FULL_IPV6_ADDRESS dev sit0; ip route add 2000::/3 via ::$ROUTER_GATEWAY dev sit0'
ExecStop=/bin/bash -c 'ip link set sit0 down; ip tunnel del sit0'
User=root

[Install]
WantedBy=multi-user.target
EOF

sudo mv /tmp/remoteclaude-6to4.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable remoteclaude-6to4.service

log_success "6to4 tunnel service installed and enabled"

# Summary
log_info "=== Configuration Summary ==="
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌍 External IPv4: $EXTERNAL_IP"
echo "🌈 6to4 IPv6: $FULL_IPV6_ADDRESS"
echo "🔗 6to4 Prefix: $IPV6_PREFIX"
echo "🖥️ Router IPv4: $ROUTER_IPV4"
echo "🌉 Tunnel Interface: sit0"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_success "IPv6 6to4 tunnel setup completed!"

echo ""
log_info "Next steps:"
echo "1. Run: ./start-external-server.sh"
echo "2. Configure WireGuard clients with IPv6 support"
echo "3. Test dual-stack connectivity"