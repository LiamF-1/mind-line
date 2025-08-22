'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTimerStore } from '@/lib/stores/timer-store'
import { trpc } from '@/lib/trpc'

const assignmentSchema = z.object({
  label: z.string().optional(),
  taskId: z.string().optional(),
  eventId: z.string().optional(),
  distractionFree: z.boolean(),
})

type AssignmentFormData = z.infer<typeof assignmentSchema>

interface TimerAssignmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TimerAssignmentModal({
  open,
  onOpenChange,
}: TimerAssignmentModalProps) {
  const {
    mode,
    stopwatch,
    pomodoro,
    updateStopwatchAssignment,
    updatePomodoroAssignment,
  } = useTimerStore()

  const currentAssignment =
    mode === 'stopwatch' ? stopwatch.assignment : pomodoro.assignment

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      label: currentAssignment.label || '',
      taskId: currentAssignment.taskId || '',
      eventId: currentAssignment.eventId || '',
      distractionFree: currentAssignment.distractionFree,
    },
  })

  // Memoized date range to prevent constant refetching
  const dateRange = useMemo(
    () => ({
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }),
    []
  )

  // Fetch tasks and events for selection - only when modal is open
  const { data: tasks = [] } = trpc.task.list.useQuery(
    {
      status: 'ACTIVE',
    },
    {
      enabled: open,
    }
  )

  const { data: events = [] } = trpc.event.getByDateRange.useQuery(dateRange, {
    enabled: open,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  const onSubmit = (data: AssignmentFormData) => {
    const assignment = {
      label: data.label || undefined,
      taskId: data.taskId || undefined,
      eventId: data.eventId || undefined,
      distractionFree: data.distractionFree,
    }

    if (mode === 'stopwatch') {
      updateStopwatchAssignment(assignment)
    } else {
      updatePomodoroAssignment(assignment)
    }

    onOpenChange(false)
  }

  const handleClear = () => {
    form.reset({
      label: '',
      taskId: '',
      eventId: '',
      distractionFree: true,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Timer Assignment</DialogTitle>
          <DialogDescription>
            Assign your {mode} session to a task, event, or custom label.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Label</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Deep Work, Reading, Planning"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taskId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a task" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {tasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="eventId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calendar Event</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an event" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="distractionFree"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Distraction-free session</FormLabel>
                    <p className="text-muted-foreground text-sm">
                      Count this session toward your streak
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={handleClear}>
                Clear All
              </Button>
              <div className="space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
