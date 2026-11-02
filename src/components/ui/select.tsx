import * as React from 'react'
import { Select as SelectPrimitive } from 'radix-ui'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option {
  value: string
  label: React.ReactNode
}

interface SelectProps {
  id?: string
  value: string
  onValueChange: (value: string) => void
  options: Option[]
  placeholder?: string
  size?: 'sm' | 'default'
  className?: string
  'aria-label'?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  disabled?: boolean
}

/** Accessible dropdown (Radix Select) styled to match the inputs. */
export function Select({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  size = 'default',
  className,
  disabled,
  ...aria
}: SelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        id={id}
        {...aria}
        className={cn(
          'flex w-full min-w-0 items-center justify-between gap-2 rounded-[10px] border border-input bg-background px-3 text-left text-sm text-foreground outline-none focus-visible:border-brand-border focus-visible:ring-[3px] focus-visible:ring-brand-soft disabled:opacity-50 aria-invalid:border-expense data-[placeholder]:text-muted-foreground',
          size === 'sm' ? 'h-[34px] rounded-lg text-[13px]' : 'h-10',
          className,
        )}
      >
        <span className="truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon>
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-[60] max-h-[min(320px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-card shadow-[0_18px_40px_rgba(14,23,38,0.16)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {/* Border + p-1 + pl-2 = 13px, the same inset as the trigger's text (border + px-3), so options line up with it. */}
          <SelectPrimitive.Viewport className="p-1">
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value}
                value={o.value}
                className="relative flex h-9 cursor-pointer select-none items-center rounded-lg pl-2 pr-8 text-[13.5px] outline-none data-[highlighted]:bg-brand-soft data-[highlighted]:text-brand-strong data-[state=checked]:font-semibold"
              >
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2.5">
                  <CheckIcon className="size-4" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
