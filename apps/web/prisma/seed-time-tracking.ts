import { PrismaClient } from '@prisma/client'
import { subDays, startOfDay, addMinutes, addHours } from 'date-fns'

const prisma = new PrismaClient()

async function seedTimeTracking() {
  console.log('🕐 Seeding time tracking data...')

  // Get existing users or create demo users
  const users = await prisma.user.findMany({ take: 3 })
  if (users.length === 0) {
    console.log('⚠️ No users found. Please run the main seed script first.')
    return
  }

  const user = users[0] // Use first user for demo data

  // Create pomodoro preferences for the user
  await prisma.pomodoroPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      workMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakEvery: 4,
      autoStartNextPhase: false,
      autoStartNextWork: true,
      soundEnabled: false,
      notificationsEnabled: false,
      defaultLabel: 'Focus Session',
      distractionFreeDefault: true,
    },
  })

  // Create distraction preference
  await prisma.distractionPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      targetName: 'Instagram',
    },
  })

  // Get some existing tasks and events for assignment
  const tasks = await prisma.task.findMany({
    where: { userId: user.id },
    take: 3,
  })

  const events = await prisma.calendarEvent.findMany({
    where: { userId: user.id },
    take: 2,
  })

  // Generate time entries for the past 14 days
  const timeEntries = []
  const pomodoroRuns = []

  for (let i = 13; i >= 0; i--) {
    const day = subDays(new Date(), i)
    const dayStart = startOfDay(day)

    // Skip some days to create realistic gaps
    if (i === 12 || i === 8 || i === 3) continue

    // Generate 2-5 sessions per day
    const sessionCount = Math.floor(Math.random() * 4) + 2
    let currentTime = addHours(dayStart, 9) // Start at 9 AM

    for (let j = 0; j < sessionCount; j++) {
      const isPomodoro = Math.random() > 0.4 // 60% chance of pomodoro
      const duration = isPomodoro
        ? 25 * 60 + Math.floor(Math.random() * 5 * 60) // 25-30 minutes for pomodoro
        : Math.floor(Math.random() * 45 * 60) + 15 * 60 // 15-60 minutes for stopwatch

      const startTime = currentTime
      const endTime = addMinutes(startTime, Math.floor(duration / 60))

      // Assign to task/event/label randomly
      let assignment: any = {}
      const assignmentType = Math.floor(Math.random() * 4)

      switch (assignmentType) {
        case 0:
          if (tasks.length > 0) {
            assignment.taskId =
              tasks[Math.floor(Math.random() * tasks.length)].id
          }
          break
        case 1:
          if (events.length > 0) {
            assignment.eventId =
              events[Math.floor(Math.random() * events.length)].id
          }
          break
        case 2:
          const labels = [
            'Deep Work',
            'Reading',
            'Planning',
            'Research',
            'Writing',
            'Learning',
          ]
          assignment.label = labels[Math.floor(Math.random() * labels.length)]
          break
        default:
          assignment.label = 'Focus Session'
      }

      // 85% chance of being distraction-free
      const distractionFree = Math.random() > 0.15

      if (isPomodoro) {
        // Create pomodoro run
        const pomodoroRun = {
          id: `run_${i}_${j}`,
          userId: user.id,
          startedAt: startTime,
          endedAt: endTime,
          workMinutes: 25,
          shortBreakMinutes: 5,
          longBreakMinutes: 15,
          longBreakEvery: 4,
          autoStartNextPhase: false,
          autoStartNextWork: true,
          completedWorkCount: 1,
          distractionFreeDefault: distractionFree,
          ...assignment,
        }

        pomodoroRuns.push(pomodoroRun)

        // Create corresponding time entry
        timeEntries.push({
          id: `entry_${i}_${j}`,
          userId: user.id,
          start: startTime,
          end: endTime,
          duration,
          source: 'POMODORO',
          pomodoroRunId: pomodoroRun.id,
          pomodoroCycle: 1,
          distractionFree,
          ...assignment,
        })
      } else {
        // Create stopwatch entry
        timeEntries.push({
          id: `entry_${i}_${j}`,
          userId: user.id,
          start: startTime,
          end: endTime,
          duration,
          source: 'STOPWATCH',
          distractionFree,
          ...assignment,
        })
      }

      // Add break time between sessions
      currentTime = addMinutes(endTime, Math.floor(Math.random() * 60) + 30)
    }
  }

  // Insert pomodoro runs first
  for (const run of pomodoroRuns) {
    await prisma.pomodoroRun.upsert({
      where: { id: run.id },
      update: {},
      create: run,
    })
  }

  // Insert time entries
  for (const entry of timeEntries) {
    await prisma.timeEntry.upsert({
      where: { id: entry.id },
      update: {},
      create: entry,
    })
  }

  console.log(`✅ Created ${pomodoroRuns.length} pomodoro runs`)
  console.log(`✅ Created ${timeEntries.length} time entries`)
  console.log('✅ Time tracking seed data completed!')
}

// Run if called directly
if (require.main === module) {
  seedTimeTracking()
    .catch((e) => {
      console.error('❌ Error seeding time tracking data:', e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

export { seedTimeTracking }
