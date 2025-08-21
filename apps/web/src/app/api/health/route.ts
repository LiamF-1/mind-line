import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const checks = {
    database: false,
    timestamp: new Date().toISOString(),
  }

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    checks.database = true
  } catch (error) {
    console.error('Database health check failed:', error)
  }

  const isHealthy = checks.database
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
