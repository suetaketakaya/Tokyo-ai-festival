/**
 * Claude Code統合サービス
 * - 開発コンテキストの自動収集
 * - Claude Codeへの最適化された情報提供
 * - 開発効率向上のためのチューニング機能
 */

interface ProjectContext {
  id: string;
  name: string;
  type: 'react-native' | 'web' | 'node' | 'python' | 'other';
  framework?: string;
  language: string[];
  dependencies: string[];
  recentFiles: string[];
  activeFeatures: string[];
  commonCommands: string[];
  gitInfo?: {
    branch: string;
    lastCommit: string;
    status: string;
  };
}

interface DevelopmentSession {
  sessionId: string;
  projectId: string;
  startTime: Date;
  endTime?: Date;
  commandsExecuted: Array<{
    command: string;
    timestamp: Date;
    success: boolean;
    context: string;
  }>;
  filesModified: string[];
  errorsEncountered: Array<{
    error: string;
    timestamp: Date;
    context: string;
    resolved: boolean;
  }>;
  productivity: {
    commandsPerHour: number;
    successRate: number;
    avgResponseTime: number;
  };
}

interface ClaudeCodePromptTemplate {
  name: string;
  description: string;
  template: string;
  variables: string[];
  category: 'debugging' | 'feature' | 'optimization' | 'review' | 'documentation';
}

class ClaudeCodeIntegrationService {
  private currentProject: ProjectContext | null = null;
  private currentSession: DevelopmentSession | null = null;
  private promptTemplates: ClaudeCodePromptTemplate[] = [];
  private learningData: Map<string, any> = new Map();

  constructor() {
    this.initializePromptTemplates();
  }

  /**
   * プロジェクトコンテキストを設定（同期版 - 下位互換性のため）
   */
  setProjectContext(projectId: string, projectName: string): void {
    this.currentProject = {
      id: projectId,
      name: projectName,
      type: 'other', // 同期版では固定値
      language: ['TypeScript', 'JavaScript'],
      dependencies: ['react-native', 'react'],
      recentFiles: [],
      activeFeatures: ['WebSocket', 'Navigation'],
      commonCommands: ['npm install', 'expo start'],
      gitInfo: {
        branch: 'main',
        lastCommit: 'N/A',
        status: 'unknown'
      },
    };

    // 非同期で詳細情報を取得
    this.setProjectContextAsync(projectId, projectName).catch(console.error);
  }

  /**
   * 開発セッション開始
   */
  startDevelopmentSession(): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.currentSession = {
      sessionId,
      projectId: this.currentProject?.id || 'unknown',
      startTime: new Date(),
      commandsExecuted: [],
      filesModified: [],
      errorsEncountered: [],
      productivity: {
        commandsPerHour: 0,
        successRate: 0,
        avgResponseTime: 0,
      },
    };

    return sessionId;
  }

  /**
   * Claude Codeへの最適化されたプロンプト生成
   */
  generateOptimizedPrompt(task: string, category: string = 'feature'): string {
    const template = this.selectBestTemplate(task, category as any);
    const context = this.buildContextualInformation();

    return this.interpolateTemplate(template, {
      task,
      projectContext: context.project,
      sessionContext: context.session,
      recentActivity: context.activity,
      commonPatterns: context.patterns,
    });
  }

  /**
   * コマンド実行結果の記録と学習
   */
  recordCommandExecution(
    command: string,
    success: boolean,
    responseTime: number,
    context: string = ''
  ): void {
    if (!this.currentSession) return;

    this.currentSession.commandsExecuted.push({
      command,
      timestamp: new Date(),
      success,
      context,
    });

    // 生産性メトリクスの更新
    this.updateProductivityMetrics(responseTime);

    // 学習データの蓄積
    this.accumulateLearningData(command, success, context);
  }

  /**
   * エラー情報の記録
   */
  recordError(error: string, context: string = ''): void {
    if (!this.currentSession) return;

    this.currentSession.errorsEncountered.push({
      error,
      timestamp: new Date(),
      context,
      resolved: false,
    });
  }

  /**
   * エラー解決の記録
   */
  markErrorResolved(errorIndex: number): void {
    if (!this.currentSession || !this.currentSession.errorsEncountered[errorIndex]) return;

    this.currentSession.errorsEncountered[errorIndex].resolved = true;
  }

  /**
   * Claude Code向けプロジェクト情報のエクスポート
   */
  exportForClaudeCode(): object {
    return {
      project: this.currentProject,
      session: this.currentSession,
      suggestions: this.generateSuggestions(),
      contextualPrompts: this.getContextualPrompts(),
      learningInsights: this.getLearningInsights(),
    };
  }

  private initializePromptTemplates(): void {
    this.promptTemplates = [
      {
        name: 'Feature Development',
        description: 'React Native機能開発用テンプレート',
        category: 'feature',
        template: `
# React Native機能開発アシスタント

## プロジェクト情報
- プロジェクト: {{projectContext.name}}
- タイプ: {{projectContext.type}}
- 言語: {{projectContext.language}}
- フレームワーク: {{projectContext.framework}}

## 開発タスク
{{task}}

## 現在のセッション情報
- 実行コマンド数: {{sessionContext.commandsExecuted.length}}
- 成功率: {{sessionContext.productivity.successRate}}%
- 最近のアクティビティ: {{recentActivity}}

## 共通パターン
{{commonPatterns}}

上記の情報を考慮して、最適な実装方法を提案してください。コードの品質、保守性、そしてReact Nativeのベストプラクティスに従った解決策を提供してください。
        `,
        variables: ['task', 'projectContext', 'sessionContext', 'recentActivity', 'commonPatterns'],
      },
      {
        name: 'Debug Assistant',
        description: 'デバッグ支援用テンプレート',
        category: 'debugging',
        template: `
# デバッグアシスタント

## エラー情報
{{task}}

## プロジェクト環境
- {{projectContext.name}} ({{projectContext.type}})
- 依存関係: {{projectContext.dependencies}}
- Git状態: {{projectContext.gitInfo.status}}

## 最近のエラー履歴
{{sessionContext.errorsEncountered}}

## 実行コマンド履歴
{{recentActivity}}

上記のエラーを分析し、根本原因と解決策を提案してください。
        `,
        variables: ['task', 'projectContext', 'sessionContext', 'recentActivity'],
      },
      {
        name: 'Code Review',
        description: 'コードレビュー用テンプレート',
        category: 'review',
        template: `
# コードレビューアシスタント

## レビュー対象
{{task}}

## プロジェクト標準
- 言語: {{projectContext.language}}
- 一般的なコマンド: {{projectContext.commonCommands}}
- アクティブ機能: {{projectContext.activeFeatures}}

## 品質メトリクス
- 成功率: {{sessionContext.productivity.successRate}}%
- 平均応答時間: {{sessionContext.productivity.avgResponseTime}}ms

コードの品質、セキュリティ、保守性の観点からレビューし、改善提案を行ってください。
        `,
        variables: ['task', 'projectContext', 'sessionContext'],
      },
    ];
  }

  /**
   * 動的プロジェクトタイプ検出
   */
  private async detectProjectType(): Promise<'react-native' | 'web' | 'node' | 'python' | 'other'> {
    try {
      if (!this.currentProject?.id) return 'other';

      const projectInfo = await this.fetchContainerProjectInfo(this.currentProject.id);

      // package.jsonの分析
      if (projectInfo.packageJson) {
        const pkg = JSON.parse(projectInfo.packageJson);

        if (pkg.dependencies?.['react-native'] || pkg.dependencies?.['expo']) {
          return 'react-native';
        }
        if (pkg.dependencies?.['react'] && pkg.dependencies?.['react-dom']) {
          return 'web';
        }
        if (pkg.dependencies?.['express'] || pkg.dependencies?.['fastify']) {
          return 'node';
        }
      }

      // requirements.txtの存在確認
      if (projectInfo.hasPythonFiles || projectInfo.hasRequirementsTxt) {
        return 'python';
      }

      return 'other';
    } catch (error) {
      console.error('Project type detection failed:', error);
      return 'other';
    }
  }

  /**
   * 動的言語検出
   */
  private async detectLanguages(): Promise<string[]> {
    try {
      if (!this.currentProject?.id) return [];

      const projectInfo = await this.fetchContainerProjectInfo(this.currentProject.id);
      const languages = new Set<string>();

      // ファイル拡張子の分析
      projectInfo.fileExtensions?.forEach(ext => {
        switch (ext) {
          case '.ts': case '.tsx': languages.add('TypeScript'); break;
          case '.js': case '.jsx': languages.add('JavaScript'); break;
          case '.py': languages.add('Python'); break;
          case '.go': languages.add('Go'); break;
          case '.java': languages.add('Java'); break;
          case '.cpp': case '.cc': case '.cxx': languages.add('C++'); break;
          case '.c': languages.add('C'); break;
          case '.rs': languages.add('Rust'); break;
          case '.swift': languages.add('Swift'); break;
          case '.kt': languages.add('Kotlin'); break;
        }
      });

      return Array.from(languages);
    } catch (error) {
      console.error('Language detection failed:', error);
      return ['Unknown'];
    }
  }

  // These methods are now replaced by async versions below
  // Keeping for backward compatibility

  private selectBestTemplate(task: string, category: string): ClaudeCodePromptTemplate {
    // タスクとカテゴリに基づいて最適なテンプレートを選択
    const template = this.promptTemplates.find(t => t.category === category);
    return template || this.promptTemplates[0];
  }

  private buildContextualInformation(): any {
    return {
      project: this.currentProject,
      session: this.currentSession,
      activity: this.getRecentActivity(),
      patterns: this.getCommonPatterns(),
    };
  }

  private interpolateTemplate(template: ClaudeCodePromptTemplate, variables: any): string {
    let result = template.template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, JSON.stringify(value, null, 2));
    }

    return result;
  }

  private updateProductivityMetrics(responseTime: number): void {
    if (!this.currentSession) return;

    const session = this.currentSession;
    const totalCommands = session.commandsExecuted.length;
    const successfulCommands = session.commandsExecuted.filter(c => c.success).length;

    session.productivity.successRate = (successfulCommands / totalCommands) * 100;
    session.productivity.avgResponseTime = responseTime;

    // Commands per hour calculation
    const sessionDuration = Date.now() - session.startTime.getTime();
    const hoursElapsed = sessionDuration / (1000 * 60 * 60);
    session.productivity.commandsPerHour = totalCommands / Math.max(hoursElapsed, 0.1);
  }

  private accumulateLearningData(command: string, success: boolean, context: string): void {
    const key = `${command}_${context}`;
    const existing = this.learningData.get(key) || { count: 0, successRate: 0 };

    existing.count++;
    existing.successRate = ((existing.successRate * (existing.count - 1)) + (success ? 1 : 0)) / existing.count;

    this.learningData.set(key, existing);
  }

  private getRecentActivity(): string {
    if (!this.currentSession) return 'No active session';

    const recentCommands = this.currentSession.commandsExecuted
      .slice(-5)
      .map(c => `${c.command} (${c.success ? '✅' : '❌'})`)
      .join(', ');

    return recentCommands || 'No recent commands';
  }

  private getCommonPatterns(): string {
    const patterns: string[] = [];

    for (const [key, data] of this.learningData.entries()) {
      if (data.count > 3 && data.successRate > 0.8) {
        patterns.push(`${key}: ${Math.round(data.successRate * 100)}% success rate`);
      }
    }

    return patterns.join('; ');
  }

  private generateSuggestions(): string[] {
    const suggestions: string[] = [];

    if (this.currentSession) {
      const errorRate = 1 - (this.currentSession.productivity.successRate / 100);

      if (errorRate > 0.3) {
        suggestions.push('エラー率が高いです。よく使用するコマンドのテンプレート化を検討してください。');
      }

      if (this.currentSession.productivity.avgResponseTime > 5000) {
        suggestions.push('応答時間が長いです。コマンドの最適化や分割を検討してください。');
      }

      if (this.currentSession.errorsEncountered.length > 5) {
        suggestions.push('多くのエラーが発生しています。デバッグガイドの確認をお勧めします。');
      }
    }

    return suggestions;
  }

  private getContextualPrompts(): string[] {
    const prompts: string[] = [];

    if (this.currentProject?.type === 'react-native') {
      prompts.push('React Nativeのパフォーマンス最適化について相談する');
      prompts.push('ナビゲーション構造の改善を検討する');
      prompts.push('状態管理の最適化を検討する');
    }

    return prompts;
  }

  private getLearningInsights(): any {
    return {
      mostSuccessfulCommands: this.getMostSuccessfulCommands(),
      commonErrorPatterns: this.getCommonErrorPatterns(),
      productivityTrends: this.getProductivityTrends(),
    };
  }

  private getMostSuccessfulCommands(): any[] {
    const commands: any[] = [];

    for (const [key, data] of this.learningData.entries()) {
      if (data.successRate > 0.9 && data.count > 2) {
        commands.push({
          command: key.split('_')[0],
          successRate: Math.round(data.successRate * 100),
          usage: data.count,
        });
      }
    }

    return commands.sort((a, b) => b.usage - a.usage).slice(0, 5);
  }

  private getCommonErrorPatterns(): string[] {
    if (!this.currentSession) return [];

    const errorCounts = new Map<string, number>();

    this.currentSession.errorsEncountered.forEach(error => {
      const key = error.error.substring(0, 50); // First 50 chars as pattern
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
    });

    return Array.from(errorCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([pattern, count]) => `${pattern}... (${count}回)`)
      .slice(0, 3);
  }

  private getProductivityTrends(): any {
    if (!this.currentSession) return null;

    return {
      totalCommands: this.currentSession.commandsExecuted.length,
      successRate: this.currentSession.productivity.successRate,
      commandsPerHour: Math.round(this.currentSession.productivity.commandsPerHour),
      avgResponseTime: Math.round(this.currentSession.productivity.avgResponseTime),
      errorsEncountered: this.currentSession.errorsEncountered.length,
      resolvedErrors: this.currentSession.errorsEncountered.filter(e => e.resolved).length,
    };
  }

  /**
   * 動的依存関係スキャン
   */
  private async scanDependencies(): Promise<string[]> {
    try {
      if (!this.currentProject?.id) return [];

      const projectInfo = await this.fetchContainerProjectInfo(this.currentProject.id);
      const dependencies: string[] = [];

      // package.jsonの依存関係
      if (projectInfo.packageJson) {
        const pkg = JSON.parse(projectInfo.packageJson);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        dependencies.push(...Object.keys(deps));
      }

      // requirements.txtの依存関係
      if (projectInfo.requirementsTxt) {
        const pythonDeps = projectInfo.requirementsTxt
          .split('\n')
          .filter(line => line.trim() && !line.startsWith('#'))
          .map(line => line.split('==')[0].split('>=')[0].split('<=')[0].trim());
        dependencies.push(...pythonDeps);
      }

      // go.modの依存関係
      if (projectInfo.goMod) {
        const goModLines = projectInfo.goMod.split('\n');
        const requireIndex = goModLines.findIndex(line => line.trim() === 'require (');
        if (requireIndex !== -1) {
          for (let i = requireIndex + 1; i < goModLines.length; i++) {
            const line = goModLines[i].trim();
            if (line === ')') break;
            if (line && !line.startsWith('//')) {
              const depName = line.split(' ')[0];
              dependencies.push(depName);
            }
          }
        }
      }

      return dependencies.slice(0, 20); // 最大20件に制限
    } catch (error) {
      console.error('Dependency scanning failed:', error);
      return [];
    }
  }

  /**
   * 最近のファイル取得
   */
  private async getRecentFiles(): Promise<string[]> {
    try {
      if (!this.currentProject?.id) return [];

      const projectInfo = await this.fetchContainerProjectInfo(this.currentProject.id);
      return projectInfo.recentFiles || [];
    } catch (error) {
      console.error('Recent files fetch failed:', error);
      return [];
    }
  }

  /**
   * アクティブ機能検出
   */
  private async detectActiveFeatures(): Promise<string[]> {
    try {
      if (!this.currentProject?.id) return [];

      const projectInfo = await this.fetchContainerProjectInfo(this.currentProject.id);
      const features = new Set<string>();

      // 実行中のプロセス分析
      projectInfo.runningProcesses?.forEach(process => {
        if (process.includes('jupyter')) features.add('Jupyter Notebook');
        if (process.includes('node')) features.add('Node.js Server');
        if (process.includes('python')) features.add('Python Application');
        if (process.includes('streamlit')) features.add('Streamlit');
        if (process.includes('flask')) features.add('Flask');
        if (process.includes('fastapi')) features.add('FastAPI');
      });

      // ネットワークポート分析
      projectInfo.openPorts?.forEach(port => {
        switch (port) {
          case 8888: features.add('Jupyter (8888)'); break;
          case 3000: features.add('React Dev Server (3000)'); break;
          case 5000: features.add('Flask/Express (5000)'); break;
          case 8000: features.add('Django/FastAPI (8000)'); break;
          case 8080: features.add('Web Server (8080)'); break;
        }
      });

      // WebSocket接続検出
      if (projectInfo.hasWebSocketConnections) {
        features.add('WebSocket Active');
      }

      return Array.from(features);
    } catch (error) {
      console.error('Active features detection failed:', error);
      return ['Unknown'];
    }
  }

  /**
   * 共通コマンド分析
   */
  private async getCommonCommands(): Promise<string[]> {
    try {
      if (!this.currentProject?.id) return [];

      const projectInfo = await this.fetchContainerProjectInfo(this.currentProject.id);
      const commands: string[] = [];

      // プロジェクトタイプに基づく共通コマンド
      const projectType = await this.detectProjectType();

      switch (projectType) {
        case 'react-native':
          commands.push('npm install', 'expo start', 'npm run android', 'npm run ios');
          break;
        case 'web':
          commands.push('npm install', 'npm start', 'npm run build', 'npm test');
          break;
        case 'node':
          commands.push('npm install', 'npm start', 'node index.js', 'npm run dev');
          break;
        case 'python':
          commands.push('pip install -r requirements.txt', 'python main.py', 'jupyter notebook', 'streamlit run app.py');
          break;
      }

      // 履歴から頻繁に使用されるコマンドを追加
      if (projectInfo.commandHistory) {
        const frequentCommands = this.analyzeCommandFrequency(projectInfo.commandHistory);
        commands.push(...frequentCommands.slice(0, 5));
      }

      return [...new Set(commands)]; // 重複削除
    } catch (error) {
      console.error('Common commands analysis failed:', error);
      return [];
    }
  }

  /**
   * Git情報取得
   */
  private async getGitInfo(): Promise<any> {
    try {
      if (!this.currentProject?.id) return null;

      const projectInfo = await this.fetchContainerProjectInfo(this.currentProject.id);
      return projectInfo.gitInfo || {
        branch: 'unknown',
        lastCommit: 'N/A',
        status: 'unknown'
      };
    } catch (error) {
      console.error('Git info fetch failed:', error);
      return {
        branch: 'unknown',
        lastCommit: 'N/A',
        status: 'error'
      };
    }
  }

  /**
   * コンテナからプロジェクト情報を取得
   */
  private async fetchContainerProjectInfo(projectId: string): Promise<any> {
    // ここでWebSocketサービスを使用してサーバーからコンテナ情報を取得
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Container info fetch timeout'));
      }, 5000);

      // WebSocketメッセージを送信して情報を要求
      const message = {
        type: 'container_info_request',
        data: {
          project_id: projectId,
          info_types: [
            'package_json',
            'requirements_txt',
            'go_mod',
            'file_extensions',
            'recent_files',
            'running_processes',
            'open_ports',
            'websocket_connections',
            'command_history',
            'git_info'
          ]
        }
      };

      // 一時的なレスポンスハンドラー
      const handleResponse = (response: any) => {
        if (response.type === 'container_info_response' && response.data?.project_id === projectId) {
          clearTimeout(timeout);
          resolve(response.data);
          // レスポンスハンドラーを削除
        }
      };

      // EnhancedWebSocketService経由で送信
      try {
        // この部分は実際の実装では EnhancedWebSocketService を使用
        // 現在は模擬データを返す
        setTimeout(() => {
          clearTimeout(timeout);
          resolve(this.getMockContainerInfo());
        }, 1000);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * コマンド頻度分析
   */
  private analyzeCommandFrequency(commandHistory: string[]): string[] {
    const frequency = new Map<string, number>();

    commandHistory.forEach(cmd => {
      const cleanCmd = cmd.trim();
      frequency.set(cleanCmd, (frequency.get(cleanCmd) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cmd]) => cmd)
      .filter(cmd => cmd.length > 2); // 短すぎるコマンドは除外
  }

  /**
   * 模擬コンテナ情報（開発用）
   */
  private getMockContainerInfo(): any {
    return {
      packageJson: JSON.stringify({
        name: 'remote-claude-app',
        dependencies: {
          'react-native': '^0.72.0',
          'react': '^18.0.0',
          '@react-navigation/native': '^6.0.0',
          'expo': '^49.0.0'
        },
        devDependencies: {
          'typescript': '^5.0.0',
          '@types/react': '^18.0.0'
        }
      }),
      fileExtensions: ['.tsx', '.ts', '.js', '.json', '.md'],
      recentFiles: [
        'src/screens/PreviewScreen.tsx',
        'src/services/EnhancedWebSocketService.ts',
        'src/services/ClaudeCodeIntegrationService.ts'
      ],
      runningProcesses: [
        'node /opt/expo/@expo/cli/build/bin/cli start',
        'jupyter notebook --ip=0.0.0.0'
      ],
      openPorts: [8888, 3000, 19000],
      hasWebSocketConnections: true,
      commandHistory: [
        'npm install',
        'expo start',
        'git status',
        'npm run android',
        'expo start',
        'git add .',
        'git commit -m "update"'
      ],
      gitInfo: {
        branch: 'main',
        lastCommit: 'Fix preview functionality',
        status: 'clean'
      }
    };
  }

  /**
   * 非同期プロジェクトコンテキスト設定
   */
  async setProjectContextAsync(projectId: string, projectName: string): Promise<void> {
    try {
      this.currentProject = {
        id: projectId,
        name: projectName,
        type: await this.detectProjectType(),
        language: await this.detectLanguages(),
        dependencies: await this.scanDependencies(),
        recentFiles: await this.getRecentFiles(),
        activeFeatures: await this.detectActiveFeatures(),
        commonCommands: await this.getCommonCommands(),
        gitInfo: await this.getGitInfo(),
      };
    } catch (error) {
      console.error('Failed to set project context:', error);
      // フォールバック: 静的な情報を使用
      this.setProjectContext(projectId, projectName);
    }
  }
}

export default new ClaudeCodeIntegrationService();