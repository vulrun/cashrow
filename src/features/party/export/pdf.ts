/**
 * A minimal PDF 1.4 writer: one JPEG image per page, scaled to the page width and
 * pinned to the top. Enough for exports drawn on a canvas, without a PDF library.
 */

export interface PdfImagePage {
  jpeg: Uint8Array
  /** Image size in pixels. */
  width: number
  height: number
}

/** A4 portrait in points. */
export const A4 = { width: 595.28, height: 841.89 }

export function imagesToPdf(pages: PdfImagePage[], opts: { title?: string } = {}): Uint8Array<ArrayBuffer> {
  const chunks: Uint8Array[] = []
  const offsets: number[] = []
  let length = 0
  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === 'string' ? latin1(part) : part
    chunks.push(bytes)
    length += bytes.length
  }
  const object = (id: number, body: string, stream?: Uint8Array) => {
    offsets[id] = length
    push(`${id} 0 obj\n${body}\n`)
    if (stream) {
      push('stream\n')
      push(stream)
      push('\nendstream\n')
    }
    push('endobj\n')
  }

  // 1 catalog, 2 page tree, 3 info, then page / image / contents for each page.
  const pageId = (i: number) => 4 + i * 3
  const size = 4 + pages.length * 3

  push('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')
  object(1, '<< /Type /Catalog /Pages 2 0 R >>')
  object(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${pageId(i)} 0 R`).join(' ')}] /Count ${pages.length} >>`)
  object(3, `<< /Producer (Cashrow)${opts.title ? ` /Title ${textString(opts.title)}` : ''} >>`)
  pages.forEach((page, i) => {
    const id = pageId(i)
    const drawnHeight = (A4.width * page.height) / page.width
    const draw = latin1(`q ${num(A4.width)} 0 0 ${num(drawnHeight)} 0 ${num(A4.height - drawnHeight)} cm /Im0 Do Q`)
    object(
      id,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(A4.width)} ${num(A4.height)}] /Resources << /XObject << /Im0 ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`,
    )
    object(
      id + 1,
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>`,
      page.jpeg,
    )
    object(id + 2, `<< /Length ${draw.length} >>`, draw)
  })

  const xref = length
  push(`xref\n0 ${size}\n0000000000 65535 f \n`)
  for (let id = 1; id < size; id++) push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size ${size} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`)

  const out = new Uint8Array(length)
  let at = 0
  for (const c of chunks) {
    out.set(c, at)
    at += c.length
  }
  return out
}

function num(n: number): string {
  return String(Math.round(n * 100) / 100)
}

/** One byte per character; callers only pass ASCII (and the binary comment above). */
function latin1(s: string): Uint8Array {
  const bytes = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff
  return bytes
}

/** A PDF text string as UTF-16BE hex, so any party name survives. */
function textString(s: string): string {
  let hex = 'FEFF'
  for (let i = 0; i < s.length; i++) hex += s.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase()
  return `<${hex}>`
}
