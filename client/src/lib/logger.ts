type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LoggerMethods {
  error: (message: string, meta?: unknown) => void;
  warn: (message: string, meta?: unknown) => void;
  info: (message: string, meta?: unknown) => void;
  debug: (message: string, meta?: unknown) => void;
}

class ClientLogger implements LoggerMethods {
  private readonly levelPriority: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  };

  private currentLevel: number;

  constructor(level: LogLevel = 'debug') {
    this.currentLevel = this.levelPriority[level];
  }

  private send(level: LogLevel, message: string, meta?: unknown): void {
    // Явная типизация доступа к console
    const consoleMethod: keyof Console = level === 'debug' ? 'debug' :
                                       level === 'info' ? 'info' :
                                       level === 'warn' ? 'warn' : 'error';

    if (this.levelPriority[level] <= this.currentLevel) {
      console[consoleMethod](`[${level.toUpperCase()}] ${message}`, meta);
    }
  }

  private async sendToBackend(level: string, message: string, meta?: unknown): Promise<void> {
    try {
      await fetch('/client-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, message, meta })
      });
    } catch (e) {
      console.error('Failed to send log:', e);
    }
  }

  public error(message: string, meta?: unknown): void {
    this.send('error', message, meta);
  }

  public warn(message: string, meta?: unknown): void {
    this.send('warn', message, meta);
  }

  public info(message: string, meta?: unknown): void {
    this.send('info', message, meta);
  }

  public debug(message: string, meta?: unknown): void {
    this.send('debug', message, meta);
  }
}

// Создаем экземпляр логгера
export const logger = new ClientLogger('debug');