#!/usr/bin/env node

/**
 * Test WebSocket Client for Preview Functionality
 * Tests if the server can detect and serve preview files
 */

const WebSocket = require('ws');

class PreviewTestClient {
    constructor() {
        this.serverUrl = 'ws://192.168.0.135:8091/ws?key=b12d619904416da244fefe1dba1eec16';
        this.ws = null;
    }

    async connect() {
        console.log('🔌 Connecting to server...');
        this.ws = new WebSocket(this.serverUrl);

        return new Promise((resolve, reject) => {
            this.ws.on('open', () => {
                console.log('✅ Connected to server');
                this.setupMessageHandler();
                resolve();
            });

            this.ws.on('error', (error) => {
                console.error('❌ Connection error:', error);
                reject(error);
            });

            this.ws.on('close', (code, reason) => {
                console.log(`🔌 Connection closed: ${code} ${reason}`);
            });
        });
    }

    setupMessageHandler() {
        this.ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log('📨 Received message:', JSON.stringify(message, null, 2));
            } catch (error) {
                console.error('❌ Failed to parse message:', error);
                console.log('Raw message:', data.toString());
            }
        });
    }

    sendMessage(type, data = {}) {
        const message = {
            type: type,
            ...data
        };
        console.log('📤 Sending message:', JSON.stringify(message, null, 2));
        this.ws.send(JSON.stringify(message));
    }

    async testPreviewListRequest() {
        console.log('\n🔍 Testing preview list request...');
        this.sendMessage('preview_list_request', {
            project_id: 'test-project'
        });

        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    async runTests() {
        try {
            await this.connect();
            await this.testPreviewListRequest();

            console.log('\n✅ Test completed');
        } catch (error) {
            console.error('❌ Test failed:', error);
        } finally {
            if (this.ws) {
                this.ws.close();
            }
        }
    }
}

// Run the test
if (require.main === module) {
    const client = new PreviewTestClient();
    client.runTests();
}

module.exports = PreviewTestClient;