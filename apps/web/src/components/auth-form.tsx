'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>
type RegisterFormData = z.infer<typeof registerSchema>

interface AuthFormProps {
  mode: 'login' | 'register'
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isLogin = mode === 'login'
  const schema = isLogin ? loginSchema : registerSchema

  const form = useForm<LoginFormData | RegisterFormData>({
    resolver: zodResolver(schema),
    defaultValues: isLogin
      ? { email: '', password: '' }
      : { name: '', email: '', password: '' },
  })

  async function onSubmit(data: LoginFormData | RegisterFormData) {
    setIsLoading(true)
    setError(null)

    try {
      if (isLogin) {
        const result = await signIn('credentials', {
          email: data.email,
          password: data.password,
          redirect: false,
        })

        if (result?.error) {
          setError('Invalid email or password')
        } else if (result?.ok) {
          router.push('/dashboard')
          router.refresh()
        }
      } else {
        // Register
        const registerData = data as RegisterFormData
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registerData),
        })

        if (response.ok) {
          // Auto-login after successful registration
          const signInResult = await signIn('credentials', {
            email: registerData.email,
            password: registerData.password,
            redirect: false,
          })

          if (signInResult?.ok) {
            router.push('/dashboard')
            router.refresh()
          } else {
            router.push('/login')
          }
        } else {
          const errorData = await response.json()
          setError(errorData.error || 'Registration failed')
        }
      }
    } catch (error) {
      setError('An unexpected error occurred')
      console.error('Auth error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-center text-2xl">
          {isLogin ? 'Welcome back' : 'Create account'}
        </CardTitle>
        <CardDescription className="text-center">
          {isLogin
            ? 'Enter your credentials to access your account'
            : 'Enter your information to create your account'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isLogin && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={isLogin ? 'Password' : 'Min. 6 characters'}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="bg-destructive/15 text-destructive rounded-md p-3 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? 'Loading...'
                : isLogin
                  ? 'Sign In'
                  : 'Create Account'}
            </Button>
          </form>
        </Form>

        <div className="mt-4 text-center text-sm">
          {isLogin ? (
            <>
              Don&apos;t have an account?{' '}
              <Button variant="link" className="h-auto p-0" asChild>
                <a href="/register">Sign up</a>
              </Button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Button variant="link" className="h-auto p-0" asChild>
                <a href="/login">Sign in</a>
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
