import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Toast } from '@heroui/react'
import { AppNavbar } from './_components/AppNavbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen flex flex-col">
      <AppNavbar user={{ name: session.user.name, email: session.user.email }} />
      <main className="flex-1">{children}</main>
      <Toast.Provider />
    </div>
  )
}
