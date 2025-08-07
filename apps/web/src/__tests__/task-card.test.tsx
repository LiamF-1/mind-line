import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TaskCard } from '@/components/tasks/task-card'

const mockTask = {
  id: '1',
  title: 'Test Task',
  description: 'Test Description',
  dueDate: new Date('2024-12-31'),
  priority: 'MEDIUM' as const,
  status: 'ACTIVE' as const,
  label: '#3b82f6',
  order: 1,
  calendarEventId: null,
  calendarEvent: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

describe('TaskCard', () => {
  it('renders task title and description', () => {
    render(
      <TaskCard
        task={mockTask}
        onToggleComplete={vi.fn()}
        onEdit={vi.fn()}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    expect(screen.getByText('Test Task')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
  })

  it('calls onToggleComplete when checkbox is clicked', () => {
    const onToggleComplete = vi.fn()
    render(
      <TaskCard
        task={mockTask}
        onToggleComplete={onToggleComplete}
        onEdit={vi.fn()}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    const checkbox = screen.getByRole('checkbox') // Only one checkbox when showCheckbox is false
    fireEvent.click(checkbox)

    expect(onToggleComplete).toHaveBeenCalledWith('1')
  })

  it('calls onEdit when card is clicked', () => {
    const onEdit = vi.fn()
    render(
      <TaskCard
        task={mockTask}
        onToggleComplete={vi.fn()}
        onEdit={onEdit}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    const card = screen.getByText('Test Task').closest('div')
    if (card) {
      fireEvent.click(card)
      expect(onEdit).toHaveBeenCalledWith(mockTask)
    }
  })

  it('shows completed styling for completed tasks', () => {
    const completedTask = { ...mockTask, status: 'COMPLETED' as const }
    render(
      <TaskCard
        task={completedTask}
        onToggleComplete={vi.fn()}
        onEdit={vi.fn()}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    const title = screen.getByText('Test Task')
    expect(title).toHaveClass('line-through')
  })

  it('displays priority indicator', () => {
    render(
      <TaskCard
        task={mockTask}
        onToggleComplete={vi.fn()}
        onEdit={vi.fn()}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    expect(screen.getByText('Medium')).toBeInTheDocument()
  })

  it('shows selection checkbox when showCheckbox is true', () => {
    render(
      <TaskCard
        task={mockTask}
        showCheckbox={true}
        selected={false}
        onToggleComplete={vi.fn()}
        onEdit={vi.fn()}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
        onSelect={vi.fn()}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(2) // Selection checkbox + completion checkbox
  })

  it('calls onSelect when selection checkbox is changed', () => {
    const onSelect = vi.fn()
    render(
      <TaskCard
        task={mockTask}
        showCheckbox={true}
        selected={false}
        onToggleComplete={vi.fn()}
        onEdit={vi.fn()}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
        onSelect={onSelect}
      />
    )

    const selectionCheckbox = screen.getAllByRole('checkbox')[0] // First checkbox is selection
    fireEvent.click(selectionCheckbox)

    expect(onSelect).toHaveBeenCalledWith('1', true)
  })

  it('handles keyboard shortcuts', () => {
    const onToggleComplete = vi.fn()
    const onEdit = vi.fn()
    const onArchive = vi.fn()

    render(
      <TaskCard
        task={mockTask}
        onToggleComplete={onToggleComplete}
        onEdit={onEdit}
        onArchive={onArchive}
        onDelete={vi.fn()}
      />
    )

    const card = screen.getByText('Test Task').closest('div')
    if (card) {
      // Test space key for toggle complete
      fireEvent.keyDown(card, { key: ' ' })
      expect(onToggleComplete).toHaveBeenCalledWith('1')

      // Test 'e' key for edit
      fireEvent.keyDown(card, { key: 'e' })
      expect(onEdit).toHaveBeenCalledWith(mockTask)

      // Test Delete key for archive
      fireEvent.keyDown(card, { key: 'Delete' })
      expect(onArchive).toHaveBeenCalledWith('1')
    }
  })

  it('shows overdue styling for overdue tasks', () => {
    const overdueTask = {
      ...mockTask,
      dueDate: new Date('2020-01-01'), // Past date
    }

    render(
      <TaskCard
        task={overdueTask}
        onToggleComplete={vi.fn()}
        onEdit={vi.fn()}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    // Should show overdue indicator in red
    const dueDateElement = screen.getByText(/Jan 1/)
    expect(dueDateElement).toHaveClass('text-red-500')
  })
})
