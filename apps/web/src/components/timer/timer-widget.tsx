'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Play,
  Pause,
  Square,
  ChevronDown,
  Timer,
  Coffee,
  Settings,
  SkipForward,
  X,
  RotateCcw,
} from 'lucide-react'
import { useTimerStore } from '@/lib/stores/timer-store'
import { useFormattedTime } from '@/lib/stores/useFormattedTime'
import { useStoreWithEqualityFn } from 'zustand/traditional'
import { shallow } from 'zustand/shallow'
import { trpc } from '@/lib/trpc'
import { toast } from 'sonner'
// TODO: Implement these modals
// import { TimerAssignmentModal } from './timer-assignment-modal'
import { PomodoroSettingsModal } from './pomodoro-settings-modal'

export function TimerWidget() {
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [showCreateTimer, setShowCreateTimer] = useState(false)
  const [newTimerName, setNewTimerName] = useState('')
  const [newTimerDuration, setNewTimerDuration] = useState(25) // minutes

  const {
    mode,
    stopwatchStatus,
    pomodoroStatus,
    pomodoroPhase,
    pomodoroRunId,
    pomodoroEndsAt,
    timerInstances,
    activeTimerId,
    setMode,
    startStopwatch,
    pauseStopwatch,
    resumeStopwatch,
    stopStopwatch,
    startPomodoro,
    pausePomodoro,
    resumePomodoro,
    skipPomodoroPhase,
    cancelPomodoro,
    completePomodoroPhase,
    createTimer,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    deleteTimer,
    reset,
  } = useStoreWithEqualityFn(
    useTimerStore,
    (s) => ({
      mode: s.mode,
      stopwatchStatus: s.stopwatch.status,
      pomodoroStatus: s.pomodoro.status,
      pomodoroPhase: s.pomodoro.phase,
      pomodoroRunId: s.pomodoro.runId,
      pomodoroEndsAt: s.pomodoro.phaseEndsAt,
      timerInstances: s.timer.timers,
      activeTimerId: s.timer.activeTimerId,
      setMode: s.setMode,
      startStopwatch: s.startStopwatch,
      pauseStopwatch: s.pauseStopwatch,
      resumeStopwatch: s.resumeStopwatch,
      stopStopwatch: s.stopStopwatch,
      startPomodoro: s.startPomodoro,
      pausePomodoro: s.pausePomodoro,
      resumePomodoro: s.resumePomodoro,
      skipPomodoroPhase: s.skipPomodoroPhase,
      cancelPomodoro: s.cancelPomodoro,
      completePomodoroPhase: s.completePomodoroPhase,
      createTimer: s.createTimer,
      startTimer: s.startTimer,
      pauseTimer: s.pauseTimer,
      resumeTimer: s.resumeTimer,
      stopTimer: s.stopTimer,
      deleteTimer: s.deleteTimer,
      reset: s.reset,
    }),
    shallow
  )

  const { formattedTime, isRunning, phase, cycle } = useFormattedTime()

  // Get active timer for timer mode
  const activeTimer = timerInstances.find((t) => t.id === activeTimerId)
  const timerStatus = activeTimer?.status || 'idle'

  // tRPC mutations
  const stopTimerMutation = trpc.time.stopTimer.useMutation({
    onError: (error) => {
      toast.error(`Failed to save timer: ${error.message}`)
    },
  })

  const startPomodoroMutation = trpc.pomodoro.startRun.useMutation({
    onError: (error) => {
      toast.error(`Failed to start pomodoro: ${error.message}`)
    },
  })

  const completePhaseMutation = trpc.pomodoro.completePhase.useMutation({
    onError: (error) => {
      toast.error(`Failed to complete phase: ${error.message}`)
    },
  })

  const cancelRunMutation = trpc.pomodoro.cancelRun.useMutation({
    onError: (error) => {
      toast.error(`Failed to cancel pomodoro: ${error.message}`)
    },
  })

  const saveTimerSessionMutation = trpc.time.saveTimerSession.useMutation({
    onError: (error) => {
      toast.error(`Failed to save timer session: ${error.message}`)
    },
  })

  const endRunMutation = trpc.pomodoro.endRun.useMutation()

  const pomodoroPreferencesQuery = trpc.pomodoro.getPreferences.useQuery(
    undefined,
    {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )

  // Client-side only to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Use ref to store the mutation function to avoid dependency issues
  const completePhaseMutationRef = useRef(completePhaseMutation.mutateAsync)
  completePhaseMutationRef.current = completePhaseMutation.mutateAsync

  // Stable callback for completing pomodoro phase
  const handlePhaseCompletion = useCallback(async () => {
    if (!pomodoroEndsAt || !pomodoroRunId) return

    const endsAt = new Date(pomodoroEndsAt)
    const remaining = Math.max(
      0,
      Math.floor((endsAt.getTime() - Date.now()) / 1000)
    )

    if (remaining === 0) {
      // Complete locally first (updates store -> new phase/endsAt)
      const result = completePomodoroPhase()

      try {
        await completePhaseMutationRef.current({
          runId: result.runId,
          phaseType: result.phaseType,
          phaseStart: result.phaseStart,
          phaseEnd: result.phaseEnd,
          cycle: result.cycle,
        })
        // Phase completed successfully
      } catch (err) {
        console.error('Failed to complete phase:', err)
      }
    }
  }, [pomodoroEndsAt, pomodoroRunId, completePomodoroPhase])

  // Auto-complete pomodoro phases when timer reaches zero
  const completedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (
      mode !== 'pomodoro' ||
      pomodoroStatus !== 'running' ||
      !pomodoroEndsAt ||
      !pomodoroRunId
    )
      return

    const endsAt = new Date(pomodoroEndsAt)
    const key = `${pomodoroRunId}:${endsAt.getTime()}`
    const ms = endsAt.getTime() - Date.now()

    if (ms <= 0) {
      if (completedKeyRef.current !== key) {
        completedKeyRef.current = key
        void handlePhaseCompletion()
      }
      return
    }

    const t = setTimeout(() => {
      if (completedKeyRef.current !== key) {
        completedKeyRef.current = key
        void handlePhaseCompletion()
      }
    }, ms + 30)

    return () => clearTimeout(t)
  }, [
    mode,
    pomodoroStatus,
    pomodoroEndsAt,
    pomodoroRunId,
    handlePhaseCompletion,
  ])

  if (!isClient) {
    return (
      <div className="flex items-center gap-2">
        <div className="bg-muted h-8 w-20 animate-pulse rounded" />
        <div className="bg-muted h-8 w-8 animate-pulse rounded" />
      </div>
    )
  }

  const handleStartStopwatch = () => {
    const assignment = { distractionFree: true } // Default assignment
    startStopwatch(assignment)
    // Toast will be shown when timer is stopped and saved
  }

  const handleStartPomodoro = async () => {
    if (!pomodoroPreferencesQuery.data) {
      return
    }

    try {
      const run = await startPomodoroMutation.mutateAsync({
        label: '', // Will be set via assignment modal
        taskId: undefined,
        eventId: undefined,
        distractionFreeDefault: true,
      })

      console.log('Started pomodoro run:', run)
      console.log('Using preferences:', pomodoroPreferencesQuery.data)

      startPomodoro(run.id, {
        workMinutes: Math.max(
          1,
          pomodoroPreferencesQuery.data.workMinutes ?? 25
        ),
        shortBreakMinutes: Math.max(
          1,
          pomodoroPreferencesQuery.data.shortBreakMinutes ?? 5
        ),
        longBreakMinutes: Math.max(
          1,
          pomodoroPreferencesQuery.data.longBreakMinutes ?? 15
        ),
        longBreakEvery: Math.max(
          1,
          pomodoroPreferencesQuery.data.longBreakEvery ?? 4
        ),
        autoStartNextPhase: !!pomodoroPreferencesQuery.data.autoStartNextPhase,
        autoStartNextWork: !!pomodoroPreferencesQuery.data.autoStartNextWork,
      })

      // Pomodoro started successfully
    } catch (error) {
      console.error('Failed to start pomodoro:', error)
      toast.error('Failed to start Pomodoro')
    }
  }

  const handleCreateTimer = () => {
    if (newTimerName.trim() && newTimerDuration > 0) {
      const timerId = createTimer(newTimerName.trim(), newTimerDuration * 60) // convert to seconds
      setNewTimerName('')
      setNewTimerDuration(25)
      setShowCreateTimer(false)

      // Auto-switch to timer mode if not already
      if (mode !== 'timer') {
        setMode('timer')
      }
    }
  }

  const handleStartTimer = (timerId?: string) => {
    const targetId = timerId || activeTimerId
    if (targetId) {
      startTimer(targetId)
    }
  }

  const handleStopTimer = async (timerId?: string) => {
    const targetId = timerId || activeTimerId
    if (!targetId) return

    const timer = timerInstances.find((t) => t.id === targetId)
    if (!timer || !timer.startedAt) return

    const stoppedTimer = stopTimer(targetId)
    if (!stoppedTimer || !stoppedTimer.startedAt) return

    const endTime = new Date()

    try {
      await saveTimerSessionMutation.mutateAsync({
        start: new Date(stoppedTimer.startedAt),
        end: endTime,
        duration: stoppedTimer.duration,
        label: stoppedTimer.name,
        distractionFree: stoppedTimer.assignment.distractionFree,
        taskId: stoppedTimer.assignment.taskId,
        eventId: stoppedTimer.assignment.eventId,
      })
      // Timer session saved successfully
    } catch (error) {
      console.error('Failed to save timer session:', error)
    }
  }

  const handlePause = () => {
    if (mode === 'stopwatch') {
      pauseStopwatch()
    } else if (mode === 'pomodoro') {
      pausePomodoro()
    } else if (mode === 'timer' && activeTimerId) {
      pauseTimer(activeTimerId)
    }
  }

  const handleResume = () => {
    if (mode === 'stopwatch') {
      resumeStopwatch()
    } else if (mode === 'pomodoro') {
      resumePomodoro()
    } else if (mode === 'timer' && activeTimerId) {
      resumeTimer(activeTimerId)
    }
  }

  const handleStop = async () => {
    if (mode === 'stopwatch') {
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
    } else if (mode === 'pomodoro') {
      const result = cancelPomodoro()

      if (result.runId) {
        try {
          await cancelRunMutation.mutateAsync({
            runId: result.runId,
            logPartialWork: !!result.partialWork,
            partialWorkStart: result.partialWork?.start,
            partialWorkEnd: result.partialWork?.end,
          })

          // Toast will be shown by mutation success callback
        } catch (error) {
          console.error('Failed to cancel pomodoro:', error)
        }
      }
    } else if (mode === 'timer' && activeTimerId) {
      await handleStopTimer(activeTimerId)
    }
  }

  const handleCompletePhase = async () => {
    if (mode !== 'pomodoro' || !pomodoroRunId) return

    try {
      const result = completePomodoroPhase()

      await completePhaseMutation.mutateAsync({
        runId: result.runId,
        phaseType: result.phaseType,
        phaseStart: result.phaseStart,
        phaseEnd: result.phaseEnd,
        cycle: result.cycle,
      })

      // Phase completed successfully
    } catch (error) {
      console.error('Failed to complete phase:', error)
    }
  }

  const handleSkipPhase = () => {
    skipPomodoroPhase()
    // No toast needed for phase skipping
  }

  const handleEndPomodoro = async () => {
    if (pomodoroRunId) {
      try {
        await endRunMutation.mutateAsync({ runId: pomodoroRunId })
        cancelPomodoro()
        // Toast will be shown by mutation success if needed
      } catch (error) {
        console.error('Failed to end pomodoro:', error)
      }
    }
  }

  const handleReset = () => {
    reset()
  }

  const getPhaseIcon = () => {
    if (mode === 'stopwatch') return <Timer className="h-3 w-3" />
    if (mode === 'timer') return <Timer className="h-3 w-3" />

    switch (phase) {
      case 'work':
        return <Timer className="h-3 w-3" />
      case 'shortBreak':
        return <Coffee className="h-3 w-3" />
      case 'longBreak':
        return <Coffee className="h-3 w-3" />
      default:
        return <Timer className="h-3 w-3" />
    }
  }

  const getPhaseLabel = () => {
    if (mode === 'stopwatch') return 'Stopwatch'
    if (mode === 'timer') return activeTimer?.name || 'Timer'

    switch (phase) {
      case 'work':
        return `Work ${cycle}`
      case 'shortBreak':
        return 'Short Break'
      case 'longBreak':
        return 'Long Break'
      default:
        return 'Pomodoro'
    }
  }

  const getMainButton = () => {
    const currentStatus =
      mode === 'stopwatch'
        ? stopwatchStatus
        : mode === 'pomodoro'
          ? pomodoroStatus
          : timerStatus

    if (currentStatus === 'idle') {
      return (
        <Button
          size="sm"
          onClick={
            mode === 'stopwatch'
              ? handleStartStopwatch
              : mode === 'pomodoro'
                ? handleStartPomodoro
                : () => handleStartTimer()
          }
          disabled={
            (mode === 'pomodoro' &&
              (startPomodoroMutation.isPending ||
                !pomodoroPreferencesQuery.data)) ||
            (mode === 'timer' && !activeTimer)
          }
        >
          <Play className="h-3 w-3" />
        </Button>
      )
    }

    if (currentStatus === 'paused') {
      return (
        <Button size="sm" onClick={handleResume}>
          <Play className="h-3 w-3" />
        </Button>
      )
    }

    return (
      <Button size="sm" variant="outline" onClick={handlePause}>
        <Pause className="h-3 w-3" />
      </Button>
    )
  }

  const showCycleIndicator = mode === 'pomodoro' && phase === 'work'
  const currentStatus =
    mode === 'stopwatch'
      ? stopwatchStatus
      : mode === 'pomodoro'
        ? pomodoroStatus
        : timerStatus

  return (
    <>
      <div className="flex items-center gap-2 text-sm">
        {/* Timer display */}
        <div className="flex items-center gap-1 font-mono">
          {mode === 'pomodoro' && (
            <Badge variant="secondary" className="text-xs">
              {getPhaseIcon()}
              <span className="ml-1">{getPhaseLabel()}</span>
            </Badge>
          )}
          <span
            className={
              isRunning
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }
          >
            {formattedTime}
          </span>
          {showCycleIndicator && (
            <div className="ml-1 flex items-center gap-0.5">
              {Array.from({ length: 4 }).map(
                (
                  _,
                  i // Default to 4 cycles
                ) => (
                  <div
                    key={i}
                    className={`h-1 w-1 rounded-full ${
                      i < (cycle || 0)
                        ? 'bg-blue-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                )
              )}
            </div>
          )}
        </div>

        {/* Main action button */}
        {getMainButton()}

        {/* Dropdown menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Timer Mode</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setMode('stopwatch')}>
              <Timer className="mr-2 h-4 w-4" />
              Stopwatch
              {mode === 'stopwatch' && (
                <div className="ml-auto h-2 w-2 rounded-full bg-blue-500" />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMode('pomodoro')}>
              <Coffee className="mr-2 h-4 w-4" />
              Pomodoro
              {mode === 'pomodoro' && (
                <div className="ml-auto h-2 w-2 rounded-full bg-blue-500" />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMode('timer')}>
              <Timer className="mr-2 h-4 w-4" />
              Timer
              {mode === 'timer' && (
                <div className="ml-auto h-2 w-2 rounded-full bg-blue-500" />
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuLabel>Assignment</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setShowAssignmentModal(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Set Label/Task/Event
            </DropdownMenuItem>

            {mode === 'pomodoro' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Pomodoro Controls</DropdownMenuLabel>

                {currentStatus === 'running' && phase !== 'work' && (
                  <DropdownMenuItem onClick={handleSkipPhase}>
                    <SkipForward className="mr-2 h-4 w-4" />
                    Skip Break
                  </DropdownMenuItem>
                )}

                {currentStatus !== 'idle' && (
                  <DropdownMenuItem onClick={handleStop}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel Run
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={() => setShowSettingsModal(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Pomodoro Settings
                </DropdownMenuItem>
              </>
            )}

            {currentStatus === 'paused' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleStop}>
                  <Square className="mr-2 h-4 w-4" />
                  Stop & Save
                </DropdownMenuItem>
              </>
            )}

            {mode === 'timer' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Timer Management</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setShowCreateTimer(true)}>
                  <Timer className="mr-2 h-4 w-4" />
                  Create Timer
                </DropdownMenuItem>
                {timerInstances.map((timer) => (
                  <DropdownMenuItem
                    key={timer.id}
                    onClick={() => handleStartTimer(timer.id)}
                  >
                    <Timer className="mr-2 h-4 w-4" />
                    {timer.name} ({Math.floor(timer.duration / 60)}m)
                    {timer.id === activeTimerId && (
                      <div className="ml-auto h-2 w-2 rounded-full bg-green-500" />
                    )}
                  </DropdownMenuItem>
                ))}
                {timerInstances.length > 0 && (
                  <DropdownMenuItem
                    onClick={() => activeTimerId && deleteTimer(activeTimerId)}
                    disabled={!activeTimerId}
                    className="text-red-600"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Delete Active Timer
                  </DropdownMenuItem>
                )}
              </>
            )}

            {mode === 'stopwatch' && currentStatus !== 'idle' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleReset}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset Timer
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* TODO: Implement assignment modal */}
      {showAssignmentModal && <div>Assignment Modal placeholder</div>}

      {/* Pomodoro Settings Modal */}
      <PomodoroSettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
      />

      {/* Timer Creation Dialog */}
      <Dialog open={showCreateTimer} onOpenChange={setShowCreateTimer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Timer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="timer-name"
                className="mb-1 block text-sm font-medium"
              >
                Timer Name
              </label>
              <Input
                id="timer-name"
                placeholder="e.g., Focus Session, Study Time"
                value={newTimerName}
                onChange={(e) => setNewTimerName(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="timer-duration"
                className="mb-1 block text-sm font-medium"
              >
                Duration (minutes)
              </label>
              <Input
                id="timer-duration"
                type="number"
                min="1"
                max="480"
                placeholder="25"
                value={newTimerDuration}
                onChange={(e) =>
                  setNewTimerDuration(parseInt(e.target.value) || 25)
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateTimer(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTimer}
                disabled={
                  !newTimerName.trim() ||
                  newTimerDuration <= 0 ||
                  timerInstances.length >= 5
                }
              >
                Create Timer ({timerInstances.length}/5)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
