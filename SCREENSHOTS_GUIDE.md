# ClaudeOps Remote iOS App - スクリーンショット作成ガイド

## 📱 App Store用スクリーンショット完全ガイド

**アプリ名:** ClaudeOps Remote

### 1. **メインスクリーン - サーバー管理画面**
```
画面内容:
• 「🖥️ Server Connections」ヘッダー
• 複数のサーバーカード表示
• 接続状態インジケーター（🟢🟡⚪）
• 「📱 Scan QR Code」「✏️ Add Manually」ボタン
• サーバー統計表示 ("3 servers • 2 connected")

撮影タイミング: 
• 2-3個のサーバーが登録された状態
• 1つは接続済み（🟢）、1つは未接続（⚪）状態
• クリーンな状態（エラー表示なし）

重要なUI要素:
✅ アプリ名「ClaudeOps Remote」
✅ サーバー接続状態の視覚的区別
✅ 直感的なボタンデザイン
✅ プロフェッショナルな配色
```

### 2. **QRスキャン画面 - カメラ機能**
```
画面内容:
• QRコードスキャナーのカメラビュー
• スキャンフレーム（四角いオーバーレイ）
• 「QRコードをスキャンしてサーバーに接続」説明テキスト
• キャンセルボタン
• フラッシュ切り替えボタン（あれば）

撮影タイミング:
• カメラが起動し、スキャンフレームが表示された瞬間
• QRコードは画面中央に配置（実際のClaudeOps RemoteサーバーQRコード）
• スキャン待機状態

重要な要素:
✅ カメラ権限の適切な使用
✅ ユーザーフレンドリーなUI
✅ 機能の明確な説明
✅ アクセシビリティ配慮
```

### 3. **プロジェクト管理画面 - Docker統合**
```
画面内容:
• 「ClaudeOps Remote Projects」ヘッダー
• 接続情報表示（🟢 Connected • Session: ab12cd34...）
• 「+ Create New Project」ボタン
• プロジェクトカード表示（2-3個）
  - プロジェクト名、状態（🟢Running, ⚫Stopped）
  - 最終更新日時
  - アクション ボタン（▶️ Start, ⏹️ Stop, 🗑️ Delete）

撮影タイミング:
• サーバー接続済み状態
• 複数プロジェクトが存在する状態
• 異なる状態のプロジェクトを表示（Running/Stopped）

重要な要素:
✅ Docker統合の分かりやすい表現
✅ プロジェクト状態の視覚的区別
✅ プロフェッショナルなアクションボタン
✅ 情報の整理された表示
```

### 4. **開発環境 - リアルタイムターミナル**
```
画面内容:
• プロジェクト名 ヘッダー
• QuickCommandsセクション
  - 「🐧 Linux System」
  - 「🐍 Python」  
  - 「🔍 File Operations」
  - 「🤖 Claude AI」などのカテゴリボタン
• ターミナル出力エリア
  - リアルタイムコマンド実行結果
  - 色分けされた出力（成功=緑、エラー=赤）
• コマンド入力フィールド

撮影タイミング:
• プロジェクトに接続済み
• いくつかのコマンドが実行済み
• ターミナルに出力が表示されている状態

サンプルコマンド実行履歴:
```
$ ls -la
drwxr-xr-x   8 user  staff   256 Sep  6 15:30 .
drwxr-xr-x  15 user  staff   480 Sep  6 15:25 ..
-rw-r--r--   1 user  staff  1234 Sep  6 15:30 main.py

$ python3 --version  
Python 3.9.18

$ echo "Hello ClaudeOps Remote!"
Hello ClaudeOps Remote!
```

重要な要素:
✅ QuickCommandsの豊富さ
✅ リアルタイム性の表現
✅ 開発者向けの機能性
✅ ユーザビリティの高さ
```

### 5. **Claude AI統合 - AI支援開発**
```
画面内容:
• 「🤖 Claude AI」セクション展開状態
• Claude AI コマンドボタン:
  - "📝 Create README"
  - "🔍 Analyze Code"  
  - "🐍 Create Python Script"
  - "📊 Generate Report"
• ターミナルにClaude AI の出力を表示
• AI生成されたコンテンツの例

撮影タイミング:
• Claude AIコマンドを実行後
• AIからのレスポンスがターミナルに表示された状態
• 実際に有用なコンテンツが生成されている

サンプルClaude出力:
```
🤖 Claude AI: README.md を生成中...

# Project Documentation
This is a sample Python project demonstrating...

## Features
- Data processing capabilities
- RESTful API endpoints
- Comprehensive error handling

## Installation
```bash
pip install -r requirements.txt
python main.py
```

✅ README.md created successfully!
```

重要な要素:
✅ Claude AI の実用性
✅ 開発支援の具体例
✅ AIとの自然な統合
✅ 生産性向上の実感
```

---

## 🎨 デザインガイドライン

### 色彩・ブランディング
```
プライマリーカラー: #007AFF (iOS Blue)
セカンダリーカラー: #28a745 (Success Green)
背景色: #f5f5f5 (Light Gray)
テキストカラー: #333333 (Dark Gray)
エラーカラー: #dc3545 (Red)
```

### UI要素の一貫性
```
✅ iOS Human Interface Guidelines 準拠
✅ San Francisco フォント使用
✅ 適切な余白・パディング
✅ タッチしやすいボタンサイズ (44pt以上)
✅ アクセシビリティ対応
```

### 撮影時の注意点
```
✅ バッテリー残量: 100%または非表示
✅ 時刻: 9:41 AM (Appleの慣習)
✅ 電波状況: フルバー
✅ Wi-Fi: 接続済み表示
✅ 通知: なし（Do Not Disturb推奨）
✅ 画面の明度: 最大
```

---

## 🛠️ スクリーンショット作成手順

### 1. 準備作業
```bash
# デバイス設定
1. iPhone/iPad の画面を最大輝度に設定
2. Do Not Disturb モードを有効化
3. 時刻を 9:41 に調整（可能であれば）
4. バッテリー残量を100%にするか、ステータスバーを非表示に

# アプリ準備  
1. ClaudeOps Remote アプリの最新ビルドをインストール
2. テスト用サーバーを起動（複数サーバー推奨）
3. サンプルプロジェクトを2-3個作成
4. 各種コマンドを事前実行してターミナル履歴を準備
```

### 2. 撮影実行
```bash
# iOS スクリーンショット操作
iPhone X 以降: 音量上ボタン + サイドボタン 同時押し
iPhone 8 以前: ホームボタン + サイドボタン 同時押し
iPad: トップボタン + 音量上ボタン 同時押し

# 保存場所確認
写真アプリ > スクリーンショット アルバム
```

### 3. 後処理・最適化
```bash
# 推奨ツール
- Figma (無料) - リサイズ・注釈追加
- Sketch (有料) - プロ仕様デザインツール  
- Canva (無料/有料) - 簡単編集
- Adobe Photoshop (有料) - 高度な編集

# 最適化作業
1. 各デバイスサイズにリサイズ
2. 色調・明度の統一
3. 不要な要素の除去
4. テキスト読みやすさの確認
5. ファイルサイズ最適化（8MB以下）
```

---

## 📋 チェックリスト

### 撮影完了チェック
- [ ] **5枚のスクリーンショット** すべて撮影完了
- [ ] **3つのデバイスサイズ** にそれぞれ対応
- [ ] **画質確認** - 文字が鮮明に読める
- [ ] **UI一貫性** - デザインが統一されている
- [ ] **機能性表現** - アプリの価値が伝わる
- [ ] **エラー要素なし** - クラッシュやエラー表示がない

### App Store Connect アップロード前
- [ ] **ファイル形式**: PNG または JPEG
- [ ] **ファイルサイズ**: 各8MB以下
- [ ] **解像度確認**: 指定サイズに正確に合致
- [ ] **色空間**: sRGB または P3
- [ ] **ファイル名**: 分かりやすい命名
- [ ] **バックアップ**: 元ファイルの保存

### 品質確認
- [ ] **文字の可読性**: ズームなしで読める
- [ ] **色彩バランス**: 統一された見た目
- [ ] **ブランド一貫性**: ClaudeOps Remote らしさ
- [ ] **競合差別化**: 独自性が表現されている
- [ ] **ターゲット訴求**: 開発者向けであることが明確

---

## 📊 App Store 掲載時の順序

### 推奨スクリーンショット順序
```
1位: 04_terminal_development.png
理由: 最も重要なコア機能（リアルタイム開発環境）

2位: 01_server_list.png  
理由: アプリの全体像とマルチサーバー管理機能

3位: 05_claude_ai_integration.png
理由: Claude AI統合という差別化ポイント

4位: 03_project_list.png
理由: Docker統合とプロジェクト管理機能

5位: 02_qr_scanner.png
理由: 接続の簡単さを表現（サポート機能）
```

### 各スクリーンショットのキャッチコピー（オプション）
```
Screenshot 1: "リアルタイム開発環境をiPhoneで操作"
Screenshot 2: "複数サーバーを統合管理"  
Screenshot 3: "Claude AIがコード生成を支援"
Screenshot 4: "Dockerプロジェクトを簡単管理"
Screenshot 5: "QRコードで瞬時に接続"
```

---

## 🎬 App Preview動画（オプション）

### 動画要件
```
長さ: 15-30秒
解像度: スクリーンショットと同じ
フレームレート: 30fps
フォーマット: MOV または MP4
ファイルサイズ: 500MB以下
```

### 推奨構成（30秒）
```
0-5秒: アプリアイコンとタイトル表示
5-10秒: QRコードスキャンでの接続デモ
10-20秒: ターミナルでのコマンド実行（早送り）
20-25秒: Claude AIでのコード生成
25-30秒: アプリ名と「今すぐダウンロード」
```

---

## 📱 最終確認・提出

### App Store Connect アップロード
1. **App Store Connect** にログイン
2. **アプリページ** > **App Store** セクション
3. **スクリーンショット** セクション
4. **デバイスサイズ別** にアップロード
5. **順序調整** で最適な順序に設定
6. **プレビュー** で表示確認
7. **保存** して完了

### 最終品質チェック
- ✅ **全サイズ対応**: iPhone 3サイズ + iPad 2サイズ
- ✅ **アプリ機能網羅**: 5つの主要機能すべて表現
- ✅ **ユーザー訴求力**: 開発者にとっての価値が明確
- ✅ **技術的品質**: 解像度・色彩・ファイルサイズ適切
- ✅ **ブランド統一**: ClaudeOps Remote らしい一貫したデザイン

---

**ClaudeOps Remote v3.5.0 - App Store向け Visual Assets Ready!**

📸 **Professional Screenshots** | 🎨 **Brand Consistent** | 📱 **Multi-Device** | ⭐ **Store Optimized**

---

*このスクリーンショットガイドに従って作成された画像は、App Storeでの最大限の訴求力を発揮し、ClaudeOps Remoteの価値を効果的に伝達します。*