'use client'

import { Handle, Position } from 'reactflow'
import { Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import type { CalendarEvent } from '@prisma/client'
import { cn } from '@/lib/utils'

interface EventNodeProps {
  data: {
    event: CalendarEvent
    status: 'completed' | 'upcoming' | 'at-risk' | 'overdue'
  }
  selected?: boolean
}

export function EventNode({ data, selected }: EventNodeProps) {
  const { event, status } = data

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
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
      case 'at-risk':
        return 'border-amber-500 bg-amber-50 text-amber-900'
      default:
        return 'border-blue-500 bg-blue-50 text-blue-900'
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const getDuration = () => {
    const start = new Date(event.startsAt)
    const end = new Date(event.endsAt)
    const diffMs = end.getTime() - start.getTime()
    const diffHours = Math.round(diffMs / (1000 * 60 * 60))

    if (diffHours < 1) {
      const diffMinutes = Math.round(diffMs / (1000 * 60))
      return `${diffMinutes}m`
    }

    return diffHours === 1 ? '1hr' : `${diffHours}hrs`
  }

  return (
    <div
      className={cn(
        'max-w-[320px] min-w-[220px] rounded-lg border-2 bg-white p-3 shadow-sm transition-all',
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
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: event.color || '#3b82f6' }}
            />
          </div>

          <h3 className="line-clamp-2 text-sm leading-tight font-medium">
            {event.title}
          </h3>

          {event.description && (
            <p className="mt-1 line-clamp-2 text-xs text-gray-600">
              {event.description}
            </p>
          )}

          <div className="mt-2 flex flex-col gap-1 text-xs">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(new Date(event.startsAt))}</span>
              {!event.allDay && (
                <>
                  <span className="mx-1">•</span>
                  <span>
                    {formatTime(new Date(event.startsAt))} -{' '}
                    {formatTime(new Date(event.endsAt))}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!event.allDay && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{getDuration()}</span>
                </div>
              )}

              {event.location && (
                <span className="truncate text-gray-500">
                  📍 {event.location}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
