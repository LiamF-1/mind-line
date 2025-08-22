'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, CheckSquare, FileText, Plus, ArrowRight } from 'lucide-react'
import {
  format,
  isToday,
  isTomorrow,
  startOfDay,
  endOfDay,
  addDays,
  formatDistanceToNow,
} from 'date-fns'

export function DashboardClient() {
  const { data: session } = useSession()
  const router = useRouter()

  // Memoized date ranges to prevent excessive API calls
  const dateRanges = useMemo(() => {
    const today = new Date()
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)
    const weekEnd = endOfDay(addDays(today, 7))

    return {
      today: { start: todayStart, end: todayEnd },
      upcoming: { start: todayStart, end: weekEnd },
      todayDate: today,
    }
  }, [])

  const { data: todayEvents = [] } = trpc.event.getByDateRange.useQuery(
    dateRanges.today,
    {
      staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    }
  )

  const { data: upcomingEvents = [] } = trpc.event.getByDateRange.useQuery(
    dateRanges.upcoming,
    {
      staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    }
  )

  // Get task counts
  const { data: taskCounts } = trpc.task.getCounts.useQuery()

  // Get recent notes
  const { data: recentNotesData } = trpc.note.list.useQuery({
    limit: 5,
  })
  const recentNotes = recentNotesData?.notes || []

  // Create note mutation
  const createNoteMutation = trpc.note.create.useMutation({
    onSuccess: (note) => {
      router.push(`/notes/${note.id}`)
    },
  })

  const getGreeting = () => {
    const hour = dateRanges.todayDate.getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const formatEventTime = (date: Date, allDay: boolean) => {
    if (allDay) return 'All day'
    return format(date, 'h:mm a')
  }

  const getRelativeDate = (date: Date) => {
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'MMM d')
  }

  const extractTextFromContent = (content: any): string => {
    if (!content || !content.content) return ''

    const extractText = (node: any): string => {
      if (node.type === 'text') return node.text || ''
      if (node.content) {
        return node.content.map(extractText).join('')
      }
      return ''
    }

    return content.content.map(extractText).join(' ').slice(0, 100)
  }

  const handleCreateNote = async () => {
    try {
      await createNoteMutation.mutateAsync({
        title: 'Untitled Note',
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
        tags: [],
      })
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Hero Section */}
      <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-100 p-6 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {getGreeting()}, {session?.user?.name || 'there'}!
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              {format(dateRanges.todayDate, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="hidden sm:block">
            <Link href="/calendar">
              <Button className="gap-2">
                <Calendar className="h-4 w-4" />
                View Calendar
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Events
            </CardTitle>
            <Calendar className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayEvents.length}</div>
            <p className="text-muted-foreground text-xs">
              {todayEvents.length === 0
                ? 'No events today'
                : `${todayEvents.length} event${todayEvents.length > 1 ? 's' : ''} scheduled`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Events
            </CardTitle>
            <Calendar className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingEvents.length}</div>
            <p className="text-muted-foreground text-xs">Next 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <CheckSquare className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {taskCounts?.totalActive || 0}
            </div>
            <p className="text-muted-foreground text-xs">
              {taskCounts?.dueToday
                ? `${taskCounts.dueToday} due today`
                : 'No tasks due today'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today&apos;s Schedule
              </CardTitle>
              <Link href="/calendar">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {todayEvents.length === 0 ? (
              <div className="py-6 text-center">
                <Calendar className="text-muted-foreground mx-auto mb-2 h-12 w-12" />
                <p className="text-muted-foreground">
                  No events scheduled for today
                </p>
                <Link href="/calendar">
                  <Button variant="outline" size="sm" className="mt-3 gap-2">
                    <Plus className="h-4 w-4" />
                    Add Event
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {todayEvents.slice(0, 3).map((event: any) => (
                  <div
                    key={event.id}
                    className="bg-card flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: event.color || '#3b82f6' }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {event.title}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatEventTime(
                          new Date(event.startsAt),
                          event.allDay
                        )}
                        {event.location && ` • ${event.location}`}
                      </p>
                    </div>
                  </div>
                ))}
                {todayEvents.length > 3 && (
                  <p className="text-muted-foreground pt-2 text-center text-xs">
                    +{todayEvents.length - 3} more events
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Get started with your productivity tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Button
                className="w-full justify-start gap-2"
                onClick={handleCreateNote}
                disabled={createNoteMutation.isPending}
              >
                <FileText className="h-4 w-4" />
                {createNoteMutation.isPending ? 'Creating...' : 'New Note'}
              </Button>
              <Link href="/calendar">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Create Event
                </Button>
              </Link>
              <Link href="/tasks">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <CheckSquare className="h-4 w-4" />
                  Add Task
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>Your events for the next 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.slice(0, 5).map((event: any) => (
                  <div
                    key={event.id}
                    className="bg-card flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: event.color || '#3b82f6' }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {event.title}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {getRelativeDate(new Date(event.startsAt))} at{' '}
                        {formatEventTime(
                          new Date(event.startsAt),
                          event.allDay
                        )}
                        {event.location && ` • ${event.location}`}
                      </p>
                    </div>
                  </div>
                ))}
                {upcomingEvents.length > 5 && (
                  <Link href="/calendar">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full gap-1"
                    >
                      View {upcomingEvents.length - 5} more events
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task Overview */}
        {taskCounts &&
          (taskCounts.overdue > 0 ||
            taskCounts.dueToday > 0 ||
            taskCounts.upcoming > 0) && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5" />
                    Task Overview
                  </CardTitle>
                  <Link href="/tasks">
                    <Button variant="ghost" size="sm" className="gap-1">
                      View All
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {taskCounts.overdue > 0 && (
                    <Link href="/tasks?filter=overdue">
                      <div className="bg-card flex items-center gap-3 rounded-lg border border-red-200 p-3 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-red-700 dark:text-red-300">
                            {taskCounts.overdue} Overdue Task
                            {taskCounts.overdue > 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-red-600 dark:text-red-400">
                            Needs immediate attention
                          </p>
                        </div>
                      </div>
                    </Link>
                  )}

                  {taskCounts.dueToday > 0 && (
                    <Link href="/tasks?filter=today">
                      <div className="bg-card flex items-center gap-3 rounded-lg border border-orange-200 p-3 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-900/20">
                        <div className="h-3 w-3 rounded-full bg-orange-500" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                            {taskCounts.dueToday} Due Today
                          </p>
                          <p className="text-xs text-orange-600 dark:text-orange-400">
                            Complete by end of day
                          </p>
                        </div>
                      </div>
                    </Link>
                  )}

                  {taskCounts.upcoming > 0 && (
                    <Link href="/tasks?filter=upcoming">
                      <div className="bg-card flex items-center gap-3 rounded-lg border p-3">
                        <div className="h-3 w-3 rounded-full bg-blue-500" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {taskCounts.upcoming} Upcoming Task
                            {taskCounts.upcoming > 1 ? 's' : ''}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Due in the next week
                          </p>
                        </div>
                      </div>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Recent Notes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Notes
              </CardTitle>
              <Link href="/notes">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentNotes.length > 0 ? (
              <div className="space-y-3">
                {recentNotes.slice(0, 3).map((note: any) => (
                  <Link key={note.id} href={`/notes/${note.id}`}>
                    <div className="bg-card hover:bg-muted/50 flex items-start gap-3 rounded-lg border p-3 transition-colors">
                      <div className="mt-1">
                        <FileText className="text-muted-foreground h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {note.title}
                        </p>
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                          {extractTextFromContent(note.content) || 'No content'}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {formatDistanceToNow(new Date(note.updatedAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <FileText className="text-muted-foreground mx-auto mb-2 h-12 w-12" />
                <p className="text-muted-foreground mb-2">No notes yet</p>
                <p className="text-muted-foreground mb-4 text-sm">
                  Start capturing your thoughts and ideas
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleCreateNote}
                  disabled={createNoteMutation.isPending}
                >
                  <Plus className="h-4 w-4" />
                  Create Your First Note
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
