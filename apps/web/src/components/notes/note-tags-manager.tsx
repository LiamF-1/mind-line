'use client'

import { useState } from 'react'
import { Plus, X, Tag } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc'

interface NoteTagsManagerProps {
  tags: string[]
  onChange: (tags: string[]) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NoteTagsManager({
  tags,
  onChange,
  open,
  onOpenChange,
}: NoteTagsManagerProps) {
  const [newTag, setNewTag] = useState('')

  // Get all available tags from user's notes
  const { data: availableTags = [] } = trpc.note.getTags.useQuery()

  const handleAddTag = () => {
    const trimmedTag = newTag.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onChange([...tags, trimmedTag])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleAddExistingTag = (tag: string) => {
    if (!tags.includes(tag)) {
      onChange([...tags, tag])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const unusedTags = availableTags.filter((tag: string) => !tags.includes(tag))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Tags */}
          <div>
            <h4 className="mb-2 text-sm font-medium">Current Tags</h4>
            <div className="flex min-h-[40px] flex-wrap gap-2 rounded-md border p-2">
              {tags.length === 0 ? (
                <span className="text-muted-foreground text-sm">
                  No tags added
                </span>
              ) : (
                tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    <Tag className="h-3 w-3" />
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:bg-muted-foreground/20 ml-1 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          {/* Add New Tag */}
          <div>
            <h4 className="mb-2 text-sm font-medium">Add New Tag</h4>
            <div className="flex gap-2">
              <Input
                placeholder="Enter tag name..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button
                onClick={handleAddTag}
                disabled={!newTag.trim() || tags.includes(newTag.trim())}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Existing Tags */}
          {unusedTags.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium">Add Existing Tags</h4>
              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                {unusedTags.map((tag: string) => (
                  <Button
                    key={tag}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddExistingTag(tag)}
                    className="h-auto px-2 py-1"
                  >
                    <Tag className="mr-1 h-3 w-3" />
                    {tag}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
