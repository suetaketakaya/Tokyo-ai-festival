/**
 * Puppeteer Configuration for Web Tests
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../..',
  testMatch: ['<rootDir>/src/tests/web/**/*.test.ts'],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: '<rootDir>/src/setup/webGlobalSetup.js',
  globalTeardown: '<rootDir>/src/setup/webGlobalTeardown.js',
  setupFilesAfterEnv: ['<rootDir>/src/setup/webSetup.js'],
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './reports',
        filename: 'web-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'RemoteClaudeApp Web Test Report'
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './reports',
        outputName: 'web-test-results.xml',
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
    'node_modules/(?!(puppeteer|puppeteer-core)/)'
  ]
};