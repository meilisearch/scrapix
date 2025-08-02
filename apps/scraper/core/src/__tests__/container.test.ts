import { Container, SERVICES } from '../container'
import { Sender } from '../sender'
import { MeiliSearch } from 'meilisearch'
import { Config } from '../types'

describe('Container', () => {
  let container: Container
  let mockConfig: Config

  beforeEach(() => {
    container = new Container()
    mockConfig = {
      start_urls: ['https://example.com'],
      meilisearch_url: 'http://localhost:7700',
      meilisearch_api_key: 'test-key',
      meilisearch_index_uid: 'test-index',
      crawler_type: 'cheerio'
    }
  })

  describe('register and get', () => {
    it('should register and retrieve a value', () => {
      const testValue = { test: 'value' }
      container.registerValue(Symbol('test'), testValue)
      
      expect(container.get(Symbol('test'))).toBe(testValue)
    })

    it('should register and retrieve via factory', () => {
      const factory = jest.fn(() => ({ created: true }))
      const symbol = Symbol('factory-test')
      
      container.register(symbol, factory)
      
      const result = container.get(symbol)
      expect(result).toEqual({ created: true })
      expect(factory).toHaveBeenCalledWith(container)
    })

    it('should cache factory results', () => {
      const factory = jest.fn(() => ({ instance: Math.random() }))
      const symbol = Symbol('cache-test')
      
      container.register(symbol, factory)
      
      const result1 = container.get(symbol)
      const result2 = container.get(symbol)
      
      expect(result1).toBe(result2)
      expect(factory).toHaveBeenCalledTimes(1)
    })

    it('should throw error for unregistered service', () => {
      expect(() => container.get(Symbol('unknown'))).toThrow()
    })
  })

  describe('createDefault', () => {
    beforeEach(() => {
      container = Container.createDefault(mockConfig)
    })

    it('should register config', () => {
      const config = container.get<Config>(SERVICES.CONFIG)
      expect(config).toBe(mockConfig)
    })

    it('should create MeiliSearch client', () => {
      const client = container.get<MeiliSearch>(SERVICES.MEILISEARCH_CLIENT)
      expect(client).toBeInstanceOf(MeiliSearch)
    })

    it('should create Sender', () => {
      const sender = container.get<Sender>(SERVICES.SENDER)
      expect(sender).toBeInstanceOf(Sender)
      expect(sender.config).toBe(mockConfig)
    })
  })

  describe('dependency injection in tests', () => {
    it('should allow mocking dependencies', () => {
      // Create mock MeiliSearch client
      const mockClient = {
        index: jest.fn().mockReturnValue({
          addDocuments: jest.fn().mockResolvedValue({ taskUid: 123 })
        }),
        getIndex: jest.fn().mockRejectedValue(new Error('Index not found')),
        createIndex: jest.fn().mockResolvedValue({ taskUid: 456 }),
        waitForTask: jest.fn().mockResolvedValue({ status: 'succeeded' })
      }

      // Create mock webhook
      const mockWebhook = {
        started: jest.fn().mockResolvedValue(undefined),
        completed: jest.fn().mockResolvedValue(undefined)
      }

      // Create Sender with mocked dependencies
      const sender = new Sender(mockConfig, {
        client: mockClient as any,
        webhook: mockWebhook as any
      })

      expect(sender.client).toBe(mockClient)
    })
  })
})