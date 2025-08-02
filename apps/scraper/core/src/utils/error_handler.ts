import { Log } from '@crawlee/core'

const log = new Log({ prefix: 'ErrorHandler' })

export enum ErrorCode {
  // Configuration errors
  CONFIG_INVALID = 'CONFIG_INVALID',
  CONFIG_MISSING_REQUIRED = 'CONFIG_MISSING_REQUIRED',
  CONFIG_MEILISEARCH_CONNECTION = 'CONFIG_MEILISEARCH_CONNECTION',
  
  // Crawler errors
  CRAWLER_INIT_FAILED = 'CRAWLER_INIT_FAILED',
  CRAWLER_TYPE_UNSUPPORTED = 'CRAWLER_TYPE_UNSUPPORTED',
  CRAWLER_PAGE_LOAD_FAILED = 'CRAWLER_PAGE_LOAD_FAILED',
  
  // Sender errors
  SENDER_INIT_FAILED = 'SENDER_INIT_FAILED',
  SENDER_BATCH_FAILED = 'SENDER_BATCH_FAILED',
  SENDER_INDEX_NOT_FOUND = 'SENDER_INDEX_NOT_FOUND',
  
  // Network errors
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_CONNECTION_FAILED = 'NETWORK_CONNECTION_FAILED',
  
  // Job errors
  JOB_NOT_FOUND = 'JOB_NOT_FOUND',
  JOB_PROCESSING_FAILED = 'JOB_PROCESSING_FAILED',
  
  // Generic errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export class ScrapixError extends Error {
  code: ErrorCode
  details?: any
  statusCode: number

  constructor(code: ErrorCode, message: string, details?: any, statusCode: number = 500) {
    super(message)
    this.name = 'ScrapixError'
    this.code = code
    this.details = details
    this.statusCode = statusCode
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    }
  }
}

export function formatError(error: unknown): { message: string; code: ErrorCode; details?: any } {
  if (error instanceof ScrapixError) {
    return {
      message: error.message,
      code: error.code,
      details: error.details,
    }
  }

  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes('ECONNREFUSED')) {
      return {
        message: 'Failed to connect to the service. Please check if the service is running and the URL is correct.',
        code: ErrorCode.NETWORK_CONNECTION_FAILED,
        details: { originalMessage: error.message },
      }
    }

    if (error.message.includes('ETIMEDOUT')) {
      return {
        message: 'Request timed out. The service might be overloaded or the network is slow.',
        code: ErrorCode.NETWORK_TIMEOUT,
        details: { originalMessage: error.message },
      }
    }

    if (error.message.includes('Invalid configuration')) {
      return {
        message: error.message,
        code: ErrorCode.CONFIG_INVALID,
      }
    }

    if (error.message.includes('not found')) {
      return {
        message: error.message,
        code: ErrorCode.JOB_NOT_FOUND,
      }
    }

    // Generic error with original message
    return {
      message: error.message,
      code: ErrorCode.INTERNAL_ERROR,
      details: { stack: error.stack },
    }
  }

  // Unknown error type
  return {
    message: 'An unexpected error occurred. Please try again or contact support.',
    code: ErrorCode.INTERNAL_ERROR,
    details: { error: String(error) },
  }
}

export function logError(context: string, error: unknown, additionalInfo?: Record<string, any>) {
  const formatted = formatError(error)
  
  log.error(`[${context}] ${formatted.message}`, {
    code: formatted.code,
    details: formatted.details,
    ...additionalInfo,
  })
  
  return formatted
}