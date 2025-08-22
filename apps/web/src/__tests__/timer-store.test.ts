import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTimerStore } from '@/lib/stores/timer-store'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('Timer Store', () => {
  const mockPreferences = {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4,
    autoStartNextPhase: false,
    autoStartNextWork: true,
  }

  beforeEach(() => {
    // Reset the store before each test
    useTimerStore.getState().reset()
    vi.clearAllMocks()
  })

  describe('Mode switching', () => {
    it('should switch between stopwatch and pomodoro modes', () => {
      const store = useTimerStore.getState()

      expect(store.mode).toBe('stopwatch')

      store.setMode('pomodoro')
      expect(useTimerStore.getState().mode).toBe('pomodoro')

      store.setMode('stopwatch')
      expect(useTimerStore.getState().mode).toBe('stopwatch')
    })
  })

  describe('Stopwatch functionality', () => {
    it('should start stopwatch timer', () => {
      const store = useTimerStore.getState()

      store.startStopwatch({ label: 'Test Session', distractionFree: true })

      const state = useTimerStore.getState()
      expect(state.stopwatch.status).toBe('running')
      expect(state.stopwatch.startedAt).toBeInstanceOf(Date)
      expect(state.stopwatch.assignment.label).toBe('Test Session')
      expect(state.stopwatch.assignment.distractionFree).toBe(true)
    })

    it('should pause and resume stopwatch', () => {
      const store = useTimerStore.getState()

      // Start timer
      store.startStopwatch()
      const afterStart = useTimerStore.getState()
      expect(afterStart.stopwatch.status).toBe('running')

      // Pause timer
      store.pauseStopwatch()
      const pausedState = useTimerStore.getState()
      expect(pausedState.stopwatch.status).toBe('paused')
      expect(pausedState.stopwatch.pausedAt).toBeInstanceOf(Date)

      // Resume timer
      store.resumeStopwatch()
      const resumedState = useTimerStore.getState()
      expect(resumedState.stopwatch.status).toBe('running')
      expect(resumedState.stopwatch.pausedAt).toBeUndefined()
    })

    it('should stop and return stopwatch state', () => {
      const store = useTimerStore.getState()

      store.startStopwatch({ label: 'Test Session' })

      // Simulate some elapsed time
      const startTime = Date.now() - 5000 // 5 seconds ago
      useTimerStore.setState((state) => ({
        stopwatch: {
          ...state.stopwatch,
          startedAt: new Date(startTime),
        },
      }))

      const stoppedState = store.stopStopwatch()

      expect(stoppedState.assignment.label).toBe('Test Session')
      expect(stoppedState.elapsed).toBeGreaterThan(0)

      // Timer should be reset to idle
      const currentState = useTimerStore.getState()
      expect(currentState.stopwatch.status).toBe('idle')
    })

    it('should update stopwatch assignment', () => {
      const store = useTimerStore.getState()

      store.startStopwatch()
      store.updateStopwatchAssignment({
        label: 'Updated Label',
        taskId: 'task-123',
        distractionFree: false,
      })

      const state = useTimerStore.getState()
      expect(state.stopwatch.assignment.label).toBe('Updated Label')
      expect(state.stopwatch.assignment.taskId).toBe('task-123')
      expect(state.stopwatch.assignment.distractionFree).toBe(false)
    })
  })

  describe('Pomodoro functionality', () => {
    it('should start pomodoro run', () => {
      const store = useTimerStore.getState()

      store.startPomodoro('run-123', mockPreferences, {
        label: 'Focus Session',
      })

      const state = useTimerStore.getState()
      expect(state.pomodoro.status).toBe('running')
      expect(state.pomodoro.runId).toBe('run-123')
      expect(state.pomodoro.phase).toBe('work')
      expect(state.pomodoro.cycle).toBe(1)
      expect(state.pomodoro.phaseStartedAt).toBeInstanceOf(Date)
      expect(state.pomodoro.phaseEndsAt).toBeInstanceOf(Date)
      expect(state.pomodoro.assignment.label).toBe('Focus Session')
    })

    it('should pause and resume pomodoro', () => {
      const store = useTimerStore.getState()

      store.startPomodoro('run-123', mockPreferences)
      store.pausePomodoro()

      const pausedState = useTimerStore.getState()
      expect(pausedState.pomodoro.status).toBe('paused')
      expect(pausedState.pomodoro.pausedAt).toBeInstanceOf(Date)

      store.resumePomodoro()

      const resumedState = useTimerStore.getState()
      expect(resumedState.pomodoro.status).toBe('running')
      expect(resumedState.pomodoro.pausedAt).toBeUndefined()
    })

    it('should skip pomodoro phases', () => {
      const store = useTimerStore.getState()

      // Start in work phase
      store.startPomodoro('run-123', mockPreferences)
      expect(store.pomodoro.phase).toBe('work')
      expect(store.pomodoro.cycle).toBe(1)

      // Skip to short break
      store.skipPomodoroPhase()
      const afterFirstSkip = useTimerStore.getState()
      expect(afterFirstSkip.pomodoro.phase).toBe('shortBreak')

      // Skip back to work
      store.skipPomodoroPhase()
      const afterSecondSkip = useTimerStore.getState()
      expect(afterSecondSkip.pomodoro.phase).toBe('work')
      expect(afterSecondSkip.pomodoro.cycle).toBe(2)
    })

    it('should handle long break after specified cycles', () => {
      const store = useTimerStore.getState()

      store.startPomodoro('run-123', mockPreferences)

      // Simulate completing 4 work cycles to trigger long break
      useTimerStore.setState((state) => ({
        pomodoro: {
          ...state.pomodoro,
          cycle: 4,
        },
      }))

      store.skipPomodoroPhase()

      const state = useTimerStore.getState()
      expect(state.pomodoro.phase).toBe('longBreak')
    })

    it('should complete pomodoro phase and transition', () => {
      const store = useTimerStore.getState()

      store.startPomodoro('run-123', mockPreferences)

      const result = store.completePomodoroPhase()

      expect(result.runId).toBe('run-123')
      expect(result.phaseType).toBe('work')
      expect(result.cycle).toBe(1)
      expect(result.phaseStart).toBeInstanceOf(Date)
      expect(result.phaseEnd).toBeInstanceOf(Date)

      // Should transition to short break
      const state = useTimerStore.getState()
      expect(state.pomodoro.phase).toBe('shortBreak')
    })

    it('should cancel pomodoro and return partial work if applicable', () => {
      const store = useTimerStore.getState()

      store.startPomodoro('run-123', mockPreferences)

      // Simulate some work time
      const startTime = Date.now() - 120000 // 2 minutes ago
      useTimerStore.setState((state) => ({
        pomodoro: {
          ...state.pomodoro,
          phaseStartedAt: new Date(startTime),
        },
      }))

      const result = store.cancelPomodoro()

      expect(result.runId).toBe('run-123')
      expect(result.partialWork).toBeDefined()
      expect(result.partialWork?.start).toBeInstanceOf(Date)
      expect(result.partialWork?.end).toBeInstanceOf(Date)

      // Pomodoro should be reset
      const state = useTimerStore.getState()
      expect(state.pomodoro.status).toBe('idle')
    })
  })

  describe('Time calculation', () => {
    it('should calculate current time for running stopwatch', () => {
      const store = useTimerStore.getState()

      // Start stopwatch 30 seconds ago
      const startTime = Date.now() - 30000
      store.startStopwatch()
      useTimerStore.setState((state) => ({
        stopwatch: {
          ...state.stopwatch,
          startedAt: new Date(startTime),
        },
      }))

      const currentTime = store.getCurrentTime()
      expect(currentTime).toBeGreaterThanOrEqual(29)
      expect(currentTime).toBeLessThanOrEqual(31)
    })

    it('should return elapsed time for paused stopwatch', () => {
      const store = useTimerStore.getState()

      store.startStopwatch()

      // Simulate 45 seconds elapsed
      useTimerStore.setState((state) => ({
        stopwatch: {
          ...state.stopwatch,
          status: 'paused',
          elapsed: 45,
        },
      }))

      const currentTime = store.getCurrentTime()
      expect(currentTime).toBe(45)
    })

    it('should calculate remaining time for running pomodoro', () => {
      const store = useTimerStore.getState()

      // Set mode to pomodoro
      store.setMode('pomodoro')

      // Start pomodoro that ends in 10 seconds
      const endTime = Date.now() + 10000
      store.startPomodoro('run-123', mockPreferences, { label: 'Test' })
      useTimerStore.setState((state) => ({
        pomodoro: {
          ...state.pomodoro,
          phaseEndsAt: new Date(endTime),
        },
      }))

      const remainingTime = store.getCurrentTime()
      expect(remainingTime).toBeGreaterThanOrEqual(9)
      expect(remainingTime).toBeLessThanOrEqual(11)
    })
  })

  describe('Store persistence', () => {
    it('should reset store to initial state', () => {
      const store = useTimerStore.getState()

      // Make some changes
      store.setMode('pomodoro')
      store.startStopwatch({ label: 'Test' })

      // Reset
      store.reset()

      const state = useTimerStore.getState()
      expect(state.mode).toBe('stopwatch')
      expect(state.stopwatch.status).toBe('idle')
      expect(state.pomodoro.status).toBe('idle')
    })
  })
})
