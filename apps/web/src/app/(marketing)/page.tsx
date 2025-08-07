import Link from 'next/link'

// Force dynamic rendering and disable static optimization completely
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// Simple button component to avoid any UI library issues
function SimpleButton({
  href,
  children,
  variant = 'primary',
}: {
  href: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
}) {
  const baseClasses =
    'inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
  const variantClasses =
    variant === 'primary'
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'

  return (
    <Link href={href} className={`${baseClasses} ${variantClasses}`}>
      {children}
    </Link>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-6xl font-bold tracking-tight text-slate-900 sm:text-7xl dark:text-slate-100">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Mindline
            </span>
          </h1>

          <p className="mt-6 text-xl leading-8 text-slate-600 dark:text-slate-300">
            Your intelligent productivity companion. Organize tasks, manage
            time, and capture ideas in one seamless workspace.
          </p>

          <div className="mt-10 flex items-center justify-center gap-x-6">
            <SimpleButton href="/register">Get Started</SimpleButton>
            <SimpleButton href="https://github.com" variant="secondary">
              View on GitHub
            </SimpleButton>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="rounded-lg bg-white/50 p-6 backdrop-blur dark:bg-slate-800/50">
              <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 p-3 dark:bg-blue-900">
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
              <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
                Task Management
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Organize and prioritize your work with intelligent task
                management.
              </p>
            </div>

            <div className="rounded-lg bg-white/50 p-6 backdrop-blur dark:bg-slate-800/50">
              <div className="mx-auto h-12 w-12 rounded-full bg-purple-100 p-3 dark:bg-purple-900">
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
              <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
                Time Tracking
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Schedule events and track time with integrated calendar
                functionality.
              </p>
            </div>

            <div className="rounded-lg bg-white/50 p-6 backdrop-blur dark:bg-slate-800/50">
              <div className="mx-auto h-12 w-12 rounded-full bg-green-100 p-3 dark:bg-green-900">
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
              <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
                Smart Notes
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Capture and organize your thoughts with powerful note-taking
                tools.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
