import { buildLedgerReport, type LedgerReportInput } from './ledgerReport'
import { imagesToPdf, type PdfImagePage } from './pdf'
import { ExportError, createRenderer, release } from './renderCanvas'

export { ExportError }

export type ExportFormat = 'pdf' | 'jpg'

const JPEG_QUALITY = 0.9

/** Draws the filtered ledger and downloads it. Loaded on demand, so none of this is in the main bundle. */
export async function exportLedger(input: LedgerReportInput, format: ExportFormat): Promise<void> {
  const report = buildLedgerReport(input)
  const renderer = await createRenderer(report)

  if (format === 'jpg') {
    const canvas = renderer.drawImage()
    const blob = await jpeg(canvas)
    release(canvas)
    download(blob, `${report.fileName}.jpg`)
    return
  }

  // One page at a time, so a long ledger never holds every page in memory.
  const pages: PdfImagePage[] = []
  for (let i = 0; i < renderer.pageCount; i++) {
    const canvas = renderer.drawPage(i)
    const bytes = new Uint8Array(await (await jpeg(canvas)).arrayBuffer())
    pages.push({ jpeg: bytes, width: canvas.width, height: canvas.height })
    release(canvas)
  }
  const pdf = imagesToPdf(pages, { title: `${report.title} · Ledger statement` })
  download(new Blob([pdf], { type: 'application/pdf' }), `${report.fileName}.pdf`)
}

function jpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ExportError('Your browser could not create the image.'))),
      'image/jpeg',
      JPEG_QUALITY,
    ),
  )
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  // Revoking straight away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
