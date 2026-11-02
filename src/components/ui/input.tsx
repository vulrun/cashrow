import * as React from 'react'
import { cn } from '@/lib/utils'

export const fieldClass =
  'w-full min-w-0 rounded-[10px] border border-input bg-background px-3 text-sm text-foreground outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-brand-border focus-visible:ring-[3px] focus-visible:ring-brand-soft disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-expense aria-invalid:ring-expense-soft'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return <input type={type} data-slot="input" className={cn(fieldClass, 'h-10', className)} {...props} />
}

export { Input }
