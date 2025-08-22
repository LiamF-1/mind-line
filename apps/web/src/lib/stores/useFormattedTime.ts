'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTimerStore } from './timer-store'

export function useFormattedTime() {
  // Strictly READ-ONLY. No actions here.
  const {
    mode,
    stopwatch,
    pomodoro: { phase, phaseEndsAt, status: pomodoroStatus, cycle, pausedAt },
    timer,
  } = useTimerStore((s) => ({
    mode: s.mode,
    stopwatch: s.stopwatch,
    pomodoro: s.pomodoro,
    timer: s.timer,
  }))

  // Tick once per second to recompute the display
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const formattedTime = useMemo(() => {
    const now = Date.now()
    const pad = (n: number) => n.toString().padStart(2, '0')

    if (mode === 'stopwatch') {
      let elapsed = stopwatch.elapsed || 0
      if (stopwatch.status === 'running' && stopwatch.startedAt) {
        const startedAt = new Date(stopwatch.startedAt)
        elapsed += Math.floor((now - startedAt.getTime()) / 1000)
      }
      const h = Math.floor(elapsed / 3600)
      const m = Math.floor((elapsed % 3600) / 60)
      const s = elapsed % 60
      return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
    }

    if (mode === 'pomodoro') {
      let remaining = 0
      if (phaseEndsAt) {
        if (pomodoroStatus === 'running') {
          // When running, calculate remaining time normally
          remaining = Math.max(
            0,
            Math.floor((new Date(phaseEndsAt).getTime() - now) / 1000)
          )
        } else if (pomodoroStatus === 'paused' && pausedAt) {
          // When paused, show remaining time as of when it was paused
          remaining = Math.max(
            0,
            Math.floor(
              (new Date(phaseEndsAt).getTime() - new Date(pausedAt).getTime()) /
                1000
            )
          )
        }
      }
      const h = Math.floor(remaining / 3600)
      const m = Math.floor((remaining % 3600) / 60)
      const s = remaining % 60
      return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
    }

    if (mode === 'timer') {
      const active = timer.activeTimerId
        ? timer.timers.find((t) => t.id === timer.activeTimerId)
        : undefined
      if (!active) return '00:00'
      let elapsed = 0
      if (active.status === 'running' && active.startedAt) {
        const startedAt = new Date(active.startedAt)
        elapsed =
          Math.floor((now - startedAt.getTime()) / 1000) +
          (active.pausedElapsed || 0)
      } else if (active.status === 'paused') {
        elapsed = active.pausedElapsed || 0
      }
      const remaining = Math.max(0, active.duration - elapsed)
      const h = Math.floor(remaining / 3600)
      const m = Math.floor((remaining % 3600) / 60)
      const s = remaining % 60
      return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
    }

    return '00:00'
  }, [mode, stopwatch, phaseEndsAt, pausedAt, pomodoroStatus, timer, tick])

  const isRunning =
    (mode === 'stopwatch' && stopwatch.status === 'running') ||
    (mode === 'pomodoro' && pomodoroStatus === 'running') ||
    (mode === 'timer' &&
      timer.activeTimerId &&
      timer.timers.find((t) => t.id === timer.activeTimerId)?.status ===
        'running')

  return { formattedTime, isRunning, phase, cycle }
}
