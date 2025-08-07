import { trpc } from '@/lib/trpc'

/**
 * Utility functions for keeping workflow boards in sync with task and event changes
 */

/**
 * Invalidates board queries when a task is updated
 * This should be called after any task mutation that could affect board display
 */
export function invalidateBoardsForTask(taskId: string) {
  // In a real implementation, we would query which boards contain this task
  // and only invalidate those specific boards. For now, we'll invalidate all boards.
  // Note: This function should be called from components that have access to utils
  // We could also be more specific and only invalidate boards that contain this task:
  // const boardsWithTask = await api.board.getBoardsContainingItem.query({
  //   externalId: taskId,
  //   externalType: 'TASK'
  // })
  // boardsWithTask.forEach(board => {
  //   api.board.getById.invalidate({ id: board.id })
  //   api.board.getStats.invalidate({ boardId: board.id })
  // })
}

/**
 * Invalidates board queries when an event is updated
 * This should be called after any event mutation that could affect board display
 */
export function invalidateBoardsForEvent(eventId: string) {
  // Similar to tasks, invalidate all boards for now
  // Note: This function should be called from components that have access to utils
  // Future optimization: only invalidate specific boards
}

/**
 * Hook for automatically syncing boards when tasks/events change
 * This can be used in components that need to keep boards updated
 */
export function useBoardSync() {
  const utils = trpc.useUtils()

  return {
    invalidateAllBoards: () => {
      utils.board.list.invalidate()
    },

    invalidateBoardsForTask: (taskId: string) => {
      // For now, invalidate all boards
      // In the future, we could be more selective
      utils.board.list.invalidate()
    },

    invalidateBoardsForEvent: (eventId: string) => {
      // For now, invalidate all boards
      // In the future, we could be more selective
      utils.board.list.invalidate()
    },

    invalidateSpecificBoard: (boardId: string) => {
      utils.board.getById.invalidate({ id: boardId })
      utils.board.getStats.invalidate({ boardId })
    },
  }
}

/**
 * Enhanced task mutation hooks that automatically sync with boards
 */
export function useTaskMutationWithBoardSync() {
  const utils = trpc.useUtils()

  const updateTask = trpc.task.update.useMutation({
    onSuccess: (data) => {
      // Invalidate task queries
      utils.task.list.invalidate()
      utils.task.getById.invalidate({ id: data.id })

      // Invalidate boards that might contain this task
      utils.board.list.invalidate()
    },
  })

  const toggleTaskStatus = trpc.task.toggleStatus.useMutation({
    onSuccess: (data) => {
      // Invalidate task queries
      utils.task.list.invalidate()
      utils.task.getById.invalidate({ id: data.id })

      // Invalidate boards that might contain this task
      utils.board.list.invalidate()
    },
  })

  const deleteTask = trpc.task.delete.useMutation({
    onSuccess: (_, variables) => {
      // Invalidate task queries
      utils.task.list.invalidate()

      // Invalidate boards that might contain this task
      utils.board.list.invalidate()
    },
  })

  return {
    updateTask,
    toggleTaskStatus,
    deleteTask,
  }
}

/**
 * Enhanced event mutation hooks that automatically sync with boards
 */
export function useEventMutationWithBoardSync() {
  const utils = trpc.useUtils()

  const updateEvent = trpc.event.update.useMutation({
    onSuccess: (data) => {
      // Invalidate event queries
      utils.event.list.invalidate()
      utils.event.getById.invalidate({ id: data.id })

      // Invalidate boards that might contain this event
      utils.board.list.invalidate()
    },
  })

  const deleteEvent = trpc.event.delete.useMutation({
    onSuccess: (_, variables) => {
      // Invalidate event queries
      utils.event.list.invalidate()

      // Invalidate boards that might contain this event
      utils.board.list.invalidate()
    },
  })

  return {
    updateEvent,
    deleteEvent,
  }
}
