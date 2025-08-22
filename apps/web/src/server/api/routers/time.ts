import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'
import { startOfDay, endOfDay } from 'date-fns'
import { TimeSource, Prisma } from '@prisma/client'

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
          source: TimeSource.STOPWATCH,
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
      const where: Prisma.TimeEntryWhereInput = {
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
    // Get current streak from view (using parameterized query)
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

    // Get best streak (historical max) (using parameterized query)
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

      // Get total minutes using Prisma aggregate
      const totalAggregate = await ctx.prisma.timeEntry.aggregate({
        _sum: { duration: true },
        where: {
          userId: ctx.session.user.id,
          start: {
            gte: from,
            lte: to,
          },
        },
      })
      const totalMinutes = (totalAggregate._sum.duration ?? 0) / 60.0

      // Get all entries for daily breakdown
      const entries = await ctx.prisma.timeEntry.findMany({
        where: {
          userId: ctx.session.user.id,
          start: {
            gte: from,
            lte: to,
          },
        },
        select: {
          start: true,
          duration: true,
        },
        orderBy: { start: 'asc' },
      })

      // Group by day (UTC) and aggregate
      const dailyMap = new Map<
        string,
        { total_minutes: number; session_count: number }
      >()
      entries.forEach((entry: { start: Date; duration: number }) => {
        // Convert start to UTC date string (YYYY-MM-DD)
        const day = entry.start.toISOString().slice(0, 10)
        if (!dailyMap.has(day)) {
          dailyMap.set(day, { total_minutes: 0, session_count: 0 })
        }
        const current = dailyMap.get(day)!
        current.total_minutes += entry.duration / 60.0
        current.session_count += 1
      })

      return {
        totalMinutes,
        dailyBreakdown: Array.from(dailyMap.entries())
          .map(([day, data]) => ({
            day,
            totalMinutes: Number(data.total_minutes),
            sessionCount: Number(data.session_count),
          }))
          .sort((a, b) => a.day.localeCompare(b.day)),
      }
    }),

  getTodayTotal: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date()
    const from = startOfDay(today)
    const to = endOfDay(today)

    const result = await ctx.prisma.timeEntry.aggregate({
      _sum: { duration: true },
      where: {
        userId: ctx.session.user.id,
        start: {
          gte: from,
          lte: to,
        },
      },
    })

    return (result._sum.duration ?? 0) / 60.0
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

      // Get pomodoro stats using Prisma aggregate
      const pomodoroResult = await ctx.prisma.timeEntry.aggregate({
        _count: { id: true },
        _sum: { duration: true },
        where: {
          userId: ctx.session.user.id,
          source: TimeSource.POMODORO,
          start: {
            gte: from,
            lte: to,
          },
        },
      })

      const todayResult = await ctx.prisma.timeEntry.aggregate({
        _count: { id: true },
        _sum: { duration: true },
        where: {
          userId: ctx.session.user.id,
          source: TimeSource.POMODORO,
          start: {
            gte: startOfDay(new Date()),
            lte: endOfDay(new Date()),
          },
        },
      })

      return {
        totalPomodoros: pomodoroResult._count.id,
        totalMinutes: (pomodoroResult._sum.duration ?? 0) / 60.0,
        todayPomodoros: todayResult._count.id,
        todayMinutes: (todayResult._sum.duration ?? 0) / 60.0,
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
          source: TimeSource.TIMER,
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

      // Get timer stats using Prisma aggregate
      const timerResult = await ctx.prisma.timeEntry.aggregate({
        _count: { id: true },
        _sum: { duration: true },
        _avg: { duration: true },
        where: {
          userId: ctx.session.user.id,
          source: TimeSource.TIMER,
          start: {
            gte: from,
            lte: to,
          },
        },
      })

      const todayResult = await ctx.prisma.timeEntry.aggregate({
        _count: { id: true },
        _sum: { duration: true },
        where: {
          userId: ctx.session.user.id,
          source: TimeSource.TIMER,
          start: {
            gte: startOfDay(new Date()),
            lte: endOfDay(new Date()),
          },
        },
      })

      return {
        totalSessions: timerResult._count.id,
        totalMinutes: (timerResult._sum.duration ?? 0) / 60.0,
        avgDuration: (timerResult._avg.duration ?? 0) / 60.0,
        todaySessions: todayResult._count.id,
        todayMinutes: (todayResult._sum.duration ?? 0) / 60.0,
      }
    }),
})
