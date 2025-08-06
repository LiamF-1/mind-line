import Link from 'next/link'

// Prevent Next.js 15 prerendering issues
export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="mb-8 text-6xl font-bold text-gray-900 dark:text-white">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              MindLine
            </span>
          </h1>

          <p className="mx-auto mb-12 max-w-3xl text-xl text-gray-600 dark:text-gray-300">
            A modern, scalable productivity suite built with Next.js 15, tRPC,
            and PostgreSQL. Ready for production with authentication, real-time
            features, and modern DevOps practices.
          </p>

          <div className="mx-auto mb-12 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                <svg
                  className="h-6 w-6 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                Task Management
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Organize your work with powerful task management features,
                priorities, and due dates.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                <svg
                  className="h-6 w-6 text-purple-600 dark:text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                Calendar Events
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Schedule and manage your time with integrated calendar
                functionality and event tracking.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                <svg
                  className="h-6 w-6 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                Smart Notes
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Capture ideas with rich text notes, tagging, and powerful search
                capabilities.
              </p>
            </div>
          </div>

          <div className="space-y-4 sm:flex sm:justify-center sm:space-y-0 sm:space-x-4">
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-blue-600 px-8 py-3 text-base font-medium text-white transition-colors duration-200 hover:bg-blue-700 sm:w-auto"
            >
              Get Started
            </Link>
            <Link
              href="/docs"
              className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-8 py-3 text-base font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50 sm:w-auto dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              View Documentation
            </Link>
          </div>

          <div className="mt-16 border-t border-gray-200 pt-16 dark:border-gray-700">
            <h2 className="mb-8 text-2xl font-bold text-gray-900 dark:text-white">
              Built with Modern Technologies
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
              <span className="text-lg font-semibold">Next.js 15</span>
              <span className="text-lg font-semibold">React 19</span>
              <span className="text-lg font-semibold">TypeScript</span>
              <span className="text-lg font-semibold">tRPC</span>
              <span className="text-lg font-semibold">Prisma</span>
              <span className="text-lg font-semibold">PostgreSQL</span>
              <span className="text-lg font-semibold">Tailwind CSS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
