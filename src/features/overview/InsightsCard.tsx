import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface InsightCell {
  label: string
  value: string
  tone: 'income' | 'expense' | 'neutral'
  note?: string
  valueClassName?: string
}

const TONE = {
  income: 'text-income',
  expense: 'text-expense',
  neutral: 'text-subtle-foreground',
} as const

const LABEL_TONE = {
  income: 'text-income',
  expense: 'text-expense',
  neutral: 'text-subtle-foreground',
} as const

/** Three numbers side by side: You got / You gave / Balance. */
export function InsightsCard({ cells, loading }: { cells: InsightCell[]; loading?: boolean }) {
  return (
    <section
      aria-label="Insights"
      className="grid grid-cols-1 overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_1px_2px_rgba(14,23,38,0.04)] sm:grid-cols-3"
    >
      {cells.map((c, i) => (
        <div
          key={c.label}
          className={cn(
            'px-[22px] py-[18px]',
            i < cells.length - 1 && 'border-b border-hairline sm:border-b-0 sm:border-r',
          )}
        >
          <div className={cn('eyebrow', LABEL_TONE[c.tone])}>{c.label}</div>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-32" />
          ) : (
            <div className={cn('tabular mt-1.5 text-2xl font-bold', TONE[c.tone], c.valueClassName)}>{c.value}</div>
          )}
          {c.note && <div className="mt-0.5 text-[12.5px] text-muted-foreground">{loading ? ' ' : c.note}</div>}
        </div>
      ))}
    </section>
  )
}
