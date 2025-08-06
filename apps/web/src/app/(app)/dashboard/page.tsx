'use client'

import { useState } from 'react'
import Link from 'next/link'
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
} from 'date-fns'

export default function DashboardPage() {
  const { data: session } = useSession()

  // Get current date range for today's events
  const today = new Date()
  const todayStart = startOfDay(today)
  const todayEnd = endOfDay(today)

  // Get upcoming events (next 7 days)
  const weekEnd = endOfDay(addDays(today, 7))

  const { data: todayEvents = [] } = trpc.event.getByDateRange.useQuery({
    start: todayStart,
    end: todayEnd,
  })

  const { data: upcomingEvents = [] } = trpc.event.getByDateRange.useQuery({
    start: todayStart,
    end: weekEnd,
  })

  const getGreeting = () => {
    const hour = new Date().getHours()
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
              {format(today, 'EEEE, MMMM d, yyyy')}
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
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            <CheckSquare className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-muted-foreground text-xs">Coming soon</p>
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
              <Link href="/calendar">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Create Event
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                disabled
              >
                <CheckSquare className="h-4 w-4" />
                Add Task
                <span className="text-muted-foreground ml-auto text-xs">
                  Soon
                </span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                disabled
              >
                <FileText className="h-4 w-4" />
                New Note
                <span className="text-muted-foreground ml-auto text-xs">
                  Soon
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

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
                      {formatEventTime(new Date(event.startsAt), event.allDay)}
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
    </div>
  )
}
