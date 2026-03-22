/**
 * Logger — ALL output goes to stderr to keep stdout clean for MCP JSON-RPC.
 * NEVER use console.log anywhere in this project.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function log(level: LogLevel, msg: string, ...args: unknown[]): void {
  const ts = new Date().toISOString();
  console.error(`[wot-mcp][${level}] ${ts} ${msg}`, ...args);
}

export const logger = {
  info: (msg: string, ...args: unknown[]) => log('info', msg, ...args),
  warn: (msg: string, ...args: unknown[]) => log('warn', msg, ...args),
  error: (msg: string, ...args: unknown[]) => log('error', msg, ...args),
  debug: (msg: string, ...args: unknown[]) => log('debug', msg, ...args),
};
