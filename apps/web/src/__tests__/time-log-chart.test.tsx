import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// Mock Recharts components
vi.mock('recharts', () => ({
  BarChart: ({ children, data }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Bar: ({ dataKey, fill }: any) => (
    <div data-testid="bar" data-key={dataKey} data-fill={fill} />
  ),
  XAxis: ({ dataKey }: any) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: ({ strokeDasharray }: any) => (
    <div data-testid="grid" data-stroke-dasharray={strokeDasharray} />
  ),
  Tooltip: ({ content }: any) => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => (
    <div
      data-testid="responsive-container"
      style={{ width: '100%', height: '100%' }}
    >
      {children}
    </div>
  ),
}))

// Simple chart component for testing
function TimeLogChart({
  data,
}: {
  data: Array<{ date: string; minutes: number; sessions: number }>
}) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-background rounded-lg border p-2 shadow-md">
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-blue-600">
                      {payload[0].value} minutes
                    </p>
                    <p className="text-sm text-gray-600">
                      {payload[0].payload.sessions} sessions
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="minutes" fill="#3b82f6" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

describe('Time Log Chart', () => {
  it('should render chart with data', () => {
    const mockData = [
      { date: 'Jan 01', minutes: 120, sessions: 3 },
      { date: 'Jan 02', minutes: 90, sessions: 2 },
      { date: 'Jan 03', minutes: 150, sessions: 4 },
    ]

    render(<TimeLogChart data={mockData} />)

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    expect(screen.getByTestId('bar')).toBeInTheDocument()
    expect(screen.getByTestId('x-axis')).toBeInTheDocument()
    expect(screen.getByTestId('y-axis')).toBeInTheDocument()
    expect(screen.getByTestId('grid')).toBeInTheDocument()
    expect(screen.getByTestId('tooltip')).toBeInTheDocument()
  })

  it('should pass correct data to chart', () => {
    const mockData = [
      { date: 'Jan 01', minutes: 120, sessions: 3 },
      { date: 'Jan 02', minutes: 90, sessions: 2 },
    ]

    render(<TimeLogChart data={mockData} />)

    const chartElement = screen.getByTestId('bar-chart')
    const chartData = JSON.parse(
      chartElement.getAttribute('data-chart-data') || '[]'
    )

    expect(chartData).toEqual(mockData)
  })

  it('should configure bar with correct properties', () => {
    const mockData = [{ date: 'Jan 01', minutes: 120, sessions: 3 }]

    render(<TimeLogChart data={mockData} />)

    const barElement = screen.getByTestId('bar')
    expect(barElement.getAttribute('data-key')).toBe('minutes')
    expect(barElement.getAttribute('data-fill')).toBe('#3b82f6')
  })

  it('should configure x-axis with date key', () => {
    const mockData = [{ date: 'Jan 01', minutes: 120, sessions: 3 }]

    render(<TimeLogChart data={mockData} />)

    const xAxisElement = screen.getByTestId('x-axis')
    expect(xAxisElement.getAttribute('data-key')).toBe('date')
  })

  it('should render with empty data', () => {
    render(<TimeLogChart data={[]} />)

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()

    const chartElement = screen.getByTestId('bar-chart')
    const chartData = JSON.parse(
      chartElement.getAttribute('data-chart-data') || '[]'
    )

    expect(chartData).toEqual([])
  })

  it('should handle data with zero values', () => {
    const mockData = [
      { date: 'Jan 01', minutes: 0, sessions: 0 },
      { date: 'Jan 02', minutes: 120, sessions: 3 },
      { date: 'Jan 03', minutes: 0, sessions: 0 },
    ]

    render(<TimeLogChart data={mockData} />)

    const chartElement = screen.getByTestId('bar-chart')
    const chartData = JSON.parse(
      chartElement.getAttribute('data-chart-data') || '[]'
    )

    expect(chartData).toEqual(mockData)
    expect(chartData[0].minutes).toBe(0)
    expect(chartData[2].minutes).toBe(0)
  })

  it('should handle large values correctly', () => {
    const mockData = [
      { date: 'Jan 01', minutes: 1440, sessions: 24 }, // 24 hours
      { date: 'Jan 02', minutes: 720, sessions: 12 }, // 12 hours
    ]

    render(<TimeLogChart data={mockData} />)

    const chartElement = screen.getByTestId('bar-chart')
    const chartData = JSON.parse(
      chartElement.getAttribute('data-chart-data') || '[]'
    )

    expect(chartData[0].minutes).toBe(1440)
    expect(chartData[0].sessions).toBe(24)
  })

  it('should maintain responsive container structure', () => {
    const mockData = [{ date: 'Jan 01', minutes: 120, sessions: 3 }]

    render(<TimeLogChart data={mockData} />)

    const container = screen.getByTestId('responsive-container')
    expect(container.style.width).toBe('100%')
    expect(container.style.height).toBe('100%')
  })
})
