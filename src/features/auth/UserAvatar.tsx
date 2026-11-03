import { useState } from 'react'
import { cn, initials } from '@/lib/utils'
import type { AuthUser } from '@/store/authSlice'

/** The Google profile picture, or the user's initials when there is none (demo) or it fails to load. */
export function UserAvatar({ user, className }: { user: AuthUser | null; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const src = user?.picture
  const base = cn('flex size-8 shrink-0 items-center justify-center rounded-full', className)

  if (src && src !== failedSrc) {
    return (
      <img
        src={src}
        alt=""
        // Google's avatar host can refuse requests that carry a referrer.
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
        className={cn(base, 'bg-brand-softer object-cover')}
      />
    )
  }
  return (
    <span aria-hidden="true" className={cn(base, 'bg-brand-softer text-xs font-bold text-brand-strong')}>
      {initials(user?.name ?? '?') || '?'}
    </span>
  )
}
