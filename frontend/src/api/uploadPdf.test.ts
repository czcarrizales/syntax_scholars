
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
  vi.useRealTimers()
})


function mockPendingFetch() {
  const fetchMock = vi.fn(
    (_url: string, options: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = options.signal as AbortSignal

        signal.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true }
        )
      })
  )

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}


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

  
// 9. Manual cancellation
it('cancels an in-progress upload', async () => {
  mockPendingFetch()

  const controller = new AbortController()
  const request = uploadPdf(makeFile(), controller.signal)

  controller.abort()

  await expect(request).rejects.toThrow(
    'PDF processing cancelled.'
  )
})

// 10. Automatic timeout
it('times out when the backend takes too long', async () => {
  vi.useFakeTimers()
  mockPendingFetch()

  // Use 100 ms for the test instead of waiting 60 seconds.
  const request = uploadPdf(makeFile(), undefined, 100)
  const assertion = expect(request).rejects.toThrow(
    'PDF processing timed out.'
  )

  await vi.advanceTimersByTimeAsync(100)
  await assertion
})

// 11. Ignore a response received after cancellation
it('rejects a late response after cancellation', async () => {
  let resolveFetch!: (response: Response) => void

  // Simulate a fetch implementation that ignores abort.
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve
        })
    )
  )

  const controller = new AbortController()
  const request = uploadPdf(makeFile(), controller.signal)

  controller.abort()

  // The old request still produces a valid response.
  resolveFetch(
    new Response(JSON.stringify(validBook), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  )

  // But it must not be accepted.
  await expect(request).rejects.toThrow(
    'PDF processing cancelled.'
  )
})

})
