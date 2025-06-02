import http from 'node:http'
import httpProxy from 'http-proxy'
import express from 'express'
import { URL } from 'node:url'
import { v4 as uuidv4 } from 'uuid'

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

class CrawlerProxy {
  private proxy: httpProxy
  private stats: ProxyStats
  private requestLogs: RequestLog[] = []
  private maxLogs = 1000

  constructor() {
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
    this.proxy.on('error', (err, req, res) => {
      console.error('Proxy error:', err.message)
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

    console.log(
      `[${log.timestamp.toISOString()}] ${log.method} ${log.url} - ${log.statusCode} (${log.duration}ms) - ${log.clientIP}`
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
        console.log('Daily stats reset')
      }
    }, 60000) // Check every minute
  }

  public handleHttpRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
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
    head: Buffer
  ): void {
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
      console.error('HTTPS tunnel error:', err.message)
      socket.end()
    })

    socket.on('error', (err: any) => {
      console.error('Client socket error:', err.message)
      targetSocket.end()
    })
  }

  public getStats(): ProxyStats {
    return { ...this.stats }
  }

  public getRecentLogs(limit: number = 50): RequestLog[] {
    return this.requestLogs.slice(0, limit)
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
app.get('/proxy-health', (req, res) => {
  res.json({
    status: 'healthy',
    region: process.env.FLY_REGION || 'local',
    timestamp: new Date().toISOString(),
    stats: crawlerProxy.getStats(),
  })
})

// Stats endpoint
app.get('/proxy-stats', (req, res) => {
  res.json({
    stats: crawlerProxy.getStats(),
    recentLogs: crawlerProxy.getRecentLogs(20),
  })
})

// Info endpoint
app.get('/proxy-info', (req, res) => {
  res.json({
    name: '@scrapix/proxy',
    version: '0.1.0',
    type: 'HTTP/HTTPS Proxy',
    region: process.env.FLY_REGION || 'local',
    uptime: process.uptime(),
    usage: {
      http: `http://${req.headers.host}`,
      https: `http://${req.headers.host}`,
      note: 'Configure your crawler to use this server as HTTP/HTTPS proxy',
    },
  })
})

// Start servers
const proxyPort = process.env.PROXY_PORT || 8080
const managementPort = process.env.PORT || 3000

proxyServer.listen(proxyPort, () => {
  console.log(`🌐 Scrapix HTTP/HTTPS Proxy running on port ${proxyPort}`)
  console.log(`📊 Management interface on port ${managementPort}`)
  console.log(`🌍 Region: ${process.env.FLY_REGION || 'local'}`)
})

app.listen(managementPort, () => {
  console.log(`✅ Management server ready`)
})
