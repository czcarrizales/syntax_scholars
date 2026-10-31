
import { afterEach, describe, expect, it, vi } from 'vitest'
import { uploadPdf } from './uploadPdf'

// Valid backend response using our current Book format
const validBook = {
  title: 'sample.pdf',
  page_count: 2,
  pages: [
    { page: 1, text: 'Page one' },
    { page: 2, text: 'Page two' },
  ],
}

// Create a File object for the upload request.
// PDF parsing itself is tested by the backend tests.
function makeFile() {
  return new File(['test content'], 'sample.pdf', {
    type: 'application/pdf',
  })
}

// Simulate a JSON response from FastAPI
function mockResponse(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  )

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

// Restore fetch after each test
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('uploadPdf', () => {
  // 1. Valid response
  it('accepts a valid book response', async () => {
    const fetchMock = mockResponse(validBook)

    const result = await uploadPdf(makeFile())

    expect(result).toEqual(validBook)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/upload',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      })
    )
  })

  // 2. Unsupported file
  it('handles unsupported file errors', async () => {
    mockResponse(
      { detail: 'Only PDF files are supported.' },
      400
    )

    await expect(uploadPdf(makeFile())).rejects.toThrow(
      'Only PDF files are supported.'
    )
  })

  // 3. Empty file
  it('handles empty file errors', async () => {
    mockResponse(
      { detail: 'The uploaded file is empty.' },
      400
    )

    await expect(uploadPdf(makeFile())).rejects.toThrow(
      'The uploaded file is empty.'
    )
  })

  // 4. Corrupted PDF
  it('handles corrupted PDF errors', async () => {
    mockResponse(
      {
        detail:
          'Could not open the PDF. The file may be corrupted or invalid.',
      },
      400
    )

    await expect(uploadPdf(makeFile())).rejects.toThrow(
      'Could not open the PDF'
    )
  })

  // 5. Connection failure
  it('handles network connection failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(
        new TypeError('Failed to fetch')
      )
    )

    await expect(uploadPdf(makeFile())).rejects.toThrow(
      'Could not connect to the server'
    )
  })

  // 6. Invalid JSON
  it('rejects invalid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('not valid JSON', { status: 200 })
      )
    )

    await expect(uploadPdf(makeFile())).rejects.toThrow(
      'The backend returned invalid JSON.'
    )
  })

  // 7. Invalid Book structure
  it('rejects malformed book data', async () => {
    mockResponse({
      title: 'sample.pdf',
      page_count: 2,
      pages: [],
    })

    await expect(uploadPdf(makeFile())).rejects.toThrow(
      'unexpected PDF response format'
    )
  })

  // 8. HTTP error without JSON
  it('handles a non-JSON server error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          '<html>Server unavailable</html>',
          { status: 500 }
        )
      )
    )

    await expect(uploadPdf(makeFile())).rejects.toThrow(
      'Request failed (HTTP 500)'
    )
  })
})
