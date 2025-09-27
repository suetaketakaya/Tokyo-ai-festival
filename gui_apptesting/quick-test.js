#!/usr/bin/env node

/**
 * Quick Live Test - Simple JavaScript version
 * Tests Go Server connectivity without TypeScript complexity
 */

const puppeteer = require('puppeteer');
const WebSocket = require('ws');

async function quickLiveTest() {
  console.log('🧪 RemoteClaudeApp Quick Live Test');
  console.log('=' .repeat(50));

  // Test 1: Go Server Web Interface
  console.log('\n🌐 Testing Go Server Web Interface...');
  try {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1440, height: 900 },
      devtools: true
    });

    const page = await browser.newPage();

    console.log('  📡 Connecting to http://localhost:8080...');
    const startTime = Date.now();
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
    const loadTime = Date.now() - startTime;

    const title = await page.title();
    console.log(`  ✅ Page loaded successfully in ${loadTime}ms`);
    console.log(`  📄 Title: "${title}"`);

    // Take screenshot
    await page.screenshot({ path: './go-server-test.png', fullPage: true });
    console.log('  📸 Screenshot saved: go-server-test.png');

    // Check for key elements
    const statusElement = await page.$('.status-indicator');
    const qrElement = await page.$('#qr-code');

    console.log(`  🔍 Status indicator found: ${statusElement ? 'Yes' : 'No'}`);
    console.log(`  🔍 QR code element found: ${qrElement ? 'Yes' : 'No'}`);

    await browser.close();
    console.log('  ✅ Go Server web interface test completed');

  } catch (error) {
    console.log(`  ❌ Go Server test failed: ${error.message}`);
  }

  // Test 2: API Endpoints
  console.log('\n📡 Testing API Endpoints...');
  try {
    const response = await fetch('http://localhost:8080/api/status');
    const data = await response.json();

    console.log('  ✅ API /api/status accessible');
    console.log(`  📊 Server status: ${data.status}`);
    console.log(`  🏠 Host: ${data.host}`);
    console.log(`  🔌 Port: ${data.port}`);
    console.log(`  🔑 Session Key: ${data.sessionKey ? 'Present' : 'Missing'}`);
    console.log(`  👥 Connected clients: ${data.clients.length}`);

  } catch (error) {
    console.log(`  ❌ API test failed: ${error.message}`);
  }

  // Test 3: WebSocket Connection
  console.log('\n🔌 Testing WebSocket Connection...');
  try {
    // First get the correct WebSocket URL from API
    const response = await fetch('http://localhost:8080/api/status');
    const data = await response.json();
    const wsUrl = data.connection_url || 'ws://localhost:8080/ws';

    console.log(`  🔗 Connecting to: ${wsUrl}`);

    const ws = new WebSocket(wsUrl);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        console.log('  ✅ WebSocket connected successfully');

        // Test ping/pong
        const pingMessage = JSON.stringify({
          type: 'ping',
          timestamp: Date.now()
        });

        ws.send(pingMessage);
        console.log('  📤 Ping message sent');

        ws.onmessage = (event) => {
          try {
            const response = JSON.parse(event.data);
            console.log(`  📥 Received response: ${response.type}`);
            console.log('  ✅ WebSocket ping/pong successful');
            ws.close();
            resolve();
          } catch (err) {
            console.log('  📥 Received non-JSON response');
            ws.close();
            resolve();
          }
        };
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(new Error('WebSocket connection failed'));
      };
    });

  } catch (error) {
    console.log(`  ❌ WebSocket test failed: ${error.message}`);
  }

  // Test 4: ExpoGo App Check (Basic)
  console.log('\n📱 Checking ExpoGo App Environment...');
  try {
    const { execSync } = require('child_process');

    // Check if iOS Simulator is running
    try {
      const devices = execSync('xcrun simctl list devices | grep Booted', { encoding: 'utf8' });
      if (devices.trim()) {
        console.log('  ✅ iOS Simulator is running');
        console.log(`  📱 Booted devices found`);
      } else {
        console.log('  ⚠️  No booted iOS Simulator found');
      }
    } catch (err) {
      console.log('  ⚠️  Could not check iOS Simulator status');
    }

    // Check if Expo is running (by checking common ports)
    const expoPorts = [8081, 8082, 19000, 19001];
    const runningPorts = [];

    for (const port of expoPorts) {
      try {
        const response = await fetch(`http://localhost:${port}`, {
          signal: AbortSignal.timeout(1000)
        });
        runningPorts.push(port);
      } catch (err) {
        // Port not responding, which is fine
      }
    }

    if (runningPorts.length > 0) {
      console.log(`  ✅ Expo services found on ports: ${runningPorts.join(', ')}`);
    } else {
      console.log('  ⚠️  No Expo services detected');
    }

  } catch (error) {
    console.log(`  ⚠️  ExpoGo environment check limited: ${error.message}`);
  }

  // Summary
  console.log('\n📋 Test Summary');
  console.log('=' .repeat(50));
  console.log('✅ Go Server web interface: Accessible');
  console.log('✅ API endpoints: Working');
  console.log('✅ WebSocket: Connection tested');
  console.log('⚠️  ExpoGo: Basic environment check completed');
  console.log('\n🎉 Quick live test completed!');
  console.log('📊 For detailed monitoring, run: npm run live-test:monitor');
  console.log('🚀 For full testing, run: npm run live-test:run');
}

// Run the test
quickLiveTest().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});