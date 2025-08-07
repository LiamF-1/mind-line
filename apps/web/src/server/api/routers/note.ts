import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'

const noteInput = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.any(), // TipTap JSON content
  tags: z.array(z.string()).default([]),
})

const noteUpdateInput = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  content: z.any().optional(),
  tags: z.array(z.string()).optional(),
})

export const noteRouter = createTRPCRouter({
  // List notes with pagination and search
  list: protectedProcedure
    .input(
      z.object({
        query: z.string().optional(),
        tag: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { query, tag, cursor, limit } = input
      const userId = ctx.session.user.id

      let whereClause: any = { userId }

      // Add search conditions
      if (query) {
        // Use PostgreSQL full-text search
        const searchQuery = query.replace(/[^a-zA-Z0-9\s]/g, '').trim()
        if (searchQuery) {
          whereClause = {
            ...whereClause,
            OR: [
              {
                title: {
                  contains: searchQuery,
                  mode: 'insensitive',
                },
              },
              // For full-text search, we'll use raw query
            ],
          }
        }
      }

      // Add tag filter
      if (tag) {
        whereClause.tags = {
          array_contains: [tag],
        }
      }

      // Add cursor pagination
      if (cursor) {
        whereClause.id = {
          lt: cursor,
        }
      }

      const notes = await ctx.prisma.note.findMany({
        where: whereClause,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: {
          id: true,
          title: true,
          content: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      let nextCursor: typeof cursor | undefined = undefined
      if (notes.length > limit) {
        const nextItem = notes.pop()
        nextCursor = nextItem!.id
      }

      return {
        notes,
        nextCursor,
      }
    }),

  // Get single note with revisions
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const note = await ctx.prisma.note.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        include: {
          revisions: {
            orderBy: { createdAt: 'desc' },
            take: 5, // Last 5 revisions
          },
        },
      })

      if (!note) {
        throw new Error('Note not found')
      }

      return note
    }),

  // Create new note
  create: protectedProcedure
    .input(noteInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      // Create note and first revision in a transaction
      const result = await ctx.prisma.$transaction(async (tx: any) => {
        const note = await tx.note.create({
          data: {
            title: input.title,
            content: input.content,
            tags: input.tags,
            userId,
          },
        })

        // Create initial revision
        await tx.noteRevision.create({
          data: {
            noteId: note.id,
            content: input.content,
          },
        })

        return note
      })

      return result
    }),

  // Update existing note
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: noteUpdateInput,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      // Check if note exists and user owns it
      const existingNote = await ctx.prisma.note.findFirst({
        where: {
          id: input.id,
          userId,
        },
      })

      if (!existingNote) {
        throw new Error('Note not found')
      }

      const result = await ctx.prisma.$transaction(async (tx: any) => {
        const note = await tx.note.update({
          where: { id: input.id },
          data: input.data,
        })

        // Create revision if content changed
        if (
          input.data.content &&
          JSON.stringify(input.data.content) !==
            JSON.stringify(existingNote.content)
        ) {
          await tx.noteRevision.create({
            data: {
              noteId: note.id,
              content: input.data.content,
            },
          })
        }

        return note
      })

      return result
    }),

  // Delete note
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      // Verify ownership before deletion
      const note = await ctx.prisma.note.findFirst({
        where: {
          id: input.id,
          userId,
        },
      })

      if (!note) {
        throw new Error('Note not found')
      }

      // Delete note (revisions will be cascade deleted)
      await ctx.prisma.note.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // Search notes using full-text search
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const searchQuery = input.query.replace(/[^a-zA-Z0-9\s]/g, '').trim()

      if (!searchQuery) {
        return []
      }

      // Use raw query for PostgreSQL full-text search
      const notes = await ctx.prisma.$queryRaw`
        SELECT id, title, content, tags, "createdAt", "updatedAt"
        FROM notes
        WHERE "user_id" = ${userId}
          AND to_tsvector('simple', title || ' ' || content::text) @@ plainto_tsquery('simple', ${searchQuery})
        ORDER BY ts_rank(to_tsvector('simple', title || ' ' || content::text), plainto_tsquery('simple', ${searchQuery})) DESC
        LIMIT ${input.limit}
      `

      return notes
    }),

  // Get all unique tags for the user
  getTags: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id

    const notes = await ctx.prisma.note.findMany({
      where: { userId },
      select: { tags: true },
    })

    // Extract unique tags from all notes
    const allTags = new Set<string>()
    notes.forEach((note: any) => {
      const tags = Array.isArray(note.tags) ? (note.tags as string[]) : []
      tags.forEach((tag) => allTags.add(tag))
    })

    return Array.from(allTags).sort()
  }),
})
