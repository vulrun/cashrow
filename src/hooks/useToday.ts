import { useEffect, useState } from 'react'
import { todayIso } from '@/lib/dates'

/** Today's date (local calendar). Updates if the app stays open past midnight. */
export function useToday() {
  const [today, setToday] = useState(todayIso)
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = todayIso()
      setToday((prev) => (prev === now ? prev : now))
    }, 60_000)
    return () => window.clearInterval(id)
  }, [])
  return today
}
