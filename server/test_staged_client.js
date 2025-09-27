// Test client for staged execution WebSocket messaging
const WebSocket = require('ws');

const SERVER_URL = 'ws://192.168.0.135:8092/ws?key=4eb40acfb22fb2008041308ebcfb5a85';

console.log('📡 段階的実行テスト開始...');
console.log(`🔗 接続先: ${SERVER_URL}`);

const ws = new WebSocket(SERVER_URL);

ws.on('open', function open() {
    console.log('✅ WebSocket接続成功');

    // Test 1: 段階的実行メッセージ送信
    console.log('\n🧪 テスト1: 段階的実行メッセージ送信');
    const stagedMessage = {
        type: 'claude_execute_staged',
        data: {
            project_id: 'test-project-staged',
            command: 'Create a Python visualization with matplotlib',
            client_version: '3.8.0',
            use_staging: true
        }
    };

    ws.send(JSON.stringify(stagedMessage));
    console.log('📤 段階的実行メッセージ送信完了');
});

ws.on('message', function message(data) {
    try {
        const msg = JSON.parse(data.toString());

        // Progress tracking
        switch(msg.type) {
            case 'claude_progress':
                const progress = msg.data;
                const emoji = getStageEmoji(progress.stage);
                console.log(`${emoji} [${progress.progress}%] ${progress.stage}: ${progress.message}`);
                if (progress.estimated_time) {
                    console.log(`   ⏱️  推定残り時間: ${progress.estimated_time}秒`);
                }
                break;

            case 'claude_thinking':
                console.log(`🧠 [THINKING] ${msg.data.thinking}`);
                break;

            case 'stage_completed':
                const stage = msg.data;
                const stageEmoji = stage.success ? '✅' : '❌';
                console.log(`${stageEmoji} ${stage.stage.toUpperCase()} completed (${stage.duration}ms)`);
                if (stage.success) {
                    console.log(`📊 Stage data: ${JSON.stringify(stage.data, null, 2)}`);
                } else {
                    console.log(`⚠️  Error: ${stage.error}`);
                }
                break;

            case 'claude_output':
                console.log('\n🎉 FINAL RESULT:');
                console.log('================================');
                console.log(msg.data.output);
                console.log('================================');
                console.log(`⏱️  Total duration: ${msg.data.total_duration}ms`);
                console.log(`📋 Stages completed: ${msg.data.stages_completed}`);

                // Close connection after completion
                setTimeout(() => {
                    console.log('\n✅ テスト完了 - 接続を終了');
                    ws.close();
                }, 2000);
                break;

            case 'error':
                console.log(`❌ ERROR: ${msg.data.error || msg.data}`);
                break;

            default:
                console.log(`📨 Other message: ${msg.type}`, msg.data);
        }

    } catch (error) {
        console.log(`⚠️  JSON parse error: ${error}`);
        console.log(`📄 Raw data: ${data}`);
    }
});

ws.on('error', function error(err) {
    console.error('❌ WebSocket error:', err);
});

ws.on('close', function close() {
    console.log('🔌 WebSocket connection closed');
});

// Helper function for stage emojis
function getStageEmoji(stage) {
    const stageEmojis = {
        'analyzing': '🔍',
        'generating': '💻',
        'executing': '⚙️',
        'previewing': '🖼️',
        'completed': '🎉',
        'error': '❌'
    };
    return stageEmojis[stage] || '📋';
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down test client...');
    ws.close();
    process.exit(0);
});