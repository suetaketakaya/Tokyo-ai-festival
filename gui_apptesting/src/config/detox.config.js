/**
 * Jest Configuration for Detox Tests
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../..',
  testMatch: ['<rootDir>/src/tests/mobile/**/*.test.ts'],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: '<rootDir>/src/setup/detoxGlobalSetup.js',
  globalTeardown: '<rootDir>/src/setup/detoxGlobalTeardown.js',
  setupFilesAfterEnv: ['<rootDir>/src/setup/detoxSetup.js'],
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './reports',
        filename: 'mobile-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'RemoteClaudeApp Mobile Test Report'
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './reports',
        outputName: 'mobile-test-results.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: 'true'
      }
    ]
  ],
  collectCoverage: false,
  verbose: true,
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-.*|@react-navigation|detox)/)'
  ]
};