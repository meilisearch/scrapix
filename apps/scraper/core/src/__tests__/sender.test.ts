import { Sender } from '../sender'
import { Config } from '../types'
import { MeiliSearch } from 'meilisearch'

// Mock dependencies
jest.mock('meilisearch')
jest.mock('../webhook')
jest.mock('@crawlee/core')

describe('Sender', () => {
  let sender: Sender
  let mockConfig: Config
  let mockMeiliSearchClient: jest.Mocked<MeiliSearch>

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Setup mock config
    mockConfig = {
      meilisearch_index_uid: 'test-index',
      meilisearch_url: 'http://localhost:7700',
      meilisearch_api_key: 'test-key',
      start_urls: ['https://example.com'],
      batch_size: 10,
    } as Config

    // Setup mock MeiliSearch client
    mockMeiliSearchClient = {
      index: jest.fn().mockReturnThis(),
      addDocuments: jest.fn().mockResolvedValue({ taskUid: 123 }),
      updateSettings: jest.fn().mockResolvedValue({ taskUid: 124 }),
      waitForTask: jest.fn().mockResolvedValue({}),
      getIndex: jest.fn().mockResolvedValue({
        getStats: jest.fn().mockResolvedValue({ numberOfDocuments: 100 }),
      }),
      deleteIndex: jest.fn().mockResolvedValue({ taskUid: 125 }),
      swapIndexes: jest.fn().mockResolvedValue({}),
    } as any

    // Mock the MeiliSearch constructor
    ;(MeiliSearch as jest.MockedClass<typeof MeiliSearch>).mockImplementation(
      () => mockMeiliSearchClient
    )

    sender = new Sender(mockConfig)
  })

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(sender.config).toBe(mockConfig)
      expect(sender.initial_index_uid).toBe('test-index')
      expect(sender.index_uid).toBe('test-index')
      expect(sender.batch_size).toBe(10)
      expect(sender.queue).toEqual([])
      expect(sender.nb_documents_sent).toBe(0)
    })
  })

  describe('add', () => {
    it('should add documents to queue when batch size is set', async () => {
      const document = { url: 'https://example.com', title: 'Test' }
      await sender.add(document)

      expect(sender.queue).toHaveLength(1)
      expect(sender.queue[0]).toEqual(document)
    })

    it('should trigger batch send when queue reaches batch size', async () => {
      // Spy on __batchSend
      const batchSendSpy = jest.spyOn(sender as any, '__batchSend')
      batchSendSpy.mockResolvedValue(undefined)

      // Add documents up to batch size
      for (let i = 0; i < 10; i++) {
        await sender.add({ url: `https://example.com/${i}`, title: `Test ${i}` })
      }

      expect(batchSendSpy).toHaveBeenCalledTimes(1)
    })

    it('should send immediately when batch_size is not set', async () => {
      sender.batch_size = 0
      const document = { url: 'https://example.com', title: 'Test' }

      await sender.add(document)

      expect(mockMeiliSearchClient.index).toHaveBeenCalledWith('test-index')
      expect(mockMeiliSearchClient.addDocuments).toHaveBeenCalledWith([document])
    })
  })

  describe('__batchSend', () => {
    it('should send documents and track task IDs', async () => {
      sender.queue = [
        { url: 'https://example.com/1', title: 'Test 1' },
        { url: 'https://example.com/2', title: 'Test 2' },
      ]

      await (sender as any).__batchSend()

      expect(mockMeiliSearchClient.index).toHaveBeenCalledWith('test-index')
      expect(mockMeiliSearchClient.addDocuments).toHaveBeenCalledWith(sender.queue)
      expect(sender.pendingTasks).toContain(123)
      expect(sender.queue).toHaveLength(0)
    })

    it('should retry on failure with exponential backoff', async () => {
      sender.queue = [{ url: 'https://example.com', title: 'Test' }]
      
      // Mock failure then success
      mockMeiliSearchClient.addDocuments
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ taskUid: 123 })

      await (sender as any).__batchSend()

      expect(mockMeiliSearchClient.addDocuments).toHaveBeenCalledTimes(2)
      expect(sender.queue).toHaveLength(0)
    })

    it('should throw error after max retries', async () => {
      sender.queue = [{ url: 'https://example.com', title: 'Test' }]
      
      // Mock continuous failures
      mockMeiliSearchClient.addDocuments.mockRejectedValue(new Error('Network error'))

      await expect((sender as any).__batchSend()).rejects.toThrow('Network error')
      expect(mockMeiliSearchClient.addDocuments).toHaveBeenCalledTimes(4) // 1 initial + 3 retries
    })
  })

  describe('finish', () => {
    it('should send remaining documents and wait for pending tasks', async () => {
      sender.queue = [{ url: 'https://example.com', title: 'Test' }]
      sender.pendingTasks = [123, 124]

      await sender.finish()

      // Should send remaining documents
      expect(mockMeiliSearchClient.addDocuments).toHaveBeenCalled()
      
      // Should wait for pending tasks
      expect(mockMeiliSearchClient.waitForTask).toHaveBeenCalledWith(123, { timeOutMs: 30000 })
      expect(mockMeiliSearchClient.waitForTask).toHaveBeenCalledWith(124, { timeOutMs: 30000 })
    })

    it('should handle index swapping when using temporary index', async () => {
      sender.index_uid = 'test-index_crawler_tmp'
      sender.initial_index_uid = 'test-index'

      await sender.finish()

      expect(mockMeiliSearchClient.swapIndexes).toHaveBeenCalledWith([
        { indexes: ['test-index', 'test-index_crawler_tmp'] },
      ])
    })
  })

  describe('init', () => {
    it('should create temporary index when configured', async () => {
      await sender.init()

      // Should check if index exists
      expect(mockMeiliSearchClient.getIndex).toHaveBeenCalledWith('test-index')
    })

    it('should update settings when provided', async () => {
      mockConfig.meilisearch_settings = { searchableAttributes: ['title'] }
      sender = new Sender(mockConfig)

      await sender.init()

      expect(mockMeiliSearchClient.updateSettings).toHaveBeenCalledWith({
        searchableAttributes: ['title'],
      })
    })
  })
})