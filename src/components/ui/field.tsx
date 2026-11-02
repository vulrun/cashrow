import * as React from 'react'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: React.ReactNode
  /** id of the control; connects the label and the messages. */
  htmlFor: string
  hint?: React.ReactNode
  error?: string
  optional?: boolean
  /** Right-aligned text in the label row (e.g. a character counter). */
  aside?: React.ReactNode
  className?: string
  children: React.ReactNode
}

/** Label + control + hint/error, wired for screen readers. */
export function Field({ label, htmlFor, hint, error, optional, aside, className, children }: FieldProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[12.5px] font-semibold text-label">
          {label}
          {optional && <span className="font-normal text-muted-foreground"> · optional</span>}
        </label>
        {aside && <span className="text-xs text-muted-foreground">{aside}</span>}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-[12.5px] text-expense">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
