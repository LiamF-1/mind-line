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
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { trpc } from '@/lib/trpc'
import { toast } from 'sonner'

const settingsSchema = z.object({
  workMinutes: z.number().int().min(1).max(180),
  shortBreakMinutes: z.number().int().min(1).max(60),
  longBreakMinutes: z.number().int().min(1).max(60),
  longBreakEvery: z.number().int().min(2).max(12),
  autoStartNextPhase: z.boolean(),
  autoStartNextWork: z.boolean(),
  soundEnabled: z.boolean(),
  notificationsEnabled: z.boolean(),
  defaultLabel: z.string().max(60).nullable(),
  distractionFreeDefault: z.boolean(),
})

type SettingsFormData = z.infer<typeof settingsSchema>

interface PomodoroSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PomodoroSettingsModal({
  open,
  onOpenChange,
}: PomodoroSettingsModalProps) {
  const { data: preferences, refetch } = trpc.pomodoro.getPreferences.useQuery()

  const updatePreferencesMutation = trpc.pomodoro.updatePreferences.useMutation(
    {
      onSuccess: () => {
        // Pomodoro settings updated successfully
        refetch()
        onOpenChange(false)
      },
      onError: (error) => {
        toast.error(`Failed to update settings: ${error.message}`)
      },
    }
  )

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      workMinutes: preferences?.workMinutes || 25,
      shortBreakMinutes: preferences?.shortBreakMinutes || 5,
      longBreakMinutes: preferences?.longBreakMinutes || 15,
      longBreakEvery: preferences?.longBreakEvery || 4,
      autoStartNextPhase: preferences?.autoStartNextPhase || false,
      autoStartNextWork: preferences?.autoStartNextWork || true,
      soundEnabled: preferences?.soundEnabled || false,
      notificationsEnabled: preferences?.notificationsEnabled || false,
      defaultLabel: preferences?.defaultLabel || null,
      distractionFreeDefault: preferences?.distractionFreeDefault || true,
    },
  })

  // Update form when preferences load
  if (preferences && !form.formState.isDirty) {
    form.reset({
      workMinutes: preferences.workMinutes,
      shortBreakMinutes: preferences.shortBreakMinutes,
      longBreakMinutes: preferences.longBreakMinutes,
      longBreakEvery: preferences.longBreakEvery,
      autoStartNextPhase: preferences.autoStartNextPhase,
      autoStartNextWork: preferences.autoStartNextWork,
      soundEnabled: preferences.soundEnabled,
      notificationsEnabled: preferences.notificationsEnabled,
      defaultLabel: preferences.defaultLabel,
      distractionFreeDefault: preferences.distractionFreeDefault,
    })
  }

  const onSubmit = async (data: SettingsFormData) => {
    // Request notification permission if enabling notifications
    if (data.notificationsEnabled && !preferences?.notificationsEnabled) {
      if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          toast.error('Notification permission denied')
          data.notificationsEnabled = false
        }
      }
    }

    updatePreferencesMutation.mutate(data)
  }

  const handlePreset = (preset: 'classic' | 'extended' | 'short') => {
    switch (preset) {
      case 'classic':
        form.setValue('workMinutes', 25)
        form.setValue('shortBreakMinutes', 5)
        form.setValue('longBreakMinutes', 15)
        form.setValue('longBreakEvery', 4)
        break
      case 'extended':
        form.setValue('workMinutes', 50)
        form.setValue('shortBreakMinutes', 10)
        form.setValue('longBreakMinutes', 20)
        form.setValue('longBreakEvery', 3)
        break
      case 'short':
        form.setValue('workMinutes', 15)
        form.setValue('shortBreakMinutes', 3)
        form.setValue('longBreakMinutes', 10)
        form.setValue('longBreakEvery', 4)
        break
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pomodoro Settings</DialogTitle>
          <DialogDescription>
            Customize your pomodoro timer preferences.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Presets */}
            <div className="space-y-2">
              <FormLabel>Quick Presets</FormLabel>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreset('classic')}
                >
                  Classic (25/5/15)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreset('extended')}
                >
                  Extended (50/10/20)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreset('short')}
                >
                  Short (15/3/10)
                </Button>
              </div>
            </div>

            {/* Time Settings */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="workMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Minutes</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={180}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shortBreakMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Break</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={60}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="longBreakMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Long Break</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={60}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="longBreakEvery"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Long Break Every</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={2}
                        max={12}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormDescription>Work sessions</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Default Label */}
            <FormField
              control={form.control}
              name="defaultLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Label</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Deep Work, Focus Session"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Default label for new pomodoro sessions
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Behavior Settings */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="autoStartNextPhase"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Auto-start breaks</FormLabel>
                      <FormDescription>
                        Automatically start break phases after work sessions
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="autoStartNextWork"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Auto-start work after breaks</FormLabel>
                      <FormDescription>
                        Automatically start work sessions after breaks
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="distractionFreeDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Distraction-free by default</FormLabel>
                      <FormDescription>
                        New sessions count toward streak by default
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Notification Settings */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="soundEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Sound notifications</FormLabel>
                      <FormDescription>
                        Play sound when phases complete
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notificationsEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Browser notifications</FormLabel>
                      <FormDescription>
                        Show browser notifications when phases complete
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updatePreferencesMutation.isPending}
              >
                {updatePreferencesMutation.isPending
                  ? 'Saving...'
                  : 'Save Settings'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
