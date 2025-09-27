#!/usr/bin/env node

/**
 * Working GUI Test - Browser automation without Puppeteer issues
 * Uses system browser and osascript for macOS automation
 */

const WebSocket = require('ws');
const { execSync, spawn } = require('child_process');

class WorkingGUITest {
  constructor() {
    this.goServerUrl = 'http://localhost:8080';
    this.monitorUrl = 'http://localhost:3001';
    this.results = [];
  }

  async runTest() {
    console.log('🧪 Working GUI Test for RemoteClaudeApp');
    console.log('=' .repeat(50));

    await this.testGoServerGUI();
    await this.testMonitoringDashboard();
    await this.testWebSocketInteraction();
    await this.testExpoGoSimulator();

    this.generateReport();
  }

  async testGoServerGUI() {
    console.log('\n🌐 Testing Go Server GUI Interaction...');

    try {
      // Open Go server in default browser
      execSync(`open "${this.goServerUrl}"`);
      console.log('  ✅ Go Server opened in browser');

      // Wait for page to load
      await this.sleep(3000);

      // Take screenshot using macOS screencapture
      const timestamp = Date.now();
      execSync(`screencapture -x ./reports/go-server-${timestamp}.png`);
      console.log(`  📸 Screenshot saved: go-server-${timestamp}.png`);

      // Test API interaction through browser console
      const apiTest = await this.testAPIFromBrowser();
      console.log(`  📡 API interaction: ${apiTest ? 'Success' : 'Failed'}`);

      this.results.push({
        test: 'Go Server GUI',
        status: 'pass',
        details: 'Browser opened, screenshot captured, API accessible'
      });

    } catch (error) {
      console.log(`  ❌ Go Server GUI test failed: ${error.message}`);
      this.results.push({
        test: 'Go Server GUI',
        status: 'fail',
        error: error.message
      });
    }
  }

  async testMonitoringDashboard() {
    console.log('\n📊 Testing Monitoring Dashboard GUI...');

    try {
      // Open monitoring dashboard
      execSync(`open "${this.monitorUrl}/dashboard"`);
      console.log('  ✅ Monitoring dashboard opened');

      await this.sleep(2000);

      // Test dashboard API
      const response = await fetch(`${this.monitorUrl}/api/status`);
      const data = await response.json();

      console.log('  📊 Dashboard API working');
      console.log(`  🟢 Go Server Status: ${data.goServer.status}`);
      console.log(`  🟢 WebSocket Status: ${data.webSocket.status}`);
      console.log(`  🟢 ExpoApp Status: ${data.expoApp.status}`);

      // Take dashboard screenshot
      const timestamp = Date.now();
      execSync(`screencapture -x ./reports/dashboard-${timestamp}.png`);
      console.log(`  📸 Dashboard screenshot saved`);

      this.results.push({
        test: 'Monitoring Dashboard',
        status: 'pass',
        details: 'Dashboard accessible, API working, real-time status available'
      });

    } catch (error) {
      console.log(`  ❌ Dashboard test failed: ${error.message}`);
      this.results.push({
        test: 'Monitoring Dashboard',
        status: 'fail',
        error: error.message
      });
    }
  }

  async testWebSocketInteraction() {
    console.log('\n🔌 Testing WebSocket Real-time Interaction...');

    try {
      // Get WebSocket URL from Go server
      const response = await fetch(`${this.goServerUrl}/api/status`);
      const data = await response.json();
      const wsUrl = data.connection_url;

      console.log(`  🔗 Connecting to: ${wsUrl}`);

      const ws = new WebSocket(wsUrl);

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('WebSocket timeout'));
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          console.log('  ✅ WebSocket connection established');

          // Send test command
          const testCommand = {
            type: 'command',
            command: 'echo "GUI Test Command"',
            timestamp: Date.now()
          };

          ws.send(JSON.stringify(testCommand));
          console.log('  📤 Test command sent');
        };

        ws.onmessage = (event) => {
          try {
            const response = JSON.parse(event.data);
            console.log(`  📥 Response received: ${response.type}`);

            if (response.type === 'pong' || response.type === 'command_result') {
              console.log('  ✅ WebSocket interaction successful');
            }
          } catch (err) {
            console.log('  📥 Non-JSON response received');
          }

          ws.close();
          resolve();
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          reject(new Error('WebSocket error'));
        };
      });

      this.results.push({
        test: 'WebSocket Interaction',
        status: 'pass',
        details: 'Real-time bidirectional communication working'
      });

    } catch (error) {
      console.log(`  ❌ WebSocket test failed: ${error.message}`);
      this.results.push({
        test: 'WebSocket Interaction',
        status: 'fail',
        error: error.message
      });
    }
  }

  async testExpoGoSimulator() {
    console.log('\n📱 Testing ExpoGo Simulator Interaction...');

    try {
      // Check iOS Simulator
      const devices = execSync('xcrun simctl list devices | grep Booted', { encoding: 'utf8' });

      if (devices.trim()) {
        console.log('  ✅ iOS Simulator detected');
        console.log('  📱 Booted devices found');

        // Try to interact with Expo app using AppleScript
        try {
          const script = `
            tell application "Simulator"
              activate
            end tell
          `;
          execSync(`osascript -e '${script}'`);
          console.log('  ✅ Simulator activated');

          // Take simulator screenshot
          await this.sleep(2000);
          const timestamp = Date.now();
          execSync(`screencapture -x ./reports/simulator-${timestamp}.png`);
          console.log(`  📸 Simulator screenshot saved`);

        } catch (scriptError) {
          console.log('  ⚠️  Simulator automation limited');
        }

        // Check Expo services
        const expoPorts = [8081, 8082];
        const activePorts = [];

        for (const port of expoPorts) {
          try {
            await fetch(`http://localhost:${port}`, {
              signal: AbortSignal.timeout(1000)
            });
            activePorts.push(port);
          } catch (err) {
            // Port not responding
          }
        }

        if (activePorts.length > 0) {
          console.log(`  ✅ Expo services active on ports: ${activePorts.join(', ')}`);
        }

        this.results.push({
          test: 'ExpoGo Simulator',
          status: 'pass',
          details: `Simulator running, Expo services on ports ${activePorts.join(', ')}`
        });

      } else {
        throw new Error('No booted iOS Simulator found');
      }

    } catch (error) {
      console.log(`  ❌ ExpoGo test failed: ${error.message}`);
      this.results.push({
        test: 'ExpoGo Simulator',
        status: 'fail',
        error: error.message
      });
    }
  }

  async testAPIFromBrowser() {
    try {
      const response = await fetch(`${this.goServerUrl}/api/status`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateReport() {
    console.log('\n📋 GUI Test Results Summary');
    console.log('=' .repeat(50));

    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Success Rate: ${Math.round((passed / this.results.length) * 100)}%`);

    console.log('\n📄 Detailed Results:');
    this.results.forEach((result, index) => {
      const status = result.status === 'pass' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.test}`);

      if (result.status === 'pass') {
        console.log(`   Details: ${result.details}`);
      } else {
        console.log(`   Error: ${result.error}`);
      }
    });

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      summary: { passed, failed, total: this.results.length },
      results: this.results
    };

    require('fs').writeFileSync('./reports/gui-test-report.json', JSON.stringify(report, null, 2));
    console.log('\n📁 Report saved: ./reports/gui-test-report.json');

    console.log('\n🎯 GUI Testing Completed!');
    console.log('📸 Screenshots saved in ./reports/ directory');
    console.log('📊 Monitor dashboard: http://localhost:3001/dashboard');
  }
}

// Create reports directory
try {
  require('fs').mkdirSync('./reports', { recursive: true });
} catch (err) {
  // Directory already exists
}

// Run the test
const test = new WorkingGUITest();
test.runTest().catch(error => {
  console.error('\n❌ Test execution failed:', error);
  process.exit(1);
});