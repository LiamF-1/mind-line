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
      label: entry.label || '',
      taskId: entry.task?.id || '',
      eventId: entry.event?.id || '',
      distractionFree: entry.distractionFree,
    },
  })

  // Fetch tasks and events for selection
  const { data: tasks = [] } = trpc.task.list.useQuery({
    status: 'ACTIVE',
  })

  const { data: events = [] } = trpc.event.getByDateRange.useQuery({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
  })

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
      taskId: data.taskId || null,
      eventId: data.eventId || null,
      distractionFree: data.distractionFree,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Time Entry</DialogTitle>
          <DialogDescription>
            Update the label, assignment, and distraction-free status.
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
                      value={field.value || ''}
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
