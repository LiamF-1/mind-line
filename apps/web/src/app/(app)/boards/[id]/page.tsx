'use client'

import { use } from 'react'
import { notFound } from 'next/navigation'
import { WorkflowBoard } from '@/components/workflow/workflow-board'

interface BoardPageProps {
  params: Promise<{ id: string }>
}

export default function BoardPage({ params }: BoardPageProps) {
  const resolvedParams = use(params)
  const boardId = resolvedParams.id

  if (!boardId) {
    notFound()
  }

  return <WorkflowBoard boardId={boardId} />
}
