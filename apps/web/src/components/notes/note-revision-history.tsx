'use client'

import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { Clock, Eye } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

interface NoteRevision {
  id: string
  content: any
  createdAt: string | Date
}

interface Note {
  id: string
  title: string
  content: any
  revisions: NoteRevision[]
  updatedAt: string | Date
}

interface NoteRevisionHistoryProps {
  note: Note
  open: boolean
  onOpenChange: (open: boolean) => void
  onRevisionSelect: (revision: NoteRevision) => void
}

export function NoteRevisionHistory({
  note,
  open,
  onOpenChange,
  onRevisionSelect,
}: NoteRevisionHistoryProps) {
  const [selectedRevision, setSelectedRevision] = useState<NoteRevision | null>(
    null
  )

  const extractTextFromContent = (content: any): string => {
    if (!content || !content.content) return ''

    const extractText = (node: any): string => {
      if (node.type === 'text') return node.text || ''
      if (node.content) {
        return node.content.map(extractText).join('')
      }
      return ''
    }

    return content.content.map(extractText).join(' ')
  }

  const allRevisions = [
    // Current version
    {
      id: 'current',
      content: note.content,
      createdAt: note.updatedAt,
    },
    // Historical revisions
    ...note.revisions,
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[80vh] max-w-4xl">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
        </DialogHeader>

        <div className="flex h-full gap-4">
          {/* Revision List */}
          <div className="w-1/3 border-r pr-4">
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {allRevisions.map((revision, index) => (
                  <div
                    key={revision.id}
                    className={`hover:bg-muted/50 cursor-pointer rounded-lg border p-3 transition-colors ${
                      selectedRevision?.id === revision.id
                        ? 'border-primary bg-muted'
                        : ''
                    }`}
                    onClick={() => setSelectedRevision(revision)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="text-muted-foreground h-4 w-4" />
                        <span className="text-sm font-medium">
                          {index === 0
                            ? 'Current'
                            : `Version ${allRevisions.length - index}`}
                        </span>
                      </div>
                      {index === 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Latest
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {format(
                        new Date(revision.createdAt),
                        'MMM d, yyyy at h:mm a'
                      )}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      (
                      {formatDistanceToNow(new Date(revision.createdAt), {
                        addSuffix: true,
                      })}
                      )
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Revision Preview */}
          <div className="flex-1">
            {selectedRevision ? (
              <div className="flex h-full flex-col">
                <div className="mb-4 flex items-center justify-between border-b pb-2">
                  <div>
                    <h3 className="font-medium">
                      {selectedRevision.id === 'current'
                        ? 'Current Version'
                        : 'Historical Version'}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {format(
                        new Date(selectedRevision.createdAt),
                        'MMMM d, yyyy at h:mm a'
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRevisionSelect(selectedRevision)}
                      disabled={selectedRevision.id === 'current'}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Restore This Version
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm">
                      {extractTextFromContent(selectedRevision.content)}
                    </pre>
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-muted-foreground text-center">
                  <Clock className="mx-auto mb-2 h-8 w-8" />
                  <p>Select a version to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
