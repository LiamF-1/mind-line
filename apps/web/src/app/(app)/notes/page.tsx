'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Tag } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { formatDistanceToNow } from 'date-fns'

export default function NotesPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string>('')

  const debouncedSearch = useDebounce(searchQuery, 300)

  // Get notes with search and filtering
  const {
    data: notesData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.note.list.useInfiniteQuery(
    {
      query: debouncedSearch || undefined,
      tag: selectedTag || undefined,
      limit: 20,
    },
    {
      getNextPageParam: (lastPage: any) => lastPage.nextCursor,
    }
  )

  // Get available tags
  const { data: tags = [] } = trpc.note.getTags.useQuery()

  // Create note mutation
  const createNoteMutation = trpc.note.create.useMutation({
    onSuccess: (note: any) => {
      router.push(`/notes/${note.id}`)
    },
  })

  const handleCreateNote = async () => {
    try {
      await createNoteMutation.mutateAsync({
        title: 'Untitled Note',
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
        tags: [],
      })
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }

  const handleNoteClick = (noteId: string) => {
    router.push(`/notes/${noteId}`)
  }

  const extractTextFromContent = (content: any): string => {
    if (!content || !content.content) return ''

    const extractText = (node: any): string => {
      if (node.type === 'text') return node.text || ''
      if (node.content) {
        return node.content.map(extractText).join('')
      }
      return ''
    }

    return content.content.map(extractText).join(' ').slice(0, 120)
  }

  const allNotes = notesData?.pages.flatMap((page: any) => page.notes) ?? []

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-6">
        <div>
          <h1 className="text-3xl font-bold">Notes</h1>
          <p className="text-muted-foreground">
            Capture your thoughts and ideas
          </p>
        </div>
        <Button
          onClick={handleCreateNote}
          disabled={createNoteMutation.isPending}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Note
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="border-b p-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute left-3 top-3 h-4 w-4" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Tag filters */}
        {tags.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedTag === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTag('')}
              >
                All
              </Button>
              {tags.slice(0, 5).map((tag: string) => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                  className="hidden sm:inline-flex"
                >
                  <Tag className="mr-1 h-3 w-3" />
                  {tag}
                </Button>
              ))}
              {/* Mobile: Show tags in a horizontal scroll */}
              <div className="flex gap-2 overflow-x-auto sm:hidden">
                {tags.map((tag: string) => (
                  <Button
                    key={tag}
                    variant={selectedTag === tag ? 'default' : 'outline'}
                    size="sm"
                    onClick={() =>
                      setSelectedTag(selectedTag === tag ? '' : tag)
                    }
                    className="flex-shrink-0"
                  >
                    <Tag className="mr-1 h-3 w-3" />
                    {tag}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="bg-muted h-4 w-3/4 rounded" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="bg-muted h-3 w-full rounded" />
                    <div className="bg-muted h-3 w-2/3 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : allNotes.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground text-lg">No notes found</p>
              <p className="text-muted-foreground text-sm">
                {searchQuery || selectedTag
                  ? 'Try adjusting your search or filters'
                  : 'Create your first note to get started'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allNotes.map((note: any) => (
                <Card
                  key={note.id}
                  className="hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleNoteClick(note.id)}
                >
                  <CardHeader>
                    <CardTitle className="line-clamp-2 text-base">
                      {note.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-3 line-clamp-3 text-sm">
                      {extractTextFromContent(note.content)}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(note.tags) &&
                          note.tags.slice(0, 2).map((tag: string) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        {Array.isArray(note.tags) && note.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{note.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {formatDistanceToNow(new Date(note.updatedAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Load More Button */}
            {hasNextPage && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
