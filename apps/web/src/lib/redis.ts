import { Redis } from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

let redisClient: Redis | null = null

export const getRedis = (): Redis | null => {
  // Skip Redis in edge runtime
  if (process.env.NEXT_RUNTIME === 'edge') return null

  // Skip Redis during build time
  if (process.env.IS_BUILD) return null

  // Return existing connection if available
  if (redisClient) return redisClient

  // Use global Redis instance in development to prevent hot-reload issues
  if (process.env.NODE_ENV !== 'production') {
    if (globalForRedis.redis) {
      redisClient = globalForRedis.redis
      return redisClient
    }
  }

  try {
    // Create new Redis connection
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

    // Store in global for development
    if (process.env.NODE_ENV !== 'production') {
      globalForRedis.redis = redisClient
    }

    return redisClient
  } catch (error) {
    console.error('Failed to connect to Redis:', error)
    return null
  }
}

// Legacy export for backward compatibility - will be lazy-loaded
export const redis = {
  get client() {
    return getRedis()
  },
}
