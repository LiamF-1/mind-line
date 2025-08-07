import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'

const taskInput = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).default('ACTIVE'),
  dueDate: z.date().optional(),
  label: z.string().optional(),
  calendarEventId: z.string().optional(),
})

const taskFilterInput = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  overdue: z.boolean().optional(),
  dueToday: z.boolean().optional(),
  upcoming: z.boolean().optional(),
})

export const taskRouter = createTRPCRouter({
  // Get all tasks with optional filtering
  list: protectedProcedure
    .input(taskFilterInput.optional())
    .query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.session.user.id }

      if (input?.status) {
        where.status = input.status
      }

      if (input?.priority) {
        where.priority = input.priority
      }

      if (input?.overdue) {
        where.dueDate = {
          lt: new Date(),
        }
        where.status = 'ACTIVE'
      }

      if (input?.dueToday) {
        const today = new Date()
        const startOfDay = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        )
        const endOfDay = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          23,
          59,
          59
        )
        where.dueDate = {
          gte: startOfDay,
          lte: endOfDay,
        }
      }

      if (input?.upcoming) {
        const today = new Date()
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
        where.dueDate = {
          gt: today,
          lte: nextWeek,
        }
        where.status = 'ACTIVE'
      }

      return ctx.prisma.task.findMany({
        where,
        include: {
          calendarEvent: true,
        },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      })
    }),

  // Get task counts for dashboard
  getCounts: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date()
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    )
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59
    )
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    const [totalActive, dueToday, overdue, upcoming] = await Promise.all([
      ctx.prisma.task.count({
        where: {
          userId: ctx.session.user.id,
          status: 'ACTIVE',
        },
      }),
      ctx.prisma.task.count({
        where: {
          userId: ctx.session.user.id,
          status: 'ACTIVE',
          dueDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),
      ctx.prisma.task.count({
        where: {
          userId: ctx.session.user.id,
          status: 'ACTIVE',
          dueDate: {
            lt: today,
          },
        },
      }),
      ctx.prisma.task.count({
        where: {
          userId: ctx.session.user.id,
          status: 'ACTIVE',
          dueDate: {
            gt: today,
            lte: nextWeek,
          },
        },
      }),
    ])

    return {
      totalActive,
      dueToday,
      overdue,
      upcoming,
    }
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.task.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        include: {
          calendarEvent: true,
        },
      })
    }),

  create: protectedProcedure
    .input(taskInput)
    .mutation(async ({ ctx, input }) => {
      // Get the max order for the user's tasks
      const maxOrderTask = await ctx.prisma.task.findFirst({
        where: { userId: ctx.session.user.id },
        orderBy: { order: 'desc' },
        select: { order: true },
      })

      const nextOrder = maxOrderTask ? maxOrderTask.order + 1 : 1

      return ctx.prisma.task.create({
        data: {
          ...input,
          order: nextOrder,
          userId: ctx.session.user.id,
        },
        include: {
          calendarEvent: true,
        },
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: taskInput.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.task.update({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        data: input.data,
        include: {
          calendarEvent: true,
        },
      })
    }),

  // Update task order for drag and drop
  updateOrder: protectedProcedure
    .input(
      z.object({
        taskIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update order for each task
      const updates = input.taskIds.map((id, index) =>
        ctx.prisma.task.update({
          where: {
            id,
            userId: ctx.session.user.id,
          },
          data: {
            order: index + 1,
          },
        })
      )

      await Promise.all(updates)
      return { success: true }
    }),

  // Toggle task status (Active <-> Completed)
  toggleStatus: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      })

      if (!task) {
        throw new Error('Task not found')
      }

      const newStatus = task.status === 'ACTIVE' ? 'COMPLETED' : 'ACTIVE'

      return ctx.prisma.task.update({
        where: { id: input.id },
        data: { status: newStatus },
        include: {
          calendarEvent: true,
        },
      })
    }),

  // Archive task
  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.task.update({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        data: { status: 'ARCHIVED' },
        include: {
          calendarEvent: true,
        },
      })
    }),

  // Restore task from archive
  restore: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.task.update({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        data: { status: 'ACTIVE' },
        include: {
          calendarEvent: true,
        },
      })
    }),

  // Bulk operations
  bulkUpdate: protectedProcedure
    .input(
      z.object({
        taskIds: z.array(z.string()),
        data: z.object({
          status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
          priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
          label: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.task.updateMany({
        where: {
          id: { in: input.taskIds },
          userId: ctx.session.user.id,
        },
        data: input.data,
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.task.delete({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      })
    }),
})
