import { apiFetchRaw } from './client'

export type ExportFormat = 'markdown' | 'json'

function filenameFromHeader(header: string | null, fallback: string): string {
  if (header === null) return fallback
  const match: RegExpMatchArray | null = header.match(/filename="?([^"]+)"?/)
  return match !== null && match[1] !== undefined ? match[1] : fallback
}

export async function downloadExport(
  format: ExportFormat,
  token: string,
): Promise<void> {
  const response: Response = await apiFetchRaw(
    `/export/${format}`,
    { method: 'GET' },
    { token },
  )

  const blob: Blob = await response.blob()
  const fallback: string = format === 'markdown' ? 'lumen-export.md' : 'lumen-export.json'
  const filename: string = filenameFromHeader(
    response.headers.get('content-disposition'),
    fallback
  )

  const url: string = window.URL.createObjectURL(blob)
  const link: HTMLAnchorElement = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
