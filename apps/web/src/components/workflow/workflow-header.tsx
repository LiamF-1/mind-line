'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, Calendar, MoreVertical, Edit3, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
// Define board types locally to avoid import issues
type Board = {
  id: string
  name: string
  description: string | null
  deadline: Date | null
  theme: string | null
  createdAt: Date
  updatedAt: Date
  userId: string
}

type BoardItem = {
  id: string
  externalId: string
  externalType: 'TASK' | 'EVENT'
  xPos: number
  yPos: number
  boardId: string
  createdAt: Date
  updatedAt: Date
}
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

interface EnhancedBoardItem extends BoardItem {
  data: any
}

interface BoardWithData extends Board {
  items: EnhancedBoardItem[]
}

interface WorkflowHeaderProps {
  board: BoardWithData
  onSidebarToggle: () => void
  selectedNodeId: string | null
  onDeleteNode?: (nodeId: string) => void
}

export function WorkflowHeader({
  board,
  onSidebarToggle,
  selectedNodeId,
  onDeleteNode,
}: WorkflowHeaderProps) {
  const [showOptions, setShowOptions] = useState(false)
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const utils = trpc.useUtils()
  const { data: stats } = trpc.board.getStats.useQuery({ boardId: board.id })
  const deleteMutation = trpc.board.delete.useMutation({
    onSuccess: () => {
      // Invalidate board list when deleting from within a board
      utils.board.list.invalidate()
    },
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowOptions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDeleteBoard = async () => {
    if (
      window.confirm(
        `Are you sure you want to delete "${board.name}"? This action cannot be undone and will remove all items and connections.`
      )
    ) {
      try {
        await deleteMutation.mutateAsync({ id: board.id })
        router.push('/boards')
      } catch (error) {
        console.error('Failed to delete board:', error)
        // Toast notification would be ideal here, but we'll rely on the mutation error
      }
    }
  }

  const formatDeadline = (deadline: Date) => {
    const now = new Date()
    const diffTime = deadline.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return {
        text: `${Math.abs(diffDays)} days overdue`,
        color: 'text-red-600',
      }
    } else if (diffDays === 0) {
      return { text: 'Due today', color: 'text-amber-600' }
    } else if (diffDays === 1) {
      return { text: 'Due tomorrow', color: 'text-amber-600' }
    } else if (diffDays <= 7) {
      return { text: `Due in ${diffDays} days`, color: 'text-amber-600' }
    } else {
      return { text: `Due in ${diffDays} days`, color: 'text-gray-600' }
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 50) return 'bg-blue-500'
    if (percentage >= 25) return 'bg-yellow-500'
    return 'bg-gray-300'
  }

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSidebarToggle}
            className="lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-3">
            <div
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: board.theme || '#3b82f6' }}
            />

            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {board.name}
              </h1>

              {board.description && (
                <p className="mt-0.5 text-sm text-gray-600">
                  {board.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Center - Progress and Stats */}
        <div className="hidden items-center gap-6 md:flex">
          {stats && (
            <>
              {/* Progress */}
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-600">Progress</div>
                <div className="flex items-center gap-2">
                  <div className="w-24">
                    <div className="mb-1 flex items-center gap-1">
                      <div
                        className={cn(
                          'h-2 rounded-full transition-all',
                          getProgressColor(stats.progressPercentage)
                        )}
                        style={{ width: `${stats.progressPercentage}%` }}
                      />
                      <div className="h-2 flex-1 rounded-full bg-gray-200" />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {stats.progressPercentage}%
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-gray-400" />
                  <span className="text-gray-600">
                    {stats.totalItems} items
                  </span>
                </div>

                {stats.overdueTasks > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-red-600">
                      {stats.overdueTasks} overdue
                    </span>
                  </div>
                )}

                {stats.dueTodayTasks > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-amber-600">
                      {stats.dueTodayTasks} due today
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Deadline */}
          {board.deadline && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span
                className={cn(
                  'text-sm',
                  formatDeadline(new Date(board.deadline)).color
                )}
              >
                {formatDeadline(new Date(board.deadline)).text}
              </span>
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Selected node info and actions */}
          {selectedNodeId && (
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-sm text-blue-700">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                Node selected
              </div>
              {onDeleteNode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteNode(selectedNodeId)}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="ml-2 hidden md:inline">Remove</span>
                </Button>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/boards/${board.id}/edit`)}
            >
              <Edit3 className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Edit</span>
            </Button>

            <div className="relative" ref={dropdownRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOptions(!showOptions)}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>

              {showOptions && (
                <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => {
                      setShowOptions(false)
                      handleDeleteBoard()
                    }}
                    disabled={deleteMutation.isPending}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete Board'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile stats and selected node info */}
      <div className="mt-4 space-y-2 md:hidden">
        <div className="flex items-center justify-between text-sm">
          {stats && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Progress:</span>
                <span className="font-medium">{stats.progressPercentage}%</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-600">Items:</span>
                <span className="font-medium">{stats.totalItems}</span>
              </div>
            </div>
          )}

          {board.deadline && (
            <span
              className={cn(
                'text-sm',
                formatDeadline(new Date(board.deadline)).color
              )}
            >
              {formatDeadline(new Date(board.deadline)).text}
            </span>
          )}
        </div>

        {/* Mobile selected node actions */}
        {selectedNodeId && (
          <div className="flex items-center justify-between rounded-lg bg-blue-50 p-2">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              Node selected • Press Delete or right-click to remove
            </div>
            {onDeleteNode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteNode(selectedNodeId)}
                className="h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
