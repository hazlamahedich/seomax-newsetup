// Basic logger utility for standardized logging across the application

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, data?: any) => void;
  log: (message: string, data?: any) => void;
  child: (options: Record<string, any>) => Logger;
}

const formatMessage = (level: LogLevel, message: string, data?: any, prefix?: string): string => {
  const timestamp = new Date().toISOString();
  const prefixStr = prefix ? `[${prefix}] ` : '';
  return `[${timestamp}] ${prefixStr}[${level.toUpperCase()}] ${message}${data ? ` ${JSON.stringify(data)}` : ''}`;
};

const createLogger = (prefix?: string): Logger => ({
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatMessage('debug', message, data, prefix));
    }
  },
  info: (message: string, data?: any) => {
    console.info(formatMessage('info', message, data, prefix));
  },
  warn: (message: string, data?: any) => {
    console.warn(formatMessage('warn', message, data, prefix));
  },
  error: (message: string, data?: any) => {
    console.error(formatMessage('error', message, data, prefix));
  },
  log: (message: string, data?: any) => {
    console.log(formatMessage('info', message, data, prefix));
  },
  child: (options: Record<string, any>) => {
    const childPrefix = prefix ? `${prefix}:${options.name || ''}` : options.name;
    return createLogger(childPrefix);
  }
});

export const logger: Logger = createLogger();

export default logger; 