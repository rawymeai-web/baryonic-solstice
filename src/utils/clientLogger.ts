// Frontend logger utility

export const ClientLogger = {
  log: (action: string, details?: any) => {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        action,
        ...details
      };
      
      console.log(`%c[ACTION] ${action}`, 'background: #005f73; color: white; padding: 2px 5px; border-radius: 3px;', details || '');
      
      // We could optionally send this to a backend endpoint here if needed,
      // but logging clearly in the console is the first step.
    } catch (e) {
      console.error("ClientLogger failed", e);
    }
  },
  
  error: (action: string, error: any, details?: any) => {
    try {
      console.error(`%c[ERROR] ${action}`, 'background: #ae2012; color: white; padding: 2px 5px; border-radius: 3px;', error, details || '');
    } catch (e) {
      console.error("ClientLogger failed", e);
    }
  }
};
