import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'
import { startOfDay, endOfDay } from 'date-fns'
// import { TimeSource } from '@prisma/client' // Temporarily commented out due to Prisma generation issue

export const timeRouter = createTRPCRouter({
  startTimer: protectedProcedure
    .input(
      z.object({
        label: z.string().optional(),
        taskId: z.string().optional(),
        eventId: z.string().optional(),
        distractionFree: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // For stopwatch mode - this just validates the session
      // The actual timer state is managed client-side
      return {
        success: true,
        startedAt: new Date(),
      }
    }),

  stopTimer: protectedProcedure
    .input(
      z.object({
        start: z.date(),
        end: z.date(),
        label: z.string().optional(),
        taskId: z.string().optional(),
        eventId: z.string().optional(),
        distractionFree: z.boolean().default(true),
        savePartial: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const duration = Math.floor(
        (input.end.getTime() - input.start.getTime()) / 1000
      )

      if (duration < 1) {
        throw new Error('Timer duration must be at least 1 second')
      }

      const timeEntry = await ctx.prisma.timeEntry.create({
        data: {
          userId: ctx.session.user.id,
          start: input.start,
          end: input.end,
          duration,
          label: input.label,
          taskId: input.taskId,
          eventId: input.eventId,
          distractionFree: input.distractionFree,
          source: 'STOPWATCH',
        },
        include: {
          task: true,
          event: true,
        },
      })

      return timeEntry
    }),

  listEntries: protectedProcedure
    .input(
      z.object({
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        limit: z.number().max(200).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        userId: ctx.session.user.id,
      }

      if (input.from || input.to) {
        where.start = {}
        if (input.from) where.start.gte = new Date(input.from)
        if (input.to) where.start.lte = new Date(input.to)
      }

      const entries = await ctx.prisma.timeEntry.findMany({
        where,
        orderBy: { start: 'desc' },
        take: input.limit,
        include: {
          task: true,
          event: true,
          pomodoroRun: true,
        },
      })

      return entries
    }),

  getStreak: protectedProcedure.query(async ({ ctx }) => {
    // Get current streak from view
    const streakResult = await ctx.prisma.$queryRaw<
      { current_streak: bigint }[]
    >`
      SELECT COALESCE(COUNT(*), 0) AS current_streak
      FROM (
        SELECT DISTINCT (start AT TIME ZONE 'UTC')::date AS day
        FROM mindline.time_entries
        WHERE user_id = ${ctx.session.user.id} AND distraction_free = TRUE
        ORDER BY day DESC
      ) AS days
      WHERE day >= CURRENT_DATE - INTERVAL '1000 days'
        AND NOT EXISTS (
          SELECT 1
          FROM generate_series(CURRENT_DATE - INTERVAL '1000 days', CURRENT_DATE, '1 day') AS d
          WHERE d::date > days.day
            AND d::date <= CURRENT_DATE
            AND NOT EXISTS (
              SELECT 1
              FROM mindline.time_entries te
              WHERE te.user_id = ${ctx.session.user.id}
                AND te.distraction_free = TRUE
                AND (te.start AT TIME ZONE 'UTC')::date = d::date
            )
        )
    `

    const currentStreak =
      streakResult.length > 0 ? Number(streakResult[0].current_streak) : 0

    // Get best streak (historical max)
    const bestStreakResult = await ctx.prisma.$queryRaw<
      { max_streak: bigint }[]
    >`
      WITH days AS (
        SELECT DISTINCT (start AT TIME ZONE 'UTC')::date AS day
        FROM mindline.time_entries
        WHERE user_id = ${ctx.session.user.id} AND distraction_free = TRUE
        ORDER BY day
      ),
      streaks AS (
        SELECT 
          day,
          day - ROW_NUMBER() OVER (ORDER BY day)::int AS streak_group
        FROM days
      ),
      streak_lengths AS (
        SELECT COUNT(*) AS streak_length
        FROM streaks
        GROUP BY streak_group
      )
      SELECT COALESCE(MAX(streak_length), 0) AS max_streak
      FROM streak_lengths
    `

    const bestStreak =
      bestStreakResult.length > 0 ? Number(bestStreakResult[0].max_streak) : 0

    // Get distraction target
    let distractionPreference =
      await ctx.prisma.distractionPreference.findUnique({
        where: { userId: ctx.session.user.id },
      })

    if (!distractionPreference) {
      distractionPreference = await ctx.prisma.distractionPreference.create({
        data: { userId: ctx.session.user.id },
      })
    }

    return {
      currentStreak,
      bestStreak,
      targetName: distractionPreference.targetName,
    }
  }),

  updateStreak: protectedProcedure
    .input(z.object({ targetName: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const preference = await ctx.prisma.distractionPreference.upsert({
        where: { userId: ctx.session.user.id },
        update: { targetName: input.targetName },
        create: {
          userId: ctx.session.user.id,
          targetName: input.targetName,
        },
      })

      return preference
    }),

  deleteEntry: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.prisma.timeEntry.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      })

      if (!entry) {
        throw new Error('Time entry not found')
      }

      await ctx.prisma.timeEntry.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  updateEntry: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        label: z.string().nullable().optional(),
        distractionFree: z.boolean().optional(),
        taskId: z.string().nullable().optional(),
        eventId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.prisma.timeEntry.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      })

      if (!entry) {
        throw new Error('Time entry not found')
      }

      const updated = await ctx.prisma.timeEntry.update({
        where: { id: input.id },
        data: {
          label: input.label,
          distractionFree: input.distractionFree,
          taskId: input.taskId,
          eventId: input.eventId,
        },
        include: {
          task: true,
          event: true,
        },
      })

      return updated
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

      // Get total minutes
      const totalResult = await ctx.prisma.$queryRaw<
        { total_minutes: number }[]
      >`
        SELECT COALESCE(SUM(duration), 0) / 60.0 AS total_minutes
        FROM mindline.time_entries
        WHERE user_id = ${ctx.session.user.id}
          AND start >= ${from}
          AND start <= ${to}
      `

      const totalMinutes = totalResult[0]?.total_minutes || 0

      // Get daily breakdown
      const dailyResult = await ctx.prisma.$queryRaw<
        {
          day: string
          total_minutes: number
          session_count: number
        }[]
      >`
        SELECT 
          (start AT TIME ZONE 'UTC')::date AS day,
          SUM(duration) / 60.0 AS total_minutes,
          COUNT(*) AS session_count
        FROM mindline.time_entries
        WHERE user_id = ${ctx.session.user.id}
          AND start >= ${from}
          AND start <= ${to}
        GROUP BY day
        ORDER BY day
      `

      return {
        totalMinutes,
        dailyBreakdown: dailyResult.map((row) => ({
          day: row.day,
          totalMinutes: Number(row.total_minutes),
          sessionCount: Number(row.session_count),
        })),
      }
    }),

  getTodayTotal: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date()
    const from = startOfDay(today)
    const to = endOfDay(today)

    const result = await ctx.prisma.$queryRaw<{ total_minutes: number }[]>`
      SELECT COALESCE(SUM(duration), 0) / 60.0 AS total_minutes
      FROM mindline.time_entries
      WHERE user_id = ${ctx.session.user.id}
        AND start >= ${from}
        AND start <= ${to}
    `

    return Number(result[0]?.total_minutes || 0)
  }),

  getPomodoroSummary: protectedProcedure
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

      // Get pomodoro stats
      const pomodoroResult = await ctx.prisma.$queryRaw<
        {
          total_pomodoros: number
          total_minutes: number
        }[]
      >`
        SELECT 
          COUNT(*) AS total_pomodoros,
          SUM(duration) / 60.0 AS total_minutes
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
        totalPomodoros: Number(pomodoroResult[0]?.total_pomodoros || 0),
        totalMinutes: Number(pomodoroResult[0]?.total_minutes || 0),
        todayPomodoros: Number(todayResult[0]?.today_pomodoros || 0),
        todayMinutes: Number(todayResult[0]?.today_minutes || 0),
      }
    }),

  // Timer-specific procedures
  saveTimerSession: protectedProcedure
    .input(
      z.object({
        start: z.date(),
        end: z.date(),
        duration: z.number(), // original timer duration in seconds
        label: z.string().optional(),
        taskId: z.string().optional(),
        eventId: z.string().optional(),
        distractionFree: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const actualDuration = Math.floor(
        (input.end.getTime() - input.start.getTime()) / 1000
      )

      if (actualDuration < 1) {
        throw new Error('Timer session duration must be at least 1 second')
      }

      const timeEntry = await ctx.prisma.timeEntry.create({
        data: {
          userId: ctx.session.user.id,
          start: input.start,
          end: input.end,
          duration: actualDuration,
          label: input.label,
          taskId: input.taskId,
          eventId: input.eventId,
          distractionFree: input.distractionFree,
          source: 'TIMER',
        },
        include: {
          task: {
            select: {
              id: true,
              title: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      })

      return {
        ...timeEntry,
        duration: actualDuration,
        originalDuration: input.duration,
      }
    }),

  getTimerStats: protectedProcedure
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

      // Get timer stats
      const timerResult = await ctx.prisma.$queryRaw<
        {
          total_sessions: number
          total_minutes: number
          avg_duration: number
        }[]
      >`
        SELECT 
          COUNT(*) AS total_sessions,
          SUM(duration) / 60.0 AS total_minutes,
          AVG(duration) / 60.0 AS avg_duration
        FROM mindline.time_entries
        WHERE user_id = ${ctx.session.user.id}
          AND source = 'TIMER'
          AND start >= ${from}
          AND start <= ${to}
      `

      const todayResult = await ctx.prisma.$queryRaw<
        {
          today_sessions: number
          today_minutes: number
        }[]
      >`
        SELECT 
          COUNT(*) AS today_sessions,
          SUM(duration) / 60.0 AS today_minutes
        FROM mindline.time_entries
        WHERE user_id = ${ctx.session.user.id}
          AND source = 'TIMER'
          AND start >= ${startOfDay(new Date())}
          AND start <= ${endOfDay(new Date())}
      `

      return {
        totalSessions: Number(timerResult[0]?.total_sessions || 0),
        totalMinutes: Number(timerResult[0]?.total_minutes || 0),
        avgDuration: Number(timerResult[0]?.avg_duration || 0),
        todaySessions: Number(todayResult[0]?.today_sessions || 0),
        todayMinutes: Number(todayResult[0]?.today_minutes || 0),
      }
    }),
})
