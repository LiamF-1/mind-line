'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

type Task = {
  id: string
  title: string
  description?: string | null
  dueDate?: Date | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  label?: string | null
  order: number
  calendarEventId?: string | null
  calendarEvent?: {
    id: string
    title: string
    startsAt: Date
  } | null
  createdAt: Date
  updatedAt: Date
}

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']),
  dueDate: z.date().optional(),
  label: z.string().optional(),
})

type TaskFormData = z.infer<typeof taskSchema>

interface TaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task | null
  onSave: (data: TaskFormData) => void
  isLoading?: boolean
}

const priorityOptions = [
  { value: 'LOW', label: 'Low', color: 'bg-gray-400' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-blue-400' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-400' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-400' },
] as const

const statusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
] as const

const labelColors = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#6b7280', // gray
]

export function TaskModal({
  open,
  onOpenChange,
  task,
  onSave,
  isLoading = false,
}: TaskModalProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'MEDIUM',
      status: 'ACTIVE',
      dueDate: undefined,
      label: undefined,
    },
  })

  const watchedDueDate = watch('dueDate')
  const watchedPriority = watch('priority')
  const watchedLabel = watch('label')

  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        label: task.label || undefined,
      })
    } else {
      reset({
        title: '',
        description: '',
        priority: 'MEDIUM',
        status: 'ACTIVE',
        dueDate: undefined,
        label: undefined,
      })
    }
  }, [task, reset])

  const onSubmit = (data: TaskFormData) => {
    onSave(data)
  }

  const handleDateSelect = (date: Date | undefined) => {
    setValue('dueDate', date)
    setCalendarOpen(false)
  }

  const clearDate = () => {
    setValue('dueDate', undefined)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Create Task'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Enter task title..."
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Add a description..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={watchedPriority}
                onValueChange={(value: any) => setValue('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn('h-3 w-3 rounded-full', option.color)}
                        />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            {task && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={watch('status')}
                  onValueChange={(value: any) => setValue('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <div className="flex gap-2">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'flex-1 justify-start text-left font-normal',
                      !watchedDueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watchedDueDate ? (
                      format(watchedDueDate, 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watchedDueDate}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {watchedDueDate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearDate}
                  className="px-3"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Label Color */}
          <div className="space-y-2">
            <Label>Label Color</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setValue('label', undefined)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2',
                  !watchedLabel
                    ? 'border-gray-900 dark:border-white'
                    : 'border-gray-300'
                )}
              >
                <X className="h-4 w-4" />
              </button>
              {labelColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue('label', color)}
                  className={cn(
                    'h-8 w-8 rounded-full border-2',
                    watchedLabel === color
                      ? 'border-gray-900 dark:border-white'
                      : 'border-gray-300'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
