'use client'

import { useEffect } from 'react'
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
  // ✅ Only query when the modal is open; also keep data stable for a bit
  const { data: preferences } = trpc.pomodoro.getPreferences.useQuery(
    undefined,
    {
      enabled: open,
      staleTime: 5 * 60 * 1000,
    }
  )

  const updatePreferencesMutation = trpc.pomodoro.updatePreferences.useMutation(
    {
      onSuccess: () => {
        onOpenChange(false)
      },
      onError: (error) => {
        toast.error(`Failed to update settings: ${error.message}`)
      },
    }
  )

  // ✅ Static defaults; do NOT tie them directly to `preferences`
  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      workMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakEvery: 4,
      autoStartNextPhase: false,
      autoStartNextWork: true,
      soundEnabled: false,
      notificationsEnabled: false,
      defaultLabel: null,
      distractionFreeDefault: true,
    },
  })

  // ✅ Apply server values only when `open && preferences` change — in an effect (not render)
  useEffect(() => {
    if (!open || !preferences) return

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
  }, [open, preferences, form])

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
    const map = {
      classic: {
        workMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakEvery: 4,
      },
      extended: {
        workMinutes: 50,
        shortBreakMinutes: 10,
        longBreakMinutes: 20,
        longBreakEvery: 3,
      },
      short: {
        workMinutes: 15,
        shortBreakMinutes: 3,
        longBreakMinutes: 10,
        longBreakEvery: 4,
      },
    }[preset]
    form.setValue('workMinutes', map.workMinutes)
    form.setValue('shortBreakMinutes', map.shortBreakMinutes)
    form.setValue('longBreakMinutes', map.longBreakMinutes)
    form.setValue('longBreakEvery', map.longBreakEvery)
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
                          field.onChange(parseInt(e.target.value || '0', 10))
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
                          field.onChange(parseInt(e.target.value || '0', 10))
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
                          field.onChange(parseInt(e.target.value || '0', 10))
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
                          field.onChange(parseInt(e.target.value || '0', 10))
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
                      value={field.value ?? ''}
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
                        onCheckedChange={(v) => field.onChange(!!v)}
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
                        onCheckedChange={(v) => field.onChange(!!v)}
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
                        onCheckedChange={(v) => field.onChange(!!v)}
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
                        onCheckedChange={(v) => field.onChange(!!v)}
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
                        onCheckedChange={(v) => field.onChange(!!v)}
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
