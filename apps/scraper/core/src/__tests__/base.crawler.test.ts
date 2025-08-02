import { BaseCrawler } from '../crawlers/base'
import { Sender } from '../sender'
import { Config, CrawlerType } from '../types'
import * as cheerio from 'cheerio'
import { minimatch } from 'minimatch'

// Mock dependencies
jest.mock('../sender')
jest.mock('minimatch')

// Create a concrete implementation for testing
class TestCrawler extends BaseCrawler {
  crawlerType: CrawlerType = 'cheerio'
  
  createRouter() {
    return {} as any
  }
  
  getCrawlerOptions() {
    return {} as any
  }
  
  createCrawlerInstance() {
    return {} as any
  }
  
  async defaultHandler() {
    // Empty implementation for testing
  }
}

describe('BaseCrawler', () => {
  let crawler: TestCrawler
  let mockSender: jest.Mocked<Sender>
  let mockConfig: Config

  beforeEach(() => {
    jest.clearAllMocks()

    mockConfig = {
      start_urls: ['https://example.com'],
      meilisearch_index_uid: 'test-index',
      meilisearch_url: 'http://localhost:7700',
      meilisearch_api_key: 'test-key',
    } as Config

    mockSender = {
      add: jest.fn(),
      finish: jest.fn(),
      init: jest.fn(),
      nb_documents_sent: 0,
    } as any

    crawler = new TestCrawler(mockSender, mockConfig)
  })

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(crawler.sender).toBe(mockSender)
      expect(crawler.config).toBe(mockConfig)
      expect(crawler.nb_page_crawled).toBe(0)
      expect(crawler.nb_page_indexed).toBe(0)
      expect(crawler.urls).toEqual(['https://example.com'])
    })

    it('should handle proxy configuration', () => {
      const configWithProxy = {
        ...mockConfig,
        proxy_configuration: {
          proxyUrls: ['http://proxy1.com', 'http://proxy2.com'],
        },
      }
      
      const crawlerWithProxy = new TestCrawler(mockSender, configWithProxy)
      expect(crawlerWithProxy.proxyConfiguration).toBeDefined()
    })
  })

  describe('__generate_globs', () => {
    it('should generate correct glob patterns for URLs', () => {
      const urls = ['https://example.com/', 'https://test.com/path']
      const globs = (crawler as any).__generate_globs(urls)

      expect(globs).toEqual([
        'https://example.com/',
        'https://example.com/**',
        'https://test.com/path',
        'https://test.com/path/**',
      ])
    })
  })

  describe('__match_globs', () => {
    it('should match URLs against glob patterns', () => {
      const mockMinimatch = minimatch as jest.MockedFunction<typeof minimatch>
      mockMinimatch.mockReturnValue(true)

      const result = (crawler as any).__match_globs('https://example.com/page', ['https://example.com/**'])
      
      expect(result).toBe(true)
      expect(mockMinimatch).toHaveBeenCalledWith('https://example.com/page', 'https://example.com/**')
    })
  })

  describe('__is_file_url', () => {
    it('should identify file URLs correctly', () => {
      const fileUrls = [
        'https://example.com/file.pdf',
        'https://example.com/image.jpg',
        'https://example.com/data.json',
        'https://example.com/archive.zip',
      ]

      const nonFileUrls = [
        'https://example.com/page',
        'https://example.com/index.html',
        'https://example.com/about',
      ]

      fileUrls.forEach(url => {
        expect((crawler as any).__is_file_url(url)).toBe(true)
      })

      nonFileUrls.forEach(url => {
        expect((crawler as any).__is_file_url(url)).toBe(false)
      })
    })

    it('should ignore query parameters when checking file extensions', () => {
      expect((crawler as any).__is_file_url('https://example.com/file.pdf?version=2')).toBe(true)
      expect((crawler as any).__is_file_url('https://example.com/page?file=test.pdf')).toBe(false)
    })
  })

  describe('__is404Page', () => {
    it('should detect 404 pages using default selectors', () => {
      const $ = cheerio.load('<h1>404 - Page Not Found</h1>')
      expect((crawler as any).__is404Page($)).toBe(true)
    })

    it('should use custom selectors when provided', () => {
      mockConfig.not_found_selectors = ['.custom-404']
      crawler = new TestCrawler(mockSender, mockConfig)

      const $ = cheerio.load('<div class="custom-404">Not Found</div>')
      expect((crawler as any).__is404Page($)).toBe(true)
    })

    it('should check body text for common error messages', () => {
      const $ = cheerio.load('<body>The page you are looking for could not be found.</body>')
      expect((crawler as any).__is404Page($)).toBe(true)
    })

    it('should return false for normal pages', () => {
      const $ = cheerio.load('<h1>Welcome to our website</h1><p>This is content.</p>')
      expect((crawler as any).__is404Page($)).toBe(false)
    })
  })

  describe('handlePage', () => {
    it('should process pages within configured URLs', async () => {
      const mockContext = {
        request: {
          loadedUrl: 'https://example.com/page',
        },
        $: cheerio.load('<h1>Test Page</h1>'),
        enqueueLinks: jest.fn(),
      }

      mockConfig.urls_to_index = ['https://example.com/**']
      crawler = new TestCrawler(mockSender, mockConfig)
      crawler.scraper = {
        get: jest.fn(),
      } as any

      await crawler.handlePage(mockContext as any)

      expect(crawler.nb_page_indexed).toBe(1)
      expect(crawler.scraper.get).toHaveBeenCalledWith('https://example.com/page', mockContext.$)
    })

    it('should skip excluded URLs', async () => {
      const mockContext = {
        request: {
          loadedUrl: 'https://example.com/admin/page',
        },
        $: cheerio.load('<h1>Admin Page</h1>'),
        enqueueLinks: jest.fn(),
      }

      mockConfig.urls_to_not_index = ['https://example.com/admin/**']
      crawler = new TestCrawler(mockSender, mockConfig)
      crawler.scraper = {
        get: jest.fn(),
      } as any

      await crawler.handlePage(mockContext as any)

      expect(crawler.nb_page_indexed).toBe(0)
      expect(crawler.scraper.get).not.toHaveBeenCalled()
    })

    it('should clean up Cheerio instances for Puppeteer crawler', async () => {
      crawler.crawlerType = 'puppeteer'
      
      const mockContext = {
        request: {
          loadedUrl: 'https://example.com/page',
        },
        page: {
          content: jest.fn().mockResolvedValue('<h1>Test</h1>'),
          removeAllListeners: jest.fn(),
        },
        enqueueLinks: jest.fn(),
      }

      mockConfig.urls_to_index = ['https://example.com/**']
      crawler = new TestCrawler(mockSender, mockConfig)
      crawler.scraper = {
        get: jest.fn(),
      } as any

      await crawler.handlePage(mockContext as any)

      expect(mockContext.page.removeAllListeners).toHaveBeenCalled()
    })
  })
})