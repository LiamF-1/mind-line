'use client'

// Prevent Next.js 15 prerendering issues
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { Calendar } from '@/components/calendar/calendar'
import { EventFormModal } from '@/components/calendar/event-form-modal'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function CalendarPage() {
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setIsEventModalOpen(true)
  }

  const handleEventSelect = (eventId: string) => {
    setSelectedEvent(eventId)
    setIsEventModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsEventModalOpen(false)
    setSelectedDate(null)
    setSelectedEvent(null)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="bg-background flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">
            Manage your events and schedule
          </p>
        </div>
        <Button onClick={() => setIsEventModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Event
        </Button>
      </div>

      <div className="flex-1 p-6">
        <Calendar
          onDateSelect={handleDateSelect}
          onEventSelect={handleEventSelect}
        />
      </div>

      <EventFormModal
        open={isEventModalOpen}
        onClose={handleCloseModal}
        selectedDate={selectedDate}
        eventId={selectedEvent}
      />
    </div>
  )
}
