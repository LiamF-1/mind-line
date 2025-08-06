'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export function Header() {
  const { data: session, status } = useSession()

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link className="mr-6 flex items-center space-x-2" href="/">
            <span className="hidden font-bold sm:inline-block">Mindline</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Link
              className="mr-6 flex items-center space-x-2 md:hidden"
              href="/"
            >
              <span className="font-bold">Mindline</span>
            </Link>
          </div>

          <nav className="flex items-center space-x-2">
            {status === 'loading' ? (
              <div className="bg-muted h-9 w-16 animate-pulse rounded-md" />
            ) : session ? (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => signOut({ callbackUrl: '/' })}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Register</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
