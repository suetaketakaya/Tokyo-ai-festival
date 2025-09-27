# サーバー最適化提案

## 🐌 現在の問題点

1. **Claude API レスポンス時間**: 約2分11秒
2. **重複するファイル検索**: 同じfindコマンドが複数回実行
3. **プレビュー検索の非効率性**: 多数のnetstat/findコマンド

## 🚀 サーバー側改善案

### 1. Claude API最適化
```javascript
// ストリーミングレスポンスの実装
// 部分的な結果を随時送信
websocket.send({
  type: "claude_progress",
  data: {
    progress: 50,
    stage: "コード生成中...",
    partial_output: "部分的な結果"
  }
});
```

### 2. プレビュー検索のキャッシュ化
```javascript
// ファイル検索結果をキャッシュ
const previewCache = new Map();
const cacheTimeout = 30000; // 30秒

// 重複検索の防止
if (previewCache.has(projectId)) {
  return previewCache.get(projectId);
}
```

### 3. バックグラウンド処理の改善
```javascript
// 非同期でプレビューリストを更新
setTimeout(() => {
  updatePreviewListInBackground(projectId);
}, 1000);
```

### 4. Claude API並列処理
```javascript
// 複数のAPIリクエストを並列実行
Promise.all([
  claudeAPI.generateCode(prompt),
  scanForPreviews(projectId),
  checkRunningServices(projectId)
]);
```

## 📊 期待される改善効果

- **レスポンス時間**: 2分 → 30-60秒
- **ユーザー体験**: リアルタイムな進捗表示
- **サーバー負荷**: 重複処理の削減
- **キャンセル機能**: 長時間処理の中断可能

## 🔧 実装優先度

1. **高**: プログレス表示の改善 (クライアント側完了)
2. **高**: Claude APIストリーミング
3. **中**: プレビュー検索キャッシュ
4. **低**: 並列処理最適化