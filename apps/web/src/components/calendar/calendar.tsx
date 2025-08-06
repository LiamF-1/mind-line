'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Calendar as BigCalendar,
  momentLocalizer,
  Views,
  View,
} from 'react-big-calendar'
import moment from 'moment'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import '@/styles/calendar.css'

// Configure moment to use 24-hour format
moment.locale('en', {
  longDateFormat: {
    LT: 'HH:mm',
    LTS: 'HH:mm:ss',
    L: 'DD/MM/YYYY',
    LL: 'D MMMM YYYY',
    LLL: 'D MMMM YYYY HH:mm',
    LLLL: 'dddd D MMMM YYYY HH:mm',
  },
})

const localizer = momentLocalizer(moment)

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  color: string
  description?: string
  location?: string
}

interface CalendarProps {
  onDateSelect: (date: Date) => void
  onEventSelect: (eventId: string) => void
}

export function Calendar({ onDateSelect, onEventSelect }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<View>('month')

  // Calculate date range for fetching events
  const dateRange = useMemo(() => {
    let start: Date, end: Date

    if (view === 'month') {
      start = moment(currentDate).startOf('month').subtract(1, 'week').toDate()
      end = moment(currentDate).endOf('month').add(1, 'week').toDate()
    } else if (view === 'week') {
      start = moment(currentDate).startOf('week').toDate()
      end = moment(currentDate).endOf('week').toDate()
    } else {
      start = moment(currentDate).startOf('day').toDate()
      end = moment(currentDate).endOf('day').toDate()
    }

    return { start, end }
  }, [currentDate, view])

  // Fetch events
  const { data: events = [], isLoading } =
    trpc.event.getByDateRange.useQuery(dateRange)

  // Transform events for react-big-calendar
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return events.map((event: any) => ({
      id: event.id,
      title: event.title,
      start: new Date(event.startsAt),
      end: new Date(event.endsAt),
      allDay: event.allDay,
      color: event.color || '#3b82f6',
      description: event.description || undefined,
      location: event.location || undefined,
    }))
  }, [events])

  const handleNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate)
  }, [])

  const handleViewChange = useCallback((newView: View) => {
    setView(newView)
  }, [])

  const handleSelectSlot = useCallback(
    ({ start }: { start: Date }) => {
      onDateSelect(start)
    },
    [onDateSelect]
  )

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      onEventSelect(event.id)
    },
    [onEventSelect]
  )

  const handleGoToToday = () => {
    setCurrentDate(new Date())
  }

  const eventStyleGetter = (event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: event.color,
        color: 'white',
        borderRadius: '4px',
        borderWidth: '0px',
        fontSize: '12px',
      },
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-full">
      {/* Calendar Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const unit =
                view === 'month' ? 'month' : view === 'week' ? 'week' : 'day'
              handleNavigate(moment(currentDate).subtract(1, unit).toDate())
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const unit =
                view === 'month' ? 'month' : view === 'week' ? 'week' : 'day'
              handleNavigate(moment(currentDate).add(1, unit).toDate())
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleGoToToday}>
            Today
          </Button>
        </div>

        <h2 className="text-xl font-semibold">
          {view === 'day'
            ? moment(currentDate).format('dddd, D MMMM YYYY')
            : moment(currentDate).format('MMMM YYYY')}
        </h2>

        <div className="flex gap-1">
          {[
            { key: 'month', label: 'Month' },
            { key: 'week', label: 'Week' },
            { key: 'day', label: 'Day' },
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant={view === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleViewChange(key as View)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="calendar-container bg-background h-[600px] rounded-lg border">
        <BigCalendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          titleAccessor="title"
          allDayAccessor="allDay"
          view={view}
          date={currentDate}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          popup
          eventPropGetter={eventStyleGetter}
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          step={30}
          showMultiDayTimes
          className="p-4"
          formats={{
            timeGutterFormat: 'HH:mm',
            eventTimeRangeFormat: ({ start, end }) => {
              return `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`
            },
            agendaTimeFormat: 'HH:mm',
            agendaTimeRangeFormat: ({ start, end }) => {
              return `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`
            },
          }}
        />
      </div>
    </div>
  )
}
