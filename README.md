# RemoteClaude v2.0
**Mobile-Driven Docker Claude Development Platform**

## Overview
iPhone アプリから macOS + Docker環境の Claude Code CLI をリモート操作し、プロジェクト単位での開発環境管理とGit連携を実現する次世代モバイル開発プラットフォーム。

## Architecture
```
iPhone App (Expo) ↔ macOS Go Server ↔ Docker Containers (Ubuntu + Claude CLI)
```

## Project Structure
```
├── server/                     # Go server for macOS
├── RemoteClaudeApp/           # iPhone Expo app
├── projects/                   # Docker project workspaces
├── configs/                    # Configuration files
├── docker/                     # Docker images and compose files
└── README.md
```

## Quick Start

### macOS Server Setup
```bash
cd server
go mod init remoteclaude-server
go run main.go
```

### iPhone App Setup
```bash
cd RemoteClaudeApp
npm install
npx expo start
```

## Development Status - MVP Complete! 🎉
- [x] Project structure setup
- [x] Basic WebSocket server with QR generation
- [x] iPhone app with QR scanner
- [x] WebSocket communication between app and server  
- [x] Claude CLI integration with real-time output
- [x] Project management interface
- [ ] Docker container management (Phase 2)
- [ ] Git integration (Phase 2)
- [ ] Security restrictions (Phase 2)

## Tech Stack
- **Server**: Go + WebSocket + Docker API
- **Mobile**: React Native + Expo + TypeScript
- **Container**: Ubuntu 22.04 + Claude CLI
- **Storage**: Git repositories per project