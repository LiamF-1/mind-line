import Link from 'next/link'

// Clean not-found page for Next.js 15 - no dynamic exports or force-dynamic
// Must be completely static to avoid clientReferenceManifest issues

export default function NotFound() {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto h-12 w-12">
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
                className="text-red-500"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">
              Page not found
            </h1>
            <p className="mt-4 text-gray-600">
              Sorry, we couldn&apos;t find the page you&apos;re looking for.
            </p>
            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Go back home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
