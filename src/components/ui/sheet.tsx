import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Side panel built on Radix Dialog (focus trap, Esc to close, scroll lock). */
const Sheet = DialogPrimitive.Root
const SheetClose = DialogPrimitive.Close

function SheetContent({
  className,
  children,
  side = 'right',
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: 'right' | 'left' }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-y-0 z-50 flex w-full flex-col bg-card shadow-[-16px_0_40px_rgba(14,23,38,0.16)] outline-none duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in',
          side === 'right'
            ? 'right-0 max-w-[420px] data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right'
            : 'left-0 max-w-[320px] data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function SheetHeader({
  title,
  description,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-[22px] pb-4 pt-5', className)}>
      <div className="min-w-0">
        <DialogPrimitive.Title className="text-lg font-bold">{title}</DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="mt-0.5 text-[12.5px] text-muted-foreground">
            {description}
          </DialogPrimitive.Description>
        ) : (
          <DialogPrimitive.Description className="sr-only">Side panel</DialogPrimitive.Description>
        )}
      </div>
      <DialogPrimitive.Close
        aria-label="Close"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-label outline-none hover:bg-border focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <XIcon className="size-4" />
      </DialogPrimitive.Close>
    </div>
  )
}

const SheetTitle = DialogPrimitive.Title
const SheetDescription = DialogPrimitive.Description

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle }
