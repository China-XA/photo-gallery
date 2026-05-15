interface LogEntry {
  id: string
  timestamp: number
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  details?: Record<string, unknown>
}

class Logger {
  private logs: LogEntry[] = []
  private maxLogs = 1000

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  info(message: string, details?: Record<string, unknown>) {
    this.addLog('info', message, details)
  }

  warn(message: string, details?: Record<string, unknown>) {
    this.addLog('warn', message, details)
  }

  error(message: string, details?: Record<string, unknown>) {
    this.addLog('error', message, details)
  }

  debug(message: string, details?: Record<string, unknown>) {
    this.addLog('debug', message, details)
  }

  private addLog(level: LogEntry['level'], message: string, details?: Record<string, unknown>) {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      message,
      details
    }

    this.logs.unshift(entry)

    if (this.logs.length > this.maxLogs) {
      this.logs.pop()
    }

    if (level === 'error') {
      console.error(`[ERROR] ${message}`, details)
    } else if (level === 'warn') {
      console.warn(`[WARN] ${message}`, details)
    } else {
      console.debug(`[${level.toUpperCase()}] ${message}`, details)
    }
  }

  getLogs(limit = 50): LogEntry[] {
    return this.logs.slice(0, limit)
  }

  getLogsByLevel(level: LogEntry['level'], limit = 50): LogEntry[] {
    return this.logs.filter(log => log.level === level).slice(0, limit)
  }

  clearLogs(): void {
    this.logs = []
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  downloadLogs(): void {
    const content = this.exportLogs()
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gallery-logs-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

export const logger = new Logger()

export type { LogEntry }