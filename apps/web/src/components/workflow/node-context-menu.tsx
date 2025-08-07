'use client'

import { useEffect, useRef } from 'react'
import { Edit3, Trash2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Task, CalendarEvent } from '@prisma/client'

interface NodeContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  nodeData: {
    id: string
    type: 'TASK' | 'EVENT'
    data: Task | CalendarEvent | null
  } | null
  onClose: () => void
  onDelete: (nodeId: string) => void
  onEdit: (nodeId: string, type: 'TASK' | 'EVENT') => void
}

export function NodeContextMenu({
  isOpen,
  position,
  nodeData,
  onClose,
  onDelete,
  onEdit,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Close menu on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen || !nodeData) {
    return null
  }

  const handleEdit = () => {
    onEdit(nodeData.data?.id || '', nodeData.type)
    onClose()
  }

  const handleDelete = () => {
    onDelete(nodeData.id)
    onClose()
  }

  const getItemTitle = () => {
    if (nodeData.data) {
      return nodeData.data.title
    }
    return 'Unknown item'
  }

  const getItemType = () => {
    return nodeData.type === 'TASK' ? 'Task' : 'Event'
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Menu */}
      <div
        ref={menuRef}
        className="fixed z-50 w-56 rounded-lg border border-gray-200 bg-white py-2 shadow-xl"
        style={{
          left: Math.min(position.x, window.innerWidth - 240), // Prevent overflow
          top: Math.min(position.y, window.innerHeight - 200), // Prevent overflow
        }}
      >
        {/* Header */}
        <div className="border-b border-gray-100 px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <div>
              <p className="truncate text-sm font-medium text-gray-900">
                {getItemTitle()}
              </p>
              <p className="text-xs text-gray-500">{getItemType()}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            className="w-full justify-start px-4 py-2 text-left hover:bg-gray-50"
          >
            <Edit3 className="mr-3 h-4 w-4" />
            <span>Edit {getItemType()}</span>
            <ExternalLink className="ml-auto h-3 w-3 text-gray-400" />
          </Button>

          <hr className="mx-2 my-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="w-full justify-start px-4 py-2 text-left text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="mr-3 h-4 w-4" />
            <span>Remove from Board</span>
          </Button>
        </div>

        {/* Footer hint */}
        <div className="border-t border-gray-100 px-4 py-2">
          <p className="text-xs text-gray-400">
            Right-click or press Escape to close
          </p>
        </div>
      </div>
    </>
  )
}
