import { describe, it, expect } from 'vitest'

// Mock time entry data for testing streak calculation
interface TimeEntry {
  id: string
  userId: string
  start: Date
  distractionFree: boolean
}

// Helper function to simulate streak calculation logic
function calculateStreak(
  entries: TimeEntry[],
  userId: string
): { currentStreak: number; bestStreak: number } {
  // Filter entries for the user and only distraction-free ones
  const userEntries = entries.filter(
    (entry) => entry.userId === userId && entry.distractionFree
  )

  // Get unique days with entries
  const uniqueDays = Array.from(
    new Set(
      userEntries.map((entry) => {
        const date = new Date(entry.start)
        return date.toISOString().split('T')[0] // YYYY-MM-DD format
      })
    )
  ).sort()

  if (uniqueDays.length === 0) {
    return { currentStreak: 0, bestStreak: 0 }
  }

  // Calculate current streak (from today backwards)
  const today = new Date().toISOString().split('T')[0]
  let currentStreak = 0
  let currentDate = new Date()

  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0]
    if (uniqueDays.includes(dateStr)) {
      currentStreak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      break
    }
  }

  // Calculate best streak (longest consecutive sequence)
  let bestStreak = 0
  let tempStreak = 1

  for (let i = 1; i < uniqueDays.length; i++) {
    const prevDate = new Date(uniqueDays[i - 1])
    const currDate = new Date(uniqueDays[i])
    const diffTime = currDate.getTime() - prevDate.getTime()
    const diffDays = diffTime / (1000 * 60 * 60 * 24)

    if (diffDays === 1) {
      tempStreak++
    } else {
      bestStreak = Math.max(bestStreak, tempStreak)
      tempStreak = 1
    }
  }

  bestStreak = Math.max(bestStreak, tempStreak)

  return { currentStreak, bestStreak }
}

describe('Streak Calculation', () => {
  const userId = 'user-123'

  it('should return zero streak for no entries', () => {
    const entries: TimeEntry[] = []
    const result = calculateStreak(entries, userId)

    expect(result.currentStreak).toBe(0)
    expect(result.bestStreak).toBe(0)
  })

  it('should return zero streak for no distraction-free entries', () => {
    const entries: TimeEntry[] = [
      {
        id: '1',
        userId,
        start: new Date(),
        distractionFree: false,
      },
    ]
    const result = calculateStreak(entries, userId)

    expect(result.currentStreak).toBe(0)
    expect(result.bestStreak).toBe(0)
  })

  it('should calculate current streak correctly', () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const twoDaysAgo = new Date(today)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const entries: TimeEntry[] = [
      {
        id: '1',
        userId,
        start: today,
        distractionFree: true,
      },
      {
        id: '2',
        userId,
        start: yesterday,
        distractionFree: true,
      },
      {
        id: '3',
        userId,
        start: twoDaysAgo,
        distractionFree: true,
      },
    ]

    const result = calculateStreak(entries, userId)
    expect(result.currentStreak).toBe(3)
  })

  it('should break streak on missing day', () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const threeDaysAgo = new Date(today)
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const entries: TimeEntry[] = [
      {
        id: '1',
        userId,
        start: today,
        distractionFree: true,
      },
      {
        id: '2',
        userId,
        start: yesterday,
        distractionFree: true,
      },
      // Missing day 2
      {
        id: '3',
        userId,
        start: threeDaysAgo,
        distractionFree: true,
      },
    ]

    const result = calculateStreak(entries, userId)
    expect(result.currentStreak).toBe(2) // Only today and yesterday
  })

  it('should calculate best streak correctly', () => {
    const dates = []
    const baseDate = new Date('2024-01-01')

    // Create 5 consecutive days
    for (let i = 0; i < 5; i++) {
      const date = new Date(baseDate)
      date.setDate(date.getDate() + i)
      dates.push(date)
    }

    // Skip a day, then add 3 more consecutive days
    for (let i = 6; i < 9; i++) {
      const date = new Date(baseDate)
      date.setDate(date.getDate() + i)
      dates.push(date)
    }

    const entries: TimeEntry[] = dates.map((date, index) => ({
      id: `entry-${index}`,
      userId,
      start: date,
      distractionFree: true,
    }))

    const result = calculateStreak(entries, userId)
    expect(result.bestStreak).toBe(5) // Longest consecutive sequence
  })

  it('should handle multiple entries on same day', () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const entries: TimeEntry[] = [
      {
        id: '1',
        userId,
        start: today,
        distractionFree: true,
      },
      {
        id: '2',
        userId,
        start: new Date(today.getTime() + 3600000), // 1 hour later
        distractionFree: true,
      },
      {
        id: '3',
        userId,
        start: yesterday,
        distractionFree: true,
      },
    ]

    const result = calculateStreak(entries, userId)
    expect(result.currentStreak).toBe(2) // Only count unique days
  })

  it('should ignore entries from other users', () => {
    const today = new Date()
    const otherUserId = 'other-user'

    const entries: TimeEntry[] = [
      {
        id: '1',
        userId,
        start: today,
        distractionFree: true,
      },
      {
        id: '2',
        userId: otherUserId,
        start: today,
        distractionFree: true,
      },
    ]

    const result = calculateStreak(entries, userId)
    expect(result.currentStreak).toBe(1)
    expect(result.bestStreak).toBe(1)
  })

  it('should handle edge case of single day', () => {
    const today = new Date()

    const entries: TimeEntry[] = [
      {
        id: '1',
        userId,
        start: today,
        distractionFree: true,
      },
    ]

    const result = calculateStreak(entries, userId)
    expect(result.currentStreak).toBe(1)
    expect(result.bestStreak).toBe(1)
  })

  it('should calculate streak across month boundaries', () => {
    const entries: TimeEntry[] = [
      {
        id: '1',
        userId,
        start: new Date('2024-01-31'),
        distractionFree: true,
      },
      {
        id: '2',
        userId,
        start: new Date('2024-02-01'),
        distractionFree: true,
      },
      {
        id: '3',
        userId,
        start: new Date('2024-02-02'),
        distractionFree: true,
      },
    ]

    const result = calculateStreak(entries, userId)
    expect(result.bestStreak).toBe(3)
  })

  it('should handle leap year correctly', () => {
    const entries: TimeEntry[] = [
      {
        id: '1',
        userId,
        start: new Date('2024-02-28'),
        distractionFree: true,
      },
      {
        id: '2',
        userId,
        start: new Date('2024-02-29'), // Leap day
        distractionFree: true,
      },
      {
        id: '3',
        userId,
        start: new Date('2024-03-01'),
        distractionFree: true,
      },
    ]

    const result = calculateStreak(entries, userId)
    expect(result.bestStreak).toBe(3)
  })
})
