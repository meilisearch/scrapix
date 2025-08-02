/**
 * Dependency Injection Container for Scrapix
 * 
 * Provides a simple IoC container for managing dependencies
 * and improving testability throughout the codebase.
 */

// import { MeiliSearch } from 'meilisearch'
import { Sender } from './sender'
import { Config } from './types'
import { initMeilisearchClient } from './utils/meilisearch_client'
import { Webhook } from './webhook'
import { Log } from '@crawlee/core'

/**
 * Service identifiers for dependency injection
 */
export const SERVICES = {
  MEILISEARCH_CLIENT: Symbol('MeiliSearchClient'),
  SENDER: Symbol('Sender'),
  WEBHOOK: Symbol('Webhook'),
  LOGGER: Symbol('Logger'),
  CONFIG: Symbol('Config'),
} as const

/**
 * Service factory functions
 */
export type ServiceFactory<T> = (container: Container) => T

/**
 * Simple dependency injection container
 */
export class Container {
  private services = new Map<symbol, any>()
  private factories = new Map<symbol, ServiceFactory<any>>()

  /**
   * Register a factory function for a service
   */
  register<T>(identifier: symbol, factory: ServiceFactory<T>): void {
    this.factories.set(identifier, factory)
  }

  /**
   * Register a singleton value
   */
  registerValue<T>(identifier: symbol, value: T): void {
    this.services.set(identifier, value)
  }

  /**
   * Get a service instance
   */
  get<T>(identifier: symbol): T {
    // Check if we have a cached instance
    if (this.services.has(identifier)) {
      return this.services.get(identifier)
    }

    // Check if we have a factory
    const factory = this.factories.get(identifier)
    if (!factory) {
      throw new Error(`Service ${identifier.toString()} not registered`)
    }

    // Create and cache the instance
    const instance = factory(this)
    this.services.set(identifier, instance)
    return instance
  }

  /**
   * Clear all cached services
   */
  clear(): void {
    this.services.clear()
  }

  /**
   * Create a new container with default services
   */
  static createDefault(config: Config): Container {
    const container = new Container()

    // Register config
    container.registerValue(SERVICES.CONFIG, config)

    // Register logger factory
    container.register(SERVICES.LOGGER, () => {
      return new Log({ prefix: 'Scrapix' })
    })

    // Register Meilisearch client factory
    container.register(SERVICES.MEILISEARCH_CLIENT, (c) => {
      const cfg = c.get<Config>(SERVICES.CONFIG)
      return initMeilisearchClient({
        host: cfg.meilisearch_url,
        apiKey: cfg.meilisearch_api_key,
        clientAgents: cfg.user_agents,
      })
    })

    // Register Sender factory
    container.register(SERVICES.SENDER, (c) => {
      const cfg = c.get<Config>(SERVICES.CONFIG)
      return new Sender(cfg)
    })

    // Register Webhook factory
    container.register(SERVICES.WEBHOOK, (c) => {
      const cfg = c.get<Config>(SERVICES.CONFIG)
      return Webhook.get(cfg)
    })

    return container
  }
}

/**
 * Global container instance (optional, for backwards compatibility)
 */
let globalContainer: Container | null = null

export function setGlobalContainer(container: Container): void {
  globalContainer = container
}

export function getGlobalContainer(): Container {
  if (!globalContainer) {
    throw new Error('Global container not initialized')
  }
  return globalContainer
}