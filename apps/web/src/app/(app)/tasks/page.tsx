'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Filter, MoreHorizontal } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TaskCard } from '@/components/tasks/task-card'
import { TaskModal } from '@/components/tasks/task-modal'
import { DraggableTaskList } from '@/components/tasks/draggable-task-list'
import { toast } from 'sonner'

type TaskStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'

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

const tabs = [
  { id: 'ACTIVE', label: 'Inbox', description: 'Active tasks' },
  { id: 'COMPLETED', label: 'Completed', description: 'Finished tasks' },
  { id: 'ARCHIVED', label: 'Archived', description: 'Archived tasks' },
] as const

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState<TaskStatus>('ACTIVE')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const utils = trpc.useUtils()

  // Fetch tasks based on active tab
  const { data: tasks = [], isLoading } = trpc.task.list.useQuery({
    status: activeTab,
  })

  // Mutations
  const createTaskMutation = trpc.task.create.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate()
      utils.task.getCounts.invalidate()
      setIsTaskModalOpen(false)
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create task')
    },
  })

  const updateTaskMutation = trpc.task.update.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate()
      utils.task.getCounts.invalidate()
      setIsTaskModalOpen(false)
      setEditingTask(null)
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update task')
    },
  })

  const toggleStatusMutation = trpc.task.toggleStatus.useMutation({
    onMutate: async ({ id }) => {
      // Cancel any outgoing refetches
      await utils.task.list.cancel()

      // Snapshot the previous value
      const previousTasks = utils.task.list.getData({ status: activeTab })

      // Optimistically update to the new value
      if (previousTasks) {
        utils.task.list.setData(
          { status: activeTab },
          (old) =>
            old?.map((task) =>
              task.id === id
                ? {
                    ...task,
                    status: task.status === 'ACTIVE' ? 'COMPLETED' : 'ACTIVE',
                  }
                : task
            ) || []
        )
      }

      return { previousTasks }
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTasks) {
        utils.task.list.setData({ status: activeTab }, context.previousTasks)
      }
      toast.error(err.message || 'Failed to update task')
    },
    onSettled: () => {
      // Always refetch after error or success
      utils.task.list.invalidate()
      utils.task.getCounts.invalidate()
    },
  })

  const archiveTaskMutation = trpc.task.archive.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate()
      utils.task.getCounts.invalidate()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to archive task')
    },
  })

  const deleteTaskMutation = trpc.task.delete.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate()
      utils.task.getCounts.invalidate()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete task')
    },
  })

  const bulkUpdateMutation = trpc.task.bulkUpdate.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate()
      utils.task.getCounts.invalidate()
      setSelectedTasks([])
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update tasks')
    },
  })

  const updateOrderMutation = trpc.task.updateOrder.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to reorder tasks')
    },
  })

  // Filter tasks based on search query
  const filteredTasks = tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description &&
        task.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Handlers
  const handleCreateTask = useCallback(() => {
    setEditingTask(null)
    setIsTaskModalOpen(true)
  }, [])

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setIsTaskModalOpen(true)
  }

  const handleSaveTask = (data: any) => {
    if (editingTask) {
      updateTaskMutation.mutate({
        id: editingTask.id,
        data,
      })
    } else {
      createTaskMutation.mutate(data)
    }
  }

  const handleToggleComplete = (taskId: string) => {
    toggleStatusMutation.mutate({ id: taskId })
  }

  const handleArchiveTask = (taskId: string) => {
    archiveTaskMutation.mutate({ id: taskId })
  }

  const handleDeleteTask = (taskId: string) => {
    deleteTaskMutation.mutate({ id: taskId })
  }

  const handleSelectTask = (taskId: string, selected: boolean) => {
    setSelectedTasks((prev) =>
      selected ? [...prev, taskId] : prev.filter((id) => id !== taskId)
    )
  }

  const handleSelectAll = useCallback(() => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(filteredTasks.map((task) => task.id))
    }
  }, [selectedTasks.length, filteredTasks])

  const handleBulkComplete = () => {
    bulkUpdateMutation.mutate({
      taskIds: selectedTasks,
      data: { status: 'COMPLETED' },
    })
  }

  const handleBulkArchive = () => {
    bulkUpdateMutation.mutate({
      taskIds: selectedTasks,
      data: { status: 'ARCHIVED' },
    })
  }

  const handleBulkDelete = () => {
    // For bulk delete, we need to call delete for each task individually
    selectedTasks.forEach((taskId) => {
      deleteTaskMutation.mutate({ id: taskId })
    })
    setSelectedTasks([])
  }

  const handleReorder = (taskIds: string[]) => {
    updateOrderMutation.mutate({ taskIds })
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      switch (event.key.toLowerCase()) {
        case 'n':
          event.preventDefault()
          handleCreateTask()
          break
        case 'a':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            handleSelectAll()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleCreateTask, handleSelectAll])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Tasks
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage your tasks and stay productive
            </p>
          </div>
          <Button onClick={handleCreateTask} className="gap-2">
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b bg-white px-6 py-3 dark:bg-gray-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedTasks.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedTasks.length} selected
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {activeTab === 'ACTIVE' && (
                      <DropdownMenuItem onClick={handleBulkComplete}>
                        Mark as Complete
                      </DropdownMenuItem>
                    )}
                    {activeTab !== 'ARCHIVED' && (
                      <DropdownMenuItem onClick={handleBulkArchive}>
                        Archive
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleBulkDelete}
                      className="text-red-600 focus:text-red-600"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Quick add input */}
          {activeTab === 'ACTIVE' && (
            <div className="mb-6">
              <button
                onClick={handleCreateTask}
                className="w-full rounded-lg border-2 border-dashed border-gray-300 p-4 text-left text-gray-500 hover:border-gray-400 hover:text-gray-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-300"
              >
                <Plus className="mr-2 inline h-4 w-4" />
                Add a new task...
              </button>
            </div>
          )}

          {/* Task list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-gray-400">
                Loading tasks...
              </div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-2 text-gray-500 dark:text-gray-400">
                {searchQuery
                  ? 'No tasks found matching your search'
                  : activeTab === 'ACTIVE'
                    ? 'No active tasks'
                    : activeTab === 'COMPLETED'
                      ? 'No completed tasks'
                      : 'No archived tasks'}
              </div>
              {!searchQuery && activeTab === 'ACTIVE' && (
                <Button
                  onClick={handleCreateTask}
                  variant="outline"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create your first task
                </Button>
              )}
            </div>
          ) : activeTab === 'ACTIVE' && !searchQuery ? (
            <DraggableTaskList
              tasks={filteredTasks}
              selectedTasks={selectedTasks}
              onToggleComplete={handleToggleComplete}
              onEdit={handleEditTask}
              onArchive={handleArchiveTask}
              onDelete={handleDeleteTask}
              onSelect={handleSelectTask}
              onReorder={handleReorder}
              showCheckbox={selectedTasks.length > 0}
            />
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  selected={selectedTasks.includes(task.id)}
                  onToggleComplete={handleToggleComplete}
                  onEdit={handleEditTask}
                  onArchive={handleArchiveTask}
                  onDelete={handleDeleteTask}
                  onSelect={handleSelectTask}
                  showCheckbox={selectedTasks.length > 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Task Modal */}
      <TaskModal
        open={isTaskModalOpen}
        onOpenChange={setIsTaskModalOpen}
        task={editingTask}
        onSave={handleSaveTask}
        isLoading={createTaskMutation.isPending || updateTaskMutation.isPending}
      />
    </div>
  )
}
