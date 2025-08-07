'use client'

import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  CheckSquare,
  Search,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Task, CalendarEvent, BoardItem } from '@prisma/client'

interface WorkflowSidebarProps {
  isOpen: boolean
  onToggle: () => void
  tasks: Task[]
  events: CalendarEvent[]
  onAddItem: (item: {
    externalId: string
    externalType: 'TASK' | 'EVENT'
  }) => void
  boardItems: BoardItem[]
}

export function WorkflowSidebar({
  isOpen,
  onToggle,
  tasks,
  events,
  onAddItem,
  boardItems,
}: WorkflowSidebarProps) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'events'>('tasks')
  const [searchQuery, setSearchQuery] = useState('')

  // Get IDs of items already on the board
  const boardItemIds = new Set(boardItems.map((item) => item.externalId))

  // Filter out items already on the board
  const availableTasks = tasks.filter((task) => !boardItemIds.has(task.id))
  const availableEvents = events.filter((event) => !boardItemIds.has(event.id))

  // Filter by search query
  const filteredTasks = availableTasks.filter(
    (task) =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredEvents = availableEvents.filter(
    (event) =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getTaskStatusIcon = (task: Task) => {
    if (task.status === 'COMPLETED') {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    }

    if (task.dueDate) {
      const now = new Date()
      const dueDate = new Date(task.dueDate)

      if (dueDate < now) {
        return <AlertCircle className="h-4 w-4 text-red-600" />
      }

      const twentyFourHours = 24 * 60 * 60 * 1000
      if (dueDate.getTime() - now.getTime() <= twentyFourHours) {
        return <AlertCircle className="h-4 w-4 text-amber-600" />
      }
    }

    return <Clock className="h-4 w-4 text-blue-600" />
  }

  const getEventStatusIcon = (event: CalendarEvent) => {
    const now = new Date()

    if (new Date(event.endsAt) < now) {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    }

    const twentyFourHours = 24 * 60 * 60 * 1000
    if (new Date(event.startsAt).getTime() - now.getTime() <= twentyFourHours) {
      return <AlertCircle className="h-4 w-4 text-amber-600" />
    }

    return <Clock className="h-4 w-4 text-blue-600" />
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div
      className={cn(
        'flex flex-col border-r border-gray-200 bg-white transition-all duration-300',
        isOpen ? 'w-80' : 'w-12'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        {isOpen && <h2 className="font-semibold text-gray-900">Add Items</h2>}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="ml-auto"
        >
          {isOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isOpen && (
        <>
          {/* Search */}
          <div className="border-b border-gray-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('tasks')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'tasks'
                  ? 'border-b-2 border-blue-600 bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <CheckSquare className="h-4 w-4" />
              Tasks ({filteredTasks.length})
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'events'
                  ? 'border-b-2 border-blue-600 bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Calendar className="h-4 w-4" />
              Events ({filteredEvents.length})
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'tasks' && (
              <div className="p-2">
                {filteredTasks.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    <CheckSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    <p className="text-sm">
                      {searchQuery
                        ? 'No tasks match your search'
                        : 'No available tasks'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        className="group relative flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:border-blue-300 hover:bg-blue-50"
                        onClick={() =>
                          onAddItem({
                            externalId: task.id,
                            externalType: 'TASK',
                          })
                        }
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {getTaskStatusIcon(task)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="line-clamp-2 text-sm font-medium text-gray-900">
                            {task.title}
                          </h4>

                          {task.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                              {task.description}
                            </p>
                          )}

                          <div className="mt-2 flex items-center gap-2">
                            {task.dueDate && (
                              <span className="text-xs text-gray-500">
                                Due {formatDate(new Date(task.dueDate))}
                              </span>
                            )}

                            <span
                              className={cn(
                                'rounded px-1.5 py-0.5 text-xs',
                                task.priority === 'URGENT' &&
                                  'bg-red-100 text-red-700',
                                task.priority === 'HIGH' &&
                                  'bg-orange-100 text-orange-700',
                                task.priority === 'MEDIUM' &&
                                  'bg-yellow-100 text-yellow-700',
                                task.priority === 'LOW' &&
                                  'bg-green-100 text-green-700'
                              )}
                            >
                              {task.priority}
                            </span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            onAddItem({
                              externalId: task.id,
                              externalType: 'TASK',
                            })
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'events' && (
              <div className="p-2">
                {filteredEvents.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    <Calendar className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    <p className="text-sm">
                      {searchQuery
                        ? 'No events match your search'
                        : 'No available events'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredEvents.map((event) => (
                      <div
                        key={event.id}
                        className="group relative flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:border-blue-300 hover:bg-blue-50"
                        onClick={() =>
                          onAddItem({
                            externalId: event.id,
                            externalType: 'EVENT',
                          })
                        }
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {getEventStatusIcon(event)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="line-clamp-2 text-sm font-medium text-gray-900">
                            {event.title}
                          </h4>

                          {event.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                              {event.description}
                            </p>
                          )}

                          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                            <span>{formatDate(new Date(event.startsAt))}</span>

                            {!event.allDay && (
                              <>
                                <span>•</span>
                                <span>
                                  {new Date(event.startsAt).toLocaleTimeString(
                                    'en-US',
                                    {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true,
                                    }
                                  )}
                                </span>
                              </>
                            )}

                            {event.location && (
                              <>
                                <span>•</span>
                                <span className="truncate">
                                  📍 {event.location}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            onAddItem({
                              externalId: event.id,
                              externalType: 'EVENT',
                            })
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
