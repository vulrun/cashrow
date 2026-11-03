import type { LedgerReport, ReportRow, ReportTotal } from './ledgerReport'

/** Thrown with a message that can be shown to the user as is. */
export class ExportError extends Error {
  override name = 'ExportError'
}

// Layout in CSS px: an A4 portrait page at 150 dpi. Canvases are drawn at SCALE for sharper text.
const PAGE = { width: 1240, height: 1754 }
const SCALE = 1.5
const M = 80
const CONTENT = PAGE.width - M * 2
const COL_GAP = 16
const LINE = 24
const ROW_PAD = 12
const TABLE_HEAD = 46
const FOOTER = 96
// iOS Safari refuses canvases above ~16.7M pixels; stay under it for the single-image export.
const MAX_AREA = 16_000_000
const MIN_IMAGE_SCALE = 0.7

type Ctx = CanvasRenderingContext2D
type ColKey = Exclude<keyof ReportRow, 'type'>

interface Column {
  key: ColKey
  x: number
  w: number
  align: 'left' | 'right'
}

interface RowLayout {
  row: ReportRow
  notes: string[]
  height: number
}

/** Colours come from the app's CSS tokens, so exports match the screens. */
function readColors() {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string) => css.getPropertyValue(`--${name}`).trim()
  return {
    foreground: v('foreground'),
    muted: v('muted-foreground'),
    subtle: v('subtle-foreground'),
    label: v('label'),
    border: v('border'),
    hairline: v('hairline'),
    card: v('card'),
    brand: v('brand'),
    income: v('income'),
    incomeSoft: v('income-soft'),
    incomeBorder: v('income-border'),
    expense: v('expense'),
    expenseSoft: v('expense-soft'),
    expenseBorder: v('expense-border'),
  }
}

function columnNames(report: LedgerReport): Record<ColKey, string> {
  return { date: 'Date', notes: 'Note', method: 'Method', out: report.columns.out, in: report.columns.in, balance: 'Balance' }
}

const isAmount = (key: ColKey) => key === 'out' || key === 'in' || key === 'balance'

/** Each column as wide as its widest value (up to a cap); the note takes what is left. */
function columns(ctx: Ctx, font: (size: number, weight?: number) => string, report: LedgerReport): Column[] {
  const names = columnNames(report)
  const layout: [ColKey, number, Column['align']][] = [
    ['date', 150, 'left'],
    ['notes', 0, 'left'],
    ['method', 150, 'left'],
    ['out', 180, 'right'],
    ['in', 180, 'right'],
    ['balance', 180, 'right'],
  ]
  const widths = layout.map(([key, cap]) => {
    if (!cap) return 0
    ctx.font = font(14, 700)
    let w = ctx.measureText(names[key].toUpperCase()).width
    ctx.font = font(17, isAmount(key) ? 600 : 500)
    for (const row of report.rows) w = Math.max(w, ctx.measureText(row[key]).width)
    return Math.min(Math.ceil(w), cap)
  })
  const notesWidth = CONTENT - widths.reduce((sum, w) => sum + w, 0) - COL_GAP * (layout.length - 1)
  let x = M
  return layout.map(([key, , align], i) => {
    const col = { key, x, w: widths[i] || notesWidth, align }
    x += col.w + COL_GAP
    return col
  })
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function context(canvas: HTMLCanvasElement): Ctx {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ExportError('Your browser could not draw the export.')
  return ctx
}

/** Text cut to `max` px with an ellipsis. */
function fit(ctx: Ctx, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (ctx.measureText(`${text.slice(0, mid).trimEnd()}…`).width <= max) lo = mid
    else hi = mid - 1
  }
  return `${text.slice(0, lo).trimEnd()}…`
}

/** Word-wraps into at most `maxLines`; the last line gets an ellipsis if text is left over. */
function wrap(ctx: Ctx, text: string, max: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i]
    if (ctx.measureText(next).width <= max) {
      line = next
      continue
    }
    if (line) lines.push(fit(ctx, line, max))
    line = words[i]
    if (lines.length === maxLines - 1) {
      lines.push(fit(ctx, words.slice(i).join(' '), max))
      return lines
    }
  }
  if (line) lines.push(fit(ctx, line, max))
  return lines
}

export interface LedgerRenderer {
  pageCount: number
  /** One A4 page; free it with `release()` once read. */
  drawPage: (index: number) => HTMLCanvasElement
  /** Every row on one tall image. Throws ExportError when it would be too big. */
  drawImage: () => HTMLCanvasElement
}

export async function createRenderer(report: LedgerReport): Promise<LedgerRenderer> {
  const family = getComputedStyle(document.body).fontFamily || 'sans-serif'
  const font = (size: number, weight = 500) => `${weight} ${size}px ${family}`
  try {
    await Promise.all([500, 600, 700].map((w) => document.fonts.load(font(16, w), 'Aa₹0')))
  } catch {
    // Fall back to whatever font is available.
  }
  const mark = await loadImage(`${import.meta.env.BASE_URL}favicon.svg`)
  const colors = readColors()
  const measure = context(document.createElement('canvas'))
  const cols = columns(measure, font, report)
  const notesCol = cols.find((c) => c.key === 'notes')!
  measure.font = font(17)
  const rows: RowLayout[] = report.rows.map((row) => {
    const notes = row.notes ? wrap(measure, row.notes, notesCol.w, 2) : []
    return { row, notes, height: ROW_PAD * 2 + LINE * Math.max(1, notes.length) }
  })

  const fullHeaderHeight = 384
  const shortHeaderHeight = 130
  const pages: RowLayout[][] = []
  let y = Infinity
  for (const r of rows) {
    if (y + r.height > PAGE.height - FOOTER) {
      pages.push([])
      y = (pages.length === 1 ? fullHeaderHeight : shortHeaderHeight) + TABLE_HEAD
    }
    pages[pages.length - 1].push(r)
    y += r.height
  }
  if (pages.length === 0) pages.push([])

  function canvasOf(height: number, scale: number): [HTMLCanvasElement, Ctx] {
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(PAGE.width * scale)
    canvas.height = Math.round(height * scale)
    const ctx = context(canvas)
    ctx.fillStyle = colors.card // JPEG has no transparency; fill in device pixels so no edge is left out
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.scale(scale, scale)
    ctx.textBaseline = 'middle'
    return [canvas, ctx]
  }

  function text(ctx: Ctx, value: string, x: number, y: number, opts: { size: number; weight?: number; color: string; align?: 'left' | 'right'; max?: number }) {
    ctx.font = font(opts.size, opts.weight)
    ctx.fillStyle = opts.color
    ctx.textAlign = opts.align ?? 'left'
    ctx.fillText(opts.max ? fit(ctx, value, opts.max) : value, x, y)
  }

  function drawFullHeader(ctx: Ctx): number {
    let y = M
    if (mark) ctx.drawImage(mark, M, y, 44, 44)
    text(ctx, 'Cashrow', M + (mark ? 58 : 0), y + 23, { size: 26, weight: 700, color: colors.brand })
    text(ctx, report.generated, PAGE.width - M, y + 23, { size: 16, color: colors.muted, align: 'right' })
    y += 44 + 44
    text(ctx, 'LEDGER STATEMENT', M, y, { size: 14, weight: 700, color: colors.muted })
    y += 38
    text(ctx, report.title, M, y, { size: 38, weight: 700, color: colors.foreground, max: CONTENT })
    y += 42
    text(ctx, `${report.filterSummary} · ${report.count}`, M, y, { size: 18, color: colors.subtle, max: CONTENT })
    y += 34
    drawTotals(ctx, y, report.totals)
    return fullHeaderHeight
  }

  function drawTotals(ctx: Ctx, top: number, totals: ReportTotal[]) {
    const gap = 16
    const w = (CONTENT - gap * (totals.length - 1)) / totals.length
    const h = 96
    totals.forEach((t, i) => {
      const x = M + i * (w + gap)
      const tone =
        t.tone === 'income' || t.tone === 'in'
          ? colors.income
          : t.tone === 'expense' || t.tone === 'out'
            ? colors.expense
            : colors.muted
      const soft = t.tone === 'income' ? colors.incomeSoft : t.tone === 'expense' ? colors.expenseSoft : colors.card
      const edge = t.tone === 'income' ? colors.incomeBorder : t.tone === 'expense' ? colors.expenseBorder : colors.border
      ctx.beginPath()
      ctx.roundRect(x + 0.5, top + 0.5, w - 1, h - 1, 14)
      ctx.fillStyle = soft
      ctx.fill()
      ctx.strokeStyle = edge
      ctx.lineWidth = 1
      ctx.stroke()
      const isBalance = t.tone !== 'income' && t.tone !== 'expense'
      text(ctx, t.label.toUpperCase(), x + 20, top + 30, { size: 14, weight: 700, color: isBalance ? colors.label : tone, max: w - 40 })
      text(ctx, t.value, x + 20, top + 64, { size: 28, weight: 700, color: tone, max: w - 40 })
    })
  }

  function drawShortHeader(ctx: Ctx): number {
    text(ctx, `${report.title} · Ledger statement`, M, M + 12, { size: 18, weight: 600, color: colors.label, max: CONTENT - 260 })
    text(ctx, report.generated, PAGE.width - M, M + 12, { size: 16, color: colors.muted, align: 'right' })
    return shortHeaderHeight
  }

  const names = columnNames(report)

  function drawTableHead(ctx: Ctx, top: number) {
    for (const c of cols) {
      text(ctx, names[c.key].toUpperCase(), c.align === 'right' ? c.x + c.w : c.x, top + TABLE_HEAD / 2, {
        size: 14,
        weight: 700,
        color: colors.muted,
        align: c.align,
        max: c.w,
      })
    }
    line(ctx, top + TABLE_HEAD, colors.border, 2)
  }

  function line(ctx: Ctx, y: number, color: string, width = 1) {
    ctx.fillStyle = color
    ctx.fillRect(M, y - width / 2, CONTENT, width)
  }

  function drawRows(ctx: Ctx, top: number, list: RowLayout[]): number {
    let y = top
    for (const { row, notes, height } of list) {
      const mid = y + ROW_PAD + LINE / 2
      for (const c of cols) {
        const x = c.align === 'right' ? c.x + c.w : c.x
        if (c.key === 'notes') {
          if (notes.length === 0) text(ctx, '—', x, mid, { size: 17, color: colors.muted })
          notes.forEach((n, i) => text(ctx, n, x, mid + i * LINE, { size: 17, weight: 500, color: colors.foreground }))
          continue
        }
        const value = row[c.key] || '—'
        const color =
          c.key === 'out' && row.type === 'OUT'
            ? colors.expense
            : c.key === 'in' && row.type === 'IN'
              ? colors.income
              : c.key === 'balance'
                ? colors.label
                : c.key === 'out' || c.key === 'in'
                  ? colors.muted
                  : colors.subtle
        const weight = isAmount(c.key) ? 600 : 500
        text(ctx, value, x, mid, { size: 17, weight, color, align: c.align, max: c.w })
      }
      y += height
      line(ctx, y, colors.hairline)
    }
    return y
  }

  function drawFooter(ctx: Ctx, y: number, right: string) {
    text(ctx, `Cashrow · ${report.title}`, M, y, { size: 15, color: colors.muted, max: CONTENT - 200 })
    text(ctx, right, PAGE.width - M, y, { size: 15, color: colors.muted, align: 'right' })
  }

  return {
    pageCount: pages.length,
    drawPage(index) {
      const [canvas, ctx] = canvasOf(PAGE.height, SCALE)
      const top = index === 0 ? drawFullHeader(ctx) : drawShortHeader(ctx)
      drawTableHead(ctx, top)
      drawRows(ctx, top + TABLE_HEAD, pages[index])
      drawFooter(ctx, PAGE.height - FOOTER / 2, `Page ${index + 1} of ${pages.length}`)
      return canvas
    },
    drawImage() {
      const height = fullHeaderHeight + TABLE_HEAD + rows.reduce((sum, r) => sum + r.height, 0) + FOOTER
      const scale = Math.min(SCALE, Math.sqrt(MAX_AREA / (PAGE.width * height)))
      if (scale < MIN_IMAGE_SCALE) {
        throw new ExportError('Too many entries for one image. Export a PDF, or narrow the filters.')
      }
      const [canvas, ctx] = canvasOf(height, scale)
      const top = drawFullHeader(ctx)
      drawTableHead(ctx, top)
      const end = drawRows(ctx, top + TABLE_HEAD, rows)
      drawFooter(ctx, end + FOOTER / 2, report.count)
      return canvas
    },
  }
}

/** Frees a canvas's pixel memory straight away (large exports draw many pages). */
export function release(canvas: HTMLCanvasElement) {
  canvas.width = 0
  canvas.height = 0
}
