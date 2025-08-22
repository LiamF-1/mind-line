import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'
// import { TimeSource } from '@prisma/client' // Temporarily commented out due to Prisma generation issue
import { startOfDay, endOfDay, subDays } from 'date-fns'

export const pomodoroRouter = createTRPCRouter({
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new Error('User session not found')
    }

    let preferences = await ctx.prisma.pomodoroPreference.findUnique({
      where: { userId: ctx.session.user.id },
    })

    if (!preferences) {
      preferences = await ctx.prisma.pomodoroPreference.create({
        data: {
          userId: ctx.session.user.id,
          // Add default values to ensure all fields are set
          workMinutes: 25,
          shortBreakMinutes: 5,
          longBreakMinutes: 15,
          longBreakEvery: 4,
          autoStartNextPhase: false,
          autoStartNextWork: false,
          soundEnabled: false,
          notificationsEnabled: false,
          defaultLabel: null,
          distractionFreeDefault: true,
        },
      })
    }

    return preferences
  }),

  updatePreferences: protectedProcedure
    .input(
      z.object({
        workMinutes: z.number().int().min(1).max(180).optional(),
        shortBreakMinutes: z.number().int().min(1).max(60).optional(),
        longBreakMinutes: z.number().int().min(1).max(60).optional(),
        longBreakEvery: z.number().int().min(2).max(12).optional(),
        autoStartNextPhase: z.boolean().optional(),
        autoStartNextWork: z.boolean().optional(),
        soundEnabled: z.boolean().optional(),
        notificationsEnabled: z.boolean().optional(),
        defaultLabel: z.string().max(60).nullable().optional(),
        distractionFreeDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new Error('User session not found')
      }

      const preferences = await ctx.prisma.pomodoroPreference.upsert({
        where: { userId: ctx.session.user.id },
        update: input,
        create: {
          userId: ctx.session.user.id,
          ...input,
        },
      })

      return preferences
    }),

  startRun: protectedProcedure
    .input(
      z.object({
        label: z.string().optional(),
        taskId: z.string().optional(),
        eventId: z.string().optional(),
        distractionFreeDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new Error('User session not found')
      }

      let preferences = await ctx.prisma.pomodoroPreference.findUnique({
        where: { userId: ctx.session.user.id },
      })

      if (!preferences) {
        // Create default preferences if they don't exist
        preferences = await ctx.prisma.pomodoroPreference.create({
          data: {
            userId: ctx.session.user.id,
            workMinutes: 25,
            shortBreakMinutes: 5,
            longBreakMinutes: 15,
            longBreakEvery: 4,
            autoStartNextPhase: false,
            autoStartNextWork: false,
            soundEnabled: false,
            notificationsEnabled: false,
            defaultLabel: null,
            distractionFreeDefault: true,
          },
        })
      }

      const run = await ctx.prisma.pomodoroRun.create({
        data: {
          userId: ctx.session.user.id,
          startedAt: new Date(),
          workMinutes: preferences.workMinutes,
          shortBreakMinutes: preferences.shortBreakMinutes,
          longBreakMinutes: preferences.longBreakMinutes,
          longBreakEvery: preferences.longBreakEvery,
          autoStartNextPhase: preferences.autoStartNextPhase,
          autoStartNextWork: preferences.autoStartNextWork,
          label: input.label || preferences.defaultLabel,
          taskId: input.taskId,
          eventId: input.eventId,
          distractionFreeDefault:
            input.distractionFreeDefault ?? preferences.distractionFreeDefault,
        },
      })

      return run
    }),

  pauseRun: protectedProcedure.mutation(async ({ ctx }) => {
    // Pausing is handled client-side for Pomodoro
    // This endpoint is for consistency but doesn't modify the database
    return { success: true }
  }),

  resumeRun: protectedProcedure.mutation(async ({ ctx }) => {
    // Resuming is handled client-side for Pomodoro
    // This endpoint is for consistency but doesn't modify the database
    return { success: true }
  }),

  skipPhase: protectedProcedure.mutation(async ({ ctx }) => {
    // Phase skipping is handled client-side
    // This endpoint is for consistency but doesn't modify the database
    return { success: true }
  }),

  cancelRun: protectedProcedure
    .input(
      z.object({
        runId: z.string(),
        logPartialWork: z.boolean().default(false),
        partialWorkStart: z.date().optional(),
        partialWorkEnd: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const run = await ctx.prisma.pomodoroRun.findFirst({
        where: {
          id: input.runId,
          userId: ctx.session.user.id,
        },
      })

      if (!run) {
        throw new Error('Pomodoro run not found')
      }

      // Mark run as ended
      await ctx.prisma.pomodoroRun.update({
        where: { id: input.runId },
        data: { endedAt: new Date() },
      })

      // If logging partial work, create a time entry
      if (
        input.logPartialWork &&
        input.partialWorkStart &&
        input.partialWorkEnd
      ) {
        const duration = Math.floor(
          (input.partialWorkEnd.getTime() - input.partialWorkStart.getTime()) /
            1000
        )

        if (duration > 0) {
          await ctx.prisma.timeEntry.create({
            data: {
              userId: ctx.session.user.id,
              start: input.partialWorkStart,
              end: input.partialWorkEnd,
              duration,
              label: run.label,
              taskId: run.taskId,
              eventId: run.eventId,
              distractionFree: run.distractionFreeDefault,
              source: 'POMODORO',
              pomodoroRunId: run.id,
              pomodoroCycle: run.completedWorkCount + 1,
            },
          })
        }
      }

      return { success: true }
    }),

  completePhase: protectedProcedure
    .input(
      z.object({
        runId: z.string(),
        phaseType: z.enum(['work', 'shortBreak', 'longBreak']),
        phaseStart: z.date(),
        phaseEnd: z.date(),
        cycle: z.number().int().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const run = await ctx.prisma.pomodoroRun.findFirst({
        where: {
          id: input.runId,
          userId: ctx.session.user.id,
        },
      })

      if (!run) {
        throw new Error('Pomodoro run not found')
      }

      // Only create time entries for work phases
      if (input.phaseType === 'work') {
        const duration = Math.floor(
          (input.phaseEnd.getTime() - input.phaseStart.getTime()) / 1000
        )

        if (duration > 0) {
          await ctx.prisma.timeEntry.create({
            data: {
              userId: ctx.session.user.id,
              start: input.phaseStart,
              end: input.phaseEnd,
              duration,
              label: run.label,
              taskId: run.taskId,
              eventId: run.eventId,
              distractionFree: run.distractionFreeDefault,
              source: 'POMODORO',
              pomodoroRunId: run.id,
              pomodoroCycle: input.cycle,
            },
          })

          // Update completed work count
          await ctx.prisma.pomodoroRun.update({
            where: { id: input.runId },
            data: { completedWorkCount: input.cycle },
          })
        }
      }

      return { success: true }
    }),

  getActiveState: protectedProcedure.query(async ({ ctx }) => {
    // Find any active pomodoro run (not ended)
    const activeRun = await ctx.prisma.pomodoroRun.findFirst({
      where: {
        userId: ctx.session.user.id,
        endedAt: null,
      },
      orderBy: { startedAt: 'desc' },
      include: {
        task: true,
        event: true,
      },
    })

    return activeRun
  }),

  endRun: protectedProcedure
    .input(z.object({ runId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const run = await ctx.prisma.pomodoroRun.findFirst({
        where: {
          id: input.runId,
          userId: ctx.session.user.id,
        },
      })

      if (!run) {
        throw new Error('Pomodoro run not found')
      }

      await ctx.prisma.pomodoroRun.update({
        where: { id: input.runId },
        data: { endedAt: new Date() },
      })

      return { success: true }
    }),

  getSummary: protectedProcedure
    .input(
      z.object({
        range: z.object({
          from: z.string(),
          to: z.string(),
        }),
      })
    )
    .query(async ({ ctx, input }) => {
      const from = new Date(input.range.from)
      const to = new Date(input.range.to)

      // Get pomodoro completion stats
      const result = await ctx.prisma.$queryRaw<
        {
          total_pomodoros: number
          total_minutes: number
          completed_runs: number
        }[]
      >`
        SELECT 
          COUNT(*) AS total_pomodoros,
          SUM(duration) / 60.0 AS total_minutes,
          COUNT(DISTINCT pomodoro_run_id) AS completed_runs
        FROM mindline.time_entries
        WHERE user_id = ${ctx.session.user.id}
          AND source = 'POMODORO'
          AND start >= ${from}
          AND start <= ${to}
      `

      const todayResult = await ctx.prisma.$queryRaw<
        {
          today_pomodoros: number
          today_minutes: number
        }[]
      >`
        SELECT 
          COUNT(*) AS today_pomodoros,
          SUM(duration) / 60.0 AS today_minutes
        FROM mindline.time_entries
        WHERE user_id = ${ctx.session.user.id}
          AND source = 'POMODORO'
          AND start >= ${startOfDay(new Date())}
          AND start <= ${endOfDay(new Date())}
      `

      return {
        totalPomodoros: Number(result[0]?.total_pomodoros || 0),
        totalMinutes: Number(result[0]?.total_minutes || 0),
        completedRuns: Number(result[0]?.completed_runs || 0),
        todayPomodoros: Number(todayResult[0]?.today_pomodoros || 0),
        todayMinutes: Number(todayResult[0]?.today_minutes || 0),
      }
    }),
})
