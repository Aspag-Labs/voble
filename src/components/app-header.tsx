'use client'

import { PrivyLoginButton } from '@/components/privy-login-button'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { BarChart3, Info, Dices } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export function AppHeader({ links = [] }: { links: { label: string; path: string }[] }) {
  const pathname = usePathname()

  function isActive(path: string) {
    return path === '/' ? pathname === '/' : pathname.startsWith(path)
  }

  return (
    <header
      className="relative z-50 px-4 py-3 md:py-4 border-b border-slate-800"
      style={{ backgroundColor: '#0e0e0e' }}
    >
      <div className="mx-auto flex justify-between items-center">
        <div className="flex items-center gap-8">
          {/* Logo - Left */}
          <Link className="flex items-center gap-3 hover:opacity-80 transition-opacity" href="/">
            <div className="flex items-center gap-2">
              <Image
                src="/images/logo.png"
                alt="Voble Logo"
                width={64}
                height={64}
                className="h-14 w-14 md:h-16 md:w-16 rounded-full object-contain"
                priority
              />
              <span className="text-xs font-semibold text-gray-400 leading-none">BETA</span>
            </div>
          </Link>

          {/* Menu - Left (Desktop) */}
          <div className="hidden md:block">
            <ul className="flex gap-6 flex-nowrap items-center">
              {links.map(({ label, path }) => (
                <li key={path}>
                  <Link
                    className={`text-white hover:text-gray-300 transition-colors ${isActive(path) ? 'text-gray-300' : ''}`}
                    href={path}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Stats & Auth - Right */}
        <div className="flex items-center gap-3">
          {/* About Icon (Desktop) */}
          <Link
            href="/about"
            className="hidden md:block p-2 rounded-lg hover:bg-slate-800 transition-colors group relative"
          >
            <Info className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              About
            </div>
          </Link>

          {/* Raffle Icon (Desktop) */}
          <Link
            href="/raffle"
            className="hidden md:block p-2 rounded-lg hover:bg-slate-800 transition-colors group relative"
          >
            <Dices className="h-5 w-5 text-amber-400 hover:text-amber-300 transition-colors" />
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              Raffle
            </div>
          </Link>

          {/* Theme Toggle (Desktop & Mobile) */}
          <ThemeToggle />

          {/* Stats Icon (Desktop & Mobile) */}
          <Link href="/stats" className="p-2 rounded-lg hover:bg-slate-800 transition-colors group relative">
            <BarChart3 className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              Stats
            </div>
          </Link>

          <PrivyLoginButton />
        </div>
      </div>
    </header>
  )
}
