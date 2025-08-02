import { Webhook } from '../webhook'
import { Config } from '../types'
import axios from 'axios'

// Mock axios
jest.mock('axios')

describe('Webhook', () => {
  let mockConfig: Config
  let mockAxios: jest.Mocked<typeof axios>

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockAxios = axios as jest.Mocked<typeof axios>
    mockAxios.post.mockResolvedValue({ data: 'success' })

    mockConfig = {
      meilisearch_index_uid: 'test-index',
      meilisearch_url: 'http://localhost:7700',
      meilisearch_api_key: 'test-key',
      start_urls: ['https://example.com'],
      webhook_url: 'https://webhook.example.com/notify',
      webhook_payload: { environment: 'test' },
    } as Config
  })

  afterEach(() => {
    // Clear singleton instance
    Webhook['webhook'] = undefined
  })

  describe('get', () => {
    it('should return singleton instance', () => {
      const webhook1 = Webhook.get(mockConfig)
      const webhook2 = Webhook.get(mockConfig)

      expect(webhook1).toBe(webhook2)
    })

    it('should create new instance if config changes', () => {
      const webhook1 = Webhook.get(mockConfig)
      
      const newConfig = { ...mockConfig, webhook_url: 'https://new-webhook.com' }
      const webhook2 = Webhook.get(newConfig)

      expect(webhook1).not.toBe(webhook2)
    })

    it('should return no-op webhook when webhook_url is not configured', () => {
      const configWithoutWebhook = { ...mockConfig, webhook_url: undefined }
      const webhook = Webhook.get(configWithoutWebhook)

      expect(webhook).toBeDefined()
      // Should not throw when calling methods
      expect(() => webhook.started(configWithoutWebhook)).not.toThrow()
    })
  })

  describe('webhook notifications', () => {
    let webhook: Webhook

    beforeEach(() => {
      webhook = Webhook.get(mockConfig)
    })

    it('should send started notification', async () => {
      await webhook.started(mockConfig)

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://webhook.example.com/notify',
        expect.objectContaining({
          status: 'started',
          date: expect.any(String),
          meilisearch_url: 'http://localhost:7700',
          meilisearch_index_uid: 'test-index',
          webhook_payload: { environment: 'test' },
        })
      )
    })

    it('should send active notification with statistics', async () => {
      const stats = {
        nb_page_crawled: 10,
        nb_page_indexed: 8,
        nb_documents_sent: 50,
      }

      await webhook.active(mockConfig, stats)

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://webhook.example.com/notify',
        expect.objectContaining({
          status: 'active',
          date: expect.any(String),
          meilisearch_url: 'http://localhost:7700',
          meilisearch_index_uid: 'test-index',
          webhook_payload: { environment: 'test' },
          ...stats,
        })
      )
    })

    it('should send completed notification', async () => {
      await webhook.completed(mockConfig, 100)

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://webhook.example.com/notify',
        expect.objectContaining({
          status: 'completed',
          date: expect.any(String),
          meilisearch_url: 'http://localhost:7700',
          meilisearch_index_uid: 'test-index',
          webhook_payload: { environment: 'test' },
          nb_documents_sent: 100,
        })
      )
    })

    it('should send failed notification', async () => {
      const error = new Error('Crawling failed')
      
      await webhook.failed(mockConfig, error)

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://webhook.example.com/notify',
        expect.objectContaining({
          status: 'failed',
          date: expect.any(String),
          meilisearch_url: 'http://localhost:7700',
          meilisearch_index_uid: 'test-index',
          webhook_payload: { environment: 'test' },
          error: 'Crawling failed',
        })
      )
    })

    it('should handle webhook sending errors gracefully', async () => {
      mockAxios.post.mockRejectedValue(new Error('Network error'))
      
      // Should not throw
      await expect(webhook.started(mockConfig)).resolves.not.toThrow()
    })

    it('should set correct authorization header when token is provided', async () => {
      process.env.WEBHOOK_TOKEN = 'secret-token'
      
      webhook = Webhook.get(mockConfig)
      await webhook.started(mockConfig)

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer secret-token',
          },
        })
      )

      delete process.env.WEBHOOK_TOKEN
    })
  })

  describe('NoOpWebhook', () => {
    it('should not make any HTTP calls', async () => {
      const configWithoutWebhook = { ...mockConfig, webhook_url: undefined }
      const webhook = Webhook.get(configWithoutWebhook)

      await webhook.started(configWithoutWebhook)
      await webhook.active(configWithoutWebhook, { nb_page_crawled: 10, nb_page_indexed: 10, nb_documents_sent: 10 })
      await webhook.completed(configWithoutWebhook, 100)
      await webhook.failed(configWithoutWebhook, new Error('test'))

      expect(mockAxios.post).not.toHaveBeenCalled()
    })
  })
})