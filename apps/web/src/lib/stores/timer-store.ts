'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createWithEqualityFn } from 'zustand/traditional'
import { persist, createJSONStorage } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'
import { nanoid } from 'nanoid'

export type TimerMode = 'stopwatch' | 'pomodoro' | 'timer'
export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak'
export type TimerStatus = 'idle' | 'running' | 'paused'

interface TimerAssignment {
  label?: string
  taskId?: string
  eventId?: string
  distractionFree: boolean
}

interface StopwatchState {
  status: TimerStatus
  startedAt?: Date
  pausedAt?: Date
  elapsed: number // seconds
  assignment: TimerAssignment
}

interface PomodoroState {
  status: TimerStatus
  runId?: string
  phase: PomodoroPhase
  cycle: number // 1-based work cycle index
  phaseStartedAt?: Date
  phaseEndsAt?: Date
  pausedAt?: Date
  pausedElapsed: number // seconds paused in current phase
  assignment: TimerAssignment
  preferences: {
    workMinutes: number
    shortBreakMinutes: number
    longBreakMinutes: number
    longBreakEvery: number
    autoStartNextPhase: boolean
    autoStartNextWork: boolean
  }
}

interface TimerInstance {
  id: string
  name: string
  duration: number // total duration in seconds
  status: TimerStatus
  startedAt?: Date
  pausedAt?: Date
  endsAt?: Date
  pausedElapsed: number // seconds paused
  assignment: TimerAssignment
}

interface TimerState {
  timers: TimerInstance[]
  activeTimerId?: string
}

interface TimerStore {
  mode: TimerMode
  stopwatch: StopwatchState
  pomodoro: PomodoroState
  timer: TimerState

  // Mode switching
  setMode: (mode: TimerMode) => void

  // Stopwatch actions
  startStopwatch: (assignment?: Partial<TimerAssignment>) => void
  pauseStopwatch: () => void
  resumeStopwatch: () => void
  stopStopwatch: () => StopwatchState
  updateStopwatchAssignment: (assignment: Partial<TimerAssignment>) => void

  // Pomodoro actions
  startPomodoro: (
    runId: string,
    preferences: PomodoroState['preferences'],
    assignment?: Partial<TimerAssignment>
  ) => void
  pausePomodoro: () => void
  resumePomodoro: () => void
  skipPomodoroPhase: () => void
  cancelPomodoro: () => {
    runId?: string
    partialWork?: { start: Date; end: Date }
  }
  completePomodoroPhase: () => {
    runId: string
    phaseType: PomodoroPhase
    phaseStart: Date
    phaseEnd: Date
    cycle: number
  }
  updatePomodoroAssignment: (assignment: Partial<TimerAssignment>) => void

  // Timer actions
  createTimer: (
    name: string,
    duration: number,
    assignment?: Partial<TimerAssignment>
  ) => string
  startTimer: (id: string) => void
  pauseTimer: (id: string) => void
  resumeTimer: (id: string) => void
  stopTimer: (id: string) => TimerInstance | null
  deleteTimer: (id: string) => void
  updateTimerAssignment: (
    id: string,
    assignment: Partial<TimerAssignment>
  ) => void
  getTimer: (id: string) => TimerInstance | undefined

  // Utilities
  getCurrentTime: () => number // current elapsed/remaining time in seconds
  reset: () => void
}

const defaultAssignment: TimerAssignment = {
  distractionFree: true,
}

const initialStopwatchState: StopwatchState = {
  status: 'idle',
  elapsed: 0,
  assignment: { ...defaultAssignment },
}

const initialPomodoroState: PomodoroState = {
  status: 'idle',
  phase: 'work',
  cycle: 1,
  pausedElapsed: 0,
  assignment: { ...defaultAssignment },
  preferences: {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4,
    autoStartNextPhase: false,
    autoStartNextWork: true,
  },
}

const initialTimerState: TimerState = {
  timers: [],
  activeTimerId: undefined,
}

export const useTimerStore = createWithEqualityFn<TimerStore>()(
  persist(
    (set, get) => ({
      mode: 'stopwatch',
      stopwatch: initialStopwatchState,
      pomodoro: initialPomodoroState,
      timer: initialTimerState,

      setMode: (mode) => set({ mode }),

      // Stopwatch actions
      startStopwatch: (assignment) =>
        set((state) => ({
          stopwatch: {
            ...state.stopwatch,
            status: 'running',
            startedAt: new Date(),
            pausedAt: undefined,
            elapsed: 0,
            assignment: { ...state.stopwatch.assignment, ...assignment },
          },
        })),

      pauseStopwatch: () =>
        set((state) => {
          if (state.stopwatch.status !== 'running') return state

          const now = new Date()
          const elapsed = state.stopwatch.startedAt
            ? Math.floor(
                (now.getTime() - state.stopwatch.startedAt.getTime()) / 1000
              )
            : state.stopwatch.elapsed

          return {
            stopwatch: {
              ...state.stopwatch,
              status: 'paused',
              pausedAt: now,
              elapsed,
            },
          }
        }),

      resumeStopwatch: () =>
        set((state) => {
          if (state.stopwatch.status !== 'paused') return state

          return {
            stopwatch: {
              ...state.stopwatch,
              status: 'running',
              startedAt: new Date(Date.now() - state.stopwatch.elapsed * 1000),
              pausedAt: undefined,
            },
          }
        }),

      stopStopwatch: () => {
        const state = get()
        const stopwatchState = { ...state.stopwatch }

        if (state.stopwatch.status === 'running' && state.stopwatch.startedAt) {
          stopwatchState.elapsed = Math.floor(
            (Date.now() - state.stopwatch.startedAt.getTime()) / 1000
          )
        }

        set({
          stopwatch: initialStopwatchState,
        })

        return stopwatchState
      },

      updateStopwatchAssignment: (assignment) =>
        set((state) => ({
          stopwatch: {
            ...state.stopwatch,
            assignment: { ...state.stopwatch.assignment, ...assignment },
          },
        })),

      // Pomodoro actions
      startPomodoro: (runId, preferences, assignment) =>
        set((state) => {
          const now = new Date()
          const phaseEndsAt = new Date(
            now.getTime() + preferences.workMinutes * 60 * 1000
          )

          return {
            pomodoro: {
              ...state.pomodoro,
              status: 'running',
              runId,
              phase: 'work',
              cycle: 1,
              phaseStartedAt: now,
              phaseEndsAt,
              pausedAt: undefined,
              pausedElapsed: 0,
              assignment: { ...state.pomodoro.assignment, ...assignment },
              preferences,
            },
          }
        }),

      pausePomodoro: () =>
        set((state) => {
          if (state.pomodoro.status !== 'running') return state

          return {
            pomodoro: {
              ...state.pomodoro,
              status: 'paused',
              pausedAt: new Date(),
            },
          }
        }),

      resumePomodoro: () =>
        set((state) => {
          if (
            state.pomodoro.status !== 'paused' ||
            !state.pomodoro.pausedAt ||
            !state.pomodoro.phaseEndsAt
          ) {
            return state
          }

          const pausedDuration = Date.now() - state.pomodoro.pausedAt.getTime()
          const newPhaseEndsAt = new Date(
            state.pomodoro.phaseEndsAt.getTime() + pausedDuration
          )

          return {
            pomodoro: {
              ...state.pomodoro,
              status: 'running',
              phaseEndsAt: newPhaseEndsAt,
              pausedAt: undefined,
              pausedElapsed:
                state.pomodoro.pausedElapsed +
                Math.floor(pausedDuration / 1000),
            },
          }
        }),

      skipPomodoroPhase: () =>
        set((state) => {
          if (state.pomodoro.status === 'idle') return state

          const { phase, cycle, preferences } = state.pomodoro
          let nextPhase: PomodoroPhase
          let nextCycle = cycle
          let phaseDuration: number

          if (phase === 'work') {
            if (cycle % preferences.longBreakEvery === 0) {
              nextPhase = 'longBreak'
              phaseDuration = preferences.longBreakMinutes
            } else {
              nextPhase = 'shortBreak'
              phaseDuration = preferences.shortBreakMinutes
            }
          } else {
            nextPhase = 'work'
            nextCycle = phase === 'longBreak' ? cycle + 1 : cycle + 1
            phaseDuration = preferences.workMinutes
          }

          const now = new Date()
          const phaseEndsAt = new Date(
            now.getTime() + phaseDuration * 60 * 1000
          )

          return {
            pomodoro: {
              ...state.pomodoro,
              phase: nextPhase,
              cycle: nextCycle,
              phaseStartedAt: now,
              phaseEndsAt,
              pausedElapsed: 0,
            },
          }
        }),

      cancelPomodoro: () => {
        const state = get()
        const result: {
          runId?: string
          partialWork?: { start: Date; end: Date }
        } = {
          runId: state.pomodoro.runId,
        }

        // If we're in a work phase and have been running, capture partial work
        if (
          state.pomodoro.phase === 'work' &&
          state.pomodoro.phaseStartedAt &&
          state.pomodoro.status !== 'idle'
        ) {
          const endTime =
            state.pomodoro.status === 'paused' && state.pomodoro.pausedAt
              ? state.pomodoro.pausedAt
              : new Date()

          // Only log if we've worked for at least 1 minute
          const workDuration =
            endTime.getTime() - state.pomodoro.phaseStartedAt.getTime()
          if (workDuration >= 60000) {
            result.partialWork = {
              start: state.pomodoro.phaseStartedAt,
              end: endTime,
            }
          }
        }

        set({ pomodoro: initialPomodoroState })
        return result
      },

      completePomodoroPhase: () => {
        const state = get()
        const { runId, phase, cycle, phaseStartedAt } = state.pomodoro

        if (!runId || !phaseStartedAt) {
          throw new Error('No active pomodoro phase to complete')
        }

        const phaseEnd = new Date()
        const result = {
          runId,
          phaseType: phase,
          phaseStart: phaseStartedAt,
          phaseEnd,
          cycle,
        }

        // Determine next phase
        const { preferences } = state.pomodoro
        let nextPhase: PomodoroPhase
        let nextCycle = cycle
        let phaseDuration: number

        if (phase === 'work') {
          if (cycle % preferences.longBreakEvery === 0) {
            nextPhase = 'longBreak'
            phaseDuration = preferences.longBreakMinutes
          } else {
            nextPhase = 'shortBreak'
            phaseDuration = preferences.shortBreakMinutes
          }
        } else {
          nextPhase = 'work'
          nextCycle = phase === 'longBreak' ? cycle + 1 : cycle + 1
          phaseDuration = preferences.workMinutes
        }

        const now = new Date()
        const phaseEndsAt = new Date(now.getTime() + phaseDuration * 60 * 1000)
        const shouldAutoStart =
          phase === 'work'
            ? preferences.autoStartNextPhase
            : preferences.autoStartNextWork

        set((state) => ({
          pomodoro: {
            ...state.pomodoro,
            phase: nextPhase,
            cycle: nextCycle,
            phaseStartedAt: shouldAutoStart ? now : undefined,
            phaseEndsAt: shouldAutoStart ? phaseEndsAt : undefined,
            status: shouldAutoStart ? 'running' : 'idle',
            pausedElapsed: 0,
          },
        }))

        return result
      },

      updatePomodoroAssignment: (assignment) =>
        set((state) => ({
          pomodoro: {
            ...state.pomodoro,
            assignment: { ...state.pomodoro.assignment, ...assignment },
          },
        })),

      // Timer actions
      createTimer: (name, duration, assignment) => {
        const id = `timer-${nanoid()}`
        set((state) => {
          // Limit to 5 timers maximum
          if (state.timer.timers.length >= 5) {
            return state
          }
          return {
            timer: {
              ...state.timer,
              timers: [
                ...state.timer.timers,
                {
                  id,
                  name,
                  duration,
                  status: 'idle',
                  pausedElapsed: 0,
                  assignment: { ...defaultAssignment, ...assignment },
                },
              ],
            },
          }
        })
        return id
      },

      startTimer: (id) =>
        set((state) => {
          const timer = state.timer.timers.find((t) => t.id === id)
          if (!timer || timer.status === 'running') return state

          const now = new Date()
          const endsAt = new Date(
            now.getTime() + timer.duration * 1000 - timer.pausedElapsed * 1000
          )

          return {
            timer: {
              ...state.timer,
              activeTimerId: id,
              timers: state.timer.timers.map((t) =>
                t.id === id
                  ? {
                      ...t,
                      status: 'running',
                      startedAt: now,
                      endsAt,
                      pausedAt: undefined,
                    }
                  : t
              ),
            },
          }
        }),

      pauseTimer: (id) =>
        set((state) => {
          const timer = state.timer.timers.find((t) => t.id === id)
          if (!timer || timer.status !== 'running') return state

          const now = new Date()
          const additionalElapsed = timer.startedAt
            ? Math.floor((now.getTime() - timer.startedAt.getTime()) / 1000)
            : 0

          return {
            timer: {
              ...state.timer,
              activeTimerId:
                state.timer.activeTimerId === id
                  ? undefined
                  : state.timer.activeTimerId,
              timers: state.timer.timers.map((t) =>
                t.id === id
                  ? {
                      ...t,
                      status: 'paused',
                      pausedAt: now,
                      pausedElapsed: t.pausedElapsed + additionalElapsed,
                      endsAt: undefined,
                    }
                  : t
              ),
            },
          }
        }),

      resumeTimer: (id) =>
        set((state) => {
          const timer = state.timer.timers.find((t) => t.id === id)
          if (!timer || timer.status !== 'paused') return state

          const now = new Date()
          const remainingTime = timer.duration - timer.pausedElapsed
          const endsAt = new Date(now.getTime() + remainingTime * 1000)

          return {
            timer: {
              ...state.timer,
              activeTimerId: id,
              timers: state.timer.timers.map((t) =>
                t.id === id
                  ? {
                      ...t,
                      status: 'running',
                      startedAt: now,
                      endsAt,
                      pausedAt: undefined,
                    }
                  : t
              ),
            },
          }
        }),

      stopTimer: (id) => {
        const state = get()
        const timer = state.timer.timers.find((t) => t.id === id)
        if (!timer) return null

        const stoppedTimer = { ...timer }

        set((state) => ({
          timer: {
            ...state.timer,
            activeTimerId:
              state.timer.activeTimerId === id
                ? undefined
                : state.timer.activeTimerId,
            timers: state.timer.timers.map((t) =>
              t.id === id
                ? {
                    ...t,
                    status: 'idle',
                    startedAt: undefined,
                    pausedAt: undefined,
                    endsAt: undefined,
                    pausedElapsed: 0,
                  }
                : t
            ),
          },
        }))

        return stoppedTimer
      },

      deleteTimer: (id) =>
        set((state) => ({
          timer: {
            ...state.timer,
            activeTimerId:
              state.timer.activeTimerId === id
                ? undefined
                : state.timer.activeTimerId,
            timers: state.timer.timers.filter((t) => t.id !== id),
          },
        })),

      updateTimerAssignment: (id, assignment) =>
        set((state) => ({
          timer: {
            ...state.timer,
            timers: state.timer.timers.map((t) =>
              t.id === id
                ? { ...t, assignment: { ...t.assignment, ...assignment } }
                : t
            ),
          },
        })),

      getTimer: (id) => {
        const state = get()
        return state.timer.timers.find((t) => t.id === id)
      },

      // Utilities
      getCurrentTime: () => {
        const state = get()

        if (state.mode === 'stopwatch') {
          if (
            state.stopwatch.status === 'running' &&
            state.stopwatch.startedAt
          ) {
            return Math.floor(
              (Date.now() - state.stopwatch.startedAt.getTime()) / 1000
            )
          }
          return state.stopwatch.elapsed
        } else if (state.mode === 'pomodoro') {
          if (state.pomodoro.phaseEndsAt) {
            if (state.pomodoro.status === 'running') {
              const remaining = Math.max(
                0,
                Math.floor(
                  (state.pomodoro.phaseEndsAt.getTime() - Date.now()) / 1000
                )
              )
              return remaining
            } else if (
              state.pomodoro.status === 'paused' &&
              state.pomodoro.pausedAt
            ) {
              // Show remaining time when paused
              const remaining = Math.max(
                0,
                Math.floor(
                  (state.pomodoro.phaseEndsAt.getTime() -
                    state.pomodoro.pausedAt.getTime()) /
                    1000
                )
              )
              return remaining
            }
          }
          return 0
        } else if (state.mode === 'timer') {
          // For timer mode, return time for active timer
          if (state.timer.activeTimerId) {
            const timer = state.timer.timers.find(
              (t) => t.id === state.timer.activeTimerId
            )
            if (timer && timer.endsAt) {
              if (timer.status === 'running') {
                const remaining = Math.max(
                  0,
                  Math.floor((timer.endsAt.getTime() - Date.now()) / 1000)
                )
                return remaining
              } else if (timer.status === 'paused') {
                const remaining = Math.max(
                  0,
                  timer.duration - timer.pausedElapsed
                )
                return remaining
              }
            }
          }
          return 0
        }
        return 0
      },

      reset: () =>
        set({
          mode: 'stopwatch',
          stopwatch: initialStopwatchState,
          pomodoro: initialPomodoroState,
          timer: initialTimerState,
        }),
    }),
    {
      name: 'mindline-timer-storage',
      storage: createJSONStorage(() => localStorage, {
        replacer: (_key, value) =>
          value instanceof Date
            ? { __type: 'Date', value: value.toISOString() }
            : value,
        reviver: (_key, value) =>
          value && typeof value === 'object' && (value as any).__type === 'Date'
            ? new Date((value as any).value)
            : value,
      }),
    }
  )
)
