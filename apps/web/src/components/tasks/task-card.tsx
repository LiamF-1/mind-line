'use client'

import React, { useState } from 'react'
import { format, isToday, isPast, isThisWeek } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Calendar,
  Clock,
  MoreHorizontal,
  Archive,
  Trash2,
  Edit,
  Link as LinkIcon,
  GripVertical,
} from 'lucide-react'

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

interface TaskCardProps {
  task: Task
  selected?: boolean
  onToggleComplete?: (taskId: string) => void
  onEdit?: (task: Task) => void
  onArchive?: (taskId: string) => void
  onDelete?: (taskId: string) => void
  onSelect?: (taskId: string, selected: boolean) => void
  showCheckbox?: boolean
  draggable?: boolean
  dragHandleProps?: any
}

const priorityColors = {
  LOW: 'bg-gray-400',
  MEDIUM: 'bg-blue-400',
  HIGH: 'bg-orange-400',
  URGENT: 'bg-red-400',
}

const priorityLabels = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
}

export function TaskCard({
  task,
  selected = false,
  onToggleComplete,
  onEdit,
  onArchive,
  onDelete,
  onSelect,
  showCheckbox = false,
  draggable = false,
  dragHandleProps,
}: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const isCompleted = task.status === 'COMPLETED'
  const isOverdue = task.dueDate && isPast(task.dueDate) && !isCompleted
  const isDueToday = task.dueDate && isToday(task.dueDate)

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleComplete?.(task.id)
  }

  const handleCheckboxChange = (checked: boolean) => {
    onToggleComplete?.(task.id)
  }

  const handleSelect = (checked: boolean) => {
    onSelect?.(task.id, checked)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(task)
  }

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation()
    onArchive?.(task.id)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(task.id)
  }

  const formatDueDate = (date: Date) => {
    if (isToday(date)) return 'Today'
    if (isThisWeek(date)) return format(date, 'EEEE')
    return format(date, 'MMM d')
  }

  const labelColor = task.label || priorityColors[task.priority]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case ' ':
        e.preventDefault()
        onToggleComplete?.(task.id)
        break
      case 'e':
      case 'E':
        e.preventDefault()
        onEdit?.(task)
        break
      case 'Delete':
        e.preventDefault()
        if (task.status === 'ARCHIVED') {
          onDelete?.(task.id)
        } else {
          onArchive?.(task.id)
        }
        break
    }
  }

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 rounded-lg border p-4 transition-all hover:shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none',
        'bg-white dark:bg-gray-800',
        selected && 'ring-2 ring-blue-500',
        isCompleted && 'opacity-60'
      )}
      tabIndex={0}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
    >
      {/* Drag handle */}
      {draggable && (
        <div
          className="flex-shrink-0 cursor-move pt-1 opacity-0 transition-opacity group-hover:opacity-100"
          {...dragHandleProps}
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      )}

      {/* Color strip */}
      <div
        className={cn('h-full w-1 rounded-full', labelColor)}
        style={
          task.label &&
          !priorityColors[task.priority as keyof typeof priorityColors]
            ? { backgroundColor: task.label }
            : undefined
        }
      />

      {/* Selection checkbox */}
      {showCheckbox && (
        <div className="flex-shrink-0 pt-1">
          <Checkbox
            checked={selected}
            onCheckedChange={handleSelect}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Task checkbox */}
      <div className="flex-shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isCompleted}
          onCheckedChange={handleCheckboxChange}
          className={cn(
            'transition-colors',
            isCompleted && 'border-green-500 bg-green-500'
          )}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div
            className="min-w-0 flex-1 cursor-pointer"
            onClick={() => onEdit?.(task)}
          >
            <h3
              className={cn(
                'text-sm font-medium text-gray-900 dark:text-white',
                isCompleted && 'text-gray-500 line-through'
              )}
            >
              {task.title}
            </h3>
            {task.description && (
              <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
                {task.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div
            className={cn('flex items-center gap-1', !isHovered && 'opacity-0')}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                {task.calendarEvent && (
                  <DropdownMenuItem>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    View Event
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {task.status !== 'ARCHIVED' && (
                  <DropdownMenuItem onClick={handleArchive}>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Meta information */}
        <div
          className="mt-2 flex cursor-pointer items-center gap-3 text-xs text-gray-500"
          onClick={() => onEdit?.(task)}
        >
          {/* Priority */}
          <span className="flex items-center gap-1">
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                priorityColors[task.priority]
              )}
            />
            {priorityLabels[task.priority]}
          </span>

          {/* Due date */}
          {task.dueDate && (
            <span
              className={cn(
                'flex items-center gap-1',
                isOverdue && 'text-red-500',
                isDueToday && 'text-orange-500'
              )}
            >
              <Clock className="h-3 w-3" />
              {formatDueDate(task.dueDate)}
            </span>
          )}

          {/* Calendar event */}
          {task.calendarEvent && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Event
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
