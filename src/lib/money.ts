export const CURRENCIES = [
  { code: 'INR', label: 'Indian rupee', symbol: '₹', locale: 'en-IN' },
  { code: 'USD', label: 'US dollar', symbol: '$', locale: 'en-US' },
  { code: 'EUR', label: 'Euro', symbol: '€', locale: 'en-IE' },
  { code: 'GBP', label: 'British pound', symbol: '£', locale: 'en-GB' },
  { code: 'AED', label: 'UAE dirham', symbol: 'AED', locale: 'en-AE' },
  { code: 'SGD', label: 'Singapore dollar', symbol: 'S$', locale: 'en-SG' },
  { code: 'AUD', label: 'Australian dollar', symbol: 'A$', locale: 'en-AU' },
  { code: 'CAD', label: 'Canadian dollar', symbol: 'C$', locale: 'en-CA' },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]['code']

export function currencyInfo(code: string) {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0]
}

/**
 * Formats an amount with the currency's own digit grouping (₹1,24,500 for INR,
 * $124,500 for USD). Negative values get a true minus sign.
 */
export function formatMoney(amount: number, currency: string, opts: { signed?: boolean } = {}): string {
  const info = currencyInfo(currency)
  const abs = Math.abs(amount)
  const digits = abs.toLocaleString(info.locale, {
    minimumFractionDigits: Number.isInteger(abs) ? 0 : 2,
    maximumFractionDigits: 2,
  })
  const symbol = info.symbol.length > 1 && /^[A-Z]+$/.test(info.symbol) ? `${info.symbol} ` : info.symbol
  const sign = amount < 0 ? '−' : opts.signed && amount > 0 ? '+' : ''
  return `${sign}${symbol}${digits}`
}

/**
 * Parses what a person typed into an amount field. Accepts grouping commas and
 * spaces ("1,24,500.50"). Returns null for anything that is not a plain positive
 * number with at most two decimals.
 */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[,\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null
}
