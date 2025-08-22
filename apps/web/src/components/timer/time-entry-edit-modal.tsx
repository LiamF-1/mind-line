'use client'

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
import { trpc } from '@/lib/trpc'
import { toast } from 'sonner'

const editEntrySchema = z.object({
  label: z.string().nullable(),
  taskId: z.string().nullable(),
  eventId: z.string().nullable(),
  distractionFree: z.boolean(),
})

type EditEntryFormData = z.infer<typeof editEntrySchema>

interface TimeEntry {
  id: string
  label: string | null
  distractionFree: boolean
  task: { id: string; title: string } | null
  event: { id: string; title: string } | null
}

interface TimeEntryEditModalProps {
  entry: TimeEntry
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function TimeEntryEditModal({
  entry,
  open,
  onOpenChange,
  onSuccess,
}: TimeEntryEditModalProps) {
  const form = useForm<EditEntryFormData>({
    resolver: zodResolver(editEntrySchema),
    defaultValues: {
      label: entry.label || null,
      taskId: entry.task?.id || '__CLEAR__',
      eventId: entry.event?.id || '__CLEAR__',
      distractionFree: entry.distractionFree,
    },
  })

  // Fetch tasks and events for selection with error handling
  const { data: tasks = [], error: tasksError } = trpc.task.list.useQuery(
    {
      status: 'ACTIVE',
    },
    {
      enabled: open, // Only fetch when modal is open
      retry: 1,
    }
  )

  const { data: events = [], error: eventsError } =
    trpc.event.getByDateRange.useQuery(
      {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
      },
      {
        enabled: open, // Only fetch when modal is open
        retry: 1,
      }
    )

  // Log errors if they occur
  if (tasksError) {
    console.error('Failed to fetch tasks:', tasksError)
  }
  if (eventsError) {
    console.error('Failed to fetch events:', eventsError)
  }

  const updateEntryMutation = trpc.time.updateEntry.useMutation({
    onSuccess: () => {
      // Time entry updated successfully
      onSuccess()
    },
    onError: (error) => {
      toast.error(`Failed to update entry: ${error.message}`)
    },
  })

  const onSubmit = (data: EditEntryFormData) => {
    updateEntryMutation.mutate({
      id: entry.id,
      label: data.label || null,
      taskId: data.taskId === '__CLEAR__' ? null : data.taskId || null,
      eventId: data.eventId === '__CLEAR__' ? null : data.eventId || null,
      distractionFree: data.distractionFree,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Time Entry</DialogTitle>
          <DialogDescription>
            Update the session title, task/event assignment, and
            distraction-free status.
          </DialogDescription>
        </DialogHeader>

        {(tasksError || eventsError) && (
          <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
            <p className="font-medium">Limited functionality available</p>
            <p>
              Some features may not work due to connection issues. You can still
              edit the label and distraction-free status.
            </p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Deep Work, Reading, Planning"
                      {...field}
                      value={field.value || ''}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!tasksError && (
              <FormField
                control={form.control}
                name="taskId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a task" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__CLEAR__">
                          None (clear selection)
                        </SelectItem>
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
            )}

            {!eventsError && (
              <FormField
                control={form.control}
                name="eventId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calendar Event</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an event" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__CLEAR__">
                          None (clear selection)
                        </SelectItem>
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
            )}

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

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateEntryMutation.isPending}>
                {updateEntryMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
