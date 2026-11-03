
import { describe, expect, it } from 'vitest'
import { validatePdfSelection } from './pdfSelection'

function makeFile(
  name: string,
  type = 'application/pdf'
): File {
  return new File(['test'], name, { type })
}

describe('validatePdfSelection', () => {
  it('accepts a normal PDF', () => {
    const file = makeFile('book.pdf')
    const result = validatePdfSelection([file])

    expect(result.file).toBe(file)
    expect(result.error).toBe('')
  })

  it('accepts uppercase PDF extensions', () => {
    const file = makeFile('BOOK.PDF')
    const result = validatePdfSelection([file])

    expect(result.file).toBe(file)
  })

  it('accepts PDFs with an unspecified MIME type', () => {
    const file = makeFile('book.pdf', '')
    const result = validatePdfSelection([file])

    expect(result.file).toBe(file)
  })

  it('rejects unsupported extensions', () => {
    const result = validatePdfSelection([
      makeFile('notes.txt', 'text/plain'),
    ])

    expect(result.file).toBeNull()
    expect(result.error).toBe('Only PDF files are supported.')
  })

  it('rejects incorrect MIME types', () => {
    const result = validatePdfSelection([
      makeFile('fake.pdf', 'text/plain'),
    ])

    expect(result.file).toBeNull()
    expect(result.error).toBe('Only PDF files are supported.')
  })

  it('rejects multiple files', () => {
    const result = validatePdfSelection([
      makeFile('first.pdf'),
      makeFile('second.pdf'),
    ])

    expect(result.file).toBeNull()
    expect(result.error).toBe(
      'Please select only one PDF at a time.'
    )
  })

  it('handles an empty selection', () => {
    const result = validatePdfSelection([])

    expect(result.file).toBeNull()
    expect(result.error).toBe('')
  })
})
