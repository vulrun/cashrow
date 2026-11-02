import { ToggleGroup } from 'radix-ui'
import { cn } from '@/lib/utils'

interface SegmentedOption<T extends string> {
  value: T
  label: React.ReactNode
  /** Classes applied to this option when it is selected. */
  activeClassName?: string
}

interface SegmentedProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  options: SegmentedOption<T>[]
  'aria-label': string
  size?: 'sm' | 'lg'
  className?: string
}

/** Pill-style single choice (Radix ToggleGroup): arrow keys move between options. */
export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  size = 'sm',
  className,
  ...aria
}: SegmentedProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v as T)}
      className={cn(
        'inline-flex gap-0.5 bg-muted',
        size === 'lg' ? 'grid grid-cols-2 gap-1 rounded-xl p-1' : 'rounded-lg p-[3px]',
        className,
      )}
      {...aria}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 font-semibold text-subtle-foreground outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-[0_1px_3px_rgba(14,23,38,0.1)]',
            size === 'lg' ? 'h-[42px] rounded-[9px] text-sm' : 'h-7 rounded-md px-3 text-[12.5px]',
            value === o.value && o.activeClassName,
          )}
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
