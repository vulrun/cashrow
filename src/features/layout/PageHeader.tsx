import type { ReactNode } from 'react'
import { MenuIcon } from 'lucide-react'
import { useLayout } from './LayoutContext'

interface PageHeaderProps {
  icon: ReactNode
  title: ReactNode
  badge?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ icon, title, badge, subtitle, actions }: PageHeaderProps) {
  const { openParties } = useLayout()
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex min-w-0 items-center gap-3.5">
        <button
          type="button"
          onClick={openParties}
          aria-label="Show parties"
          className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring md:hidden"
        >
          <MenuIcon className="size-5" />
        </button>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white shadow-[0_4px_12px_rgba(52,72,214,0.24)]">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-bold leading-tight">{title}</h1>
            {badge}
          </div>
          {subtitle && <div className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{subtitle}</div>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
