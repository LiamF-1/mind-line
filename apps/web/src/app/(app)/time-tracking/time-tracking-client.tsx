'use client'

import { useState, useEffect, useCallback } from 'react'
import { subDays, startOfDay, endOfDay, format } from 'date-fns'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { trpc } from '@/lib/trpc'
import { PomodoroSettingsModal } from '@/components/timer/pomodoro-settings-modal'
import {
  Timer,
  Coffee,
  Edit2,
  Trash2,
  Clock,
  Play,
  Pause,
  Square,
  Plus,
  X,
  Settings,
} from 'lucide-react'
import { toast } from 'sonner'
import { TimeEntryEditModal } from '@/components/timer/time-entry-edit-modal'
import { StreakPanel } from '@/components/timer/streak-panel'
import { useTimerStore } from '@/lib/stores/timer-store'
import { useFormattedTime } from '@/lib/stores/useFormattedTime'
import { useStoreWithEqualityFn } from 'zustand/traditional'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { shallow } from 'zustand/shallow'

interface TimeEntry {
  id: string
  start: Date
  end: Date
  duration: number
  label: string | null
  distractionFree: boolean
  source: 'STOPWATCH' | 'POMODORO' | 'TIMER'
  task: { id: string; title: string } | null
  event: { id: string; title: string } | null
  pomodoroRun: { id: string } | null
  pomodoroCycle: number | null
}

export function TimeTrackingClient() {
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [showCreateTimer, setShowCreateTimer] = useState(false)
  const [newTimerName, setNewTimerName] = useState('')
  const [newTimerDuration, setNewTimerDuration] = useState(25)
  const [showPomodoroSettings, setShowPomodoroSettings] = useState(false)

  // Timer store
  const {
    mode,
    stopwatchStatus,
    pomodoroStatus,
    pomodoroPhase,
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

  // Get date ranges
  const today = new Date()
  const sevenDaysAgo = startOfDay(subDays(today, 6))
  const todayEnd = endOfDay(today)

  // Queries
  const { data: todayTotal = 0 } = trpc.time.getTodayTotal.useQuery()

  const { data: weekSummary } = trpc.time.getSummary.useQuery({
    range: {
      from: sevenDaysAgo.toISOString(),
      to: todayEnd.toISOString(),
    },
  })

  const { data: recentEntries = [], refetch: refetchEntries } =
    trpc.time.listEntries.useQuery({
      limit: 50,
    })

  const { data: pomodoroSummary } = trpc.time.getPomodoroSummary.useQuery({
    range: {
      from: sevenDaysAgo.toISOString(),
      to: todayEnd.toISOString(),
    },
  })

  // Mutations
  const deleteEntryMutation = trpc.time.deleteEntry.useMutation({
    onSuccess: () => {
      // Time entry deleted successfully
      refetchEntries()
    },
    onError: (error) => {
      toast.error(`Failed to delete entry: ${error.message}`)
    },
  })

  const saveTimerSessionMutation = trpc.time.saveTimerSession.useMutation({
    onSuccess: () => {
      // Timer session saved successfully
      refetchEntries()
    },
    onError: (error) => {
      toast.error(`Failed to save timer session: ${error.message}`)
    },
  })

  const stopTimerMutation = trpc.time.stopTimer.useMutation({
    onSuccess: () => {
      // Stopwatch session saved successfully
      refetchEntries()
    },
    onError: (error) => {
      toast.error(`Failed to save stopwatch: ${error.message}`)
    },
  })

  const startPomodoroMutation = trpc.pomodoro.startRun.useMutation({
    onError: (error) => {
      toast.error(`Failed to start pomodoro: ${error.message}`)
    },
  })

  const pomodoroPreferencesQuery = trpc.pomodoro.getPreferences.useQuery()

  const { formattedTime, isRunning, phase, cycle } = useFormattedTime()

  // Helper functions for display values
  const getStopwatchDisplay = useCallback(() => {
    if (stopwatchStatus === 'idle') return '00:00'
    // Only use formattedTime if we're in stopwatch mode, otherwise calculate manually
    if (mode === 'stopwatch') return formattedTime

    // Calculate stopwatch time manually when not in stopwatch mode
    const stopwatch = useTimerStore.getState().stopwatch
    let elapsed = stopwatch.elapsed || 0
    if (stopwatch.status === 'running' && stopwatch.startedAt) {
      elapsed += Math.floor((Date.now() - stopwatch.startedAt.getTime()) / 1000)
    }

    const hours = Math.floor(elapsed / 3600)
    const minutes = Math.floor((elapsed % 3600) / 60)
    const seconds = elapsed % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }, [stopwatchStatus, mode, formattedTime])

  const getPomodoroDisplay = useCallback(() => {
    if (pomodoroStatus === 'idle') {
      // Show initial work duration when idle
      const workMinutes = pomodoroPreferencesQuery.data?.workMinutes || 25
      return `${workMinutes.toString().padStart(2, '0')}:00`
    }

    // Only use formattedTime if we're in pomodoro mode, otherwise calculate manually
    if (mode === 'pomodoro') return formattedTime

    // Calculate pomodoro time manually when not in pomodoro mode
    const pomodoro = useTimerStore.getState().pomodoro
    if (pomodoro.phaseEndsAt) {
      const remaining = Math.max(
        0,
        Math.floor((pomodoro.phaseEndsAt.getTime() - Date.now()) / 1000)
      )
      const hours = Math.floor(remaining / 3600)
      const minutes = Math.floor((remaining % 3600) / 60)
      const seconds = remaining % 60

      if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      }
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }

    return '00:00'
  }, [
    pomodoroStatus,
    mode,
    formattedTime,
    pomodoroPreferencesQuery.data?.workMinutes,
  ])

  // Force re-render every second for live time updates
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((tick) => tick + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleDeleteEntry = (id: string) => {
    if (confirm('Are you sure you want to delete this time entry?')) {
      deleteEntryMutation.mutate({ id })
    }
  }

  // Stopwatch handlers
  const handleStartStopwatch = () => {
    const assignment = { distractionFree: true }
    startStopwatch(assignment)
  }

  const handleStopStopwatch = async () => {
    const stoppedTimer = stopStopwatch()

    if (stoppedTimer.startedAt && stoppedTimer.elapsed > 0) {
      const endTime = stoppedTimer.pausedAt || new Date()

      try {
        await stopTimerMutation.mutateAsync({
          start: stoppedTimer.startedAt,
          end: endTime,
          label: stoppedTimer.assignment.label,
          taskId: stoppedTimer.assignment.taskId,
          eventId: stoppedTimer.assignment.eventId,
          distractionFree: stoppedTimer.assignment.distractionFree,
        })
      } catch (error) {
        console.error('Failed to save stopwatch:', error)
      }
    }
  }

  // Pomodoro handlers
  const handleStartPomodoro = async () => {
    if (!pomodoroPreferencesQuery.data) {
      return
    }

    try {
      const run = await startPomodoroMutation.mutateAsync({
        distractionFreeDefault: true,
      })

      startPomodoro(run.id, {
        workMinutes: pomodoroPreferencesQuery.data.workMinutes,
        shortBreakMinutes: pomodoroPreferencesQuery.data.shortBreakMinutes,
        longBreakMinutes: pomodoroPreferencesQuery.data.longBreakMinutes,
        longBreakEvery: pomodoroPreferencesQuery.data.longBreakEvery,
        autoStartNextPhase: pomodoroPreferencesQuery.data.autoStartNextPhase,
        autoStartNextWork: pomodoroPreferencesQuery.data.autoStartNextWork,
      })
    } catch (error) {
      console.error('Failed to start pomodoro:', error)
      toast.error('Failed to start Pomodoro')
    }
  }

  // Timer handlers
  const handleCreateTimer = () => {
    if (newTimerName.trim() && newTimerDuration > 0) {
      createTimer(newTimerName.trim(), newTimerDuration * 60)
      setNewTimerName('')
      setNewTimerDuration(25)
      setShowCreateTimer(false)
    }
  }

  const handleStopTimer = async (timerId: string) => {
    const timer = timerInstances.find((t) => t.id === timerId)
    if (!timer || !timer.startedAt) return

    const stoppedTimer = stopTimer(timerId)
    if (!stoppedTimer || !stoppedTimer.startedAt) return

    const endTime = new Date()

    try {
      await saveTimerSessionMutation.mutateAsync({
        start: stoppedTimer.startedAt,
        end: endTime,
        duration: stoppedTimer.duration,
        label: stoppedTimer.name,
        distractionFree: stoppedTimer.assignment.distractionFree,
        taskId: stoppedTimer.assignment.taskId,
        eventId: stoppedTimer.assignment.eventId,
      })
    } catch (error) {
      console.error('Failed to save timer session:', error)
    }
  }

  // Prepare chart data
  const chartData =
    weekSummary?.dailyBreakdown.map((day) => ({
      date: format(new Date(day.day), 'MMM dd'),
      minutes: Math.round(day.totalMinutes),
      sessions: day.sessionCount,
    })) || []

  // Fill missing days with zero data
  const completeChartData = []
  for (let i = 6; i >= 0; i--) {
    const date = subDays(today, i)
    const dateStr = format(date, 'MMM dd')
    const existingData = chartData.find((d) => d.date === dateStr)

    completeChartData.push({
      date: dateStr,
      minutes: existingData?.minutes || 0,
      sessions: existingData?.sessions || 0,
    })
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const getEntryIcon = (entry: TimeEntry) => {
    if (entry.source === 'POMODORO') {
      return <Coffee className="h-4 w-4 text-orange-500" />
    }
    if (entry.source === 'TIMER') {
      return <Timer className="h-4 w-4 text-green-500" />
    }
    return <Timer className="h-4 w-4 text-blue-500" />
  }

  const getEntryLabel = (entry: TimeEntry) => {
    if (entry.label) return entry.label
    if (entry.task) return entry.task.title
    if (entry.event) return entry.event.title
    return 'Untitled session'
  }

  // Helper function to format timer time
  const getTimerFormattedTime = useCallback((timer: any) => {
    let elapsed = 0

    if (timer.status === 'running' && timer.startedAt) {
      // Current elapsed = time since start + any previously paused elapsed time
      const currentRunTime = Math.floor(
        (Date.now() - timer.startedAt.getTime()) / 1000
      )
      elapsed = currentRunTime + (timer.pausedElapsed || 0)
    } else if (timer.status === 'paused') {
      // When paused, use the stored pausedElapsed time
      elapsed = timer.pausedElapsed || 0
    } else {
      // When idle, show full duration
      elapsed = 0
    }

    // For countdown timers, show remaining time
    const remaining = Math.max(0, timer.duration - elapsed)
    const hours = Math.floor(remaining / 3600)
    const minutes = Math.floor((remaining % 3600) / 60)
    const seconds = remaining % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }, [])

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Time Tracking
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Track your focus sessions and productivity
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today Total</CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(todayTotal)} min
            </div>
            <p className="text-muted-foreground text-xs">
              {Math.round((todayTotal / 60) * 10) / 10} hours focused
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Week Total</CardTitle>
            <Timer className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(weekSummary?.totalMinutes || 0)} min
            </div>
            <p className="text-muted-foreground text-xs">
              {weekSummary?.dailyBreakdown.length || 0} active days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today Pomodoros
            </CardTitle>
            <Coffee className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pomodoroSummary?.todayPomodoros || 0}
            </div>
            <p className="text-muted-foreground text-xs">
              {Math.round(pomodoroSummary?.todayMinutes || 0)} minutes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Week Pomodoros
            </CardTitle>
            <Coffee className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pomodoroSummary?.totalPomodoros || 0}
            </div>
            <p className="text-muted-foreground text-xs">
              {Math.round(pomodoroSummary?.totalMinutes || 0)} minutes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Timer Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Stopwatch */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Stopwatch
            </CardTitle>
            <CardDescription>
              Track time with a simple stopwatch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="mt-2">
                  <div
                    className={`font-mono text-2xl font-bold ${stopwatchStatus === 'running' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}
                  >
                    {getStopwatchDisplay()}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {stopwatchStatus === 'idle'
                      ? 'Ready to start'
                      : stopwatchStatus === 'running'
                        ? 'Elapsed time'
                        : 'Paused'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {stopwatchStatus === 'idle' && (
                  <Button onClick={handleStartStopwatch}>
                    <Play className="mr-2 h-4 w-4" />
                    Start
                  </Button>
                )}
                {stopwatchStatus === 'running' && (
                  <>
                    <Button variant="outline" onClick={pauseStopwatch}>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </Button>
                    <Button variant="outline" onClick={handleStopStopwatch}>
                      <Square className="mr-2 h-4 w-4" />
                      Stop & Save
                    </Button>
                  </>
                )}
                {stopwatchStatus === 'paused' && (
                  <>
                    <Button onClick={resumeStopwatch}>
                      <Play className="mr-2 h-4 w-4" />
                      Resume
                    </Button>
                    <Button variant="outline" onClick={handleStopStopwatch}>
                      <Square className="mr-2 h-4 w-4" />
                      Stop & Save
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pomodoro */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coffee className="h-5 w-5" />
              Pomodoro
            </CardTitle>
            <CardDescription>Focused work sessions with breaks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                {(pomodoroPhase || pomodoroStatus === 'idle') && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Phase: {pomodoroPhase || 'work'}{' '}
                    {cycle && `(Cycle ${cycle})`}
                  </p>
                )}
                <div className="mt-2">
                  <div
                    className={`font-mono text-2xl font-bold ${pomodoroStatus === 'running' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}
                  >
                    {getPomodoroDisplay()}
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {pomodoroStatus === 'idle'
                      ? '🍅 Ready to start work session'
                      : phase === 'work'
                        ? '🍅 Work session'
                        : phase === 'shortBreak'
                          ? '☕ Short Break'
                          : '🛋️ Long Break'}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {pomodoroStatus === 'idle' && (
                  <Button
                    onClick={handleStartPomodoro}
                    disabled={
                      startPomodoroMutation.isPending ||
                      !pomodoroPreferencesQuery.data
                    }
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start
                  </Button>
                )}
                {pomodoroStatus === 'running' && (
                  <Button variant="outline" onClick={pausePomodoro}>
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </Button>
                )}
                {pomodoroStatus === 'paused' && (
                  <Button onClick={resumePomodoro}>
                    <Play className="mr-2 h-4 w-4" />
                    Resume
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPomodoroSettings(true)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timer Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Timer Management
          </CardTitle>
          <CardDescription>
            Create and manage custom timers (up to 5)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Create Timer Button */}
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                {timerInstances.length}/5 timers created
              </p>
              <Dialog open={showCreateTimer} onOpenChange={setShowCreateTimer}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={timerInstances.length >= 5}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Timer
                  </Button>
                </DialogTrigger>
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
                        disabled={!newTimerName.trim() || newTimerDuration <= 0}
                      >
                        Create Timer
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Timer List */}
            {timerInstances.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {timerInstances.map((timer) => (
                  <Card key={timer.id} className="relative">
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-sm font-medium">{timer.name}</h4>
                        {timer.id === activeTimerId && (
                          <Badge variant="outline" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground mb-1 text-xs">
                        {Math.floor(timer.duration / 60)} minutes total
                      </p>
                      <div className="mb-3">
                        <div
                          className={`font-mono text-lg font-bold ${timer.status === 'running' ? 'text-green-600 dark:text-green-400' : timer.status === 'paused' ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}`}
                        >
                          {getTimerFormattedTime(timer)}
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {timer.status === 'running'
                            ? 'Remaining'
                            : timer.status === 'paused'
                              ? 'Paused'
                              : 'Ready to start'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {timer.status === 'idle' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startTimer(timer.id)}
                          >
                            <Play className="mr-1 h-3 w-3" />
                            Start
                          </Button>
                        )}
                        {timer.status === 'running' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => pauseTimer(timer.id)}
                            >
                              <Pause className="mr-1 h-3 w-3" />
                              Pause
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStopTimer(timer.id)}
                            >
                              <Square className="mr-1 h-3 w-3" />
                              Stop
                            </Button>
                          </>
                        )}
                        {timer.status === 'paused' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resumeTimer(timer.id)}
                            >
                              <Play className="mr-1 h-3 w-3" />
                              Resume
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStopTimer(timer.id)}
                            >
                              <Square className="mr-1 h-3 w-3" />
                              Stop
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteTimer(timer.id)}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground py-6 text-center">
                <Timer className="mx-auto mb-2 h-12 w-12 opacity-50" />
                <p>No timers created yet</p>
                <p className="text-sm">
                  Create your first timer to get started
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts and Streak */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>7-Day Activity</CardTitle>
              <CardDescription>
                Daily focus minutes and session count
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={completeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background rounded-lg border p-2 shadow-md">
                              <p className="font-medium">{label}</p>
                              <p className="text-sm text-blue-600">
                                {payload[0].value} minutes
                              </p>
                              <p className="text-sm text-gray-600">
                                {payload[0].payload.sessions} sessions
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar
                      dataKey="minutes"
                      fill="#3b82f6"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <StreakPanel />
        </div>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
          <CardDescription>
            Your latest focus sessions and time entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentEntries.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                No time entries yet. Start your first timer session!
              </div>
            ) : (
              recentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    {getEntryIcon(entry)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {getEntryLabel(entry)}
                        </span>
                        {entry.source === 'POMODORO' && entry.pomodoroCycle && (
                          <Badge variant="secondary" className="text-xs">
                            🍅 Cycle {entry.pomodoroCycle}
                          </Badge>
                        )}
                        {!entry.distractionFree && (
                          <Badge variant="outline" className="text-xs">
                            With distractions
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {format(new Date(entry.start), 'MMM dd, h:mm a')} •{' '}
                        {formatDuration(entry.duration)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingEntry(entry)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteEntry(entry.id)}
                      disabled={deleteEntryMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editingEntry && (
        <TimeEntryEditModal
          entry={editingEntry}
          open={!!editingEntry}
          onOpenChange={(open) => !open && setEditingEntry(null)}
          onSuccess={() => {
            setEditingEntry(null)
            refetchEntries()
          }}
        />
      )}

      {/* Pomodoro Settings Modal */}
      <PomodoroSettingsModal
        open={showPomodoroSettings}
        onOpenChange={setShowPomodoroSettings}
      />
    </div>
  )
}
