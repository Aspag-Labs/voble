'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Info, Trophy, Swords, Dices, User } from 'lucide-react'

const navItems = [
  {
    label: 'About',
    href: '/about',
    icon: Info,
  },
  {
    label: 'Raffle',
    href: '/raffle',
    icon: Dices,
  },
  {
    label: 'Play',
    href: '/',
    icon: Swords,
  },
  {
    label: 'Ranks',
    href: '/leaderboard',
    icon: Trophy,
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: User,
  },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0c16e6] backdrop-blur-xl rounded-t-2xl pb-safe border-t border-zinc-800">
      <div className="grid grid-cols-5 h-20 px-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href)

          const baseClasses = 'flex flex-col items-center justify-center transition-all duration-200'

          // Container classes for the border effect - fixed height for consistency
          let containerClasses = 'flex flex-col items-center justify-center h-14 w-full rounded-xl transition-all duration-200'
          let textClasses = ''

          if (active) {
            // Active state: orange/amber badge style (matching leaderboard prize)
            containerClasses += ' border-2 border-[#e5713e] bg-[#e5713e]/10'
            textClasses = 'text-[#f89e2d]'
          } else {
            // Inactive state
            containerClasses += ' border-2 border-transparent'
            textClasses = 'text-zinc-400 hover:text-white'
          }

          return (
            <Link key={href} href={href} className={`${baseClasses} ${textClasses}`}>
              <div className={containerClasses}>
                <Icon className="w-6 h-6 mb-1.5 stroke-[2.5px]" />
                <span className="text-[11px] font-black tracking-wider leading-none">{label}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
