'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import {
  Alert,
  Button,
  Card,
  FieldError,
  Input,
  Label,
  Link,
  Separator,
  Spinner,
  TextField,
} from '@heroui/react'

type FieldErrors = Partial<Record<'name' | 'email' | 'password' | 'confirmPassword', string[]>>

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    setLoading(true)

    let res: Response
    try {
      res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      })
    } catch {
      setError('Network error. Please check your connection and try again.')
      setLoading(false)
      return
    }

    if (res.status === 422) {
      const data = await res.json()
      setFieldErrors(data.fields ?? {})
      setLoading(false)
      return
    }

    if (res.status === 409) {
      setFieldErrors({ email: ['An account with this email already exists.'] })
      setLoading(false)
      return
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Unable to create account. Please try again.')
      setLoading(false)
      return
    }

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Account created but sign-in failed. Please sign in manually.')
    } else {
      router.push('/')
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <Card variant="default" className="w-full max-w-sm">
        <Card.Header className="flex flex-col gap-1 px-6 pt-6 pb-2">
          <Card.Title>Create an account</Card.Title>
          <Card.Description>Start tracking your expenses today</Card.Description>
        </Card.Header>

        <Card.Content className="px-6 py-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>{error}</Alert.Title>
                </Alert.Content>
              </Alert>
            )}

            <TextField
              isRequired
              value={name}
              onChange={setName}
              type="text"
              autoComplete="name"
              isInvalid={!!fieldErrors.name?.length}
              fullWidth
            >
              <Label>Full name</Label>
              <Input placeholder="Jane Doe" />
              {fieldErrors.name?.[0] && <FieldError>{fieldErrors.name[0]}</FieldError>}
            </TextField>

            <TextField
              isRequired
              value={email}
              onChange={setEmail}
              type="email"
              autoComplete="email"
              isInvalid={!!fieldErrors.email?.length}
              fullWidth
            >
              <Label>Email</Label>
              <Input placeholder="you@example.com" />
              {fieldErrors.email?.[0] && <FieldError>{fieldErrors.email[0]}</FieldError>}
            </TextField>

            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">
                Password <span aria-hidden="true" className="text-red-500">*</span>
              </span>
              <div className="relative">
                <TextField
                  isRequired
                  value={password}
                  onChange={setPassword}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  aria-label="Password"
                  isInvalid={!!fieldErrors.password?.length}
                  fullWidth
                >
                  <Input placeholder="Min. 8 characters" className="pr-10" />
                  {fieldErrors.password?.[0] && (
                    <FieldError>{fieldErrors.password[0]}</FieldError>
                  )}
                </TextField>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">
                Confirm password <span aria-hidden="true" className="text-red-500">*</span>
              </span>
              <div className="relative">
                <TextField
                  isRequired
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  aria-label="Confirm password"
                  isInvalid={!!fieldErrors.confirmPassword?.length}
                  fullWidth
                >
                  <Input placeholder="Repeat your password" className="pr-10" />
                  {fieldErrors.confirmPassword?.[0] && (
                    <FieldError>{fieldErrors.confirmPassword[0]}</FieldError>
                  )}
                </TextField>
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isDisabled={loading}
            >
              {loading ? <Spinner size="sm" className="mr-2" /> : null}
              Create account
            </Button>

            <div className="flex items-center gap-2">
              <Separator className="flex-1" />
              <span className="text-xs text-gray-400">or</span>
              <Separator className="flex-1" />
            </div>

            <Button variant="outline" fullWidth isDisabled>
              <GoogleIcon />
              Continue with Google
            </Button>
          </form>
        </Card.Content>

        <Card.Footer className="justify-center px-6 pb-6">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="font-medium">
              Sign in
            </Link>
          </p>
        </Card.Footer>
      </Card>
    </div>
  )
}

function EyeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}
