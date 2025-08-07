import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'

const boardInput = z.object({
  name: z.string().min(1, 'Board name is required'),
  description: z.string().optional(),
  deadline: z.date().optional(),
  theme: z.string().optional().default('#3b82f6'),
})

const boardItemInput = z.object({
  externalId: z.string(),
  externalType: z.enum(['TASK', 'EVENT']),
  xPos: z.number(),
  yPos: z.number(),
})

const boardEdgeInput = z.object({
  sourceId: z.string(),
  targetId: z.string(),
})

export const boardRouter = createTRPCRouter({
  // Get all boards for the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.board.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      include: {
        items: {
          include: {
            sourceEdges: true,
            targetEdges: true,
          },
        },
        edges: true,
        _count: {
          select: {
            items: true,
            edges: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
  }),

  // Get a specific board by ID with all related data
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const board = await ctx.prisma.board.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        include: {
          items: {
            include: {
              sourceEdges: true,
              targetEdges: true,
            },
          },
          edges: {
            include: {
              source: true,
              target: true,
            },
          },
        },
      })

      if (!board) {
        throw new Error('Board not found')
      }

      // Fetch actual task and event data for board items
      const taskIds = board.items
        .filter((item) => item.externalType === 'TASK')
        .map((item) => item.externalId)

      const eventIds = board.items
        .filter((item) => item.externalType === 'EVENT')
        .map((item) => item.externalId)

      const [tasks, events] = await Promise.all([
        taskIds.length > 0
          ? ctx.prisma.task.findMany({
              where: {
                id: { in: taskIds },
                userId: ctx.session.user.id,
              },
            })
          : [],
        eventIds.length > 0
          ? ctx.prisma.calendarEvent.findMany({
              where: {
                id: { in: eventIds },
                userId: ctx.session.user.id,
              },
            })
          : [],
      ])

      // Create lookup maps
      const taskMap = new Map(tasks.map((task) => [task.id, task]))
      const eventMap = new Map(events.map((event) => [event.id, event]))

      // Enhance board items with actual data
      const enhancedItems = board.items.map((item) => ({
        ...item,
        data:
          item.externalType === 'TASK'
            ? taskMap.get(item.externalId)
            : eventMap.get(item.externalId),
      }))

      return {
        ...board,
        items: enhancedItems,
      }
    }),

  // Create a new board
  create: protectedProcedure
    .input(boardInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.board.create({
        data: {
          ...input,
          userId: ctx.session.user.id,
        },
        include: {
          items: true,
          edges: true,
        },
      })
    }),

  // Update a board
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: boardInput.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.board.update({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        data: input.data,
        include: {
          items: true,
          edges: true,
        },
      })
    }),

  // Delete a board
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.board.delete({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      })
    }),

  // Add an item to a board
  addItem: protectedProcedure
    .input(
      z.object({
        boardId: z.string(),
        item: boardItemInput,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify board ownership
      const board = await ctx.prisma.board.findFirst({
        where: {
          id: input.boardId,
          userId: ctx.session.user.id,
        },
      })

      if (!board) {
        throw new Error('Board not found')
      }

      // Verify the external item exists and belongs to the user
      if (input.item.externalType === 'TASK') {
        const task = await ctx.prisma.task.findFirst({
          where: {
            id: input.item.externalId,
            userId: ctx.session.user.id,
          },
        })
        if (!task) {
          throw new Error('Task not found')
        }
      } else if (input.item.externalType === 'EVENT') {
        const event = await ctx.prisma.calendarEvent.findFirst({
          where: {
            id: input.item.externalId,
            userId: ctx.session.user.id,
          },
        })
        if (!event) {
          throw new Error('Event not found')
        }
      }

      return ctx.prisma.boardItem.create({
        data: {
          ...input.item,
          boardId: input.boardId,
        },
        include: {
          sourceEdges: true,
          targetEdges: true,
        },
      })
    }),

  // Update item position
  updateItemPosition: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
        xPos: z.number(),
        yPos: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the item belongs to a board owned by the user
      const item = await ctx.prisma.boardItem.findFirst({
        where: {
          id: input.itemId,
        },
        include: {
          board: true,
        },
      })

      if (!item || item.board.userId !== ctx.session.user.id) {
        throw new Error('Board item not found')
      }

      return ctx.prisma.boardItem.update({
        where: {
          id: input.itemId,
        },
        data: {
          xPos: input.xPos,
          yPos: input.yPos,
        },
      })
    }),

  // Remove item from board
  removeItem: protectedProcedure
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the item belongs to a board owned by the user
      const item = await ctx.prisma.boardItem.findFirst({
        where: {
          id: input.itemId,
        },
        include: {
          board: true,
        },
      })

      if (!item || item.board.userId !== ctx.session.user.id) {
        throw new Error('Board item not found')
      }

      return ctx.prisma.boardItem.delete({
        where: {
          id: input.itemId,
        },
      })
    }),

  // Add edge between two items
  addEdge: protectedProcedure
    .input(
      z.object({
        boardId: z.string(),
        edge: boardEdgeInput,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify board ownership
      const board = await ctx.prisma.board.findFirst({
        where: {
          id: input.boardId,
          userId: ctx.session.user.id,
        },
      })

      if (!board) {
        throw new Error('Board not found')
      }

      // Verify both items exist on this board
      const [sourceItem, targetItem] = await Promise.all([
        ctx.prisma.boardItem.findFirst({
          where: {
            id: input.edge.sourceId,
            boardId: input.boardId,
          },
        }),
        ctx.prisma.boardItem.findFirst({
          where: {
            id: input.edge.targetId,
            boardId: input.boardId,
          },
        }),
      ])

      if (!sourceItem || !targetItem) {
        throw new Error('Source or target item not found on this board')
      }

      // Check for circular dependencies (basic check)
      if (input.edge.sourceId === input.edge.targetId) {
        throw new Error('Cannot create edge to self')
      }

      return ctx.prisma.boardEdge.create({
        data: {
          ...input.edge,
          boardId: input.boardId,
        },
        include: {
          source: true,
          target: true,
        },
      })
    }),

  // Remove edge
  removeEdge: protectedProcedure
    .input(z.object({ edgeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the edge belongs to a board owned by the user
      const edge = await ctx.prisma.boardEdge.findFirst({
        where: {
          id: input.edgeId,
        },
        include: {
          board: true,
        },
      })

      if (!edge || edge.board.userId !== ctx.session.user.id) {
        throw new Error('Board edge not found')
      }

      return ctx.prisma.boardEdge.delete({
        where: {
          id: input.edgeId,
        },
      })
    }),

  // Get board statistics
  getStats: protectedProcedure
    .input(z.object({ boardId: z.string() }))
    .query(async ({ ctx, input }) => {
      const board = await ctx.prisma.board.findFirst({
        where: {
          id: input.boardId,
          userId: ctx.session.user.id,
        },
        include: {
          items: true,
          edges: true,
        },
      })

      if (!board) {
        throw new Error('Board not found')
      }

      // Get task and event data to calculate progress
      const taskIds = board.items
        .filter((item) => item.externalType === 'TASK')
        .map((item) => item.externalId)

      const eventIds = board.items
        .filter((item) => item.externalType === 'EVENT')
        .map((item) => item.externalId)

      const [tasks, events] = await Promise.all([
        taskIds.length > 0
          ? ctx.prisma.task.findMany({
              where: {
                id: { in: taskIds },
                userId: ctx.session.user.id,
              },
            })
          : [],
        eventIds.length > 0
          ? ctx.prisma.calendarEvent.findMany({
              where: {
                id: { in: eventIds },
                userId: ctx.session.user.id,
              },
            })
          : [],
      ])

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

      // Calculate completion stats
      const completedTasks = tasks.filter(
        (task) => task.status === 'COMPLETED'
      ).length
      const completedEvents = events.filter(
        (event) => event.endsAt < now
      ).length
      const totalItems = board.items.length
      const completedItems = completedTasks + completedEvents

      // Calculate status counts
      const overdueTasks = tasks.filter(
        (task) =>
          task.status === 'ACTIVE' && task.dueDate && task.dueDate < today
      ).length

      const dueTodayTasks = tasks.filter(
        (task) =>
          task.status === 'ACTIVE' &&
          task.dueDate &&
          task.dueDate >= today &&
          task.dueDate < tomorrow
      ).length

      const upcomingEvents = events.filter(
        (event) => event.startsAt > now && event.startsAt <= tomorrow
      ).length

      return {
        totalItems,
        completedItems,
        progressPercentage:
          totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
        totalEdges: board.edges.length,
        overdueTasks,
        dueTodayTasks,
        upcomingEvents,
        tasksCount: tasks.length,
        eventsCount: events.length,
      }
    }),
})
