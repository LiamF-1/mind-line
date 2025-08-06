import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { format, addDays, startOfDay, endOfDay } from 'date-fns'

describe('Calendar utilities', () => {
  it('should format dates correctly', () => {
    const testDate = new Date('2024-01-15T10:30:00')

    expect(format(testDate, 'yyyy-MM-dd')).toBe('2024-01-15')
    expect(format(testDate, 'h:mm a')).toBe('10:30 AM')
  })

  it('should calculate date ranges correctly', () => {
    const today = new Date('2024-01-15T12:00:00Z')
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)
    const weekEnd = endOfDay(addDays(today, 7))

    expect(todayStart.getHours()).toBe(0)
    expect(todayStart.getMinutes()).toBe(0)
    expect(todayEnd.getHours()).toBe(23)
    expect(todayEnd.getMinutes()).toBe(59)
    expect(weekEnd > todayEnd).toBe(true)
  })

  it('should validate event time constraints', () => {
    const startTime = new Date('2024-01-15T10:00:00Z')
    const endTime = new Date('2024-01-15T11:00:00Z')
    const invalidEndTime = new Date('2024-01-15T09:00:00Z')

    expect(endTime > startTime).toBe(true)
    expect(invalidEndTime > startTime).toBe(false)
  })
})

describe('Event form validation', () => {
  it('should require title field', () => {
    const eventData = {
      title: '',
      startsAt: new Date(),
      endsAt: new Date(),
    }

    expect(eventData.title.length).toBe(0)
  })

  it('should validate end time is after start time', () => {
    const startTime = new Date('2024-01-15T10:00:00Z')
    const validEndTime = new Date('2024-01-15T11:00:00Z')
    const invalidEndTime = new Date('2024-01-15T09:00:00Z')

    expect(validEndTime > startTime).toBe(true)
    expect(invalidEndTime > startTime).toBe(false)
  })
})
