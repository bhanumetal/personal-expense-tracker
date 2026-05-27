'use client'

import NextLink from 'next/link'
import { signOut } from 'next-auth/react'
import { Avatar, Button, Drawer, Dropdown, Header } from '@heroui/react'
import { useOverlayState } from '@heroui/react'

type User = {
  name?: string | null
  email?: string | null
}

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/categories', label: 'Categories' },
  { href: '/reports', label: 'Reports' },
  { href: '/settings', label: 'Settings' },
]

function getInitials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function AppNavbar({ user }: { user: User }) {
  const drawerState = useOverlayState()
  const initials = getInitials(user.name)

  function handleSignOut() {
    signOut({ callbackUrl: '/login' })
  }

  return (
    <Header className="sticky top-0 z-50 flex items-center justify-between h-16 px-4 md:px-6 border-b bg-background">
      {/* Brand */}
      <NextLink
        href="/"
        className="flex items-center gap-2 font-semibold text-foreground"
      >
        <WalletIcon />
        <span>Spendly</span>
      </NextLink>

      {/* Desktop nav links */}
      <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
        {NAV_LINKS.map((link) => (
          <NextLink
            key={link.href}
            href={link.href}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted"
          >
            {link.label}
          </NextLink>
        ))}
      </nav>

      {/* Right section */}
      <div className="flex items-center gap-1">
        {/* Avatar + dropdown */}
        <Dropdown.Root>
          <Dropdown.Trigger
            aria-label="Open user menu"
            className="inline-flex items-center justify-center rounded-full w-8 h-8 bg-transparent hover:bg-muted focus-visible:outline-none transition-colors"
          >
            <Avatar.Root size="sm" color="accent">
              <Avatar.Fallback>{initials}</Avatar.Fallback>
            </Avatar.Root>
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom end">
            <div className="min-w-52 px-3 py-2.5 border-b">
              <p className="text-sm font-semibold truncate">{user.name ?? 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email ?? ''}</p>
            </div>
            <Dropdown.Menu aria-label="User actions" className="py-1">
              <Dropdown.Item onPress={handleSignOut} variant="danger">
                Sign out
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown.Root>

        {/* Mobile hamburger */}
        <Drawer.Root state={drawerState}>
          <Drawer.Trigger
            aria-label="Open navigation menu"
            className="flex md:hidden items-center justify-center rounded-md p-2 bg-transparent hover:bg-muted focus-visible:outline-none transition-colors"
          >
            <HamburgerIcon />
          </Drawer.Trigger>
          <Drawer.Content placement="left" className="w-64 max-w-[80vw]">
            <Drawer.Dialog>
              <Drawer.Header className="flex items-center justify-between border-b">
                <Drawer.Heading>Spendly</Drawer.Heading>
                <Drawer.CloseTrigger />
              </Drawer.Header>
              <Drawer.Body className="px-2 py-3">
                <nav className="flex flex-col gap-0.5" aria-label="Mobile navigation">
                  {NAV_LINKS.map((link) => (
                    <NextLink
                      key={link.href}
                      href={link.href}
                      onClick={drawerState.close}
                      className="text-sm font-medium px-3 py-2 rounded-md text-foreground hover:bg-muted transition-colors"
                    >
                      {link.label}
                    </NextLink>
                  ))}
                </nav>
              </Drawer.Body>
              <Drawer.Footer className="flex flex-col gap-3 border-t">
                <div className="flex items-center gap-3">
                  <Avatar.Root size="sm" color="accent">
                    <Avatar.Fallback>{initials}</Avatar.Fallback>
                  </Avatar.Root>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{user.name ?? 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email ?? ''}
                    </p>
                  </div>
                </div>
                <Button variant="outline" fullWidth onPress={handleSignOut}>
                  Sign out
                </Button>
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Root>
      </div>
    </Header>
  )
}

function WalletIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  )
}

function HamburgerIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  )
}
