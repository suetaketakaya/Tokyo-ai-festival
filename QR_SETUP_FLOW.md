# RemoteClaude QRコードセットアップフロー

**最終更新**: 2025-10-21
**対象**: RemoteClaude v4.0
**目標**: QRコードをかざすだけで環境セットアップ完了

---

## 🎯 ユーザー体験の設計思想

### 理想的なセットアップフロー

```
1. サーバー起動 (ワンコマンド)
   ↓
2. Claude API キー設定 (初回のみ)
   ↓
3. QRコード表示
   ↓
4. iPhoneでQRコードスキャン
   ↓
5. ✅ セットアップ完了！すぐに使える
```

**所要時間**: 30秒 (初回1分)

---

## 📱 現在の実装状況

### ✅ 実装済み機能

#### 1. サーバー側
```go
// server/main.go:66-110

func NewServer(port string) *Server {
    // 1. ランダムセッションキー生成
    key := make([]byte, 16)
    rand.Read(key)
    secretKey := hex.EncodeToString(key)

    // 2. Docker Manager初期化
    dockerManager := NewDockerManager("./projects")

    // 3. Config Manager初期化
    configManager := NewConfigManager()

    // 4. 各種コンポーネント自動初期化
    InitializeContainerContextManager(dockerManager)
    InitializeMatplotlibDetector(dockerManager)
    InitializeEnhancedMatplotlibDetector(dockerManager, workingDir)
    InitializeClaudeCodeCLIAnalyzer()
    InitializeProjectManagementHandler(dockerManager)
    InitializeButtonDatabase(buttonDBDir)

    return &Server{
        Host:          "0.0.0.0",
        Port:          port,
        SecretKey:     secretKey,
        // ...
    }
}
```

#### 2. QRコード生成・表示
```go
// server/main.go:230-280

func (s *Server) displayQRCode() {
    // 1. 接続URL生成
    connectionURL := fmt.Sprintf("remoteclaude://%s:%s?key=%s",
        s.Host, s.Port, s.SecretKey)

    // 2. QRコード生成
    qr, _ := qrcode.New(connectionURL, qrcode.Medium)

    // 3. ターミナルに表示
    fmt.Println(qr.ToSmallString(false))

    // 4. 接続情報表示
    fmt.Printf("\n📱 iPhone App Connection URL:\n%s\n", connectionURL)
    fmt.Printf("\n🔐 Session Key: %s\n", s.SecretKey)
}
```

#### 3. iPhone側QRスキャン
```typescript
// RemoteClaudeApp/src/screens/QRScanScreen.tsx:50-100

const handleBarCodeScanned = ({ data }: { data: string }) => {
    // 1. QRコードデータパース
    const url = new URL(data);
    const host = url.hostname;
    const port = url.port || '8090';
    const key = url.searchParams.get('key');

    // 2. 接続情報保存
    await AsyncStorage.setItem('serverUrl', `ws://${host}:${port}`);
    await AsyncStorage.setItem('sessionKey', key);

    // 3. WebSocket接続
    const ws = new WebSocket(`ws://${host}:${port}/ws?session_key=${key}`);

    // 4. 接続成功 → プロジェクト一覧へ
    ws.onopen = () => {
        navigation.navigate('ProjectList', {
            serverUrl: `ws://${host}:${port}`,
            sessionKey: key
        });
    };
};
```

### ✅ 自動セットアップ済み項目

| 項目 | 自動化 | 実装場所 |
|------|--------|----------|
| **セッションキー生成** | ✅ 自動 | `NewServer()` |
| **Docker Manager** | ✅ 自動 | `NewDockerManager()` |
| **Config Manager** | ✅ 自動 | `NewConfigManager()` |
| **コンテナコンテキスト** | ✅ 自動 | `InitializeContainerContextManager()` |
| **Matplotlibデテクター** | ✅ 自動 | `InitializeMatplotlibDetector()` |
| **W&B統合** | ✅ 自動 | `InitializeEnhancedMatplotlibDetector()` |
| **Claude CLI分析器** | ✅ 自動 | `InitializeClaudeCodeCLIAnalyzer()` |
| **プロジェクト管理** | ✅ 自動 | `InitializeProjectManagementHandler()` |
| **ボタンDB** | ✅ 自動 | `InitializeButtonDatabase()` |
| **QRコード生成** | ✅ 自動 | `displayQRCode()` |
| **WebSocket接続** | ✅ 自動 | iPhone App |

---

## 🚀 さらなる改善: ワンコマンドセットアップ

### 目標UX

```bash
# 1. サーバー起動 (すべて自動)
./remoteclaude-server --setup

# 出力例:
🚀 RemoteClaude Server v4.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Docker確認完了
✅ Claude API キー確認完了
✅ プロジェクトディレクトリ作成完了
✅ 各種コンポーネント初期化完了

📱 iPhoneでこのQRコードをスキャンしてください:

  ██████████████  ██  ██  ██████████████
  ██          ██  ██████  ██          ██
  ██  ██████  ██  ██  ██  ██  ██████  ██
  ██  ██████  ██  ██████  ██  ██████  ██
  ██  ██████  ██    ██    ██  ██████  ██
  ██          ██  ██  ██  ██          ██
  ██████████████  ██  ██  ██████████████

🌐 Server URL: ws://192.168.1.100:8090
🔐 Session Key: a1b2c3d4e5f6g7h8
🔥 Status: Ready - Waiting for connection...
```

### 実装計画

#### 1. セットアップスクリプト作成
```bash
# setup-remoteclaude.sh

#!/bin/bash

echo "🚀 RemoteClaude Server セットアップ開始..."

# 1. Docker確認
if ! docker info > /dev/null 2>&1; then
    echo "❌ Dockerが起動していません。起動しています..."
    open -a Docker
    sleep 10
fi
echo "✅ Docker確認完了"

# 2. Claude API キー確認
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "📝 Claude API キーを入力してください:"
    read -s ANTHROPIC_API_KEY
    export ANTHROPIC_API_KEY
    echo "export ANTHROPIC_API_KEY='$ANTHROPIC_API_KEY'" >> ~/.zshrc
fi
echo "✅ Claude API キー確認完了"

# 3. プロジェクトディレクトリ作成
mkdir -p ./projects
echo "✅ プロジェクトディレクトリ作成完了"

# 4. サーバー起動
echo ""
echo "🔥 サーバー起動中..."
./remoteclaude-server-matplotlib-mgmt --port=8090
```

#### 2. サーバー起動時の自動確認
```go
// server/main.go 追加

func (s *Server) validateSetup() error {
    fmt.Println("🚀 RemoteClaude Server v4.0")
    fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    // 1. Docker確認
    fmt.Print("Checking Docker... ")
    if err := s.dockerManager.CheckDockerRunning(); err != nil {
        fmt.Println("❌ Failed")
        return fmt.Errorf("Docker is not running. Please start Docker first.")
    }
    fmt.Println("✅ OK")

    // 2. Claude API キー確認
    fmt.Print("Checking Claude API Key... ")
    if os.Getenv("ANTHROPIC_API_KEY") == "" {
        fmt.Println("❌ Failed")
        return fmt.Errorf("ANTHROPIC_API_KEY is not set. Please set it first.")
    }
    fmt.Println("✅ OK")

    // 3. プロジェクトディレクトリ確認
    fmt.Print("Checking Project Directory... ")
    if err := os.MkdirAll("./projects", 0755); err != nil {
        fmt.Println("❌ Failed")
        return err
    }
    fmt.Println("✅ OK")

    // 4. 各種コンポーネント初期化
    fmt.Print("Initializing Components... ")
    // (既存の初期化処理)
    fmt.Println("✅ OK")

    fmt.Println("")
    return nil
}
```

#### 3. QRコード表示の改善
```go
// server/main.go 改善

func (s *Server) displayEnhancedQRCode() {
    // 1. ローカルIPアドレス取得
    localIP := s.getLocalIPAddress()

    // 2. 接続URL生成 (ローカルIPを使用)
    connectionURL := fmt.Sprintf("remoteclaude://%s:%s?key=%s",
        localIP, s.Port, s.SecretKey)

    // 3. QRコード生成・表示
    qr, _ := qrcode.New(connectionURL, qrcode.Medium)

    fmt.Println("📱 iPhoneでこのQRコードをスキャンしてください:")
    fmt.Println("")
    fmt.Println(qr.ToSmallString(false))
    fmt.Println("")

    // 4. 詳細情報表示
    fmt.Printf("🌐 Server URL: ws://%s:%s\n", localIP, s.Port)
    fmt.Printf("🔐 Session Key: %s\n", s.SecretKey)
    fmt.Printf("🔥 Status: Ready - Waiting for connection...\n")
    fmt.Println("")
    fmt.Println("💡 Tip: QRコードスキャン後、すぐに使用できます!")
}

func (s *Server) getLocalIPAddress() string {
    addrs, err := net.InterfaceAddrs()
    if err != nil {
        return "localhost"
    }

    for _, addr := range addrs {
        if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
            if ipnet.IP.To4() != nil {
                return ipnet.IP.String()
            }
        }
    }
    return "localhost"
}
```

---

## 📱 iPhone App側の改善

### 1. QRスキャン画面の改善
```typescript
// RemoteClaudeApp/src/screens/QRScanScreen.tsx 改善

export default function QRScanScreen() {
    const [scanned, setScanned] = useState(false);
    const [connecting, setConnecting] = useState(false);

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        if (scanned) return;
        setScanned(true);
        setConnecting(true);

        try {
            // 1. URLパース
            const url = new URL(data);
            const host = url.hostname;
            const port = url.port || '8090';
            const key = url.searchParams.get('key');

            // 2. 接続テスト
            const serverUrl = `ws://${host}:${port}`;
            const ws = new WebSocket(`${serverUrl}/ws?session_key=${key}`);

            ws.onopen = async () => {
                // 3. 接続情報保存
                await AsyncStorage.setItem('serverUrl', serverUrl);
                await AsyncStorage.setItem('sessionKey', key);

                // 4. 成功アニメーション
                showSuccessAnimation();

                // 5. プロジェクト一覧へ
                setTimeout(() => {
                    navigation.navigate('ProjectList', {
                        connectionUrl: serverUrl,
                        sessionKey: key
                    });
                }, 1000);
            };

            ws.onerror = () => {
                Alert.alert('接続エラー', 'サーバーに接続できませんでした');
                setScanned(false);
                setConnecting(false);
            };

        } catch (error) {
            Alert.alert('QRコードエラー', '無効なQRコードです');
            setScanned(false);
            setConnecting(false);
        }
    };

    return (
        <View style={styles.container}>
            <Camera
                style={styles.camera}
                onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                barCodeScannerSettings={{
                    barCodeTypes: [BarCodeScanner.Constants.BarCodeType.qr],
                }}
            >
                {/* スキャンエリア表示 */}
                <View style={styles.scanArea}>
                    <Text style={styles.instruction}>
                        QRコードをスキャンしてください
                    </Text>

                    {connecting && (
                        <View style={styles.connectingOverlay}>
                            <ActivityIndicator size="large" color="#007AFF" />
                            <Text style={styles.connectingText}>
                                接続中...
                            </Text>
                        </View>
                    )}
                </View>
            </Camera>
        </View>
    );
}
```

### 2. 自動再接続機能
```typescript
// RemoteClaudeApp/src/services/WebSocketService.ts

export class WebSocketService {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    async connect(serverUrl: string, sessionKey: string) {
        try {
            this.ws = new WebSocket(`${serverUrl}/ws?session_key=${sessionKey}`);

            this.ws.onopen = () => {
                console.log('✅ WebSocket接続成功');
                this.reconnectAttempts = 0;
            };

            this.ws.onclose = () => {
                console.log('❌ WebSocket接続切断');
                this.handleReconnect(serverUrl, sessionKey);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocketエラー:', error);
            };

        } catch (error) {
            console.error('接続エラー:', error);
            this.handleReconnect(serverUrl, sessionKey);
        }
    }

    private handleReconnect(serverUrl: string, sessionKey: string) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 再接続試行 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

            setTimeout(() => {
                this.connect(serverUrl, sessionKey);
            }, 2000 * this.reconnectAttempts);
        } else {
            console.error('❌ 再接続失敗: 最大試行回数に達しました');
        }
    }
}
```

---

## 🎯 完全自動セットアップフロー (最終形)

### ユーザー体験

```
【サーバー側】
$ ./remoteclaude-server --setup

🚀 RemoteClaude Server v4.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Checking Docker...                  ✅ OK
Checking Claude API Key...          ✅ OK
Checking Project Directory...       ✅ OK
Initializing Components...          ✅ OK

📱 iPhoneでこのQRコードをスキャンしてください:

  ██████████████  ██  ██  ██████████████
  ██          ██  ██████  ██          ██
  ██  ██████  ██  ██  ██  ██  ██████  ██
  (QRコード表示)

🌐 Server URL: ws://192.168.1.100:8090
🔐 Session Key: a1b2c3d4e5f6g7h8
🔥 Status: Ready - Waiting for connection...

💡 Tip: QRコードスキャン後、すぐに使用できます!


【iPhone側】
1. RemoteClaude App起動
2. "サーバーに接続" タップ
3. QRコードスキャン
4. ✅ 接続成功！
5. プロジェクト一覧表示
6. すぐに使用可能！
```

**所要時間**: 30秒

---

## 📋 実装タスク

### Phase 1: 基本セットアップフロー改善

- [ ] **setup-remoteclaude.sh 作成**
  - Docker自動起動
  - API キー設定支援
  - プロジェクトディレクトリ作成
  - 推定時間: 1時間

- [ ] **サーバー起動時バリデーション追加**
  - Docker確認
  - API キー確認
  - ディレクトリ確認
  - 推定時間: 1時間

- [ ] **QRコード表示改善**
  - ローカルIP自動取得
  - 詳細情報表示
  - ユーザーフレンドリーなメッセージ
  - 推定時間: 30分

### Phase 2: iPhone App改善

- [ ] **QRスキャン画面改善**
  - 接続中アニメーション
  - 成功フィードバック
  - エラーハンドリング
  - 推定時間: 2時間

- [ ] **自動再接続機能実装**
  - WebSocket切断時の自動再接続
  - 再接続試行回数制限
  - ユーザーへの通知
  - 推定時間: 1.5時間

### Phase 3: ドキュメント整備

- [ ] **セットアップガイド作成**
  - 初回セットアップ手順
  - トラブルシューティング
  - FAQ
  - 推定時間: 2時間

---

## 💡 使用シナリオ

### シナリオ1: 初回セットアップ (1分)

```
1. サーバーダウンロード (10秒)
2. setup-remoteclaude.sh 実行 (20秒)
   - Docker起動確認
   - API キー入力
3. QRコード表示 (5秒)
4. iPhone App起動 (5秒)
5. QRスキャン (5秒)
6. ✅ セットアップ完了！ (5秒)
7. すぐにコマンド実行可能

Total: 約1分
```

### シナリオ2: 2回目以降 (30秒)

```
1. サーバー起動 (5秒)
   $ ./remoteclaude-server
2. QRコード表示 (自動)
3. iPhone App起動 (5秒)
4. 自動再接続 (5秒)
   - 前回の接続情報使用
5. ✅ すぐに使用可能！

Total: 約15秒 (QRスキャン不要)
```

### シナリオ3: 別のPCで使用 (30秒)

```
1. サーバー起動 (5秒)
2. QRコード表示 (自動)
3. iPhone App起動 (5秒)
4. QRスキャン (5秒)
5. ✅ 新しいサーバーに接続完了！

Total: 約20秒
```

---

## 🎯 成功指標

### ユーザビリティ
- [ ] 初回セットアップ時間: 1分以内
- [ ] 2回目以降接続時間: 15秒以内
- [ ] QRスキャン成功率: 95%以上
- [ ] 自動再接続成功率: 90%以上

### 信頼性
- [ ] WebSocket接続安定性: 99%以上
- [ ] セッションキー衝突率: 0%
- [ ] Docker起動確認成功率: 100%

### ユーザー満足度
- [ ] セットアップの簡単さ: 4.5/5.0以上
- [ ] 接続の安定性: 4.5/5.0以上
- [ ] 全体的な満足度: 4.0/5.0以上

---

**作成日**: 2025-10-21
**最終更新**: 2025-10-21
**ステータス**: 設計完了 - 実装準備中
