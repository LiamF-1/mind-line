'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  FileText,
  Clock,
  Settings,
  GitBranch,
  Plus,
} from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    current: false,
  },
  {
    name: 'Calendar',
    href: '/calendar',
    icon: Calendar,
    current: false,
  },
  {
    name: 'Tasks',
    href: '/tasks',
    icon: CheckSquare,
    current: false,
  },
  {
    name: 'Notes',
    href: '/notes',
    icon: FileText,
    current: false,
  },
  {
    name: 'Time Tracking',
    href: '/time-tracking',
    icon: Clock,
    current: false,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    current: false,
    comingSoon: true,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { data: boards } = trpc.board.list.useQuery()

  return (
    <div className="hidden md:flex md:w-64 md:flex-shrink-0 md:flex-col">
      <div className="flex flex-grow flex-col overflow-y-auto border-r border-gray-200 bg-white pt-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-shrink-0 items-center px-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            MindLine
          </h2>
        </div>
        <div className="mt-8 flex flex-grow flex-col">
          <nav className="flex-1 space-y-1 px-2 pb-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.comingSoon ? '#' : item.href}
                  className={cn(
                    'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white',
                    item.comingSoon && 'cursor-not-allowed opacity-50'
                  )}
                  onClick={
                    item.comingSoon ? (e) => e.preventDefault() : undefined
                  }
                >
                  <item.icon
                    className={cn(
                      'mr-3 h-5 w-5 flex-shrink-0',
                      isActive
                        ? 'text-blue-500 dark:text-blue-400'
                        : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300'
                    )}
                    aria-hidden="true"
                  />
                  <span className="flex-1">{item.name}</span>
                  {item.comingSoon && (
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      Soon
                    </span>
                  )}
                </Link>
              )
            })}

            {/* Workflow Boards Section */}
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between px-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Workflow Boards
                </h3>
                <Link href="/boards/new">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="space-y-1">
                {boards?.map((board: any) => {
                  const isBoardActive = pathname.startsWith(
                    `/boards/${board.id}`
                  )
                  return (
                    <Link
                      key={board.id}
                      href={`/boards/${board.id}`}
                      className={cn(
                        'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                        isBoardActive
                          ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                      )}
                    >
                      <GitBranch
                        className={cn(
                          'mr-3 h-4 w-4 flex-shrink-0',
                          isBoardActive
                            ? 'text-blue-500 dark:text-blue-400'
                            : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300'
                        )}
                        aria-hidden="true"
                      />
                      <span className="flex-1 truncate">{board.name}</span>
                      {board.deadline && (
                        <div
                          className="ml-2 h-2 w-2 rounded-full"
                          style={{ backgroundColor: board.theme || '#3b82f6' }}
                        />
                      )}
                    </Link>
                  )
                })}

                {(!boards || boards.length === 0) && (
                  <div className="px-2 py-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      No boards yet
                    </p>
                    <Link href="/boards/new">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Create your first board
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </nav>
        </div>
      </div>
    </div>
  )
}
