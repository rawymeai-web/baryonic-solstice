import fs from 'fs';
import path from 'path';

const LOG_FILE_PATH = path.join(process.cwd(), 'system_debug_log.jsonl');

export const ServerLogger = {
  log: (action: string, details?: any) => {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        action,
        ...details
      };
      
      console.log(`[ACTION LOG]: ${action}`);
      fs.appendFileSync(LOG_FILE_PATH, JSON.stringify(logEntry) + '\n');
    } catch (e) {
      console.error("Failed to write to system_debug_log.jsonl", e);
    }
  },
  
  error: (action: string, error: any, details?: any) => {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        action,
        error: error?.message || String(error),
        stack: error?.stack,
        ...details
      };
      
      console.error(`[ACTION ERROR]: ${action} - ${error?.message}`);
      fs.appendFileSync(LOG_FILE_PATH, JSON.stringify(logEntry) + '\n');
    } catch (e) {
      console.error("Failed to write error to system_debug_log.jsonl", e);
    }
  }
};
