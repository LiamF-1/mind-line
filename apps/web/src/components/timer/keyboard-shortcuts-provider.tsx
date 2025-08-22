'use client'

import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts'

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode
}

export function KeyboardShortcutsProvider({
  children,
}: KeyboardShortcutsProviderProps) {
  // Enable keyboard shortcuts globally in the app
  useKeyboardShortcuts({ enabled: true })

  return <>{children}</>
}
