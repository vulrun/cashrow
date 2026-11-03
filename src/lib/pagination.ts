export type PageItem = number | 'gap'

/**
 * Page buttons to show (0-based page numbers, 'gap' for an ellipsis): every page up to
 * seven, otherwise first, last and the pages around the current one. Always seven items
 * once there are more than seven pages, so the buttons don't shift while paging.
 */
export function pageItems(current: number, count: number): PageItem[] {
  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)
  if (count <= 7) return range(0, count - 1)
  const last = count - 1
  if (current <= 3) return [...range(0, 4), 'gap', last]
  if (current >= last - 3) return [0, 'gap', ...range(last - 4, last)]
  return [0, 'gap', current - 1, current, current + 1, 'gap', last]
}
