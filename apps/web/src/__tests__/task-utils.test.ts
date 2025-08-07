import { describe, it, expect } from 'vitest'

// Task utility functions
export const getTaskPriorityColor = (
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
) => {
  const colors = {
    LOW: 'bg-gray-400',
    MEDIUM: 'bg-blue-400',
    HIGH: 'bg-orange-400',
    URGENT: 'bg-red-400',
  }
  return colors[priority]
}

export const isTaskOverdue = (dueDate: Date | null, status: string) => {
  if (!dueDate || status === 'COMPLETED' || status === 'ARCHIVED') {
    return false
  }
  return new Date(dueDate) < new Date()
}

export const getTaskStatusLabel = (
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
) => {
  const labels = {
    ACTIVE: 'Active',
    COMPLETED: 'Completed',
    ARCHIVED: 'Archived',
  }
  return labels[status]
}

export const sortTasksByOrder = (
  tasks: Array<{ id: string; order: number; createdAt: Date }>
) => {
  return [...tasks].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

describe('Task Utilities', () => {
  describe('getTaskPriorityColor', () => {
    it('should return correct color for LOW priority', () => {
      expect(getTaskPriorityColor('LOW')).toBe('bg-gray-400')
    })

    it('should return correct color for MEDIUM priority', () => {
      expect(getTaskPriorityColor('MEDIUM')).toBe('bg-blue-400')
    })

    it('should return correct color for HIGH priority', () => {
      expect(getTaskPriorityColor('HIGH')).toBe('bg-orange-400')
    })

    it('should return correct color for URGENT priority', () => {
      expect(getTaskPriorityColor('URGENT')).toBe('bg-red-400')
    })
  })

  describe('isTaskOverdue', () => {
    it('should return false for tasks with no due date', () => {
      expect(isTaskOverdue(null, 'ACTIVE')).toBe(false)
    })

    it('should return false for completed tasks', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      expect(isTaskOverdue(pastDate, 'COMPLETED')).toBe(false)
    })

    it('should return false for archived tasks', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      expect(isTaskOverdue(pastDate, 'ARCHIVED')).toBe(false)
    })

    it('should return true for active tasks past due date', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      expect(isTaskOverdue(pastDate, 'ACTIVE')).toBe(true)
    })

    it('should return false for active tasks with future due date', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day from now
      expect(isTaskOverdue(futureDate, 'ACTIVE')).toBe(false)
    })
  })

  describe('getTaskStatusLabel', () => {
    it('should return correct label for ACTIVE status', () => {
      expect(getTaskStatusLabel('ACTIVE')).toBe('Active')
    })

    it('should return correct label for COMPLETED status', () => {
      expect(getTaskStatusLabel('COMPLETED')).toBe('Completed')
    })

    it('should return correct label for ARCHIVED status', () => {
      expect(getTaskStatusLabel('ARCHIVED')).toBe('Archived')
    })
  })

  describe('sortTasksByOrder', () => {
    it('should sort tasks by order field', () => {
      const tasks = [
        { id: '1', order: 3, createdAt: new Date('2023-01-01') },
        { id: '2', order: 1, createdAt: new Date('2023-01-02') },
        { id: '3', order: 2, createdAt: new Date('2023-01-03') },
      ]

      const sorted = sortTasksByOrder(tasks)
      expect(sorted.map((t) => t.id)).toEqual(['2', '3', '1'])
    })

    it('should sort by createdAt when order is the same', () => {
      const tasks = [
        { id: '1', order: 1, createdAt: new Date('2023-01-01') },
        { id: '2', order: 1, createdAt: new Date('2023-01-03') },
        { id: '3', order: 1, createdAt: new Date('2023-01-02') },
      ]

      const sorted = sortTasksByOrder(tasks)
      // Should be sorted by newest first when order is the same
      expect(sorted.map((t) => t.id)).toEqual(['2', '3', '1'])
    })

    it('should not modify the original array', () => {
      const tasks = [
        { id: '1', order: 2, createdAt: new Date('2023-01-01') },
        { id: '2', order: 1, createdAt: new Date('2023-01-02') },
      ]

      const original = [...tasks]
      sortTasksByOrder(tasks)
      expect(tasks).toEqual(original)
    })
  })
})
