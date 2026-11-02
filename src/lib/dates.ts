/**
 * Calendar-date helpers. Dates are plain ISO strings ("2026-10-23") with no time
 * or time zone, which is also how they are stored in the sheet. All math is done
 * in UTC so a date never shifts by a day because of the viewer's time zone.
 */

export type IsoDate = string
export type DateFormat = 'text' | 'dmy' | 'mdy' | 'iso'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
export const WEEKDAYS = [
  { short: 'Su', long: 'Sunday' },
  { short: 'Mo', long: 'Monday' },
  { short: 'Tu', long: 'Tuesday' },
  { short: 'We', long: 'Wednesday' },
  { short: 'Th', long: 'Thursday' },
  { short: 'Fr', long: 'Friday' },
  { short: 'Sa', long: 'Saturday' },
]

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string') return false
  const m = ISO_RE.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  return isoOf(y, mo - 1, d) === value
}

/** Builds an ISO date; month is 0-based and may overflow (Date.UTC normalises it). */
export function isoOf(year: number, month: number, day: number): IsoDate {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10)
}

/** Today in the viewer's local calendar. */
export function todayIso(now: Date = new Date()): IsoDate {
  return isoOf(now.getFullYear(), now.getMonth(), now.getDate())
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

export interface MonthView {
  year: number
  /** 0-based */
  month: number
}

export function monthOf(iso: IsoDate): MonthView {
  return { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) - 1 }
}

export function shiftMonth(view: MonthView, delta: number): MonthView {
  const total = view.year * 12 + view.month + delta
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 }
}

export function compareMonth(a: MonthView, b: MonthView): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month)
}

export function monthTitle(view: MonthView): string {
  return `${MONTHS_LONG[view.month]} ${view.year}`
}

/** Calendar cells for a month, Sunday first. `null` cells pad the first and last week. */
export function monthGrid(view: MonthView): (IsoDate | null)[] {
  const startDow = new Date(Date.UTC(view.year, view.month, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate()
  const total = Math.ceil((startDow + daysInMonth) / 7) * 7
  return Array.from({ length: total }, (_, i) => {
    const day = i - startDow + 1
    return day >= 1 && day <= daysInMonth ? isoOf(view.year, view.month, day) : null
  })
}

export function formatDate(iso: IsoDate | null | undefined, format: DateFormat = 'text'): string {
  if (!iso || !isIsoDate(iso)) return '—'
  const [y, m, d] = [iso.slice(0, 4), iso.slice(5, 7), iso.slice(8, 10)]
  switch (format) {
    case 'iso':
      return iso
    case 'dmy':
      return `${d}/${m}/${y}`
    case 'mdy':
      return `${m}/${d}/${y}`
    default:
      return `${Number(d)} ${MONTHS_SHORT[Number(m) - 1]} ${y}`
  }
}

/** Day and month only, for compact lists. */
export function formatDayMonth(iso: IsoDate | null | undefined, format: DateFormat = 'text'): string {
  if (!iso || !isIsoDate(iso)) return '—'
  const [m, d] = [iso.slice(5, 7), iso.slice(8, 10)]
  switch (format) {
    case 'iso':
      return iso
    case 'dmy':
      return `${d}/${m}`
    case 'mdy':
      return `${m}/${d}`
    default:
      return `${Number(d)} ${MONTHS_SHORT[Number(m) - 1]}`
  }
}

export function formatLongDate(iso: IsoDate): string {
  return `${Number(iso.slice(8, 10))} ${MONTHS_LONG[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`
}

export function formatRange(from: IsoDate, to: IsoDate, format: DateFormat = 'text'): string {
  if (from === to) return formatDate(from, format)
  if (format === 'text' && from.slice(0, 4) === to.slice(0, 4)) {
    return `${formatDayMonth(from, format)} – ${formatDate(to, format)}`
  }
  return `${formatDate(from, format)} – ${formatDate(to, format)}`
}

/** Current timestamp in ISO 8601, used for createdAt / updatedAt columns. */
export function nowStamp(now: Date = new Date()): string {
  return now.toISOString()
}
