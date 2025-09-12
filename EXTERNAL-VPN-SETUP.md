# 🌐 外部ネットワークVPN接続設定ガイド

## 問題の概要

**現在の状況**: iPhone側でWireGuard VPNに接続後、RemoteClaudeアプリで `ws://10.0.0.1:8090/ws` に接続しようとしても失敗する

**原因**: 
1. WireGuard設定の `AllowedIPs` が `/32` に制限されている
2. ルーターのポートフォワーディング未設定
3. VPNトラフィックのルーティング不備

## 🔧 修正方法

### 方法1: 自動修正スクリプト実行

```bash
cd server
./fix-external-vpn.sh
```

### 方法2: 手動修正

#### 1. WireGuard設定修正

**サーバー設定** (`~/.remoteclaude/wireguard/wg0.conf`):
```ini
[Interface]
PrivateKey = <SERVER_PRIVATE_KEY>
Address = 10.0.0.1/24
ListenPort = 51820
PostUp = sysctl -w net.inet.ip.forwarding=1
PostDown = sysctl -w net.inet.ip.forwarding=0

[Peer]
PublicKey = <CLIENT_PUBLIC_KEY>
AllowedIPs = 10.0.0.0/24  # ← 10.0.0.2/32 から変更
PersistentKeepalive = 25
```

**クライアント設定** (`~/.remoteclaude/wireguard/client.conf`):
```ini
[Interface]
PrivateKey = <CLIENT_PRIVATE_KEY>
Address = 10.0.0.2/24     # ← /32 から /24 に変更
DNS = 8.8.8.8, 8.8.4.4

[Peer]
PublicKey = <SERVER_PUBLIC_KEY>
Endpoint = <YOUR_PUBLIC_IP>:51820
AllowedIPs = 10.0.0.0/24  # ← VPN網内のみ
PersistentKeepalive = 25
```

#### 2. ルーター設定

**必須**: ルーター管理画面でポートフォワーディング設定

| 項目 | 設定値 |
|------|--------|
| プロトコル | UDP |
| 外部ポート | 51820 |
| 内部IP | `<macOSのローカルIP>` |
| 内部ポート | 51820 |

#### 3. ファイアウォール設定

**macOS**:
```bash
# RemoteClaudeサーバーをファイアウォール例外に追加
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add ./remoteclaude-server-v3.6.1-final-vpn
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock ./remoteclaude-server-v3.6.1-final-vpn
```

**ルーター**: UDP 51820ポートを開放

## 📱 iPhone設定手順

### 1. WireGuard設定更新

1. **既存の設定を削除**: WireGuardアプリで古い設定を削除
2. **新しいQRコード読み取り**: 修正後の設定でQRコード再生成
3. **VPN接続**: WireGuardアプリでVPNをONにする

### 2. 接続確認

1. **WireGuard接続確認**: iPhoneの設定でVPN接続がアクティブか確認
2. **VPN IP確認**: `10.0.0.x` のIPが割り当てられているか確認
3. **RemoteClaudeアプリ接続**: `ws://10.0.0.1:8090/ws?key=SESSION_KEY`

## 🔍 トラブルシューティング

### 診断スクリプト実行

```bash
# 詳細診断
./diagnose-external-vpn.sh

# VPN接続テスト
./test-vpn-connection.sh
```

### よくある問題と解決法

#### 1. VPN接続はできるがRemoteClaudeに接続できない

**原因**: サーバーが10.0.0.1にバインドされていない

**解決**: 
```bash
# サーバー再起動（VPNモード）
./remoteclaude-server-v3.6.1-final-vpn
```

#### 2. WireGuard接続自体ができない

**原因**: ルーターのポートフォワーディング未設定

**解決**: 
- ルーター管理画面でUDP 51820をポートフォワーディング
- パブリックIPが変わっていないか確認

#### 3. 間欠的に接続が切れる

**原因**: PersistentKeepalive設定またはNAT問題

**解決**: 
- クライアント設定で `PersistentKeepalive = 25` を確認
- ルーターのNATセッション時間を延長

## 🌐 ネットワーク構成図

```
[iPhone (外部)] 
    ↓ (4G/5G/WiFi)
[インターネット]
    ↓ (UDP 51820)
[ルーター] → ポートフォワーディング
    ↓ (UDP 51820)
[macOS Server] 
    ↓ (WireGuard VPN: 10.0.0.1)
[RemoteClaude Server] (ws://10.0.0.1:8090)
```

## ✅ 確認チェックリスト

- [ ] WireGuard設定でAllowedIPs = 10.0.0.0/24
- [ ] クライアント設定でAddress = 10.0.0.2/24  
- [ ] ルーターでUDP 51820ポートフォワーディング設定
- [ ] パブリックIPが設定に反映されている
- [ ] macOSファイアウォールでRemoteClaudeサーバーが許可
- [ ] iPhone WireGuardで新しい設定を使用
- [ ] RemoteClaudeサーバーがVPNモードで起動
- [ ] Web UI (http://LOCAL_IP:8080) でVPN QRコード確認可能

## 🔒 セキュリティ考慮事項

- WireGuardは強力な暗号化を提供
- AllowedIPs を 10.0.0.0/24 に制限してVPN内のみアクセス
- 不要な時はVPN接続を切断
- 定期的にWireGuardキーの更新を検討

---

**修正完了後の接続フロー**:
1. iPhone → WireGuard VPN接続 (10.0.0.2 IP取得)
2. RemoteClaudeアプリ → `ws://10.0.0.1:8090/ws?key=SESSION_KEY`
3. macOSサーバー → 10.0.0.1:8090でリッスン
4. 正常接続完了 🎉