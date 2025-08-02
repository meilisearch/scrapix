export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogEntry {
  timestamp: Date
  level: LogLevel
  message: string
  data?: any
}

export class Logger {
  private static instance: Logger
  private logLevel: LogLevel
  private logs: LogEntry[] = []
  private maxLogs = 5000

  private constructor() {
    const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO'
    this.logLevel = LogLevel[level as keyof typeof LogLevel] || LogLevel.INFO
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString()
    const levelName = LogLevel[level]
    const icons = {
      [LogLevel.ERROR]: '❌',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.INFO]: '✅',
      [LogLevel.DEBUG]: '🔍',
    }
    return `[${timestamp}] ${icons[level]} ${levelName}: ${message}`
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (level > this.logLevel) return

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
    }

    this.logs.unshift(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    const formattedMessage = this.formatMessage(level, message)

    if (data) {
      console.log(formattedMessage, data)
    } else {
      console.log(formattedMessage)
    }
  }

  error(message: string, error?: Error | any): void {
    this.log(LogLevel.ERROR, message, error)
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data)
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data)
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data)
  }

  getRecentLogs(limit = 100, level?: LogLevel): LogEntry[] {
    let filtered = this.logs
    if (level !== undefined) {
      filtered = this.logs.filter((log) => log.level === level)
    }
    return filtered.slice(0, limit)
  }

  clear(): void {
    this.logs = []
  }
}

export const logger = Logger.getInstance()
