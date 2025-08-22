'use client'
import { useTimerStore } from '@/lib/stores/timer-store'

if (process.env.NODE_ENV !== 'production') {
  const original = useTimerStore.setState as any
  useTimerStore.setState = (...args: any[]) => {
    const stack = new Error().stack || ''
    // If someone calls setState while React is rendering hooks, scream:
    if (
      stack.includes('renderWithHooks') ||
      stack.includes('updateFunctionComponent')
    ) {
      console.error('❌ Zustand setState called during render!\n', stack)
      throw new Error('Zustand setState during render')
    }
    return original(...args)
  }
}

export default function DevGuard() {
  return null
}
