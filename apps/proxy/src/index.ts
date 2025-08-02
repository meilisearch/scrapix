import http from 'node:http'
import httpProxy from 'http-proxy'
import express from 'express'
import { URL } from 'node:url'
import { v4 as uuidv4 } from 'uuid'
import { logger, LogLevel } from './logger'

interface ProxyStats {
  requestsToday: number
  totalRequests: number
  lastReset: Date
}

interface RequestLog {
  id: string
  timestamp: Date
  method: string
  url: string
  userAgent?: string
  statusCode?: number
  duration?: number
  clientIP: string
}

interface AuthConfig {
  enabled: boolean
  username?: string
  password?: string
  token?: string
}

class CrawlerProxy {
  private proxy: httpProxy
  private stats: ProxyStats
  private requestLogs: RequestLog[] = []
  private maxLogs = 1000
  private authConfig: AuthConfig

  constructor() {
    // Setup authentication from environment variables
    this.authConfig = {
      enabled: process.env.PROXY_AUTH_ENABLED === 'true',
      username: process.env.PROXY_AUTH_USERNAME,
      password: process.env.PROXY_AUTH_PASSWORD,
      token: process.env.PROXY_AUTH_TOKEN,
    }

    if (this.authConfig.enabled) {
      logger.info('Proxy authentication enabled')
      if (!this.authConfig.username && !this.authConfig.token) {
        logger.warn('Authentication enabled but no credentials configured!')
      }
    }
    this.proxy = httpProxy.createProxyServer({
      changeOrigin: true,
      followRedirects: true,
      timeout: 30000,
      proxyTimeout: 30000,
    })

    this.stats = {
      requestsToday: 0,
      totalRequests: 0,
      lastReset: new Date(),
    }

    this.setupProxyEvents()
    this.resetDailyStats()
  }

  private setupProxyEvents(): void {
    this.proxy.on('error', (err, _req, res) => {
      logger.error('Proxy error', err)
      if (res instanceof http.ServerResponse && !res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end('Proxy error: ' + err.message)
      }
    })

    this.proxy.on('proxyReq', (proxyReq, req) => {
      const requestId = uuidv4()
      const startTime = Date.now()

      // Add headers to identify the proxy
      proxyReq.setHeader('X-Scrapix-Proxy', 'true')
      proxyReq.setHeader('X-Scrapix-Region', process.env.FLY_REGION || 'local')
      proxyReq.setHeader('X-Request-ID', requestId)

      // Store request info for logging
      ;(req as any).proxyStartTime = startTime
      ;(req as any).proxyRequestId = requestId
    })

    this.proxy.on('proxyRes', (proxyRes, req) => {
      const duration = Date.now() - ((req as any).proxyStartTime || 0)
      const requestId = (req as any).proxyRequestId

      this.logRequest({
        id: requestId || uuidv4(),
        timestamp: new Date(),
        method: req.method || 'GET',
        url: req.url || '',
        userAgent: req.headers['user-agent'],
        statusCode: proxyRes.statusCode,
        duration,
        clientIP: this.getClientIP(req),
      })

      this.updateStats()
    })
  }

  private getClientIP(req: http.IncomingMessage): string {
    const forwarded = req.headers['x-forwarded-for']
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim()
    }
    return req.socket.remoteAddress || 'unknown'
  }

  private logRequest(log: RequestLog): void {
    this.requestLogs.unshift(log)
    if (this.requestLogs.length > this.maxLogs) {
      this.requestLogs = this.requestLogs.slice(0, this.maxLogs)
    }

    logger.debug(
      `${log.method} ${log.url} - ${log.statusCode} (${log.duration}ms) - ${log.clientIP}`
    )
  }

  private updateStats(): void {
    this.stats.totalRequests++
    this.stats.requestsToday++
  }

  private resetDailyStats(): void {
    setInterval(() => {
      const now = new Date()
      const lastReset = this.stats.lastReset

      if (
        now.getDate() !== lastReset.getDate() ||
        now.getMonth() !== lastReset.getMonth() ||
        now.getFullYear() !== lastReset.getFullYear()
      ) {
        this.stats.requestsToday = 0
        this.stats.lastReset = now
        logger.info('Daily stats reset')
      }
    }, 60000) // Check every minute
  }

  private authenticateRequest(req: http.IncomingMessage): boolean {
    if (!this.authConfig.enabled) {
      return true
    }

    const authHeader =
      req.headers['proxy-authorization'] || req.headers['authorization']

    if (!authHeader) {
      return false
    }

    // Check token-based auth
    if (this.authConfig.token) {
      const bearerMatch = authHeader.toString().match(/^Bearer (.+)$/i)
      if (bearerMatch && bearerMatch[1] === this.authConfig.token) {
        return true
      }
    }

    // Check basic auth
    if (this.authConfig.username && this.authConfig.password) {
      const basicMatch = authHeader.toString().match(/^Basic (.+)$/i)
      if (basicMatch) {
        const decoded = Buffer.from(basicMatch[1], 'base64').toString()
        const [username, password] = decoded.split(':')
        if (
          username === this.authConfig.username &&
          password === this.authConfig.password
        ) {
          return true
        }
      }
    }

    return false
  }

  private sendAuthRequired(res: http.ServerResponse): void {
    res.writeHead(407, {
      'Proxy-Authenticate': 'Basic realm="Scrapix Proxy"',
      'Content-Type': 'text/plain',
    })
    res.end('Proxy authentication required')
  }

  public handleHttpRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
    // Check authentication
    if (!this.authenticateRequest(req)) {
      this.sendAuthRequired(res)
      return
    }

    const url = new URL(req.url!, `http://${req.headers.host}`)

    // Don't proxy requests to the management interface
    if (url.pathname.startsWith('/proxy-')) {
      res.writeHead(404)
      res.end('Not found')
      return
    }

    this.proxy.web(req, res, {
      target: url.href,
      headers: {
        host: url.host,
      },
    })
  }

  public handleHttpsConnect(
    req: http.IncomingMessage,
    socket: any,
    _head: Buffer
  ): void {
    // Check authentication
    if (!this.authenticateRequest(req)) {
      socket.write('HTTP/1.1 407 Proxy Authentication Required\r\n')
      socket.write('Proxy-Authenticate: Basic realm="Scrapix Proxy"\r\n')
      socket.write('\r\n')
      socket.end()
      return
    }

    const [hostname, port] = req.url!.split(':')
    const targetPort = parseInt(port) || 443

    const targetSocket = new (require('net').Socket)()

    targetSocket.connect(targetPort, hostname, () => {
      socket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
      targetSocket.pipe(socket)
      socket.pipe(targetSocket)

      this.logRequest({
        id: uuidv4(),
        timestamp: new Date(),
        method: 'CONNECT',
        url: req.url!,
        clientIP: this.getClientIP(req),
      })

      this.updateStats()
    })

    targetSocket.on('error', (err: any) => {
      logger.error('HTTPS tunnel error', err)
      socket.end()
    })

    socket.on('error', (err: any) => {
      logger.error('Client socket error', err)
      targetSocket.end()
    })
  }

  public getStats(): ProxyStats {
    return { ...this.stats }
  }

  public getRecentLogs(limit: number = 50): RequestLog[] {
    return this.requestLogs.slice(0, limit)
  }

  public getAuthConfig(): AuthConfig {
    return { ...this.authConfig }
  }
}

// Create proxy instance
const crawlerProxy = new CrawlerProxy()

// Create HTTP server for proxy traffic
const proxyServer = http.createServer((req, res) => {
  crawlerProxy.handleHttpRequest(req, res)
})

// Handle HTTPS CONNECT method for SSL tunneling
proxyServer.on('connect', (req, socket, head) => {
  crawlerProxy.handleHttpsConnect(req, socket, head)
})

// Create Express app for management interface
const app = express()
app.use(express.json())

// Health check endpoint
app.get('/proxy-health', (_req, res) => {
  res.json({
    status: 'healthy',
    region: process.env.FLY_REGION || 'local',
    timestamp: new Date().toISOString(),
    stats: crawlerProxy.getStats(),
  })
})

// Stats endpoint
app.get('/proxy-stats', (_req, res) => {
  res.json({
    stats: crawlerProxy.getStats(),
    recentLogs: crawlerProxy.getRecentLogs(20),
  })
})

// Logs endpoint
app.get('/proxy-logs', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100
  const level = req.query.level as string
  let logLevel: LogLevel | undefined

  if (level) {
    logLevel = LogLevel[level.toUpperCase() as keyof typeof LogLevel]
  }

  res.json({
    logs: logger.getRecentLogs(limit, logLevel),
  })
})

// Info endpoint
app.get('/proxy-info', (req, res) => {
  const authConfig = crawlerProxy.getAuthConfig()
  const authInfo = authConfig.enabled
    ? {
        authentication: {
          enabled: true,
          methods: [
            authConfig.token ? 'Bearer token' : null,
            authConfig.username ? 'Basic auth' : null,
          ].filter(Boolean),
        },
      }
    : { authentication: { enabled: false } }

  res.json({
    name: '@scrapix/proxy',
    version: '0.1.0',
    type: 'HTTP/HTTPS Proxy',
    region: process.env.FLY_REGION || 'local',
    uptime: process.uptime(),
    ...authInfo,
    usage: {
      http: `http://${req.headers.host}`,
      https: `http://${req.headers.host}`,
      note: 'Configure your crawler to use this server as HTTP/HTTPS proxy',
      authExample: authConfig.enabled
        ? {
            basic: authConfig.username
              ? `http://username:password@${req.headers.host}`
              : undefined,
            bearer: authConfig.token
              ? 'Use Proxy-Authorization: Bearer YOUR_TOKEN header'
              : undefined,
          }
        : undefined,
    },
  })
})

// Start servers
const proxyPort = process.env.PROXY_PORT || 8080
const managementPort = process.env.PORT || 3000

proxyServer.listen(proxyPort, () => {
  logger.info(`Scrapix HTTP/HTTPS Proxy running on port ${proxyPort}`)
  logger.info(`Management interface on port ${managementPort}`)
  logger.info(`Region: ${process.env.FLY_REGION || 'local'}`)
})

app.listen(managementPort, () => {
  logger.info('Management server ready')
})
