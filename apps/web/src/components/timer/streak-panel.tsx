'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Flame, Settings, Trophy } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { toast } from 'sonner'

export function StreakPanel() {
  const [isEditing, setIsEditing] = useState(false)
  const [newTargetName, setNewTargetName] = useState('')

  const { data: streakData, refetch } = trpc.time.getStreak.useQuery()

  const updateStreakMutation = trpc.time.updateStreak.useMutation({
    onSuccess: () => {
      // Distraction target updated successfully
      setIsEditing(false)
      refetch()
    },
    onError: (error) => {
      toast.error(`Failed to update target: ${error.message}`)
    },
  })

  const handleUpdateTarget = () => {
    if (!newTargetName.trim()) {
      toast.error('Please enter a target name')
      return
    }

    updateStreakMutation.mutate({ targetName: newTargetName.trim() })
  }

  const openEditDialog = () => {
    setNewTargetName(streakData?.targetName || 'Instagram')
    setIsEditing(true)
  }

  if (!streakData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5" />
            Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="bg-muted h-8 rounded" />
            <div className="bg-muted h-4 w-3/4 rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const isNewRecord =
    streakData.currentStreak > 0 &&
    streakData.currentStreak >= streakData.bestStreak

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flame
              className={`h-5 w-5 ${isNewRecord ? 'text-yellow-500' : 'text-gray-400'}`}
            />
            Days without {streakData.targetName}
          </CardTitle>
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" onClick={openEditDialog}>
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Change Distraction Target</DialogTitle>
                <DialogDescription>
                  What habit or distraction are you trying to avoid?
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="e.g., Instagram, Twitter, YouTube"
                  value={newTargetName}
                  onChange={(e) => setNewTargetName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUpdateTarget()
                    }
                  }}
                />
                <div className="flex justify-end space-x-2">
                  <Button variant="ghost" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateTarget}
                    disabled={updateStreakMutation.isPending}
                  >
                    {updateStreakMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Consecutive days with distraction-free focus sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
            {streakData.currentStreak}
          </div>
          <p className="text-muted-foreground text-sm">
            {streakData.currentStreak === 1 ? 'day' : 'days'} current streak
          </p>
        </div>

        {isNewRecord && streakData.currentStreak > 1 && (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-yellow-50 p-2 dark:bg-yellow-900/20">
            <Trophy className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
              New personal record!
            </span>
          </div>
        )}

        <div className="border-t pt-2 text-center">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            {streakData.bestStreak}
          </div>
          <p className="text-muted-foreground text-xs">best streak</p>
        </div>

        <div className="text-muted-foreground text-center text-xs">
          Complete at least one distraction-free session each day to maintain
          your streak
        </div>
      </CardContent>
    </Card>
  )
}
