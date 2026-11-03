import { describe, expect, it } from 'vitest'
import { imagesToPdf } from './pdf'

const fakeJpeg = (n: number) => Uint8Array.from({ length: n }, (_, i) => (i * 37) % 256)
const text = (bytes: Uint8Array) => Array.from(bytes, (b) => String.fromCharCode(b)).join('')

describe('imagesToPdf', () => {
  const pages = [
    { jpeg: fakeJpeg(300), width: 1240, height: 1754 },
    { jpeg: fakeJpeg(120), width: 1240, height: 900 },
  ]
  const pdf = text(imagesToPdf(pages, { title: 'Sharma ₹' }))

  it('writes a header, one page per image and a trailer', () => {
    expect(pdf.startsWith('%PDF-1.4\n')).toBe(true)
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true)
    expect(pdf).toContain('/Type /Pages /Kids [4 0 R 7 0 R] /Count 2')
    expect(pdf.match(/\/Type \/Page /g)).toHaveLength(2)
    expect(pdf).toContain('/Width 1240 /Height 1754')
    expect(pdf).toContain('/Filter /DCTDecode /Length 300')
  })

  it('points every xref entry at its object', () => {
    const xrefAt = Number(/startxref\n(\d+)/.exec(pdf)![1])
    expect(pdf.slice(xrefAt, xrefAt + 4)).toBe('xref')
    const [, count] = /xref\n0 (\d+)\n/.exec(pdf.slice(xrefAt))!
    const entries = pdf.slice(xrefAt).split('\n').slice(3, 2 + Number(count))
    expect(entries).toHaveLength(Number(count) - 1)
    entries.forEach((line, i) => {
      const offset = Number(line.slice(0, 10))
      expect(pdf.slice(offset).startsWith(`${i + 1} 0 obj`)).toBe(true)
    })
  })

  it('pins shorter pages to the top and stores the title as UTF-16', () => {
    // 900px tall at 1240px wide fills 432.06pt of the 841.89pt page, from the top.
    expect(pdf).toContain('q 595.28 0 0 432.06 0 409.83 cm /Im0 Do Q')
    expect(pdf).toContain('/Title <FEFF0053006800610072006D0061002020B9>')
  })
})
