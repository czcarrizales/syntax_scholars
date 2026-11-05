
import { describe, expect, it } from 'vitest'
import { searchPdf } from './searchPdf'

const pages = [
  { page: 1, text: 'The cat sat on the mat.' },
  { page: 2, text: 'A dog ran through the garden.' },
  { page: 3, text: 'Another CAT appeared near the house.' },
]

describe('searchPdf', () => {
  it('finds matching pages', () => {
    const results = searchPdf(pages, 'cat')

    expect(results.map((result) => result.pageNumber))
      .toEqual([1, 3])
  })

  it('ignores capitalization', () => {
    const results = searchPdf(pages, 'CAT')

    expect(results).toHaveLength(2)
  })

  it('returns no results for an empty search', () => {
    expect(searchPdf(pages, '   ')).toEqual([])
  })

  it('returns no results when nothing matches', () => {
    expect(searchPdf(pages, 'elephant')).toEqual([])
  })

  it('returns the correct page index', () => {
    const results = searchPdf(pages, 'garden')

    expect(results[0].pageIndex).toBe(1)
    expect(results[0].pageNumber).toBe(2)
  })

  it('includes text around the match', () => {
    const results = searchPdf(pages, 'garden')

    expect(results[0].snippet).toContain('garden')
  })

  it('handles extra spaces and line breaks', () => {
    const results = searchPdf(
      [{ page: 1, text: 'The first\nchapter begins here.' }],
      'first chapter'
    )

    expect(results).toHaveLength(1)
  })

  it('keeps punctuation as literal search text', () => {
    const results = searchPdf(
      [{ page: 1, text: 'Version 1.2 is available.' }],
      '1.2'
    )

    expect(results).toHaveLength(1)
  })
})
