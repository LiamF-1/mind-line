import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NoteEditor } from '@/components/notes/note-editor'
import React from 'react'

// Mock TipTap editor
vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(),
  EditorContent: ({ editor }: { editor: any }) => (
    <div data-testid="editor-content">
      {editor ? 'Editor loaded' : 'Loading editor...'}
    </div>
  ),
}))

// Mock extensions
vi.mock('@tiptap/starter-kit', () => ({
  default: {
    configure: vi.fn().mockReturnValue({}),
  },
}))

vi.mock('@tiptap/extension-placeholder', () => ({
  default: {
    configure: vi.fn().mockReturnValue({}),
  },
}))

vi.mock('@tiptap/extension-task-list', () => ({
  default: {
    configure: vi.fn().mockReturnValue({}),
  },
}))

vi.mock('@tiptap/extension-task-item', () => ({
  default: {
    configure: vi.fn().mockReturnValue({}),
  },
}))

vi.mock('@tiptap/extension-code-block-lowlight', () => ({
  default: {
    configure: vi.fn().mockReturnValue({}),
  },
}))

vi.mock('@tiptap/extension-highlight', () => ({
  default: {
    configure: vi.fn().mockReturnValue({}),
  },
}))

vi.mock('lowlight', () => ({
  createLowlight: vi.fn().mockReturnValue({}),
  common: {},
}))

// Mock toolbar component
vi.mock('@/components/notes/note-editor-toolbar', () => ({
  NoteEditorToolbar: ({ editor }: { editor: any }) => (
    <div data-testid="editor-toolbar">
      Toolbar {editor ? 'loaded' : 'loading'}
    </div>
  ),
}))

// Mock slash command extension
vi.mock('@/components/notes/slash-command-extension', () => ({
  SlashCommandExtension: {},
}))

describe('NoteEditor', () => {
  const mockOnChange = vi.fn()
  const mockEditor = {
    getJSON: vi.fn().mockReturnValue({ type: 'doc', content: [] }),
    commands: {
      setContent: vi.fn(),
    },
  }

  let mockUseEditor: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const tiptapReact = await import('@tiptap/react')
    mockUseEditor = vi.mocked(tiptapReact.useEditor)
  })

  it('should show loading state when editor is not ready', () => {
    mockUseEditor.mockReturnValue(null)

    render(
      <NoteEditor
        content={{ type: 'doc', content: [] }}
        onChange={mockOnChange}
        placeholder="Start writing..."
      />
    )

    expect(screen.getByText('Loading editor...')).toBeInTheDocument()
  })

  it('should render editor when ready', () => {
    mockUseEditor.mockReturnValue(mockEditor)

    render(
      <NoteEditor
        content={{ type: 'doc', content: [] }}
        onChange={mockOnChange}
        placeholder="Start writing..."
      />
    )

    expect(screen.getByText('Editor loaded')).toBeInTheDocument()
    expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument()
  })

  it('should call onChange when editor content updates', () => {
    let onUpdateCallback: any = null

    mockUseEditor.mockImplementation((config: any) => {
      onUpdateCallback = config.onUpdate
      return mockEditor
    })

    render(
      <NoteEditor
        content={{ type: 'doc', content: [] }}
        onChange={mockOnChange}
        placeholder="Start writing..."
      />
    )

    // Simulate editor update
    const newContent = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
      ],
    }
    mockEditor.getJSON.mockReturnValue(newContent)

    if (onUpdateCallback) {
      onUpdateCallback({ editor: mockEditor })
    }

    expect(mockOnChange).toHaveBeenCalledWith(newContent)
  })

  it('should update editor content when prop changes', () => {
    mockUseEditor.mockReturnValue(mockEditor)

    const initialContent = { type: 'doc', content: [] }
    const { rerender } = render(
      <NoteEditor
        content={initialContent}
        onChange={mockOnChange}
        placeholder="Start writing..."
      />
    )

    const newContent = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'New content' }] },
      ],
    }

    // Mock different JSON content
    mockEditor.getJSON.mockReturnValue(initialContent)

    rerender(
      <NoteEditor
        content={newContent}
        onChange={mockOnChange}
        placeholder="Start writing..."
      />
    )

    expect(mockEditor.commands.setContent).toHaveBeenCalledWith(newContent)
  })

  it('should not update editor if content is the same', () => {
    mockUseEditor.mockReturnValue(mockEditor)

    const content = { type: 'doc', content: [] }
    mockEditor.getJSON.mockReturnValue(content)

    const { rerender } = render(
      <NoteEditor
        content={content}
        onChange={mockOnChange}
        placeholder="Start writing..."
      />
    )

    rerender(
      <NoteEditor
        content={content}
        onChange={mockOnChange}
        placeholder="Start writing..."
      />
    )

    expect(mockEditor.commands.setContent).not.toHaveBeenCalled()
  })

  it('should configure editor with correct extensions and options', () => {
    mockUseEditor.mockReturnValue(mockEditor)

    render(
      <NoteEditor
        content={{ type: 'doc', content: [] }}
        onChange={mockOnChange}
        placeholder="Custom placeholder"
      />
    )

    expect(mockUseEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        extensions: expect.any(Array),
        content: { type: 'doc', content: [] },
        onUpdate: expect.any(Function),
        editorProps: expect.objectContaining({
          attributes: expect.objectContaining({
            class: expect.stringContaining('prose'),
          }),
        }),
      })
    )
  })
})
