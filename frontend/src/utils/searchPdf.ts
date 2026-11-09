
import type { Page } from '../types/book'

export type PdfSearchResult = {
  pageIndex: number
  pageNumber: number
  snippet: string
}

export function searchPdf(
  pages: Page[],
  query: string
): PdfSearchResult[] {
  const term = query.trim().replace(/\s+/g, ' ').toLowerCase()

  if (!term) return []

  const results: PdfSearchResult[] = []

  for (const [index, page] of pages.entries()) {
    // PDF text can have weird spacing and line breaks.
    const text = page.text.replace(/\s+/g, ' ')
    const matchIndex = text.toLowerCase().indexOf(term)

    if (matchIndex === -1) continue

    const start = Math.max(0, matchIndex - 55)
    const end = Math.min(
      text.length,
      matchIndex + term.length + 90
    )

    const snippet =
      (start > 0 ? '...' : '') +
      text.slice(start, end).trim() +
      (end < text.length ? '...' : '')

    results.push({
      pageIndex: index,
      pageNumber: page.page,
      snippet,
    })
  }

  return results
}
