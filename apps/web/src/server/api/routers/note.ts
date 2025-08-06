import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'

const noteInput = z.object({
  title: z.string().optional(),
  content: z.any(), // JSON content
  tags: z.array(z.string()).default([]),
})

export const noteRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.note.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { updatedAt: 'desc' },
    })
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.note.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      })
    }),

  create: protectedProcedure
    .input(noteInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.note.create({
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
        data: noteInput.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.note.update({
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
      return ctx.prisma.note.delete({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      })
    }),

  searchByTags: protectedProcedure
    .input(z.object({ tags: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.note.findMany({
        where: {
          userId: ctx.session.user.id,
          tags: {
            hasSome: input.tags,
          },
        },
        orderBy: { updatedAt: 'desc' },
      })
    }),
})
