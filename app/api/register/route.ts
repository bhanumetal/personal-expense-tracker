import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { registerSchema } from '@/lib/schemas/auth'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const result = registerSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: result.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { name, email, password } = result.data

  try {
    await connectDB()

    const existing = await User.findOne({ email })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 },
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await User.create({ name, email, passwordHash })

    return NextResponse.json({ message: 'Account created' }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Unable to create account. Please try again.' },
      { status: 500 },
    )
  }
}
