-- CreateEnum
CREATE TYPE "mindline"."TimeSource" AS ENUM ('STOPWATCH', 'POMODORO');

-- CreateTable
CREATE TABLE "mindline"."time_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "label" TEXT,
    "distraction_free" BOOLEAN NOT NULL DEFAULT true,
    "task_id" TEXT,
    "event_id" TEXT,
    "source" "mindline"."TimeSource" NOT NULL DEFAULT 'STOPWATCH',
    "pomodoro_run_id" TEXT,
    "pomodoro_cycle" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mindline"."pomodoro_runs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "work_minutes" INTEGER NOT NULL,
    "short_break_minutes" INTEGER NOT NULL,
    "long_break_minutes" INTEGER NOT NULL,
    "long_break_every" INTEGER NOT NULL,
    "auto_start_next_phase" BOOLEAN NOT NULL DEFAULT false,
    "auto_start_next_work" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT,
    "task_id" TEXT,
    "event_id" TEXT,
    "distraction_free_default" BOOLEAN NOT NULL DEFAULT true,
    "completed_work_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pomodoro_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mindline"."pomodoro_preferences" (
    "user_id" TEXT NOT NULL,
    "work_minutes" INTEGER NOT NULL DEFAULT 25,
    "short_break_minutes" INTEGER NOT NULL DEFAULT 5,
    "long_break_minutes" INTEGER NOT NULL DEFAULT 15,
    "long_break_every" INTEGER NOT NULL DEFAULT 4,
    "auto_start_next_phase" BOOLEAN NOT NULL DEFAULT false,
    "auto_start_next_work" BOOLEAN NOT NULL DEFAULT true,
    "sound_enabled" BOOLEAN NOT NULL DEFAULT false,
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT false,
    "default_label" TEXT,
    "distraction_free_default" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pomodoro_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "mindline"."distraction_preferences" (
    "user_id" TEXT NOT NULL,
    "target_name" TEXT NOT NULL DEFAULT 'Instagram',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distraction_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "time_entries_user_id_start_idx" ON "mindline"."time_entries"("user_id", "start");

-- CreateIndex
CREATE INDEX "time_entries_user_id_source_idx" ON "mindline"."time_entries"("user_id", "source");

-- CreateIndex
CREATE INDEX "time_entries_user_id_pomodoro_run_id_idx" ON "mindline"."time_entries"("user_id", "pomodoro_run_id");

-- CreateIndex
CREATE INDEX "pomodoro_runs_user_id_started_at_idx" ON "mindline"."pomodoro_runs"("user_id", "started_at");

-- AddForeignKey
ALTER TABLE "mindline"."time_entries" ADD CONSTRAINT "time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "mindline"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mindline"."time_entries" ADD CONSTRAINT "time_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "mindline"."tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mindline"."time_entries" ADD CONSTRAINT "time_entries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "mindline"."calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mindline"."time_entries" ADD CONSTRAINT "time_entries_pomodoro_run_id_fkey" FOREIGN KEY ("pomodoro_run_id") REFERENCES "mindline"."pomodoro_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mindline"."pomodoro_runs" ADD CONSTRAINT "pomodoro_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "mindline"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mindline"."pomodoro_runs" ADD CONSTRAINT "pomodoro_runs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "mindline"."tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mindline"."pomodoro_runs" ADD CONSTRAINT "pomodoro_runs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "mindline"."calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mindline"."pomodoro_preferences" ADD CONSTRAINT "pomodoro_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "mindline"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mindline"."distraction_preferences" ADD CONSTRAINT "distraction_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "mindline"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
