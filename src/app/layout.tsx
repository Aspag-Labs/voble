import type { Metadata } from 'next'
import './globals.css'
import React from 'react'
import Providers from '@/providers/providers'
import { AppLayout } from '@/components/app-layout'

const links: { label: string; path: string }[] = [
  { label: 'Play', path: '/' },
  { label: 'Profile', path: '/profile' },
  { label: 'Leaderboard', path: '/leaderboard' },
]

export const metadata: Metadata = {
  title: 'Voble',
  description: 'The Word Game That Pays',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark overflow-x-hidden">
      <body className="antialiased min-h-screen bg-[#0a0a0a] overflow-x-hidden">
        <Providers>
          <AppLayout links={links}>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  )
}

declare global {
  interface BigInt {
    toJSON(): string
  }
}

BigInt.prototype.toJSON = function () {
  return this.toString()
}
