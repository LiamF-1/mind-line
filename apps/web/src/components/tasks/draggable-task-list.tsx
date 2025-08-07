'use client'

import React, { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { SortableTaskCard } from './sortable-task-card'

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

interface DraggableTaskListProps {
  tasks: Task[]
  selectedTasks: string[]
  onToggleComplete?: (taskId: string) => void
  onEdit?: (task: Task) => void
  onArchive?: (taskId: string) => void
  onDelete?: (taskId: string) => void
  onSelect?: (taskId: string, selected: boolean) => void
  onReorder?: (taskIds: string[]) => void
  showCheckbox?: boolean
}

export function DraggableTaskList({
  tasks,
  selectedTasks,
  onToggleComplete,
  onEdit,
  onArchive,
  onDelete,
  onSelect,
  onReorder,
  showCheckbox = false,
}: DraggableTaskListProps) {
  const [items, setItems] = useState(tasks)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Update items when tasks change
  React.useEffect(() => {
    setItems(tasks)
  }, [tasks])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)

      const newItems = arrayMove(items, oldIndex, newIndex)
      setItems(newItems)

      // Call the onReorder callback with the new order
      onReorder?.(newItems.map((item) => item.id))
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {items.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              selected={selectedTasks.includes(task.id)}
              onToggleComplete={onToggleComplete}
              onEdit={onEdit}
              onArchive={onArchive}
              onDelete={onDelete}
              onSelect={onSelect}
              showCheckbox={showCheckbox}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
