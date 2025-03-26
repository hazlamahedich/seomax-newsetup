declare module '@/lib/utils/logger' {
  export interface Logger {
    debug: (message: string, data?: any) => void;
    info: (message: string, data?: any) => void;
    warn: (message: string, data?: any) => void;
    error: (message: string, data?: any) => void;
    log: (message: string, data?: any) => void;
    child: (options: Record<string, any>) => Logger;
  }

  export const logger: Logger;
} 