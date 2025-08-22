'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { trpc } from '@/lib/trpc'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
  DialogPortal,
} from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar, Clock, MapPin, Palette, Trash2 } from 'lucide-react'

const eventSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    startsAt: z.string(),
    endsAt: z.string(),
    allDay: z.boolean(),
    color: z.string(),
    location: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.allDay) {
        return new Date(data.endsAt) > new Date(data.startsAt)
      }
      return true
    },
    {
      message: 'End time must be after start time',
      path: ['endsAt'],
    }
  )

type EventFormData = z.infer<typeof eventSchema>

interface EventFormModalProps {
  open: boolean
  onClose: () => void
  selectedDate?: Date | null
  eventId?: string | null
}

const colorOptions = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#ef4444', label: 'Red' },
  { value: '#22c55e', label: 'Green' },
  { value: '#f59e0b', label: 'Yellow' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#f97316', label: 'Orange' },
  { value: '#84cc16', label: 'Lime' },
]

export function EventFormModal({
  open,
  onClose,
  selectedDate,
  eventId,
}: EventFormModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const utils = trpc.useUtils()

  // Fetch event data if editing
  const { data: event } = trpc.event.getById.useQuery(
    { id: eventId! },
    { enabled: !!eventId }
  )

  const createMutation = trpc.event.create.useMutation({
    onSuccess: () => {
      utils.event.getByDateRange.invalidate()
      // Event created successfully
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create event')
    },
  })

  const updateMutation = trpc.event.update.useMutation({
    onSuccess: () => {
      utils.event.getByDateRange.invalidate()
      // Event updated successfully
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update event')
    },
  })

  const deleteMutation = trpc.event.delete.useMutation({
    onSuccess: () => {
      utils.event.getByDateRange.invalidate()
      // Event deleted successfully
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete event')
    },
  })

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      startsAt: '',
      endsAt: '',
      allDay: false,
      color: '#3b82f6',
      location: '',
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = form
  const watchAllDay = watch('allDay')

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      if (event) {
        // Editing existing event
        const startDate = new Date(event.startsAt)
        const endDate = new Date(event.endsAt)

        reset({
          title: event.title,
          description: event.description || '',
          startsAt: event.allDay
            ? format(startDate, 'yyyy-MM-dd')
            : format(startDate, "yyyy-MM-dd'T'HH:mm"),
          endsAt: event.allDay
            ? format(endDate, 'yyyy-MM-dd')
            : format(endDate, "yyyy-MM-dd'T'HH:mm"),
          allDay: event.allDay,
          color: event.color || '#3b82f6',
          location: event.location || '',
        })
      } else if (selectedDate) {
        // Creating new event
        const start = format(selectedDate, "yyyy-MM-dd'T'HH:mm")
        const end = format(
          new Date(selectedDate.getTime() + 60 * 60 * 1000),
          "yyyy-MM-dd'T'HH:mm"
        )

        reset({
          title: '',
          description: '',
          startsAt: start,
          endsAt: end,
          allDay: false,
          color: '#3b82f6',
          location: '',
        })
      }
    } else {
      reset()
      setShowDeleteConfirm(false)
    }
  }, [open, event, selectedDate, reset])

  const onSubmit = (data: EventFormData) => {
    const eventData = {
      title: data.title,
      description: data.description || undefined,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      allDay: data.allDay,
      color: data.color,
      location: data.location || undefined,
    }

    if (eventId) {
      updateMutation.mutate({ id: eventId, data: eventData })
    } else {
      createMutation.mutate(eventData)
    }
  }

  const handleDelete = () => {
    if (eventId) {
      deleteMutation.mutate({ id: eventId })
    }
  }

  const isLoading =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending

  // Custom dialog content with animation from top-right
  const CustomDialogContent = ({
    className,
    children,
    ...props
  }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-right-full data-[state=closed]:slide-out-to-top-[10%] data-[state=open]:slide-in-from-right-full data-[state=open]:slide-in-from-top-[10%] fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 shadow-lg duration-300 sm:rounded-lg',
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <CustomDialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {eventId ? 'Edit Event' : 'Create Event'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="title" className="mb-2 block">
                Title *
              </Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Event title"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description" className="mb-2 block">
                Description
              </Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Event description (optional)"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allDay"
                checked={watchAllDay}
                onCheckedChange={(checked) => setValue('allDay', !!checked)}
              />
              <Label htmlFor="allDay">All day event</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="startsAt"
                  className="mb-2 flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Start {watchAllDay ? 'Date' : 'Time'}
                </Label>
                <Input
                  id="startsAt"
                  type={watchAllDay ? 'date' : 'datetime-local'}
                  {...register('startsAt')}
                  className={errors.startsAt ? 'border-red-500' : ''}
                />
                {errors.startsAt && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.startsAt.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="endsAt" className="mb-2 block">
                  End {watchAllDay ? 'Date' : 'Time'}
                </Label>
                <Input
                  id="endsAt"
                  type={watchAllDay ? 'date' : 'datetime-local'}
                  {...register('endsAt')}
                  className={errors.endsAt ? 'border-red-500' : ''}
                />
                {errors.endsAt && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.endsAt.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label
                htmlFor="location"
                className="mb-2 flex items-center gap-2"
              >
                <MapPin className="h-4 w-4" />
                Location
              </Label>
              <Input
                id="location"
                {...register('location')}
                placeholder="Event location (optional)"
              />
            </div>

            <div>
              <Label className="mb-2 flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Color
              </Label>
              <div className="flex gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setValue('color', color.value)}
                    className={`h-8 w-8 rounded-full border-2 ${
                      watch('color') === color.value
                        ? 'border-gray-900 dark:border-gray-100'
                        : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              {eventId && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isLoading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}

              <div className="ml-auto flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading
                    ? 'Saving...'
                    : eventId
                      ? 'Update Event'
                      : 'Create Event'}
                </Button>
              </div>
            </div>
          </form>
        </CustomDialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this event? This action cannot be
            undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete Event'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
