'use client'

import { useState, useEffect, use, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Trash2,
  Clock,
  Tag,
  MoreHorizontal,
} from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { NoteEditor } from '@/components/notes/note-editor'
import { NoteRevisionHistory } from '@/components/notes/note-revision-history'
import { NoteTagsManager } from '@/components/notes/note-tags-manager'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { formatDistanceToNow } from 'date-fns'

interface NoteEditorPageProps {
  params: Promise<{
    id: string
  }>
}

export default function NoteEditorPage({ params }: NoteEditorPageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<any>(null)
  const [tags, setTags] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showRevisions, setShowRevisions] = useState(false)
  const [showTagsManager, setShowTagsManager] = useState(false)
  const isInitialLoad = useRef(true)
  const lastSavedValues = useRef<{
    title: string
    content: any
    tags: string[]
  } | null>(null)

  const debouncedTitle = useDebounce(title, 1500)
  const debouncedContent = useDebounce(content, 1500)
  const debouncedTags = useDebounce(tags, 1500)

  // Get note data
  const {
    data: note,
    isLoading,
    error,
    refetch,
  } = trpc.note.get.useQuery({ id: resolvedParams.id })

  // Update note mutation
  const updateNoteMutation = trpc.note.update.useMutation({
    onSuccess: () => {
      // Store the last saved values to prevent re-triggering
      lastSavedValues.current = {
        title: debouncedTitle,
        content: debouncedContent,
        tags: debouncedTags,
      }
      setLastSaved(new Date())
      setIsSaving(false)
    },
    onError: () => {
      setIsSaving(false)
    },
  })

  // Delete note mutation
  const deleteNoteMutation = trpc.note.delete.useMutation({
    onSuccess: () => {
      router.push('/notes')
    },
  })

  // Initialize state when note loads
  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
      setTags(
        Array.isArray(note.tags)
          ? note.tags.filter(
              (tag: any): tag is string => typeof tag === 'string'
            )
          : []
      )
      setLastSaved(new Date(note.updatedAt))
      isInitialLoad.current = true
      // Clear last saved values when loading a new note
      lastSavedValues.current = null
    }
  }, [note])

  const handleSave = useCallback(async () => {
    if (!note || isSaving) return

    setIsSaving(true)
    try {
      await updateNoteMutation.mutateAsync({
        id: note.id,
        data: {
          title: debouncedTitle,
          content: debouncedContent,
          tags: debouncedTags,
        },
      })
    } catch (error) {
      console.error('Failed to save note:', error)
    }
  }, [
    note,
    isSaving,
    updateNoteMutation,
    debouncedTitle,
    debouncedContent,
    debouncedTags,
  ])

  // Auto-save when debounced values change
  useEffect(() => {
    if (!note || isSaving) return

    // Skip auto-save on initial load
    if (isInitialLoad.current) {
      isInitialLoad.current = false
      return
    }

    // Check if values have changed from what we last saved
    const lastSaved = lastSavedValues.current
    if (lastSaved) {
      const isSameAsLastSaved =
        debouncedTitle === lastSaved.title &&
        JSON.stringify(debouncedContent) ===
          JSON.stringify(lastSaved.content) &&
        JSON.stringify(debouncedTags) === JSON.stringify(lastSaved.tags)

      if (isSameAsLastSaved) {
        console.log('Skipping auto-save: values same as last saved')
        return
      }
    }

    const hasChanges =
      debouncedTitle !== note.title ||
      JSON.stringify(debouncedContent) !== JSON.stringify(note.content) ||
      JSON.stringify(debouncedTags) !== JSON.stringify(note.tags)

    console.log('Auto-save check:', {
      hasChanges,
      titleChanged: debouncedTitle !== note.title,
      contentChanged:
        JSON.stringify(debouncedContent) !== JSON.stringify(note.content),
      tagsChanged: JSON.stringify(debouncedTags) !== JSON.stringify(note.tags),
    })

    if (hasChanges && debouncedTitle && debouncedContent) {
      console.log('Triggering auto-save...')
      setIsSaving(true)
      updateNoteMutation.mutate({
        id: note.id,
        data: {
          title: debouncedTitle,
          content: debouncedContent,
          tags: debouncedTags,
        },
      })
    }
  }, [
    debouncedTitle,
    debouncedContent,
    debouncedTags,
    note,
    isSaving,
    updateNoteMutation,
  ])

  const handleManualSave = useCallback(() => {
    if (note && title && content) {
      updateNoteMutation.mutate({
        id: note.id,
        data: {
          title,
          content,
          tags,
        },
      })
    }
  }, [note, title, content, tags, updateNoteMutation])

  const handleDelete = () => {
    if (note && window.confirm('Are you sure you want to delete this note?')) {
      deleteNoteMutation.mutate({ id: note.id })
    }
  }

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleManualSave()
      }
    },
    [handleManualSave]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground mt-2 text-sm">Loading note...</p>
        </div>
      </div>
    )
  }

  if (error || !note) {
    notFound()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/notes')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="text-muted-foreground flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden sm:inline">Notes</span>
            <span className="hidden sm:inline">/</span>
            <span className="text-foreground truncate font-medium">
              {title || 'Untitled'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save status */}
          <div className="text-muted-foreground hidden items-center gap-2 text-sm sm:flex">
            {isSaving ? (
              <>
                <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
                <span>Saving...</span>
              </>
            ) : lastSaved ? (
              <>
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>
                  Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
                </span>
              </>
            ) : null}
          </div>

          {/* Mobile save indicator */}
          <div className="sm:hidden">
            {isSaving ? (
              <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
            ) : lastSaved ? (
              <div className="h-2 w-2 rounded-full bg-green-500" />
            ) : null}
          </div>

          {/* Actions */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowRevisions(true)}>
                <Clock className="mr-2 h-4 w-4" />
                Version History
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowTagsManager(true)}>
                <Tag className="mr-2 h-4 w-4" />
                Manage Tags
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive"
                disabled={deleteNoteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Note
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Title and Tags */}
      <div className="border-b p-4">
        <Input
          placeholder="Note title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="placeholder:text-muted-foreground mb-3 border-none px-0 text-2xl font-bold focus-visible:ring-0"
        />

        {/* Tags display */}
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
          {tags.length === 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTagsManager(true)}
              className="text-muted-foreground"
            >
              <Tag className="mr-2 h-4 w-4" />
              Add tags...
            </Button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <NoteEditor
          content={content}
          onChange={setContent}
          placeholder="Start writing..."
        />
      </div>

      {/* Revision History Modal */}
      {showRevisions && (
        <NoteRevisionHistory
          note={note}
          open={showRevisions}
          onOpenChange={setShowRevisions}
          onRevisionSelect={(revision) => {
            setContent(revision.content)
            setShowRevisions(false)
          }}
        />
      )}

      {/* Tags Manager Modal */}
      {showTagsManager && (
        <NoteTagsManager
          tags={tags}
          onChange={setTags}
          open={showTagsManager}
          onOpenChange={setShowTagsManager}
        />
      )}
    </div>
  )
}
