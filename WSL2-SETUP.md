# RemoteClaude WSL2/Ubuntu セットアップガイド

## 🐧 WSL2でのRemoteClaudeサーバー実行

WSL2上のUbuntuでRemoteClaudeサーバーを実行することが可能です。ただし、ネットワーク設定でいくつかの追加手順が必要です。

## ✅ **実行可能性**

| 機能 | WSL2対応 | 備考 |
|------|----------|------|
| RemoteClaude Server | ✅ | Linuxバイナリ使用 |
| WireGuard VPN | ✅ | Ubuntu WireGuardパッケージ |
| Web Interface | ✅ | ポート転送設定必要 |
| QR Code生成 | ✅ | qrencodeパッケージ |
| 自動起動 | ✅ | systemd使用 |

## 🚀 **セットアップ手順**

### 1. WSL2専用スクリプト実行

```bash
# WSL2/Ubuntu専用セットアップスクリプトを実行
chmod +x scripts/auto-setup-wsl2.sh
./scripts/auto-setup-wsl2.sh
```

### 2. Windowsでのポート転送設定

WSL2は仮想ネットワーク内で動作するため、外部からのアクセスにはWindowsでのポート転送が必要です。

**PowerShellを管理者として実行:**

```powershell
# WSL2のIPアドレスを取得
wsl hostname -I

# ポート転送設定 (WSL2_IPを実際のIPに置換)
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=51820 connectaddress=WSL2_IP connectport=51820
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=8090 connectaddress=WSL2_IP connectport=8090
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=8080 connectaddress=WSL2_IP connectport=8080

# Windowsファイアウォール設定
netsh advfirewall firewall add rule name="WSL2 WireGuard" dir=in action=allow protocol=UDP localport=51820
netsh advfirewall firewall add rule name="WSL2 RemoteClaude" dir=in action=allow protocol=TCP localport=8090
netsh advfirewall firewall add rule name="WSL2 Web Interface" dir=in action=allow protocol=TCP localport=8080
```

### 3. ルーター設定

外部からのVPNアクセスの場合：

```
UDP 51820 → Windows PC IP:51820
```

## 🔧 **主な違い (macOS vs WSL2/Ubuntu)**

| 項目 | macOS | WSL2/Ubuntu |
|------|--------|-------------|
| パッケージ管理 | Homebrew (`brew`) | APT (`apt`) |
| IP取得 | `ipconfig getifaddr en0` | `hostname -I` |
| 自動起動 | launchd (`launchctl`) | systemd (`systemctl`) |
| ファイアウォール | ApplicationFirewall | UFW |
| WireGuardパス | `/usr/local/bin/wg-quick` | `/usr/bin/wg-quick` |
| ネットワーク | 直接露出 | ポート転送必要 |

## 📁 **ファイル構成**

```
~/.remoteclaude/
├── wireguard/
│   ├── wg0.conf           # サーバー設定
│   ├── client.conf        # クライアント設定
│   ├── wireguard-qr.png   # WireGuardアプリ用QR
│   └── vpn-connection-qr.png # RemoteClaudeアプリ用QR
└── wsl2-network-setup.txt  # Windows設定コマンド
```

## ⚡ **主要コマンド**

### WireGuard VPN
```bash
# VPN開始
sudo wg-quick up ~/.remoteclaude/wireguard/wg0.conf

# VPN停止
sudo wg-quick down ~/.remoteclaude/wireguard/wg0.conf

# VPN状態確認
sudo wg show
```

### RemoteClaudeサーバー
```bash
# サーバー起動
./remoteclaude-server --port=8090

# Web管理画面
http://localhost:8080
```

### systemdサービス
```bash
# WireGuard自動起動
sudo systemctl enable remoteclaude-wireguard.service
sudo systemctl start remoteclaude-wireguard.service

# RemoteClaudeサーバー自動起動
sudo systemctl enable remoteclaude-server.service
sudo systemctl start remoteclaude-server.service
```

## 🐛 **トラブルシューティング**

### WSL2 IPアドレスの確認
```bash
# WSL2内部から
hostname -I

# Windowsから
wsl hostname -I
```

### ポート転送状況確認
```powershell
# Windowsで設定済みポート転送一覧
netsh interface portproxy show v4tov4
```

### WireGuardデバッグ
```bash
# WireGuard設定確認
cat ~/.remoteclaude/wireguard/wg0.conf

# カーネルモジュール確認
lsmod | grep wireguard

# ログ確認
sudo dmesg | grep -i wireguard
```

## ⚠️ **制約事項**

1. **WSL2ネットワーク制約**
   - WSL2のIPは動的に変更される可能性
   - Windowsの再起動時にポート転送再設定が必要な場合有り

2. **パフォーマンス**
   - WSL2仮想化によるわずかなオーバーヘッド
   - ネットワークパフォーマンスはネイティブLinuxより若干劣る

3. **依存関係**
   - WireGuardカーネルモジュールの可用性
   - Ubuntu/WSL2のバージョン互換性

## 🎯 **推奨環境**

- **WSL2**: Windows 10 version 2004以降 / Windows 11
- **Ubuntu**: 20.04 LTS以降
- **メモリ**: 4GB以上
- **ストレージ**: 2GB以上の空き容量

## 💡 **ベストプラクティス**

1. **定期的なバックアップ**
   ```bash
   tar -czf remoteclaude-backup.tar.gz ~/.remoteclaude/
   ```

2. **WSL2リソース管理**
   - `.wslconfig`でメモリ/CPU制限設定
   - 不要時はWSL2シャットダウン

3. **セキュリティ**
   - 定期的なUbuntuパッケージ更新
   - VPNキーの適切な管理

## 📞 **サポート**

WSL2固有の問題や設定でお困りの場合は、以下を確認してください：

1. WSL2のネットワーク設定
2. Windowsファイアウォール設定  
3. ルーターのポートフォワーディング設定
4. Ubuntu WireGuardパッケージバージョン