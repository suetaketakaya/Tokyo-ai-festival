/**
 * Detox Configuration for RemoteClaudeApp Testing
 */

module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'src/config/detox.config.js'
    },
    jest: {
      setupFilesAfterEnv: ['<rootDir>/src/setup/detoxSetup.js']
    }
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: '../RemoteClaudeApp/ios/build/Build/Products/Debug-iphonesimulator/RemoteClaudeApp.app',
      build: 'cd ../RemoteClaudeApp && xcodebuild -workspace ios/RemoteClaudeApp.xcworkspace -scheme RemoteClaudeApp -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: '../RemoteClaudeApp/ios/build/Build/Products/Release-iphonesimulator/RemoteClaudeApp.app',
      build: 'cd ../RemoteClaudeApp && xcodebuild -workspace ios/RemoteClaudeApp.xcworkspace -scheme RemoteClaudeApp -configuration Release -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: '../RemoteClaudeApp/android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd ../RemoteClaudeApp && cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
      reversePorts: [8081]
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: '../RemoteClaudeApp/android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd ../RemoteClaudeApp && cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release'
    }
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 14'
      }
    },
    attached: {
      type: 'android.attached',
      device: {
        adbName: '.*'
      }
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_5_API_31'
      }
    },
    genymotion: {
      type: 'android.genycloud',
      device: {
        recipeName: 'Detox_Pixel_5_API_31'
      }
    }
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug'
    },
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release'
    },
    'android.att.debug': {
      device: 'attached',
      app: 'android.debug'
    },
    'android.att.release': {
      device: 'attached',
      app: 'android.release'
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug'
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release'
    }
  }
};