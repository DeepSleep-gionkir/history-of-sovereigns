export interface ActionResponse {
  success: boolean;
  result?: {
    narrative: string;
    news_headline?: string;
    changes?: Record<string, number>;
  };
  error?: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  command: string;
  result: string;
  headline?: string;
}
