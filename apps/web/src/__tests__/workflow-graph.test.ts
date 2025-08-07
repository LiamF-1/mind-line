import { describe, it, expect } from 'vitest'
import {
  detectCircularDependencies,
  canAddEdge,
  getNodeStatuses,
  calculateProgress,
  getPredecessors,
  getSuccessors,
  topologicalSort,
  validateWorkflowGraph,
  type WorkflowGraph,
  type WorkflowNode,
} from '@/lib/workflow-graph'
import type { Task, CalendarEvent } from '@prisma/client'

// Mock data
const mockTask: Task = {
  id: 'task1',
  title: 'Test Task',
  description: 'Test Description',
  dueDate: new Date('2024-01-15'),
  priority: 'MEDIUM',
  status: 'ACTIVE',
  label: null,
  order: 1,
  calendarEventId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'user1',
}

const mockCompletedTask: Task = {
  ...mockTask,
  id: 'task2',
  status: 'COMPLETED',
}

const mockEvent: CalendarEvent = {
  id: 'event1',
  title: 'Test Event',
  description: 'Test Event Description',
  startsAt: new Date('2024-01-20T10:00:00Z'),
  endsAt: new Date('2024-01-20T11:00:00Z'),
  allDay: false,
  color: '#3b82f6',
  location: 'Test Location',
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'user1',
}

const createMockNode = (
  id: string,
  data: Task | CalendarEvent | null,
  type: 'TASK' | 'EVENT'
): WorkflowNode => ({
  id,
  externalId: data?.id || id,
  externalType: type,
  xPos: 100,
  yPos: 100,
  data,
})

describe('Workflow Graph Utilities', () => {
  describe('detectCircularDependencies', () => {
    it('should detect no cycles in an acyclic graph', () => {
      const graph: WorkflowGraph = {
        nodes: [
          createMockNode('1', mockTask, 'TASK'),
          createMockNode('2', mockTask, 'TASK'),
          createMockNode('3', mockTask, 'TASK'),
        ],
        edges: [
          { id: 'e1', sourceId: '1', targetId: '2' },
          { id: 'e2', sourceId: '2', targetId: '3' },
        ],
      }

      const cycles = detectCircularDependencies(graph)
      expect(cycles).toEqual([])
    })

    it('should detect a simple cycle', () => {
      const graph: WorkflowGraph = {
        nodes: [
          createMockNode('1', mockTask, 'TASK'),
          createMockNode('2', mockTask, 'TASK'),
          createMockNode('3', mockTask, 'TASK'),
        ],
        edges: [
          { id: 'e1', sourceId: '1', targetId: '2' },
          { id: 'e2', sourceId: '2', targetId: '3' },
          { id: 'e3', sourceId: '3', targetId: '1' }, // Creates cycle
        ],
      }

      const cycles = detectCircularDependencies(graph)
      expect(cycles.length).toBeGreaterThan(0)
      expect(cycles).toContain('1')
      expect(cycles).toContain('2')
      expect(cycles).toContain('3')
    })

    it('should handle self-loops', () => {
      const graph: WorkflowGraph = {
        nodes: [createMockNode('1', mockTask, 'TASK')],
        edges: [{ id: 'e1', sourceId: '1', targetId: '1' }],
      }

      const cycles = detectCircularDependencies(graph)
      expect(cycles).toContain('1')
    })
  })

  describe('canAddEdge', () => {
    it('should allow adding edge in acyclic graph', () => {
      const graph: WorkflowGraph = {
        nodes: [
          createMockNode('1', mockTask, 'TASK'),
          createMockNode('2', mockTask, 'TASK'),
        ],
        edges: [],
      }

      expect(canAddEdge(graph, '1', '2')).toBe(true)
    })

    it('should prevent adding edge that creates cycle', () => {
      const graph: WorkflowGraph = {
        nodes: [
          createMockNode('1', mockTask, 'TASK'),
          createMockNode('2', mockTask, 'TASK'),
        ],
        edges: [{ id: 'e1', sourceId: '1', targetId: '2' }],
      }

      expect(canAddEdge(graph, '2', '1')).toBe(false)
    })

    it('should prevent self-loops', () => {
      const graph: WorkflowGraph = {
        nodes: [createMockNode('1', mockTask, 'TASK')],
        edges: [],
      }

      expect(canAddEdge(graph, '1', '1')).toBe(false)
    })

    it('should prevent duplicate edges', () => {
      const graph: WorkflowGraph = {
        nodes: [
          createMockNode('1', mockTask, 'TASK'),
          createMockNode('2', mockTask, 'TASK'),
        ],
        edges: [{ id: 'e1', sourceId: '1', targetId: '2' }],
      }

      expect(canAddEdge(graph, '1', '2')).toBe(false)
    })
  })

  describe('getNodeStatuses', () => {
    it('should correctly identify completed tasks', () => {
      const nodes = [createMockNode('1', mockCompletedTask, 'TASK')]

      const statuses = getNodeStatuses(nodes)
      expect(statuses[0].status).toBe('completed')
      expect(statuses[0].isCompleted).toBe(true)
    })

    it('should correctly identify overdue tasks', () => {
      const overdueTask = {
        ...mockTask,
        dueDate: new Date('2020-01-01'), // Past date
      }
      const nodes = [createMockNode('1', overdueTask, 'TASK')]

      const statuses = getNodeStatuses(nodes)
      expect(statuses[0].status).toBe('overdue')
      expect(statuses[0].isCompleted).toBe(false)
    })

    it('should correctly identify at-risk tasks', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const atRiskTask = {
        ...mockTask,
        dueDate: tomorrow,
      }
      const nodes = [createMockNode('1', atRiskTask, 'TASK')]

      const statuses = getNodeStatuses(nodes)
      expect(statuses[0].status).toBe('at-risk')
    })

    it('should correctly identify completed events', () => {
      const pastEvent = {
        ...mockEvent,
        endsAt: new Date('2020-01-01T10:00:00Z'), // Past date
      }
      const nodes = [createMockNode('1', pastEvent, 'EVENT')]

      const statuses = getNodeStatuses(nodes)
      expect(statuses[0].status).toBe('completed')
      expect(statuses[0].isCompleted).toBe(true)
    })
  })

  describe('calculateProgress', () => {
    it('should calculate correct progress percentage', () => {
      const statuses = [
        { id: '1', status: 'completed' as const, isCompleted: true },
        { id: '2', status: 'completed' as const, isCompleted: true },
        { id: '3', status: 'upcoming' as const, isCompleted: false },
        { id: '4', status: 'upcoming' as const, isCompleted: false },
      ]

      const progress = calculateProgress(statuses)
      expect(progress).toBe(50) // 2 out of 4 completed
    })

    it('should return 0 for empty array', () => {
      const progress = calculateProgress([])
      expect(progress).toBe(0)
    })

    it('should return 100 for all completed', () => {
      const statuses = [
        { id: '1', status: 'completed' as const, isCompleted: true },
        { id: '2', status: 'completed' as const, isCompleted: true },
      ]

      const progress = calculateProgress(statuses)
      expect(progress).toBe(100)
    })
  })

  describe('getPredecessors', () => {
    it('should find all predecessors', () => {
      const graph: WorkflowGraph = {
        nodes: [
          createMockNode('1', mockTask, 'TASK'),
          createMockNode('2', mockTask, 'TASK'),
          createMockNode('3', mockTask, 'TASK'),
          createMockNode('4', mockTask, 'TASK'),
        ],
        edges: [
          { id: 'e1', sourceId: '1', targetId: '3' },
          { id: 'e2', sourceId: '2', targetId: '3' },
          { id: 'e3', sourceId: '3', targetId: '4' },
        ],
      }

      const predecessors = getPredecessors(graph, '4')
      expect(predecessors).toContain('3')
      expect(predecessors).toContain('1')
      expect(predecessors).toContain('2')
      expect(predecessors.length).toBe(3)
    })

    it('should return empty array for node with no predecessors', () => {
      const graph: WorkflowGraph = {
        nodes: [createMockNode('1', mockTask, 'TASK')],
        edges: [],
      }

      const predecessors = getPredecessors(graph, '1')
      expect(predecessors).toEqual([])
    })
  })

  describe('getSuccessors', () => {
    it('should find all successors', () => {
      const graph: WorkflowGraph = {
        nodes: [
          createMockNode('1', mockTask, 'TASK'),
          createMockNode('2', mockTask, 'TASK'),
          createMockNode('3', mockTask, 'TASK'),
          createMockNode('4', mockTask, 'TASK'),
        ],
        edges: [
          { id: 'e1', sourceId: '1', targetId: '2' },
          { id: 'e2', sourceId: '1', targetId: '3' },
          { id: 'e3', sourceId: '2', targetId: '4' },
        ],
      }

      const successors = getSuccessors(graph, '1')
      expect(successors).toContain('2')
      expect(successors).toContain('3')
      expect(successors).toContain('4')
      expect(successors.length).toBe(3)
    })
  })

  describe('topologicalSort', () => {
    it('should return topologically sorted nodes', () => {
      const graph: WorkflowGraph = {
        nodes: [
          createMockNode('1', mockTask, 'TASK'),
          createMockNode('2', mockTask, 'TASK'),
          createMockNode('3', mockTask, 'TASK'),
        ],
        edges: [
          { id: 'e1', sourceId: '1', targetId: '2' },
          { id: 'e2', sourceId: '2', targetId: '3' },
        ],
      }

      const sorted = topologicalSort(graph)
      expect(sorted).not.toBeNull()
      expect(sorted![0]).toBe('1')
      expect(sorted![1]).toBe('2')
      expect(sorted![2]).toBe('3')
    })

    it('should return null for cyclic graph', () => {
      const graph: WorkflowGraph = {
        nodes: [
          createMockNode('1', mockTask, 'TASK'),
          createMockNode('2', mockTask, 'TASK'),
        ],
        edges: [
          { id: 'e1', sourceId: '1', targetId: '2' },
          { id: 'e2', sourceId: '2', targetId: '1' },
        ],
      }

      const sorted = topologicalSort(graph)
      expect(sorted).toBeNull()
    })
  })

  describe('validateWorkflowGraph', () => {
    it('should validate a correct graph', () => {
      const graph: WorkflowGraph = {
        nodes: [
          createMockNode('1', mockTask, 'TASK'),
          createMockNode('2', mockTask, 'TASK'),
        ],
        edges: [{ id: 'e1', sourceId: '1', targetId: '2' }],
      }

      const validation = validateWorkflowGraph(graph)
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toEqual([])
    })

    it('should detect circular dependencies', () => {
      const graph: WorkflowGraph = {
        nodes: [
          createMockNode('1', mockTask, 'TASK'),
          createMockNode('2', mockTask, 'TASK'),
        ],
        edges: [
          { id: 'e1', sourceId: '1', targetId: '2' },
          { id: 'e2', sourceId: '2', targetId: '1' },
        ],
      }

      const validation = validateWorkflowGraph(graph)
      expect(validation.isValid).toBe(false)
      expect(
        validation.errors.some((error) =>
          error.includes('Circular dependencies')
        )
      ).toBe(true)
    })

    it('should detect missing nodes', () => {
      const graph: WorkflowGraph = {
        nodes: [createMockNode('1', mockTask, 'TASK')],
        edges: [
          { id: 'e1', sourceId: '1', targetId: '2' }, // Node '2' doesn't exist
        ],
      }

      const validation = validateWorkflowGraph(graph)
      expect(validation.isValid).toBe(false)
      expect(
        validation.errors.some((error) =>
          error.includes('non-existent target node')
        )
      ).toBe(true)
    })

    it('should detect self-loops', () => {
      const graph: WorkflowGraph = {
        nodes: [createMockNode('1', mockTask, 'TASK')],
        edges: [{ id: 'e1', sourceId: '1', targetId: '1' }],
      }

      const validation = validateWorkflowGraph(graph)
      expect(validation.isValid).toBe(false)
      expect(
        validation.errors.some((error) => error.includes('Self-loop detected'))
      ).toBe(true)
    })
  })
})
