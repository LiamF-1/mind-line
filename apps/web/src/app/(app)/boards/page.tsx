'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  GitBranch,
  Calendar,
  Clock,
  MoreVertical,
  Edit3,
  Trash2,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function BoardsPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const utils = trpc.useUtils()
  const { data: boards, isLoading, refetch } = trpc.board.list.useQuery()
  const deleteMutation = trpc.board.delete.useMutation({
    onSuccess: () => {
      // Automatically invalidate the boards list
      utils.board.list.invalidate()
    },
  })

  const filteredBoards = boards?.filter(
    (board: any) =>
      board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      board.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async (boardId: string, boardName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${boardName}"? This action cannot be undone and will remove all items and connections.`
      )
    ) {
      try {
        await deleteMutation.mutateAsync({ id: boardId })
        toast.success('Board deleted successfully')
        // Refetch is automatically handled by the mutation, but we can call it explicitly for safety
        refetch()
      } catch (error) {
        console.error('Failed to delete board:', error)
        toast.error('Failed to delete board')
      }
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getDeadlineStatus = (deadline: Date) => {
    const now = new Date()
    const diffTime = deadline.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return {
        text: `${Math.abs(diffDays)} days overdue`,
        color: 'text-red-600 bg-red-50',
      }
    } else if (diffDays === 0) {
      return { text: 'Due today', color: 'text-amber-600 bg-amber-50' }
    } else if (diffDays <= 7) {
      return {
        text: `${diffDays} days left`,
        color: 'text-amber-600 bg-amber-50',
      }
    } else {
      return {
        text: `${diffDays} days left`,
        color: 'text-gray-600 bg-gray-50',
      }
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="mb-6 h-8 w-1/4 rounded bg-gray-200"></div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 rounded-lg bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workflow Boards</h1>
          <p className="mt-1 text-gray-600">
            Visualize your tasks and events on interactive timelines
          </p>
        </div>

        <Link href="/boards/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Board
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input
            placeholder="Search boards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Boards Grid */}
      {filteredBoards && filteredBoards.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredBoards.map((board: any) => (
            <Card
              key={board.id}
              className="p-6 transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: board.theme || '#3b82f6' }}
                  />
                  <GitBranch className="h-5 w-5 text-gray-400" />
                </div>

                <div className="group relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>

                  <div className="absolute top-full right-0 z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    <Link href={`/boards/${board.id}/edit`}>
                      <button className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50">
                        <Edit3 className="h-4 w-4" />
                        Edit Board
                      </button>
                    </Link>

                    <button
                      onClick={() => handleDelete(board.id, board.name)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Board
                    </button>
                  </div>
                </div>
              </div>

              <Link href={`/boards/${board.id}`} className="block">
                <h3 className="mb-2 text-lg font-semibold text-gray-900 transition-colors hover:text-blue-600">
                  {board.name}
                </h3>

                {board.description && (
                  <p className="mb-4 line-clamp-2 text-sm text-gray-600">
                    {board.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-gray-500">
                      <div className="h-2 w-2 rounded-full bg-gray-300" />
                      <span>{board._count?.items || 0} items</span>
                    </div>

                    <div className="flex items-center gap-1 text-gray-500">
                      <GitBranch className="h-3 w-3" />
                      <span>{board._count?.edges || 0} connections</span>
                    </div>
                  </div>

                  <div className="text-gray-500">
                    <Clock className="mr-1 inline h-3 w-3" />
                    {formatDate(new Date(board.updatedAt))}
                  </div>
                </div>

                {board.deadline && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span
                        className={cn(
                          'rounded-full px-2 py-1 text-xs',
                          getDeadlineStatus(new Date(board.deadline)).color
                        )}
                      >
                        {getDeadlineStatus(new Date(board.deadline)).text}
                      </span>
                    </div>
                  </div>
                )}
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <GitBranch className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h3 className="mb-2 text-xl font-semibold text-gray-900">
            {searchQuery ? 'No boards found' : 'No workflow boards yet'}
          </h3>
          <p className="mx-auto mb-6 max-w-md text-gray-600">
            {searchQuery
              ? "Try adjusting your search terms to find the board you're looking for."
              : 'Create your first workflow board to start visualizing your tasks and events on interactive timelines.'}
          </p>

          {!searchQuery && (
            <Link href="/boards/new">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Board
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
