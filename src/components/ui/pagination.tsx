import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from 'lucide-react'
import { pageItems } from '@/lib/pagination'
import { cn } from '@/lib/utils'

interface PaginationProps {
  /** 0-based. */
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  className?: string
}

const BUTTON =
  'flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-45'

/** First / previous / page numbers / next / last. Phones show "Page x of y" instead of the numbers. */
export function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  const atStart = page === 0
  const atEnd = page >= pageCount - 1
  const step = (label: string, target: number, disabled: boolean, icon: React.ReactNode) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onPageChange(target)}
      className={cn(BUTTON, 'bg-muted hover:bg-border')}
    >
      {icon}
    </button>
  )

  return (
    <nav aria-label="Pagination" className={cn('flex items-center gap-1', className)}>
      {step('First page', 0, atStart, <ChevronsLeftIcon className="size-[15px]" />)}
      {step('Previous page', page - 1, atStart, <ChevronLeftIcon className="size-[15px]" />)}
      <span className="min-w-[84px] text-center sm:hidden">
        Page {page + 1} of {pageCount}
      </span>
      <ul className="hidden items-center gap-1 sm:flex">
        {pageItems(page, pageCount).map((item, i) =>
          item === 'gap' ? (
            <li key={`gap-${i}`} aria-hidden="true" className="w-5 text-center text-muted-foreground">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                aria-label={`Page ${item + 1}`}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => onPageChange(item)}
                className={cn(
                  BUTTON,
                  'tabular font-semibold',
                  item === page ? 'bg-brand text-white' : 'text-subtle-foreground hover:bg-muted',
                )}
              >
                {item + 1}
              </button>
            </li>
          ),
        )}
      </ul>
      {step('Next page', page + 1, atEnd, <ChevronRightIcon className="size-[15px]" />)}
      {step('Last page', pageCount - 1, atEnd, <ChevronsRightIcon className="size-[15px]" />)}
    </nav>
  )
}
