import { createTRPCRouter } from '@/server/api/trpc'
import { taskRouter } from './routers/task'
import { eventRouter } from './routers/event'
import { noteRouter } from './routers/note'
import { userRouter } from './routers/user'
import { authRouter } from './routers/auth'

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  task: taskRouter,
  event: eventRouter,
  note: noteRouter,
  user: userRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter
