export type RootStackParamList = {
  QRScanner: undefined;
  ServerList: undefined;
  ProjectList: {
    connectionUrl?: string;
    sessionKey?: string;
  };
  Development: {
    projectId: string;
    projectName: string;
    connectionUrl: string;
    sessionKey: string;
    serverInfo?: {
      id: string;
      name: string;
      host: string;
      port: number;
    };
    project?: {
      id: string;
      name: string;
    };
  };
  Settings: undefined;
};