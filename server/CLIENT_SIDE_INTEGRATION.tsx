// CLIENT-SIDE INTEGRATION PATCH
// 段階的実行フロー用のクライアント側統合パッチ

/*
=== DevelopmentScreen.tsx の更新 ===

1. 段階的進捗表示の状態管理を追加:
*/

// Add these state variables
const [executionStage, setExecutionStage] = useState<string>('');
const [executionProgress, setExecutionProgress] = useState<number>(0);
const [stageHistory, setStageHistory] = useState<Array<{stage: string, timestamp: number, message: string}>>([]);
const [estimatedTime, setEstimatedTime] = useState<number>(0);

/*
2. 段階的メッセージハンドリングを追加:
*/

// Add these message handlers in the WebSocket message processing
case 'claude_progress':
  const progressData = message.data;
  setExecutionStage(progressData.stage);
  setExecutionProgress(progressData.progress);
  setEstimatedTime(progressData.estimated_time || 0);

  // Add to terminal with enhanced formatting
  const stageEmoji = getStageEmoji(progressData.stage);
  const progressBar = generateProgressBar(progressData.progress);
  addTerminalLine(`${stageEmoji} [${progressData.progress}%] ${progressData.message}`, 'progress');
  addTerminalLine(`${progressBar}`, 'progress-bar');

  // Update stage history
  setStageHistory(prev => [...prev, {
    stage: progressData.stage,
    timestamp: progressData.timestamp,
    message: progressData.message
  }]);
  break;

case 'stage_completed':
  const stageData = message.data;
  const stageEmoji = stageData.success ? '✅' : '❌';
  const duration = `${stageData.duration}ms`;
  addTerminalLine(`${stageEmoji} ${stageData.stage.toUpperCase()} completed (${duration})`, 'stage-complete');

  if (stageData.success) {
    addTerminalLine(`📊 Stage data: ${JSON.stringify(stageData.data, null, 2)}`, 'stage-data');
  } else {
    addTerminalLine(`⚠️ Error: ${stageData.error}`, 'error');
  }
  break;

case 'claude_thinking':
  // Enhanced thinking display for staged execution
  const thinkingData = message.data;
  addTerminalLine(`🧠💭 [${thinkingData.stage?.toUpperCase()}] ${thinkingData.thinking}`, 'thinking-staged');
  break;

case 'execution_progress':
  // Real-time execution progress
  const execData = message.data;
  addTerminalLine(`⚙️ ${execData.message} (${execData.progress}%)`, 'execution');
  break;

case 'preview_ready':
  // Preview generation completion
  const previewData = message.data;
  addTerminalLine(`🖼️ プレビュー生成完了: ${previewData.previews.length}個のアイテム`, 'preview');

  // Trigger preview list refresh
  setTimeout(() => {
    refreshPreviewList();
  }, 1000);
  break;

/*
3. ヘルパー関数を追加:
*/

const getStageEmoji = (stage: string): string => {
  const stageEmojis: {[key: string]: string} = {
    'analyzing': '🔍',
    'generating': '💻',
    'executing': '⚙️',
    'previewing': '🖼️',
    'completed': '🎉',
    'error': '❌'
  };
  return stageEmojis[stage] || '📋';
};

const generateProgressBar = (progress: number): string => {
  const barLength = 20;
  const filledLength = Math.round((progress / 100) * barLength);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
  return `[${bar}] ${progress}%`;
};

/*
4. 段階的実行を要求する送信関数を更新:
*/

const sendClaudeCommandStaged = (command: string) => {
  if (!webSocketService.isConnected()) {
    addTerminalLine('❌ サーバーに接続されていません', 'error');
    return;
  }

  // Reset stage tracking
  setExecutionStage('preparing');
  setExecutionProgress(0);
  setStageHistory([]);
  setIsExecuting(true);

  const message = {
    type: 'claude_execute_staged', // Use staged execution
    data: {
      command: command,
      project_id: selectedProject?.id,
      context: {
        current_dir: '/workspace',
        git_branch: 'main'
      },
      client_version: '3.8.0', // Indicate staging support
      use_staging: true // Explicitly request staging
    }
  };

  // Show preparation message
  addTerminalLine(`🚀 段階的実行を開始: ${command}`, 'command');
  addTerminalLine(`📋 4つのステージで処理します: 分析 → 生成 → 実行 → プレビュー`, 'info');

  webSocketService.sendMessage(message);
};

/*
5. UI コンポーネントの更新:
*/

// Add progress display component
const StagedProgressDisplay = () => {
  if (!isExecuting || !executionStage) return null;

  return (
    <View style={styles.progressContainer}>
      <Text style={styles.progressStage}>
        {getStageEmoji(executionStage)} Stage: {executionStage.toUpperCase()}
      </Text>
      <View style={styles.progressBarContainer}>
        <View
          style={[styles.progressBar, {width: `${executionProgress}%`}]}
        />
      </View>
      <Text style={styles.progressText}>
        {executionProgress}% {estimatedTime > 0 && `(約${estimatedTime}秒)`}
      </Text>
    </View>
  );
};

// Add stage timeline component
const StageTimeline = () => {
  return (
    <ScrollView style={styles.timelineContainer}>
      {stageHistory.map((stage, index) => (
        <View key={index} style={styles.timelineItem}>
          <Text style={styles.timelineStage}>
            {getStageEmoji(stage.stage)} {stage.stage}
          </Text>
          <Text style={styles.timelineMessage}>{stage.message}</Text>
          <Text style={styles.timelineTime}>
            {new Date(stage.timestamp * 1000).toLocaleTimeString()}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
};

/*
6. スタイルの追加:
*/

const styles = StyleSheet.create({
  // ... existing styles ...

  progressContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    margin: 10,
    borderRadius: 10,
  },
  progressStage: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
  },
  timelineContainer: {
    maxHeight: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    margin: 10,
  },
  timelineItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  timelineStage: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  timelineMessage: {
    color: 'white',
    marginBottom: 3,
  },
  timelineTime: {
    color: '#888',
    fontSize: 12,
  },
});

/*
7. メインコンポーネントの render に追加:
*/

// Add to the main render return
return (
  <View style={styles.container}>
    {/* ... existing components ... */}

    {/* Staged Progress Display */}
    <StagedProgressDisplay />

    {/* Stage Timeline */}
    {stageHistory.length > 0 && (
      <View style={styles.timelineWrapper}>
        <Text style={styles.timelineTitle}>📋 実行ステージ履歴</Text>
        <StageTimeline />
      </View>
    )}

    {/* ... rest of existing components ... */}
  </View>
);

/*
=== INTEGRATION SUMMARY ===
===========================

1. **State Management**: Added stage tracking, progress, and history
2. **Message Handling**: Enhanced WebSocket message processing for staged execution
3. **UI Components**: Progress bars, stage timeline, and visual indicators
4. **Styling**: Professional styling for progress display
5. **User Experience**: Real-time feedback during long operations

This integration provides:
- ✅ Real-time progress updates
- ✅ Stage-by-stage visualization
- ✅ Connection stability during long operations
- ✅ Enhanced user feedback
- ✅ Professional UI/UX

The staged execution will prevent WebSocket timeouts and provide much better
user experience during long Claude operations.
*/