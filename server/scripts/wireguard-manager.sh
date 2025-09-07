#!/bin/bash

# WireGuard Management Script for RemoteClaude v3.6.0

WIREGUARD_CONFIG_DIR="$HOME/.remoteclaude/wireguard"
WG_CONFIG_FILE="$WIREGUARD_CONFIG_DIR/wg0.conf"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

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

check_config() {
    if [[ ! -f "$WG_CONFIG_FILE" ]]; then
        log_error "WireGuard configuration not found at $WG_CONFIG_FILE"
        log_info "Please run auto-setup.sh first"
        exit 1
    fi
}

start_vpn() {
    check_config
    log_info "Starting WireGuard VPN..."
    
    if sudo wg-quick up "$WG_CONFIG_FILE" 2>/dev/null; then
        log_success "WireGuard VPN started successfully"
        show_status
    else
        log_error "Failed to start WireGuard VPN"
        log_info "VPN may already be running"
    fi
}

stop_vpn() {
    log_info "Stopping WireGuard VPN..."
    
    if sudo wg-quick down "$WG_CONFIG_FILE" 2>/dev/null; then
        log_success "WireGuard VPN stopped successfully"
    else
        log_warning "VPN may not be running"
    fi
}

restart_vpn() {
    log_info "Restarting WireGuard VPN..."
    stop_vpn
    sleep 2
    start_vpn
}

show_status() {
    log_info "WireGuard Status:"
    echo
    
    if sudo wg show 2>/dev/null | grep -q "wg0"; then
        echo -e "${GREEN}✅ VPN Status: Active${NC}"
        sudo wg show
        echo
        echo -e "${BLUE}📱 RemoteClaude Connection:${NC}"
        echo "   URL: ws://10.0.0.1:8090/ws?key=YOUR_SESSION_KEY"
        echo "   Mode: Secure VPN"
    else
        echo -e "${YELLOW}⭕ VPN Status: Inactive${NC}"
        echo
        echo -e "${BLUE}📱 RemoteClaude Connection:${NC}"
        LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || echo "192.168.x.x")
        echo "   URL: ws://$LOCAL_IP:8090/ws?key=YOUR_SESSION_KEY"
        echo "   Mode: Local Network"
    fi
}

show_qr_code() {
    check_config
    QR_FILE="$WIREGUARD_CONFIG_DIR/wireguard-qr.txt"
    
    if [[ -f "$QR_FILE" ]]; then
        log_info "WireGuard QR Code for iPhone:"
        echo
        cat "$QR_FILE"
        echo
        log_info "Scan this QR code with the WireGuard app on iPhone"
    else
        log_error "QR code file not found. Please run auto-setup.sh first"
    fi
}

show_config() {
    check_config
    log_info "WireGuard Configuration:"
    echo
    cat "$WG_CONFIG_FILE"
}

show_help() {
    echo "
🔐 WireGuard Manager for RemoteClaude v3.6.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Usage: $0 [command]

Commands:
  start     Start WireGuard VPN
  stop      Stop WireGuard VPN
  restart   Restart WireGuard VPN
  status    Show VPN connection status
  qr        Display QR code for iPhone setup
  config    Show WireGuard configuration
  help      Show this help message

Examples:
  $0 start          # Start VPN
  $0 status         # Check if VPN is running
  $0 qr             # Show QR code for iPhone

Notes:
  • VPN Mode: Use ws://10.0.0.1:8090/ws for RemoteClaude
  • Local Mode: Use ws://[local-ip]:8090/ws for RemoteClaude
  • Configuration: $WIREGUARD_CONFIG_DIR
"
}

main() {
    case "${1:-help}" in
        "start"|"up")
            start_vpn
            ;;
        "stop"|"down")
            stop_vpn
            ;;
        "restart")
            restart_vpn
            ;;
        "status")
            show_status
            ;;
        "qr"|"qrcode")
            show_qr_code
            ;;
        "config"|"show")
            show_config
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"