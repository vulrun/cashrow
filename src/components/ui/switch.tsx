import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

/** 44px-wide touch target around a 44x26 track. */
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'group relative inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="flex h-[26px] w-11 items-center rounded-full bg-input-strong p-[3px] transition-colors group-data-[state=checked]:bg-brand">
        <SwitchPrimitive.Thumb className="block size-5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[18px]" />
      </span>
    </SwitchPrimitive.Root>
  )
}

export { Switch }
