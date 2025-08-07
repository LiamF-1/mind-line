'use client'

import { Handle, Position } from 'reactflow'
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react'
import type { Task } from '@prisma/client'
import { cn } from '@/lib/utils'

interface TaskNodeProps {
  data: {
    task: Task
    status: 'completed' | 'upcoming' | 'at-risk' | 'overdue'
  }
  selected?: boolean
}

export function TaskNode({ data, selected }: TaskNodeProps) {
  const { task, status } = data

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'overdue':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'at-risk':
        return <AlertCircle className="h-4 w-4 text-amber-600" />
      default:
        return <Clock className="h-4 w-4 text-blue-600" />
    }
  }

  const getStatusColors = () => {
    switch (status) {
      case 'completed':
        return 'border-green-500 bg-green-50 text-green-900'
      case 'overdue':
        return 'border-red-500 bg-red-50 text-red-900'
      case 'at-risk':
        return 'border-amber-500 bg-amber-50 text-amber-900'
      default:
        return 'border-blue-500 bg-blue-50 text-blue-900'
    }
  }

  const getPriorityColors = () => {
    switch (task.priority) {
      case 'URGENT':
        return 'bg-red-500'
      case 'HIGH':
        return 'bg-orange-500'
      case 'MEDIUM':
        return 'bg-yellow-500'
      case 'LOW':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div
      className={cn(
        'max-w-[300px] min-w-[200px] rounded-lg border-2 bg-white p-3 shadow-sm transition-all',
        getStatusColors(),
        selected && 'shadow-lg ring-2 ring-blue-500 ring-offset-2'
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-gray-400"
      />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            {getStatusIcon()}
            <div className={cn('h-2 w-2 rounded-full', getPriorityColors())} />
          </div>

          <h3 className="line-clamp-2 text-sm leading-tight font-medium">
            {task.title}
          </h3>

          {task.description && (
            <p className="mt-1 line-clamp-2 text-xs text-gray-600">
              {task.description}
            </p>
          )}

          <div className="mt-2 flex items-center gap-2 text-xs">
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>
                  {new Date(task.dueDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}

            {task.label && (
              <span
                className="rounded px-1.5 py-0.5 text-xs text-white"
                style={{ backgroundColor: task.label }}
              >
                {task.priority}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
