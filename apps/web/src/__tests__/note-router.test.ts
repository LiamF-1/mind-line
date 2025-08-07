import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { noteRouter } from '@/server/api/routers/note'
import { createTRPCContext } from '@/server/api/trpc'
import type { AppRouter } from '@/server/api/root'
import React from 'react'

// Mock Prisma client
const mockPrisma = {
  note: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  noteRevision: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
  $queryRaw: vi.fn(),
}

// Mock session
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
}

// Mock context
const mockContext = {
  session: mockSession,
  req: undefined,
  prisma: mockPrisma as any,
  redis: null,
}

describe('Note Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should create a new note with revision', async () => {
      const noteData = {
        title: 'Test Note',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Hello world' }],
            },
          ],
        },
        tags: ['test', 'demo'],
      }

      const mockNote = {
        id: 'note-1',
        ...noteData,
        userId: mockSession.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          note: {
            create: vi.fn().mockResolvedValue(mockNote),
          },
          noteRevision: {
            create: vi.fn().mockResolvedValue({
              id: 'revision-1',
              noteId: mockNote.id,
              content: noteData.content,
              createdAt: new Date(),
            }),
          },
        })
      })

      const caller = noteRouter.createCaller(mockContext)
      const result = await caller.create(noteData)

      expect(result).toEqual(mockNote)
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce()
    })

    it('should require a title', async () => {
      const caller = noteRouter.createCaller(mockContext)

      await expect(
        caller.create({
          title: '',
          content: { type: 'doc', content: [] },
          tags: [],
        })
      ).rejects.toThrow()
    })
  })

  describe('list', () => {
    it('should return paginated notes', async () => {
      const mockNotes = [
        {
          id: 'note-1',
          title: 'First Note',
          content: { type: 'doc', content: [] },
          tags: ['tag1'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'note-2',
          title: 'Second Note',
          content: { type: 'doc', content: [] },
          tags: ['tag2'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockPrisma.note.findMany.mockResolvedValue(mockNotes)

      const caller = noteRouter.createCaller(mockContext)
      const result = await caller.list({ limit: 20 })

      expect(result.notes).toEqual(mockNotes)
      expect(result.nextCursor).toBeUndefined()
      expect(mockPrisma.note.findMany).toHaveBeenCalledWith({
        where: { userId: mockSession.user.id },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: 21,
        select: {
          id: true,
          title: true,
          content: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    })

    it('should handle search queries', async () => {
      mockPrisma.note.findMany.mockResolvedValue([])

      const caller = noteRouter.createCaller(mockContext)
      await caller.list({ query: 'test search', limit: 20 })

      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockSession.user.id,
            OR: expect.arrayContaining([
              {
                title: {
                  contains: 'test search',
                  mode: 'insensitive',
                },
              },
            ]),
          }),
        })
      )
    })
  })

  describe('get', () => {
    it('should return a note with revisions', async () => {
      const mockNote = {
        id: 'note-1',
        title: 'Test Note',
        content: { type: 'doc', content: [] },
        tags: ['test'],
        userId: mockSession.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        revisions: [
          {
            id: 'revision-1',
            noteId: 'note-1',
            content: { type: 'doc', content: [] },
            createdAt: new Date(),
          },
        ],
      }

      mockPrisma.note.findFirst.mockResolvedValue(mockNote)

      const caller = noteRouter.createCaller(mockContext)
      const result = await caller.get({ id: 'note-1' })

      expect(result).toEqual(mockNote)
      expect(mockPrisma.note.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'note-1',
          userId: mockSession.user.id,
        },
        include: {
          revisions: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      })
    })

    it('should throw error if note not found', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(null)

      const caller = noteRouter.createCaller(mockContext)

      await expect(caller.get({ id: 'non-existent' })).rejects.toThrow(
        'Note not found'
      )
    })
  })

  describe('update', () => {
    it('should update a note and create revision if content changed', async () => {
      const existingNote = {
        id: 'note-1',
        title: 'Old Title',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Old content' }],
            },
          ],
        },
        tags: ['old'],
        userId: mockSession.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedNote = {
        ...existingNote,
        title: 'New Title',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'New content' }],
            },
          ],
        },
      }

      mockPrisma.note.findFirst.mockResolvedValue(existingNote)
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          note: {
            update: vi.fn().mockResolvedValue(updatedNote),
          },
          noteRevision: {
            create: vi.fn().mockResolvedValue({
              id: 'revision-2',
              noteId: existingNote.id,
              content: updatedNote.content,
              createdAt: new Date(),
            }),
          },
        })
      })

      const caller = noteRouter.createCaller(mockContext)
      const result = await caller.update({
        id: 'note-1',
        data: {
          title: 'New Title',
          content: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'New content' }],
              },
            ],
          },
        },
      })

      expect(result).toEqual(updatedNote)
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce()
    })
  })

  describe('delete', () => {
    it('should delete a note', async () => {
      const mockNote = {
        id: 'note-1',
        title: 'Test Note',
        userId: mockSession.user.id,
      }

      mockPrisma.note.findFirst.mockResolvedValue(mockNote)
      mockPrisma.note.delete.mockResolvedValue(mockNote)

      const caller = noteRouter.createCaller(mockContext)
      const result = await caller.delete({ id: 'note-1' })

      expect(result).toEqual({ success: true })
      expect(mockPrisma.note.delete).toHaveBeenCalledWith({
        where: { id: 'note-1' },
      })
    })

    it('should throw error if note not found', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(null)

      const caller = noteRouter.createCaller(mockContext)

      await expect(caller.delete({ id: 'non-existent' })).rejects.toThrow(
        'Note not found'
      )
    })
  })

  describe('search', () => {
    it('should perform full-text search', async () => {
      const mockResults = [
        {
          id: 'note-1',
          title: 'Test Note',
          content: { type: 'doc', content: [] },
          tags: ['test'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockPrisma.$queryRaw.mockResolvedValue(mockResults)

      const caller = noteRouter.createCaller(mockContext)
      const result = await caller.search({ query: 'test search' })

      expect(result).toEqual(mockResults)
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1)

      // Verify the query contains the expected parts
      const queryCall = mockPrisma.$queryRaw.mock.calls[0]
      const queryParts = queryCall[0]
      expect(Array.isArray(queryParts)).toBe(true)
      expect(queryParts.join('')).toContain('SELECT id, title, content, tags')
      expect(queryParts.join('')).toContain('FROM notes')
      expect(queryParts.join('')).toContain('WHERE "user_id" =')
      expect(queryCall).toContain('test-user-id')
      expect(queryCall).toContain('test search')
    })

    it('should return empty array for empty query', async () => {
      const caller = noteRouter.createCaller(mockContext)
      const result = await caller.search({ query: '   ' })

      expect(result).toEqual([])
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled()
    })
  })

  describe('getTags', () => {
    it('should return unique tags from all user notes', async () => {
      const mockNotes = [
        { tags: ['tag1', 'tag2'] },
        { tags: ['tag2', 'tag3'] },
        { tags: ['tag1'] },
      ]

      mockPrisma.note.findMany.mockResolvedValue(mockNotes)

      const caller = noteRouter.createCaller(mockContext)
      const result = await caller.getTags()

      expect(result).toEqual(['tag1', 'tag2', 'tag3'])
      expect(mockPrisma.note.findMany).toHaveBeenCalledWith({
        where: { userId: mockSession.user.id },
        select: { tags: true },
      })
    })
  })
})
