'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskCard } from './task-card'

type Task = {
  id: string
  title: string
  description?: string | null
  dueDate?: Date | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  label?: string | null
  order: number
  calendarEventId?: string | null
  calendarEvent?: {
    id: string
    title: string
    startsAt: Date
  } | null
  createdAt: Date
  updatedAt: Date
}

interface SortableTaskCardProps {
  task: Task
  selected?: boolean
  onToggleComplete?: (taskId: string) => void
  onEdit?: (task: Task) => void
  onArchive?: (taskId: string) => void
  onDelete?: (taskId: string) => void
  onSelect?: (taskId: string, selected: boolean) => void
  showCheckbox?: boolean
}

export function SortableTaskCard(props: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskCard {...props} draggable={true} dragHandleProps={listeners} />
    </div>
  )
}
