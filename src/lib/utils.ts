import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Short random id with a readable prefix, e.g. "pty_k3j9x2m1q0". */
export function newId(prefix: string): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  const body = Array.from(bytes, (b) => (b % 36).toString(36)).join('')
  return `${prefix}_${body}`
}

/** Random positive 31-bit integer, used for Google Sheets tab ids. */
export function newSheetId(): number {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return (bytes[0] % 2_000_000_000) + 1
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w.charAt(0)))
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()
}

export function pluralize(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}
