/**
 * Test Logger Utility for RemoteClaudeApp System Integration Tests
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import moment from 'moment';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  testSuite?: string;
  testCase?: string;
}

export class TestLogger {
  private logLevel: LogLevel;
  private logFile: string;
  private logs: LogEntry[] = [];

  constructor(logLevel: LogLevel = LogLevel.INFO) {
    this.logLevel = logLevel;
    this.logFile = path.join(process.cwd(), 'reports', `test-${moment().format('YYYY-MM-DD-HH-mm-ss')}.log`);
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    const logDir = path.dirname(this.logFile);
    fs.ensureDirSync(logDir);
  }

  private createLogEntry(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      timestamp: moment().toISOString(),
      level,
      message,
      data,
      testSuite: expect.getState().currentTestName?.split(' ')[0],
      testCase: expect.getState().currentTestName
    };
  }

  private writeLog(entry: LogEntry): void {
    this.logs.push(entry);

    // Console output with colors
    if (entry.level >= this.logLevel) {
      const timestamp = chalk.gray(moment(entry.timestamp).format('HH:mm:ss.SSS'));
      const levelStr = this.getLevelString(entry.level);
      const testInfo = entry.testCase ? chalk.cyan(`[${entry.testCase}]`) : '';

      let logMessage = `${timestamp} ${levelStr} ${testInfo} ${entry.message}`;

      if (entry.data) {
        logMessage += `\n${chalk.gray(JSON.stringify(entry.data, null, 2))}`;
      }

      console.log(logMessage);
    }

    // File output
    const fileEntry = `${entry.timestamp} [${LogLevel[entry.level]}] ${entry.testCase || 'GENERAL'} ${entry.message}`;
    fs.appendFileSync(this.logFile, fileEntry + '\n');
  }

  private getLevelString(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return chalk.blue('DEBUG');
      case LogLevel.INFO:
        return chalk.green('INFO ');
      case LogLevel.WARN:
        return chalk.yellow('WARN ');
      case LogLevel.ERROR:
        return chalk.red('ERROR');
      default:
        return 'UNKNOWN';
    }
  }

  debug(message: string, data?: any): void {
    this.writeLog(this.createLogEntry(LogLevel.DEBUG, message, data));
  }

  info(message: string, data?: any): void {
    this.writeLog(this.createLogEntry(LogLevel.INFO, message, data));
  }

  warn(message: string, data?: any): void {
    this.writeLog(this.createLogEntry(LogLevel.WARN, message, data));
  }

  error(message: string, data?: any): void {
    this.writeLog(this.createLogEntry(LogLevel.ERROR, message, data));
  }

  step(message: string, data?: any): void {
    const stepMessage = `📝 STEP: ${message}`;
    this.info(stepMessage, data);
  }

  assertion(message: string, passed: boolean, data?: any): void {
    const icon = passed ? '✅' : '❌';
    const assertMessage = `${icon} ASSERTION: ${message}`;
    this.info(assertMessage, data);
  }

  testStart(testName: string): void {
    this.info(`🚀 TEST START: ${testName}`);
  }

  testEnd(testName: string, passed: boolean, duration?: number): void {
    const icon = passed ? '✅' : '❌';
    const durationStr = duration ? ` (${duration}ms)` : '';
    this.info(`${icon} TEST END: ${testName}${durationStr}`);
  }

  websocketEvent(event: string, data?: any): void {
    this.debug(`🔌 WebSocket ${event}`, data);
  }

  apiCall(method: string, url: string, status?: number, data?: any): void {
    const statusStr = status ? ` (${status})` : '';
    this.debug(`🌐 API ${method} ${url}${statusStr}`, data);
  }

  screenshot(filename: string): void {
    this.info(`📸 Screenshot saved: ${filename}`);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogFile(): string {
    return this.logFile;
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(format: 'json' | 'csv' = 'json'): string {
    const exportFile = this.logFile.replace('.log', `.${format}`);

    if (format === 'json') {
      fs.writeFileSync(exportFile, JSON.stringify(this.logs, null, 2));
    } else if (format === 'csv') {
      const csvHeaders = 'Timestamp,Level,TestSuite,TestCase,Message,Data\n';
      const csvRows = this.logs.map(log =>
        `"${log.timestamp}","${LogLevel[log.level]}","${log.testSuite || ''}","${log.testCase || ''}","${log.message}","${log.data ? JSON.stringify(log.data).replace(/"/g, '""') : ''}"`
      ).join('\n');

      fs.writeFileSync(exportFile, csvHeaders + csvRows);
    }

    return exportFile;
  }
}