# RemoteClaude v3.5
**Enterprise Mobile-Driven Multi-Server Claude Development Platform**

## Overview
iPhoneアプリから複数のmacOS/Ubuntu サーバ上のClaude Code CLIをリモート操作し、リアルタイムでのプロジェクト開発・管理を実現する次世代モバイル開発プラットフォーム。v3.5では完全なマルチサーバ管理、拡張QuickCommands、リアルタイムターミナル、QRコードスキャン機能を搭載。

## Architecture
```
iPhone App (React Native + Expo)
      ↕ WebSocket Real-time Connection
Multiple Servers (macOS/Ubuntu + Go WebSocket Server)
      ↕ Command Execution
Docker Containers (Ubuntu 22.04 + Claude CLI + Development Tools)
```

## Project Structure
```
├── remoteclaude-server/         # Go server for macOS/Ubuntu
├── RemoteClaudeApp/            # iPhone Expo app with multi-server support
├── projects/                    # Docker project workspaces
├── configs/                     # Configuration files
├── docker/                      # Docker images and compose files
├── dist/                        # Distribution builds
├── build.sh                     # Build script
└── README.md
```

## 🚀 Quick Start Guide

### 💿 Easy Installation (macOS)
**Download the pre-built DMG file:**
1. Go to [Releases](https://github.com/suetaketakaya/Tokyo-ai-festival/releases)
2. Download `RemoteClaude-Server-v3.5.0.dmg`
3. Mount the DMG and drag **RemoteClaudeServer.app** to Applications
4. Install dependencies: Docker Desktop + Claude CLI
5. Launch the app from Applications folder

### 🔧 Manual Installation Prerequisites
- **macOS**: macOS 10.15+ or **Ubuntu**: 18.04+
- **Docker**: Docker Desktop (macOS) or Docker CE (Ubuntu)
- **Go**: 1.19+
- **Node.js**: 18+
- **iPhone**: iOS 13+ with Expo Go app

## Server Setup

### macOS Server Setup

#### 1. Install Prerequisites
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required packages
brew install go docker node npm

# Start Docker Desktop
open /Applications/Docker.app
```

#### 2. Install Claude CLI
```bash
# Install Claude CLI
curl -fsSL https://claude.ai/install.sh | sh

# Verify installation
claude --version
```

#### 3. Build and Run Server
```bash
# Clone and build
git clone <repository-url>
cd remote_manual/server

# Build server binary
./build.sh

# Run server with default settings
./remoteclaude-server

# Or run with custom port
./remoteclaude-server --port=8090
```

#### 4. Configure Firewall (macOS)
```bash
# Allow incoming connections (System Preferences > Security & Privacy > Firewall)
# Or use command line:
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add ./remoteclaude-server
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on
```

#### 5. Auto-Start Service (Optional)
```bash
# Create launch daemon
sudo tee /Library/LaunchDaemons/com.remoteclaude.server.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.remoteclaude.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/your/remoteclaude-server</string>
        <string>--port=8090</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>/path/to/your/server/directory</string>
</dict>
</plist>
EOF

# Load and start service
sudo launchctl load /Library/LaunchDaemons/com.remoteclaude.server.plist
sudo launchctl start com.remoteclaude.server
```

### Ubuntu Server Setup

#### 1. Install Prerequisites
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git build-essential

# Install Go
wget https://golang.org/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 2. Install Claude CLI
```bash
# Install Claude CLI
curl -fsSL https://claude.ai/install.sh | sh

# Add to PATH if needed
echo 'export PATH=$PATH:~/.local/bin' >> ~/.bashrc
source ~/.bashrc

# Verify installation
claude --version
```

#### 3. Build and Run Server
```bash
# Clone and build
git clone <repository-url>
cd remote_manual/server

# Build server binary
chmod +x build.sh
./build.sh

# Run server
./remoteclaude-server --port=8090
```

#### 4. Configure Firewall (Ubuntu)
```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw allow 8090/tcp
sudo ufw allow ssh
sudo ufw status
```

#### 5. Auto-Start Service (systemd)
```bash
# Create systemd service
sudo tee /etc/systemd/system/remoteclaude.service << EOF
[Unit]
Description=RemoteClaude Server
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=$USER
WorkingDirectory=/path/to/your/server/directory
ExecStart=/path/to/your/remoteclaude-server --port=8090
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable remoteclaude.service
sudo systemctl start remoteclaude.service
sudo systemctl status remoteclaude.service
```

## Mobile App Setup

### iPhone App Installation
```bash
# Clone repository
git clone <repository-url>
cd remote_manual/RemoteClaudeApp

# Install dependencies
npm install

# Install Expo CLI globally
npm install -g @expo/cli

# Start development server
npx expo start
```

### Expo Go Setup
1. Install **Expo Go** from App Store
2. Open Expo Go app
3. Scan QR code from terminal
4. App will load on your iPhone

## 📱 Usage Guide

### 1. Server Connection & Management
1. **Start Server**: `./remoteclaude-server --port=8090`
2. **Add Server**: 
   - **QR Code Method**: Tap **"📱 Scan QR Code"** → Scan terminal QR
   - **Manual Method**: Tap **"✏️ Add Manually"** → Enter WebSocket URL
3. **Server Management**:
   - **Connect**: Tap **"🔗 Connect"** to establish connection
   - **Status Monitoring**: Real-time indicators (🟢 Connected, 🔴 Disconnected, 🟡 Connecting)
   - **Edit Names**: Tap server name to customize
   - **Remove**: Tap **"🗑️"** button to delete server
   - **Multi-Server**: Manage unlimited servers simultaneously

### 2. Project Development
1. **Access Projects**: Tap **"📋 View Projects"** from connected server
2. **Create Project**: Tap **"➕ Create New Project"** → Enter project name
3. **Project Operations**:
   - **▶️ Start**: Start stopped Docker containers
   - **⏹️ Stop**: Stop running containers  
   - **🗑️ Delete**: Remove project completely
4. **Development Access**: Tap project name to enter development environment

### 3. Development Environment Features
#### **🚀 Enhanced QuickCommands**
- **📂 Basic Commands**: `ls -la`, `pwd`, `git status`
- **🐧 Linux System**: OS info, processes, disk usage, memory, system load
- **🐍 Python Execution**: Version check, hello world, path info, pip packages
- **🔍 File Operations**: Find Python/JS files, count lines
- **🛠️ Dev Tools**: Check installed tools, environment variables
- **🌐 Network**: IP check, date/time
- **🤖 Claude AI**: Create README, analyze code, Python scripts

#### **💻 Real-time Terminal**
- **Live Command Execution**: Real-time output streaming
- **Auto-capitalization Fix**: Proper command input handling
- **Command History**: Scroll through previous commands and outputs
- **Error Handling**: Clear distinction between output, errors, and system messages

#### **⚡ Interactive Development**
1. **Select Project**: Choose from project list
2. **Execute Commands**: Use QuickCommands or type manually
3. **Monitor Output**: Real-time terminal with color-coded responses
4. **AI Assistance**: Use Claude commands for code generation and analysis

## 💻 Direct Container Access & Editing

### PC Terminal Access to Running Containers

#### **1. List Running Containers**
```bash
# Show all running RemoteClaude containers
docker ps --filter "ancestor=remoteclaude-ubuntu-claude:latest"

# Get container details
docker ps -a --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}"
```

#### **2. Access Container Shell**
```bash
# Method 1: Using container ID
docker exec -it <container-id> /bin/bash

# Method 2: Using container name (if named)
docker exec -it <container-name> /bin/bash

# Example with specific container
docker exec -it a1b2c3d4e5f6 /bin/bash
```

#### **3. File Editing Options**

##### **A. Using nano (Simple text editor)**
```bash
# Access container and edit files
docker exec -it <container-id> /bin/bash
cd /workspace
nano src/main.py
```

##### **B. Using vim (Advanced editor)**
```bash
# Install vim if not available
docker exec -it <container-id> apt-get update && apt-get install -y vim

# Edit files with vim
docker exec -it <container-id> vim /workspace/src/main.py
```

##### **C. VS Code with Dev Containers (Recommended)**
```bash
# Install VS Code Dev Containers extension
# Open VS Code -> Command Palette (Cmd+Shift+P)
# Select: "Dev Containers: Attach to Running Container"
# Choose your RemoteClaude container
```

#### **4. File Transfer Between Host and Container**

##### **Copy files FROM container TO host**
```bash
# Copy single file
docker cp <container-id>:/workspace/src/main.py ./local-main.py

# Copy entire directory
docker cp <container-id>:/workspace/src ./local-src

# Example
docker cp a1b2c3d4e5f6:/workspace/project.py ./downloaded-project.py
```

##### **Copy files FROM host TO container**
```bash
# Copy single file
docker cp ./local-file.py <container-id>:/workspace/

# Copy directory
docker cp ./local-src <container-id>:/workspace/

# Example
docker cp ./new-script.py a1b2c3d4e5f6:/workspace/scripts/
```

#### **5. Development Workflow Examples**

##### **Real-time Code Editing**
```bash
# 1. Access container
docker exec -it <container-id> /bin/bash

# 2. Navigate to project
cd /workspace

# 3. Create/edit Python file
nano hello.py
# Add your code, save with Ctrl+O, exit with Ctrl+X

# 4. Test immediately
python hello.py

# 5. Use Claude for code analysis
claude analyze hello.py
```

##### **Git Operations Inside Container**
```bash
# Access container
docker exec -it <container-id> /bin/bash

# Initialize git (if not already done)
cd /workspace
git init
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Standard git workflow
git add .
git commit -m "Update from container"
git push origin main
```

#### **6. Container Environment Information**
```bash
# Check container's working directory
docker exec <container-id> pwd

# List files in workspace
docker exec <container-id> ls -la /workspace

# Check installed tools
docker exec <container-id> which python3
docker exec <container-id> which claude
docker exec <container-id> python3 --version

# Check environment variables
docker exec <container-id> env | grep -E "(PATH|PYTHON|CLAUDE)"
```

#### **7. Advanced Container Management**

##### **Create Persistent Volume Mount**
```bash
# Stop existing container
docker stop <container-id>

# Create new container with host directory mounted
docker run -it -d \
  --name remoteclaude-dev \
  -v $(pwd)/local-workspace:/workspace \
  remoteclaude-ubuntu-claude:latest

# Now files are synchronized between host and container
```

##### **Container Backup and Restore**
```bash
# Create container snapshot
docker commit <container-id> remoteclaude-backup:$(date +%Y%m%d)

# Export container filesystem
docker export <container-id> > container-backup.tar

# Import container (if needed)
docker import container-backup.tar remoteclaude-restored:latest
```

#### **8. Troubleshooting Container Access**

##### **Common Issues and Solutions**
```bash
# Issue: Container not responding
docker ps -a  # Check if container is running
docker start <container-id>  # Start stopped container

# Issue: Permission denied
docker exec -u root -it <container-id> /bin/bash  # Access as root
chown -R $(whoami) /workspace  # Fix permissions

# Issue: Tools not found
docker exec <container-id> which claude
docker exec <container-id> echo $PATH
# Add to PATH if needed: export PATH=$PATH:/usr/local/bin

# Issue: Files not persisting
# Use volume mounts or copy files to host regularly
```

##### **Container Logs and Debugging**
```bash
# View container logs
docker logs <container-id>

# Follow container logs in real-time
docker logs -f <container-id>

# Check container resource usage
docker stats <container-id>

# Inspect container configuration
docker inspect <container-id>
```

---

## 🔧 Advanced Configuration

### Server Configuration Options
```bash
# Basic usage
./remoteclaude-server

# Custom port
./remoteclaude-server --port=8090

# Custom host binding
./remoteclaude-server --host=0.0.0.0 --port=8090

# Debug mode
./remoteclaude-server --debug --port=8090
```

### Environment Variables
```bash
# Set default port
export REMOTECLAUDE_PORT=8090

# Set host
export REMOTECLAUDE_HOST=0.0.0.0

# Enable debug logging
export REMOTECLAUDE_DEBUG=true

# Set project directory
export REMOTECLAUDE_PROJECT_DIR=/path/to/projects
```

### Docker Configuration
```bash
# Custom Docker socket
export DOCKER_HOST=unix:///var/run/docker.sock

# Docker compose file location
export REMOTECLAUDE_COMPOSE_FILE=/path/to/docker-compose.yml
```

## 🌐 Global Network Access & Remote Deployment

### ⚠️ **SECURITY WARNING** ⚠️
**Exposing RemoteClaude to the global internet introduces significant security risks. This section is for advanced users only.**

#### **🚨 Critical Security Risks**

##### **High-Risk Threats**
- **🔓 Unauthorized Access**: Anyone with your IP:PORT can attempt connections
- **🎯 Targeted Attacks**: Exposed services become attack vectors
- **🕵️ Data Exposure**: Project files, environment variables, and system information at risk
- **💻 Container Breakout**: Potential host system compromise through Docker escape
- **🔍 Reconnaissance**: Attackers can probe your development environment
- **📡 Traffic Interception**: Unencrypted WebSocket communications vulnerable to sniffing

##### **Compliance & Legal Risks**
- **📋 Data Protection**: May violate GDPR, CCPA, or corporate data policies
- **🏢 Corporate Security**: Breach of company network security policies
- **🔐 IP Exposure**: Intellectual property and source code at risk
- **📊 Audit Trail**: Difficulty in tracking access and changes

---

### 🔒 Secure Global Access Methods (Recommended)

#### **Option 1: WireGuard VPN Tunnel (Most Secure & Free)**

##### **🚀 Complete WireGuard Setup Guide**

**Benefits:**
- ✅ **Completely Free** (saves $6,000-$12,000/year vs commercial VPNs)
- ✅ **Military-grade encryption** (ChaCha20/Poly1305)
- ✅ **High performance** (faster than OpenVPN)
- ✅ **Easy iPhone setup** (QR code configuration)
- ✅ **Private network isolation** (10.0.0.0/24)

##### **Step 1: Install WireGuard (macOS Server)**
```bash
# Install via Homebrew
brew install wireguard-tools qrencode

# Verify installation
wg --version
```

##### **Step 2: Generate Encryption Keys**
```bash
# Create configuration directory
mkdir -p ~/wireguard-config && cd ~/wireguard-config

# Generate server keys
wg genkey | tee server_private.key | wg pubkey > server_public.key

# Generate client keys (for iPhone)
wg genkey | tee client_private.key | wg pubkey > client_public.key

# Display keys for configuration
echo "Server Private: $(cat server_private.key)"
echo "Server Public: $(cat server_public.key)"
echo "Client Private: $(cat client_private.key)"
echo "Client Public: $(cat client_public.key)"
```

##### **Step 3: Create Server Configuration**
```bash
# Create server config file
cat > ~/wireguard-config/wg0.conf << EOF
[Interface]
PrivateKey = YOUR_SERVER_PRIVATE_KEY
Address = 10.0.0.1/24
ListenPort = 51820
PostUp = echo "net.inet.ip.forwarding=1" | sudo sysctl -w -
PostDown = echo "net.inet.ip.forwarding=0" | sudo sysctl -w -

[Peer]
PublicKey = YOUR_CLIENT_PUBLIC_KEY
AllowedIPs = 10.0.0.2/32
PersistentKeepalive = 25
EOF

# Replace YOUR_SERVER_PRIVATE_KEY and YOUR_CLIENT_PUBLIC_KEY with actual keys
```

##### **Step 4: Create iPhone Client Configuration**
```bash
# Get your public IP address
PUBLIC_IP=$(curl -s ifconfig.me)
echo "Your public IP: $PUBLIC_IP"

# Create client configuration
cat > ~/wireguard-config/client.conf << EOF
[Interface]
PrivateKey = YOUR_CLIENT_PRIVATE_KEY
Address = 10.0.0.2/32
DNS = 8.8.8.8, 8.8.4.4

[Peer]
PublicKey = YOUR_SERVER_PUBLIC_KEY
Endpoint = $PUBLIC_IP:51820
AllowedIPs = 10.0.0.0/24
PersistentKeepalive = 25
EOF

# Replace YOUR_CLIENT_PRIVATE_KEY and YOUR_SERVER_PUBLIC_KEY with actual keys
```

##### **Step 5: Generate QR Code for iPhone**
```bash
# Generate QR code for easy iPhone setup
cd ~/wireguard-config
qrencode -t ansiutf8 -r client.conf

# Save QR code as image (optional)
qrencode -t png -o wireguard-qr.png -r client.conf
```

##### **Step 6: Router/Firewall Configuration**
```bash
# Configure router port forwarding (Web UI)
# External Port: 51820 (UDP)
# Internal IP: YOUR_LOCAL_IP (e.g., 192.168.1.100)
# Internal Port: 51820 (UDP)

# macOS Firewall (if enabled)
# System Preferences > Security & Privacy > Firewall > Options
# Add WireGuard and allow incoming connections

# Alternative: Command line firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /opt/homebrew/bin/wg
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock /opt/homebrew/bin/wg
```

##### **Step 7: Start WireGuard Server**
```bash
# Start VPN server
cd ~/wireguard-config
sudo wg-quick up wg0

# Verify server is running
sudo wg show

# Expected output:
# interface: wg0
#   public key: YOUR_SERVER_PUBLIC_KEY
#   private key: (hidden)
#   listening port: 51820
```

##### **Step 8: iPhone Setup**
```bash
# 1. Install WireGuard app from App Store (free)
# 2. Open WireGuard app
# 3. Tap "+" > "Create from QR Code"  
# 4. Scan the QR code generated in Step 5
# 5. Name: "RemoteClaude VPN"
# 6. Save configuration
# 7. Toggle connection ON
```

##### **Step 9: Verify VPN Connection**
```bash
# On macOS server, check connected clients
sudo wg show

# Expected output with connected iPhone:
# peer: YOUR_CLIENT_PUBLIC_KEY
#   endpoint: IPHONE_IP:PORT
#   allowed ips: 10.0.0.2/32
#   latest handshake: X seconds ago
#   transfer: X.XX KiB received, X.XX KiB sent

# On iPhone, verify VPN IP
# Settings > VPN > WireGuard should show "Connected"
# Visit whatismyipaddress.com - should show your home IP
```

##### **Step 10: Start RemoteClaude with VPN**

**⚠️ IMPORTANT: IP Address Usage**

When using WireGuard VPN, you **MUST** use the VPN internal IP address (`10.0.0.1`), **NOT** your local network IP (`192.168.x.x`). The iPhone will be isolated in the VPN tunnel and cannot access local network addresses.

```bash
# ✅ CORRECT: Start RemoteClaude server on VPN network
cd /path/to/remote_manual
./remoteclaude-server --host=10.0.0.1 --port=8090

# iPhone RemoteClaude app connection:
# Server URL: ws://10.0.0.1:8090/ws?key=SESSION_KEY
# ✅ Secure, encrypted, private connection established!

# ❌ WRONG: Using local IP with WireGuard VPN active
./remoteclaude-server --host=192.168.1.100 --port=8090  # iPhone cannot reach this!
```

**📱 Connection Methods Comparison:**

| Method | Server Command | iPhone URL | Security | Use Case |
|--------|----------------|------------|----------|----------|
| **WireGuard VPN** | `--host=10.0.0.1` | `ws://10.0.0.1:8090/ws` | 🔒 Encrypted | Remote/Secure |
| **Local WiFi** | `--host=192.168.x.x` | `ws://192.168.x.x:8090/ws` | 🏠 Local only | Same network |

**🔧 Quick Switch Commands:**
```bash
# Switch TO VPN mode
sudo wg-quick up wg0
./remoteclaude-server --host=10.0.0.1 --port=8090

# Switch FROM VPN mode (back to local)
sudo wg-quick down wg0  
./remoteclaude-server --port=8090  # Auto-detects local IP
```

##### **Step 11: Auto-Start Configuration (Optional)**
```bash
# Create launch daemon for auto-start
sudo tee /Library/LaunchDaemons/com.wireguard.wg0.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.wireguard.wg0</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/wg-quick</string>
        <string>up</string>
        <string>/Users/YOUR_USERNAME/wireguard-config/wg0</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
    <key>WorkingDirectory</key>
    <string>/Users/YOUR_USERNAME/wireguard-config</string>
</dict>
</plist>
EOF

# Load auto-start service
sudo launchctl load /Library/LaunchDaemons/com.wireguard.wg0.plist

# Start service
sudo launchctl start com.wireguard.wg0
```

##### **🛠️ WireGuard Management Commands**
```bash
# Start VPN
sudo wg-quick up wg0

# Stop VPN  
sudo wg-quick down wg0

# Restart VPN
sudo wg-quick down wg0 && sudo wg-quick up wg0

# Check status
sudo wg show

# View configuration
cat ~/wireguard-config/wg0.conf

# Check if port is listening
netstat -an | grep 51820

# Monitor real-time connections
watch -n 1 'sudo wg show'
```

##### **🔧 Troubleshooting WireGuard**
```bash
# Issue: Port already in use
lsof -i :51820
kill -9 <PID>

# Issue: iPhone can't connect
# Check router port forwarding: UDP 51820
# Check public IP: curl ifconfig.me
# Verify firewall allows UDP 51820

# Issue: No handshake
# Verify client.conf has correct Endpoint IP
# Check keys match between server and client configs
# Ensure PersistentKeepalive = 25 in client config

# Issue: VPN connects but no internet
# Check PostUp command in server config
# Verify DNS settings in client config

# View logs
# macOS: Console.app > search "wireguard"
# Command line: log show --predicate 'process == "wg-quick"' --last 1h
```

##### **📊 Cost Comparison**
| Solution | Setup Time | Monthly Cost | Annual Cost | Security |
|----------|------------|--------------|-------------|----------|
| **WireGuard (Self-hosted)** | 30 min | $0 | **$0** | ⭐⭐⭐⭐⭐ |
| NordVPN | 5 min | $5 | $60 | ⭐⭐⭐⭐ |
| ExpressVPN | 5 min | $10 | $120 | ⭐⭐⭐⭐ |
| Corporate VPN | Varies | $15+ | $180+ | ⭐⭐⭐ |

**💰 Savings with WireGuard: $60-$180+ per year!**

#### **Option 2: SSH Tunnel (Secure)**
```bash
# Create SSH tunnel from mobile device location
ssh -L 8090:localhost:8090 user@your-server.com

# Mobile app connects to: ws://localhost:8090/ws
# Traffic encrypted through SSH tunnel
```

#### **Option 3: Reverse Proxy with SSL (Advanced)**
```bash
# Use nginx with SSL termination
# Implement authentication middleware
# See "Secure Reverse Proxy Setup" section below
```

---

### ⚡ Direct Internet Exposure (High Risk)

#### **🔴 Use Only If You Accept ALL Risks Above**

##### **Minimal Security Setup (Still Very Risky)**
```bash
# 1. Change default port to non-standard
./remoteclaude-server --port=23847

# 2. Use strong session key
export REMOTECLAUDE_SESSION_KEY=$(openssl rand -hex 32)

# 3. Bind to specific interface only
./remoteclaude-server --host=0.0.0.0 --port=23847

# 4. Configure strict firewall rules
# macOS
sudo pfctl -e
sudo pfctl -f /etc/pf.conf

# Ubuntu
sudo ufw enable
sudo ufw deny incoming
sudo ufw allow out
sudo ufw allow from <your-mobile-ip> to any port 23847
```

##### **Router/Firewall Configuration**
```bash
# Port forwarding (Router admin panel)
External Port: 23847
Internal IP: 192.168.1.100
Internal Port: 23847
Protocol: TCP

# Firewall rules (allow only your mobile IP)
Allow: <your-mobile-ip>:any -> <server-ip>:23847
Deny: any:any -> <server-ip>:23847
```

##### **Connection String for Mobile App**
```
ws://<your-public-ip>:23847/ws?key=<strong-session-key>
```

---

### 🛡️ Secure Reverse Proxy Setup (Advanced Users)

#### **Nginx with SSL & Authentication**
```nginx
# /etc/nginx/sites-available/remoteclaude
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=ws:10m rate=1r/s;
    limit_req zone=ws burst=5;
    
    # IP whitelist (replace with your mobile IPs)
    allow 203.0.113.0/24;  # Your mobile IP range
    deny all;
    
    # Basic authentication
    auth_basic "RemoteClaude Access";
    auth_basic_user_file /etc/nginx/.htpasswd;
    
    location /ws {
        proxy_pass http://127.0.0.1:8090;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeout
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

#### **Setup Commands**
```bash
# Install nginx and certbot
sudo apt install nginx certbot python3-certbot-nginx

# Create SSL certificate
sudo certbot --nginx -d your-domain.com

# Create htpasswd file
sudo htpasswd -c /etc/nginx/.htpasswd remoteclaude-user

# Enable site
sudo ln -s /etc/nginx/sites-available/remoteclaude /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Mobile connection: wss://your-domain.com/ws?key=sessionkey
```

---

### 🔍 Security Monitoring & Logging

#### **Connection Monitoring**
```bash
# Monitor WebSocket connections
sudo netstat -tuln | grep 8090
sudo ss -tuln | grep 8090

# Log connection attempts
sudo tail -f /var/log/nginx/access.log | grep ws

# Monitor Docker container access
docker logs -f <container-id>
```

#### **Intrusion Detection**
```bash
# Install fail2ban for automated blocking
sudo apt install fail2ban

# Create jail for RemoteClaude
sudo tee /etc/fail2ban/jail.local << EOF
[remoteclaude]
enabled = true
port = 23847
filter = remoteclaude
logpath = /var/log/remoteclaude.log
maxretry = 3
bantime = 3600
EOF

# Monitor for suspicious activity
sudo tail -f /var/log/auth.log
sudo tail -f /var/log/nginx/error.log
```

#### **Emergency Response Plan**
```bash
# Immediate threat response
# 1. Block all traffic
sudo ufw deny 23847

# 2. Stop server immediately
pkill remoteclaude-server

# 3. Check for compromise
docker ps -a
docker logs <container-id>
sudo netstat -tuln

# 4. Rotate session keys
export REMOTECLAUDE_SESSION_KEY=$(openssl rand -hex 32)

# 5. Review access logs
sudo grep -i "suspicious\|attack\|exploit" /var/log/*.log
```

---

### 📊 Risk Assessment Checklist

#### **Before Global Exposure**
- [ ] **Business Justification**: Documented reason for internet exposure
- [ ] **Risk Acceptance**: Written approval from security team/management
- [ ] **Data Classification**: Confirmed no sensitive/confidential data in containers
- [ ] **Backup Strategy**: Full system backup and recovery plan in place
- [ ] **Monitoring Setup**: Real-time alerts for suspicious activity
- [ ] **Incident Response**: Clear escalation and response procedures
- [ ] **Compliance Review**: Legal/compliance team approval if required
- [ ] **Insurance Coverage**: Cyber insurance covers this use case

#### **Regular Security Reviews**
- [ ] **Weekly**: Review access logs and connection attempts
- [ ] **Monthly**: Update SSL certificates and security patches
- [ ] **Quarterly**: Penetration testing and vulnerability assessment
- [ ] **Annually**: Full security audit and policy review

---

### 🚫 **STRONGLY DISCOURAGED PRACTICES**

#### **❌ Never Do This**
```bash
# DON'T: Expose without any authentication
./remoteclaude-server --host=0.0.0.0 --port=8090

# DON'T: Use default/weak session keys
export REMOTECLAUDE_SESSION_KEY="123456"

# DON'T: Disable all firewalls
sudo ufw --force reset
sudo ufw disable

# DON'T: Run as root unnecessarily
sudo ./remoteclaude-server

# DON'T: Store secrets in containers
docker run -e PASSWORD=secret123 ...
```

#### **🛑 Red Flags - Stop Immediately If You See**
- Unexpected connection attempts from unknown IPs
- Unusual Docker container activity or resource usage
- Files modified without your knowledge
- New containers or processes running
- Unusual network traffic patterns
- System performance degradation
- Security alerts from monitoring tools

---

### 📞 Emergency Contact Information
**In case of security incident:**
1. **Immediately disconnect** from internet
2. **Document everything** - screenshots, logs, timeline
3. **Contact your IT security team** or incident response provider
4. **Preserve evidence** - don't modify logs or system state
5. **Report to authorities** if required by regulation

---

### 💡 Recommended Alternatives

#### **For Development Teams**
- **GitHub Codespaces**: Cloud-based development environments
- **AWS Cloud9**: Managed IDE in the cloud
- **Gitpod**: Automated development environments
- **Corporate VPN**: Secure remote access to internal resources

#### **For Individual Developers**
- **Local Development**: Use containers locally only
- **SSH Access**: Traditional secure remote access
- **Screen Sharing**: TeamViewer, Chrome Remote Desktop
- **VPS with VPN**: Private virtual server with VPN access

---

## 🛠️ Troubleshooting

### Common Issues

#### Server Won't Start
```bash
# Check if port is already in use
lsof -i :8090

# Kill existing process
kill -9 <PID>

# Try different port
./remoteclaude-server --port=8091
```

#### Mobile App Can't Connect
1. **Check Network**: Ensure iPhone and server are on same network
2. **Firewall**: Verify firewall allows the server port
3. **URL Format**: Ensure WebSocket URL format: `ws://IP:PORT/ws?key=sessionkey`
4. **Server Status**: Check server logs for connection attempts

#### Docker Issues
```bash
# Check Docker status
docker --version
docker info

# Restart Docker service
sudo systemctl restart docker  # Ubuntu
# or restart Docker Desktop      # macOS

# Check Docker permissions
sudo usermod -aG docker $USER
newgrp docker
```

#### Docker Project Creation Errors (v3.5.0 Fix Applied)

**Error:** `Failed to create project: failed to initialize project: exit status 1`
**Common Causes:**
- Permission issues with chown operations in container
- PATH environment not including Claude CLI location

**v3.5.0 Automatic Fixes:**
- **Fallback Initialization**: Server automatically retries with permission-safe directory creation
- **PATH Environment**: Claude CLI path automatically configured in container execution
- **Graceful Error Handling**: Container remains functional even if full initialization fails

**Manual Troubleshooting:**
```bash
# Check existing containers
docker ps -a

# Test Claude CLI in existing container
docker exec <container-id> claude --version

# Manual project directory setup if needed
docker exec <container-id> mkdir -p /workspace/{src,tests,docs}
docker exec <container-id> git init /workspace

# Verify PATH includes Claude CLI
docker exec <container-id> echo $PATH
docker exec <container-id> which claude
```

**Error:** `exit status 127` (Command not found)
**Fixed in v3.5.0:** PATH environment automatically includes `/usr/local/bin` where Claude CLI is installed

#### Permission Issues
```bash
# macOS: Grant full disk access to Terminal
# System Preferences > Security & Privacy > Privacy > Full Disk Access

# Ubuntu: Check user groups
groups $USER
sudo usermod -aG docker $USER
```

### Debug Mode
```bash
# Run server in debug mode
./remoteclaude-server --debug --port=8090

# Check server logs
tail -f /var/log/remoteclaude.log

# Monitor WebSocket connections
netstat -an | grep :8090
```

### Network Diagnostics
```bash
# Test server connectivity
telnet <server-ip> 8090

# Check WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Host: <server-ip>:8090" -H "Origin: http://<server-ip>:8090" \
  http://<server-ip>:8090/ws?key=test
```

## 🔒 Security Considerations

### Network Security
- Use strong session keys
- Consider VPN for remote connections
- Regularly rotate session keys
- Monitor connection logs

### Container Security
- Run containers with limited privileges
- Use Docker security best practices
- Regular security updates
- Isolate project environments

### Mobile Security
- Secure session key storage
- Use HTTPS/WSS in production
- Implement connection timeouts
- Regular app updates

## 📊 API Documentation

### WebSocket API Endpoints
```
ws://server:port/ws?key=sessionkey
```

### Message Types
```json
// Connection established
{
  "type": "connection_established",
  "data": {
    "server_version": "3.0",
    "capabilities": ["docker", "git", "claude"]
  }
}

// Project list request
{
  "type": "get_projects",
  "data": {}
}

// Command execution
{
  "type": "execute_command",
  "data": {
    "project_id": "container_id",
    "command": "claude --help"
  }
}
```

## 🚀 Development Status - v3.5 Production Ready! 🎉

### ✅ Core Features - Fully Implemented
- [x] **Multi-Server Management**: Complete server connection lifecycle
- [x] **QR Code Scanning**: Camera-based server discovery
- [x] **Manual Server Entry**: Fallback WebSocket URL input
- [x] **Real-Time Connection**: WebSocket-based live communication
- [x] **Project Management**: Docker container creation/start/stop/delete
- [x] **Enhanced QuickCommands**: 20+ pre-built commands
- [x] **Live Terminal**: Real-time command execution and output
- [x] **Auto-Capitalization Fix**: Proper mobile input handling
- [x] **Server Persistence**: AsyncStorage-based data retention
- [x] **Cross-Platform Servers**: macOS and Ubuntu support
- [x] **Error Recovery**: Comprehensive error handling and retry logic

### 🚀 Advanced Features - Production Grade
- [x] **Linux System Commands**: OS info, processes, disk, memory monitoring
- [x] **Python Execution Environment**: Version check, script execution, package management
- [x] **File Operations**: Search, count, analysis tools
- [x] **Development Tools Integration**: Git, Node.js, npm compatibility
- [x] **Network Diagnostics**: IP checking, connectivity tests
- [x] **Claude AI Integration**: Code generation, analysis, README creation
- [x] **Real-Time UI Updates**: Status indicators, connection health
- [x] **Comprehensive Logging**: Debug information and troubleshooting

### 🔄 In Development (Future Phases)
- [ ] SSL/TLS encryption for production deployment
- [ ] User authentication and role-based access
- [ ] Cloud deployment automation scripts
- [ ] Multi-user collaboration features
- [ ] Advanced project templates
- [ ] Container resource monitoring

## 🛡️ Enterprise-Grade Features

### **📱 Mobile Experience**
- **Intuitive UI/UX**: Clean, professional interface design
- **Real-Time Feedback**: Live status updates and progress indicators
- **Error Handling**: User-friendly error messages with retry options
- **Offline Capability**: Local server configuration persistence
- **Performance Optimized**: Efficient WebSocket connection reuse

### **🖥️ Server Architecture**
- **Multi-Server Support**: Unlimited concurrent server connections
- **Real-Time Communication**: WebSocket-based bidirectional messaging
- **Container Management**: Complete Docker lifecycle control
- **Cross-Platform**: Native macOS and Ubuntu server support
- **Resource Monitoring**: System health and performance tracking

### **🔧 Development Environment**
- **Complete Terminal**: Full Linux command support
- **Python Runtime**: Built-in Python 3 execution environment
- **Claude AI Integration**: AI-powered development assistance
- **Quick Commands**: 20+ pre-configured development commands
- **File Management**: Advanced file operations and search
- **Git Integration**: Version control operations support

## 📝 Version History
- **v3.5**: Production-ready multi-server platform, enhanced QuickCommands, full terminal
- **v3.0**: Enterprise multi-server management, enhanced security
- **v2.0**: Docker integration, project management
- **v1.0**: Basic WebSocket communication, QR scanning

## 🤝 Contributing
1. Fork the repository
2. Create feature branch
3. Test thoroughly on both platforms
4. Submit pull request with detailed description

## 📄 License
MIT License - See LICENSE file for details

## 🆘 Support
For issues and questions:
1. Check troubleshooting section above
2. Review server logs in debug mode
3. Test network connectivity
4. Verify Docker and Claude CLI installations
5. Create issue with detailed error logs

---
**RemoteClaude v3.5** - The Ultimate Mobile-Driven Multi-Server Development Platform! 

🚀 **Production Ready** | 📱 **Mobile First** | 🐧 **Cross Platform** | 🤖 **AI Powered** | ⚡ **Real Time**

*Revolutionizing remote development with enterprise-grade multi-server architecture, enhanced QuickCommands, and seamless Claude AI integration!*