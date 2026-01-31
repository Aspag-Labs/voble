import { Button } from '@/components/ui/button'
import { LayoutDashboard, History, Gift } from 'lucide-react'

export type ProfileTab = 'overview' | 'history' | 'rewards'

interface MobileTabsProps {
  currentTab: ProfileTab
  onTabChange: (tab: ProfileTab) => void
}

export function MobileTabs({ currentTab, onTabChange }: MobileTabsProps) {
  return (
    <div className="flex md:hidden w-full p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg mb-6 sticky top-0 z-10 backdrop-blur-3xl bg-opacity-80 border border-zinc-200 dark:border-zinc-800">
      <TabButton
        active={currentTab === 'overview'}
        onClick={() => onTabChange('overview')}
        icon={LayoutDashboard}
        label="Overview"
      />
      <TabButton
        active={currentTab === 'history'}
        onClick={() => onTabChange('history')}
        icon={History}
        label="History"
      />
      <TabButton active={currentTab === 'rewards'} onClick={() => onTabChange('rewards')} icon={Gift} label="Rewards" />
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: any
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`
                flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200
                ${
                  active
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }
            `}
    >
      <Icon className={`h-4 w-4 ${active ? 'text-primary' : ''}`} />
      {label}
    </button>
  )
}
