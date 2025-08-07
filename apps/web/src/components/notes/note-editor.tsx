'use client'

import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Highlight from '@tiptap/extension-highlight'
import { createLowlight, common } from 'lowlight'

const lowlight = createLowlight(common)
import { useEffect } from 'react'
import { NoteEditorToolbar } from './note-editor-toolbar'
import { SlashCommandExtension } from './slash-command-extension'

interface NoteEditorProps {
  content: any
  onChange: (content: any) => void
  placeholder?: string
}

export function NoteEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
}: NoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We'll use the lowlight version
      }),
      Placeholder.configure({
        placeholder,
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'code-block',
        },
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: 'highlight',
        },
      }),
      SlashCommandExtension,
    ],
    content,
    immediatelyRender: false, // Fix SSR hydration issues
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON())
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-4 sm:p-8 max-w-none',
      },
    },
  })

  // Update content when prop changes
  useEffect(() => {
    if (
      editor &&
      content &&
      JSON.stringify(editor.getJSON()) !== JSON.stringify(content)
    ) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!editor) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground mt-2 text-sm">
            Loading editor...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <NoteEditorToolbar editor={editor} />
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
