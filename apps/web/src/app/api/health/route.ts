import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getRedis } from '@/lib/redis'

export async function GET(request: NextRequest) {
  const checks = {
    database: false,
    redis: false,
    timestamp: new Date().toISOString(),
  }

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    checks.database = true
  } catch (error) {
    console.error('Database health check failed:', error)
  }

  try {
    // Check Redis connection (optional)
    const redis = getRedis()
    if (redis) {
      await redis.ping()
      checks.redis = true
    } else {
      checks.redis = true // Redis is optional, so we consider it healthy if not configured
    }
  } catch (error) {
    console.error('Redis health check failed:', error)
  }

  const isHealthy = checks.database && checks.redis
  const status = isHealthy ? 200 : 503

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks,
      uptime: process.uptime(),
    },
    { status }
  )
}
