import { config, DEFAULT_APP_NAME } from '@/config/env'
import { cn } from '@/lib/utils'

/*
 * The Cashrow mark: a "C" for cash cut into three ledger rows. The middle row,
 * in marigold, is the newest entry. Geometry matches brand/svg/cashrow-mark.svg
 * (a 512 box, viewBox trimmed to the ink), drawn as plain paths so several
 * copies can sit on one page without clip-path ids.
 */
const TOP_ROW = 'M66.18 193A200 200 0 0 1 399.87 117.07L327.93 186.53A100 100 0 0 0 178.34 193Z'
const MIDDLE_ROW = 'M59.45 219A200 200 0 0 0 59.45 293L163.1 293A100 100 0 0 1 163.1 219Z'
const BOTTOM_ROW = 'M66.18 319A200 200 0 0 0 399.87 394.93L327.93 325.47A100 100 0 0 1 178.34 319Z'

type MarkTone = 'brand' | 'onBrand' | 'mono'

const ROW_FILL: Record<MarkTone, string> = { brand: 'fill-brand', onBrand: 'fill-white', mono: 'fill-current' }

export function CashrowMark({ tone = 'brand', className }: { tone?: MarkTone; className?: string }) {
  return (
    <svg
      viewBox="56 56 344 400"
      className={cn('h-6 w-auto shrink-0', className)}
      aria-hidden="true"
      focusable="false"
    >
      <path className={ROW_FILL[tone]} d={TOP_ROW + BOTTOM_ROW} />
      <path className={tone === 'mono' ? 'fill-current' : 'fill-highlight'} d={MIDDLE_ROW} />
    </svg>
  )
}

/** The mark on a cobalt tile, like the app icon. */
export function AppTile({ className }: { className?: string }) {
  return (
    <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-[24%] bg-brand', className)}>
      {/* The C opens to the right, so it sits a little right of centre to look centred. */}
      <CashrowMark tone="onBrand" className="h-[62%] translate-x-[5%]" />
    </span>
  )
}

/**
 * The app name. The default name is set as the two-tone wordmark ("cash" in ink,
 * "row" in cobalt); a custom APP_NAME is shown as plain text.
 */
export function Wordmark({ name = config.appName, className }: { name?: string; className?: string }) {
  const isDefault = name.trim().toLowerCase() === DEFAULT_APP_NAME.toLowerCase()
  return (
    <span className={cn('font-extrabold tracking-[-0.035em]', className)}>
      {isDefault ? (
        <>
          cash<span className="text-brand">row</span>
        </>
      ) : (
        name
      )}
    </span>
  )
}

/** Mark + name, for headers. Size it with a text-* class. */
export function Logo({ className, name }: { className?: string; name?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-[0.36em] leading-none', className)}>
      <CashrowMark className="h-[1.32em]" />
      <Wordmark name={name} />
    </span>
  )
}
