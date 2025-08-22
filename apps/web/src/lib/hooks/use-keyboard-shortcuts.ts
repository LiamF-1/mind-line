'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTimerStore } from '@/lib/stores/timer-store'
import { trpc } from '@/lib/trpc'
import { toast } from 'sonner'

interface KeyboardShortcutOptions {
  enabled?: boolean
}

export function useKeyboardShortcuts({
  enabled = true,
}: KeyboardShortcutOptions = {}) {
  const router = useRouter()
  const {
    mode,
    stopwatch,
    pomodoro,
    startStopwatch,
    pauseStopwatch,
    resumeStopwatch,
    stopStopwatch,
    startPomodoro,
    pausePomodoro,
    resumePomodoro,
    skipPomodoroPhase,
    cancelPomodoro,
  } = useTimerStore()

  // tRPC mutations
  const stopTimerMutation = trpc.time.stopTimer.useMutation({
    onSuccess: (data) => {
      // Timer stopped and logged successfully
    },
    onError: (error) => {
      toast.error(`Failed to save timer: ${error.message}`)
    },
  })

  const startPomodoroMutation = trpc.pomodoro.startRun.useMutation({
    onError: (error) => {
      toast.error(`Failed to start pomodoro: ${error.message}`)
    },
  })

  const cancelRunMutation = trpc.pomodoro.cancelRun.useMutation({
    onError: (error) => {
      toast.error(`Failed to cancel pomodoro: ${error.message}`)
    },
  })

  const pomodoroPreferencesQuery = trpc.pomodoro.getPreferences.useQuery()

  const handleStartStopStopwatch = useCallback(async () => {
    if (stopwatch.status === 'idle') {
      // Start stopwatch
      startStopwatch()
      // Stopwatch started successfully
    } else if (stopwatch.status === 'running') {
      // Pause stopwatch
      pauseStopwatch()
      // Stopwatch paused successfully
    } else if (stopwatch.status === 'paused') {
      // Stop and save stopwatch
      const stoppedTimer = stopStopwatch()

      if (stoppedTimer.startedAt && stoppedTimer.elapsed > 0) {
        const endTime = stoppedTimer.pausedAt || new Date()

        try {
          await stopTimerMutation.mutateAsync({
            start: new Date(stoppedTimer.startedAt),
            end: new Date(endTime),
            label: stoppedTimer.assignment.label,
            taskId: stoppedTimer.assignment.taskId,
            eventId: stoppedTimer.assignment.eventId,
            distractionFree: stoppedTimer.assignment.distractionFree,
          })
        } catch (error) {
          console.error('Failed to save timer:', error)
        }
      }
    }
  }, [
    stopwatch.status,
    startStopwatch,
    pauseStopwatch,
    stopStopwatch,
    stopTimerMutation,
  ])

  const handleStartStopPomodoro = useCallback(async () => {
    if (pomodoro.status === 'idle') {
      // Start pomodoro
      if (!pomodoroPreferencesQuery.data) return

      try {
        const run = await startPomodoroMutation.mutateAsync({
          label: pomodoro.assignment.label,
          taskId: pomodoro.assignment.taskId,
          eventId: pomodoro.assignment.eventId,
          distractionFreeDefault: pomodoro.assignment.distractionFree,
        })

        startPomodoro(run.id, {
          workMinutes: pomodoroPreferencesQuery.data.workMinutes,
          shortBreakMinutes: pomodoroPreferencesQuery.data.shortBreakMinutes,
          longBreakMinutes: pomodoroPreferencesQuery.data.longBreakMinutes,
          longBreakEvery: pomodoroPreferencesQuery.data.longBreakEvery,
          autoStartNextPhase: pomodoroPreferencesQuery.data.autoStartNextPhase,
          autoStartNextWork: pomodoroPreferencesQuery.data.autoStartNextWork,
        })

        // Pomodoro started successfully
      } catch (error) {
        console.error('Failed to start pomodoro:', error)
      }
    } else if (pomodoro.status === 'running') {
      // Pause pomodoro
      pausePomodoro()
      // Pomodoro paused successfully
    } else if (pomodoro.status === 'paused') {
      // Resume pomodoro
      resumePomodoro()
      // Pomodoro resumed successfully
    }
  }, [
    pomodoro.status,
    pomodoro.assignment,
    pomodoroPreferencesQuery.data,
    startPomodoro,
    pausePomodoro,
    resumePomodoro,
    startPomodoroMutation,
  ])

  const handleSkipBreak = useCallback(() => {
    if (mode === 'pomodoro' && pomodoro.phase !== 'work') {
      skipPomodoroPhase()
      // Break skipped successfully
    }
  }, [mode, pomodoro.phase, skipPomodoroPhase])

  const handleOpenTimeLog = useCallback(() => {
    router.push('/time-tracking')
  }, [router])

  const handleOpenPomodoroSettings = useCallback(() => {
    // This would need to be implemented with a global state or context
    // For now, just show a toast
    toast.info('Use the timer dropdown to access Pomodoro settings')
  }, [])

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore shortcuts when typing in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target as HTMLElement)?.isContentEditable
      ) {
        return
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifierKey = isMac ? event.metaKey : event.ctrlKey

      if (!modifierKey || !event.shiftKey) return

      switch (event.key.toLowerCase()) {
        case 't':
          // ⌘/Ctrl + Shift + T → start/stop stopwatch
          event.preventDefault()
          if (mode === 'stopwatch') {
            handleStartStopStopwatch()
          } else {
            // Switch to stopwatch mode and start
            useTimerStore.getState().setMode('stopwatch')
            setTimeout(() => handleStartStopStopwatch(), 100)
          }
          break

        case 'l':
          // ⌘/Ctrl + Shift + L → open Time Log
          event.preventDefault()
          handleOpenTimeLog()
          break

        case 'p':
          // ⌘/Ctrl + Shift + P → start/stop Pomodoro
          event.preventDefault()
          if (mode === 'pomodoro') {
            handleStartStopPomodoro()
          } else {
            // Switch to pomodoro mode and start
            useTimerStore.getState().setMode('pomodoro')
            setTimeout(() => handleStartStopPomodoro(), 100)
          }
          break

        case 'b':
          // ⌘/Ctrl + Shift + B → skip break (when in break phase)
          event.preventDefault()
          handleSkipBreak()
          break

        case ',':
          // ⌘/Ctrl + Shift + , → open Pomodoro Settings
          event.preventDefault()
          handleOpenPomodoroSettings()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    enabled,
    mode,
    handleStartStopStopwatch,
    handleStartStopPomodoro,
    handleSkipBreak,
    handleOpenTimeLog,
    handleOpenPomodoroSettings,
  ])
}

// Hook to display keyboard shortcuts help
export function useKeyboardShortcutsHelp() {
  const isMac =
    typeof navigator !== 'undefined' &&
    navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const modifierKey = isMac ? '⌘' : 'Ctrl'

  return {
    shortcuts: [
      {
        key: `${modifierKey} + Shift + T`,
        description: 'Start/stop stopwatch',
      },
      {
        key: `${modifierKey} + Shift + L`,
        description: 'Open Time Log',
      },
      {
        key: `${modifierKey} + Shift + P`,
        description: 'Start/stop Pomodoro',
      },
      {
        key: `${modifierKey} + Shift + B`,
        description: 'Skip break (when in break phase)',
      },
      {
        key: `${modifierKey} + Shift + ,`,
        description: 'Open Pomodoro settings',
      },
    ],
  }
}
