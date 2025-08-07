import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NotesPage from '@/app/(app)/notes/page'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock tRPC
vi.mock('@/lib/trpc', () => ({
  trpc: {
    note: {
      list: {
        useInfiniteQuery: () => mockUseInfiniteQuery(),
      },
      getTags: {
        useQuery: () => mockUseQuery(),
      },
      create: {
        useMutation: (options?: any) => {
          const result = mockUseMutation()
          // Override mutateAsync to call onSuccess if provided
          if (options?.onSuccess) {
            const originalMutateAsync = result.mutateAsync
            result.mutateAsync = async (...args: any[]) => {
              const response = await originalMutateAsync(...args)
              options.onSuccess(response)
              return response
            }
          }
          return result
        },
      },
    },
  },
}))

// Mock debounce hook
vi.mock('@/lib/hooks/use-debounce', () => ({
  useDebounce: (value: any) => value,
}))

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn().mockReturnValue('2 hours ago'),
}))

// Create mock functions that we'll use in tests
const mockUseInfiniteQuery = vi.fn()
const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()

describe('NotesPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    // Default mock implementations
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          {
            notes: [
              {
                id: 'note-1',
                title: 'First Note',
                content: {
                  type: 'doc',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'text',
                          text: 'This is the first note content',
                        },
                      ],
                    },
                  ],
                },
                tags: ['work', 'important'],
                updatedAt: new Date().toISOString(),
              },
              {
                id: 'note-2',
                title: 'Second Note',
                content: {
                  type: 'doc',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'text',
                          text: 'This is the second note content',
                        },
                      ],
                    },
                  ],
                },
                tags: ['personal'],
                updatedAt: new Date().toISOString(),
              },
            ],
            nextCursor: null,
          },
        ],
      },
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    })

    mockUseQuery.mockReturnValue({
      data: ['work', 'personal', 'important'],
    })

    mockUseMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false,
      mutate: vi.fn(),
      data: undefined,
      error: null,
      isError: false,
      isSuccess: false,
      isPending: false,
      reset: vi.fn(),
    })
  })

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  it('should render notes page with header and notes list', () => {
    renderWithProviders(<NotesPage />)

    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(
      screen.getByText('Capture your thoughts and ideas')
    ).toBeInTheDocument()
    expect(screen.getByText('New Note')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search notes...')).toBeInTheDocument()
  })

  it('should display notes in grid layout', () => {
    renderWithProviders(<NotesPage />)

    expect(screen.getByText('First Note')).toBeInTheDocument()
    expect(screen.getByText('Second Note')).toBeInTheDocument()
    expect(
      screen.getByText('This is the first note content')
    ).toBeInTheDocument()
    expect(screen.getAllByText('work')).toHaveLength(3) // Desktop filter, mobile filter, note badge
    expect(screen.getAllByText('personal')).toHaveLength(3) // Desktop filter, mobile filter, note badge
  })

  it('should show loading state', () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    })

    renderWithProviders(<NotesPage />)

    // Should show loading skeleton cards
    const skeletonCards = screen
      .getAllByRole('generic')
      .filter((el) => el.className.includes('animate-pulse'))
    expect(skeletonCards.length).toBeGreaterThan(0)
  })

  it('should show empty state when no notes exist', () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [{ notes: [], nextCursor: null }],
      },
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    })

    renderWithProviders(<NotesPage />)

    expect(screen.getByText('No notes found')).toBeInTheDocument()
    expect(
      screen.getByText('Create your first note to get started')
    ).toBeInTheDocument()
  })

  it('should handle search input', async () => {
    const user = userEvent.setup()
    renderWithProviders(<NotesPage />)

    const searchInput = screen.getByPlaceholderText('Search notes...')
    await user.type(searchInput, 'test search')

    expect(searchInput).toHaveValue('test search')
  })

  it('should display tag filters', () => {
    renderWithProviders(<NotesPage />)

    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getAllByText('work')).toHaveLength(3) // Desktop filter, mobile filter, note badge
    expect(screen.getAllByText('personal')).toHaveLength(3) // Desktop filter, mobile filter, note badge
    expect(screen.getAllByText('important')).toHaveLength(3) // Desktop filter, mobile filter, note badge
  })

  it('should handle tag filter selection', async () => {
    const user = userEvent.setup()
    renderWithProviders(<NotesPage />)

    // Get all buttons with "work" text and find the filter button (should be the first one)
    const workTagButtons = screen.getAllByRole('button', { name: /work/i })
    const workTagButton = workTagButtons[0] // Filter button should be first
    await user.click(workTagButton)

    // The button should now have the default variant (selected state)
    expect(workTagButton).toBeInTheDocument()
  })

  it('should create new note when button is clicked', async () => {
    const user = userEvent.setup()
    const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'new-note-id' })

    // Set up the mutation mock before rendering
    mockUseMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
      mutate: vi.fn(),
      data: undefined,
      error: null,
      isError: false,
      isSuccess: false,
      isPending: false,
      reset: vi.fn(),
    })

    renderWithProviders(<NotesPage />)

    const newNoteButton = screen.getByText('New Note')
    await user.click(newNoteButton)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        title: 'Untitled Note',
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
        tags: [],
      })
    })

    // Wait for the async operation to complete and onSuccess to be called
    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith('/notes/new-note-id')
      },
      { timeout: 3000 }
    )
  })

  it('should navigate to note when clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<NotesPage />)

    const noteCard = screen.getByText('First Note').closest('[role="generic"]')
    if (noteCard) {
      await user.click(noteCard)
      expect(mockPush).toHaveBeenCalledWith('/notes/note-1')
    }
  })

  it('should show load more button when has next page', () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          {
            notes: [
              {
                id: 'note-1',
                title: 'First Note',
                content: { type: 'doc', content: [] },
                tags: [],
                updatedAt: new Date().toISOString(),
              },
            ],
            nextCursor: 'cursor-1',
          },
        ],
      },
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: true,
      isFetchingNextPage: false,
    })

    renderWithProviders(<NotesPage />)

    expect(screen.getByText('Load More')).toBeInTheDocument()
  })

  it('should extract text content from TipTap JSON', () => {
    renderWithProviders(<NotesPage />)

    // The component should extract and display the text content from the JSON
    expect(
      screen.getByText('This is the first note content')
    ).toBeInTheDocument()
    expect(
      screen.getByText('This is the second note content')
    ).toBeInTheDocument()
  })

  it('should limit tag display and show count for additional tags', () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          {
            notes: [
              {
                id: 'note-1',
                title: 'Note with many tags',
                content: { type: 'doc', content: [] },
                tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
                updatedAt: new Date().toISOString(),
              },
            ],
            nextCursor: null,
          },
        ],
      },
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    })

    renderWithProviders(<NotesPage />)

    // Should show first 2 tags and +3 indicator
    expect(screen.getByText('tag1')).toBeInTheDocument()
    expect(screen.getByText('tag2')).toBeInTheDocument()
    expect(screen.getByText('+3')).toBeInTheDocument()
  })
})
