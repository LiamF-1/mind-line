import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'

const eventInput = z
  .object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    startsAt: z.date(),
    endsAt: z.date(),
    allDay: z.boolean().default(false),
    color: z.string().default('#3b82f6'),
    location: z.string().optional(),
  })
  .refine((data) => data.endsAt > data.startsAt, {
    message: 'End time must be after start time',
    path: ['endsAt'],
  })

export const eventRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.calendarEvent.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { startsAt: 'asc' },
    })
  }),

  getByDateRange: protectedProcedure
    .input(
      z.object({
        start: z.date(),
        end: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.calendarEvent.findMany({
        where: {
          userId: ctx.session.user.id,
          startsAt: {
            gte: input.start,
            lte: input.end,
          },
        },
        orderBy: { startsAt: 'asc' },
      })
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.calendarEvent.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      })
    }),

  create: protectedProcedure
    .input(eventInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.calendarEvent.create({
        data: {
          ...input,
          userId: ctx.session.user.id,
        },
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: eventInput.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.calendarEvent.update({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        data: input.data,
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.calendarEvent.delete({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      })
    }),
})
