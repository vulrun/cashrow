const loading = new Map<string, Promise<void>>()

/** Loads a third-party script once. Rejects if it fails to load. */
export function loadScript(src: string): Promise<void> {
  const existing = loading.get(src)
  if (existing) return existing
  const promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script')
    el.src = src
    el.async = true
    el.defer = true
    el.onload = () => resolve()
    el.onerror = () => {
      loading.delete(src)
      el.remove()
      reject(new Error(`Could not load ${src}. Check your connection or ad blocker.`))
    }
    document.head.appendChild(el)
  })
  loading.set(src, promise)
  return promise
}
