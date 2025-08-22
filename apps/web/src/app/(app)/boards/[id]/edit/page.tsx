'use client'

import React, { use } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Calendar, Palette, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'
import { toast } from 'sonner'
import Link from 'next/link'

const boardSchema = z.object({
  name: z
    .string()
    .min(1, 'Board name is required')
    .max(100, 'Name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  deadline: z.string().optional(),
  theme: z.string().optional(),
})

type BoardForm = z.infer<typeof boardSchema>

const themeColors = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Orange', value: '#f59e0b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Teal', value: '#14b8a6' },
]

interface EditBoardPageProps {
  params: Promise<{ id: string }>
}

export default function EditBoardPage({ params }: EditBoardPageProps) {
  const resolvedParams = use(params)
  const boardId = resolvedParams.id
  const router = useRouter()
  const [selectedTheme, setSelectedTheme] = useState('#3b82f6')

  const { data: board, isLoading: boardLoading } = trpc.board.getById.useQuery({
    id: boardId,
  })
  const updateMutation = trpc.board.update.useMutation()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<BoardForm>({
    resolver: zodResolver(boardSchema),
    defaultValues: {
      theme: '#3b82f6',
    },
  })

  // Update form when board data loads
  React.useEffect(() => {
    if (board) {
      reset({
        name: board.name,
        description: board.description || '',
        deadline: board.deadline
          ? new Date(board.deadline).toISOString().split('T')[0]
          : '',
        theme: board.theme || '#3b82f6',
      })
      setSelectedTheme(board.theme || '#3b82f6')
    }
  }, [board, reset])

  const onSubmit = async (data: BoardForm) => {
    try {
      await updateMutation.mutateAsync({
        id: boardId,
        data: {
          name: data.name,
          description: data.description || undefined,
          deadline: data.deadline ? new Date(data.deadline) : undefined,
          theme: selectedTheme,
        },
      })

      // Board updated successfully
      router.push(`/boards/${boardId}`)
    } catch (error) {
      toast.error('Failed to update board')
      console.error(error)
    }
  }

  const handleThemeChange = (color: string) => {
    setSelectedTheme(color)
    setValue('theme', color)
  }

  if (boardLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading board...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="py-12 text-center">
            <p className="text-gray-600">Board not found</p>
            <Link href="/boards">
              <Button className="mt-4">Back to Boards</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/boards/${boardId}`}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Board
            </Button>
          </Link>

          <h1 className="text-3xl font-bold text-gray-900">
            Edit Workflow Board
          </h1>
          <p className="mt-2 text-gray-600">
            Update your board settings and preferences.
          </p>
        </div>

        {/* Form */}
        <Card className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Board Name */}
            <div>
              <Label htmlFor="name" className="text-base font-medium">
                Board Name *
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., Launch Website, Master's Thesis, Wedding Planning"
                className="mt-2"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-base font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Brief description of what this workflow board is for..."
                className="mt-2"
                rows={3}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Deadline */}
            <div>
              <Label htmlFor="deadline" className="text-base font-medium">
                Overall Deadline
              </Label>
              <div className="relative mt-2">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <Input
                  id="deadline"
                  type="date"
                  {...register('deadline')}
                  className="pl-10"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Optional: Set a target completion date for this entire workflow
              </p>
            </div>

            {/* Theme Color */}
            <div>
              <Label className="flex items-center gap-2 text-base font-medium">
                <Palette className="h-4 w-4" />
                Theme Color
              </Label>
              <div className="mt-3 flex flex-wrap gap-3">
                {themeColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => handleThemeChange(color.value)}
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      selectedTheme === color.value
                        ? 'scale-110 border-gray-900'
                        : 'border-gray-300 hover:border-gray-500'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                This color will be used for the board&apos;s visual theme and
                indicators
              </p>
            </div>

            {/* Preview */}
            <div className="rounded-lg border bg-gray-50 p-4">
              <h4 className="mb-3 text-sm font-medium text-gray-700">
                Preview
              </h4>
              <div className="flex items-center gap-3">
                <div
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: selectedTheme }}
                />
                <div>
                  <h5 className="font-medium text-gray-900">
                    {watch('name') || board.name}
                  </h5>
                  {watch('description') && (
                    <p className="mt-0.5 text-sm text-gray-600">
                      {watch('description')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-gray-200 pt-6">
              <Link href={`/boards/${boardId}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
