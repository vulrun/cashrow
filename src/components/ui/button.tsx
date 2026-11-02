import * as React from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Solid brand (cobalt). Primary action in a dialog. */
        brand: 'bg-brand text-white hover:bg-brand-strong',
        /** Soft brand tile, e.g. the + button. */
        soft: 'border border-brand-border bg-brand-soft text-brand-strong hover:bg-brand-softer',
        /** Dark neutral, for weighty but not branded actions (Archive). */
        dark: 'bg-foreground text-white hover:bg-foreground/90',
        /** Grey pill, for secondary actions (Settings, Cancel). */
        secondary: 'bg-muted text-foreground hover:bg-border',
        outline: 'border border-border bg-card text-foreground hover:bg-muted',
        ghost: 'text-subtle-foreground hover:bg-muted hover:text-foreground',
        income: 'border border-income-border bg-income-soft text-income hover:bg-income-border/40',
        expense: 'border border-expense-border bg-expense-soft text-expense hover:bg-expense-border/40',
        incomeSolid: 'bg-income text-white hover:bg-income/90',
        expenseSolid: 'bg-expense text-white hover:bg-expense/90',
        link: 'text-brand-strong underline-offset-4 hover:underline',
        dangerText: 'text-expense hover:bg-expense-soft',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        default: 'h-10 px-4',
        lg: 'h-12 px-7 text-[15px]',
        icon: 'size-9',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'default' },
  },
)

type ButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }

function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button }
