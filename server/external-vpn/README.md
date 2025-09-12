# 🌐 RemoteClaude External VPN Server

## 📋 概要

TP-LinkルーターのWireGuard設定と6to4 IPv6トンネルを活用した外部ネットワークからのRemoteClaude接続環境です。

### 🔧 TP-Link ルーター設定情報

| 項目 | 設定値 |
|------|--------|
| **WireGuard トンネルIP** | `10.5.5.1/32` |
| **リッスンポート** | `51820` |
| **IPv4 アドレス** | `192.168.11.108` |
| **サブネットマスク** | `255.255.255.0` |
| **デフォルトゲートウェイ** | `192.168.11.1` |
| **6to4 トンネルアドレス** | `2002:c0a8:b6c::c0a8:b6c/48` |

---

## 🚀 クイックスタート

### 1. IPv6 6to4 トンネル設定

```bash
cd /Users/suetaketakaya/1.prog/remote_manual/server/external-vpn
sudo ./setup-ipv6-tunnel.sh
```

### 2. 外部VPNサーバー起動

```bash
sudo ./start-external-server.sh
```

### 3. iPhone接続

1. **WireGuardアプリ**をApp Storeからインストール
2. 生成されたQRコードをスキャン
3. VPN接続を有効化
4. RemoteClaudeアプリで`ws://10.5.5.1:8090/ws`に接続

---

## 📱 クライアント設定

### iPhoneクライアント

**生成される設定ファイル**: `~/.remoteclaude/external-vpn/clients/client-iphone.conf`

```ini
[Interface]
PrivateKey = [自動生成]
Address = 10.5.5.10/24
DNS = 1.1.1.1, 8.8.8.8

[Peer]
PublicKey = [サーバー公開鍵]
Endpoint = 153.246.248.142:51820
AllowedIPs = 10.5.5.0/24
PersistentKeepalive = 25
```

### Android/PC クライアント

追加クライアント用の設定は手動で作成可能：

```bash
# 新しいクライアント用キー生成
wg genkey > client_private.key
wg pubkey < client_private.key > client_public.key

# サーバー設定にピア追加
sudo wg set wg0-external peer $(cat client_public.key) allowed-ips 10.5.5.11/32
```

---

## 🔧 ネットワーク設定詳細

### WireGuard サーバー設定

- **インターフェース**: `wg0-external`
- **サーバーIP**: `10.5.5.1/24`
- **クライアント範囲**: `10.5.5.10-10.5.5.254`
- **ポート**: `51820/UDP`

### IPv6 6to4 トンネル

- **外部IP**: `153.246.248.142` → **IPv6**: `2002:99f6:f88e::1/48`
- **トンネルインターフェース**: `sit0`
- **ルーティング**: `2000::/3 via ::192.168.11.1`

### RemoteClaude 接続

- **VPN内アドレス**: `ws://10.5.5.1:8090/ws`
- **Web UI**: `http://10.5.5.1:8080`
- **セッション管理**: 自動セッションキー生成

---

## 🛠️ トラブルシューティング

### WireGuard接続できない場合

```bash
# インターフェース状態確認
sudo wg show

# インターフェース再起動
sudo wg-quick down wg0-external
sudo wg-quick up ~/.remoteclaude/external-vpn/wg0-external.conf

# ファイアウォール確認
sudo iptables -L -v -n | grep wg
```

### IPv6接続できない場合

```bash
# 6to4トンネル状態確認
ip addr show sit0

# IPv6ルーティング確認
ip -6 route show

# IPv6接続テスト
ping6 -c 3 ipv6.google.com
```

### RemoteClaudeサーバー接続できない場合

```bash
# サーバープロセス確認
ps aux | grep remoteclaude

# ポート確認
netstat -an | grep 8090

# VPN経由接続テスト
nc -z 10.5.5.1 8090
```

---

## 📊 ネットワーク構成図

```
[外部端末] --Internet--> [TP-Link Router:51820/UDP] 
                            |
                            v
                      [WireGuard VPN: 10.5.5.0/24]
                            |
                            v
                   [RemoteClaude Server: 10.5.5.1:8090]
                            |
                            v
                   [Docker Containers & Host System]
```

---

## 📈 パフォーマンス最適化

### 高速化設定

```bash
# カーネルパラメータ最適化
sudo sysctl -w net.core.rmem_default=262144
sudo sysctl -w net.core.rmem_max=134217728
sudo sysctl -w net.core.wmem_default=262144
sudo sysctl -w net.core.wmem_max=134217728

# WireGuard最適化
sudo sysctl -w net.ipv4.udp_mem="102400 873800 16777216"
```

### 接続監視

```bash
# リアルタイム接続監視
watch -n 1 'sudo wg show; echo "---"; ss -tuln | grep 8090'
```

---

## 🔐 セキュリティ考慮事項

1. **定期的なキー更新**: 月1回の頻度でWireGuardキーを更新
2. **ファイアウォール設定**: 必要最小限のポートのみ開放
3. **ログ監視**: 不正接続試行の監視とアラート
4. **バックアップ**: 設定ファイルの定期バックアップ

---

## 📞 サポート

問題が発生した場合は以下の情報を含めてお問い合わせください：

1. エラーメッセージ
2. `sudo wg show` の出力
3. `ip addr show` の出力
4. 使用している端末とOS情報

---

**作成日**: 2025-09-11  
**バージョン**: v1.0  
**対応環境**: TP-Link Router + WireGuard + IPv6 6to4