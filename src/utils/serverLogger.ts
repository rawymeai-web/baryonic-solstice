export const ServerLogger = {
  log: (action: string, details?: any) => {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        action,
        ...details
      };
      
      console.log(JSON.stringify(logEntry));
    } catch (e) {
      console.error("Failed to write structured log", e);
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
      
      console.error(JSON.stringify(logEntry));
    } catch (e) {
      console.error("Failed to write structured error log", e);
    }
  }
};

