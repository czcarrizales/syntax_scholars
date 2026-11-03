
import type { Book } from '../types/book'

// Maximum time to wait for a PDF response: 60 seconds.
export const PDF_UPLOAD_TIMEOUT_MS = 60_000

function isObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

// Check that the backend actually sent what we're
// expecting before trying to use it.
function isBook(value: unknown): value is Book {
  if (!isObject(value)) return false

  const { title, page_count, pages } = value

  if (typeof title !== 'string' || !title.trim()) return false

  if (
    typeof page_count !== 'number' ||
    !Number.isInteger(page_count) ||
    page_count < 1
  ) {
    return false
  }

  if (!Array.isArray(pages) || pages.length !== page_count) {
    return false
  }

  return pages.every(
    (page, index) =>
      isObject(page) &&
      page.page === index + 1 &&
      typeof page.text === 'string'
  )
}

// Give a different message depending on whether
// the user cancelled or the upload took too long.
function getAbortError(signal: AbortSignal): Error {
  if (signal.reason === 'timeout') {
    return new Error(
      'PDF processing timed out. Please try again.'
    )
  }

  return new Error('PDF processing cancelled.')
}

// Upload a PDF, supporting cancellation and a timeout.
export async function uploadPdf(
  file: File,
  signal?: AbortSignal,
  timeoutMs = PDF_UPLOAD_TIMEOUT_MS
): Promise<Book> {
  if (signal?.aborted) {
    throw new Error('PDF processing cancelled.')
  }

  const formData = new FormData()
  formData.append('file', file)

  // This controller manages the actual HTTP request.
  const requestController = new AbortController()

  // Forward cancellation from the calling component.
  const abortFromCaller = () => {
    requestController.abort('user')
  }

  signal?.addEventListener('abort', abortFromCaller, {
    once: true,
  })

  // Handle cancellation that occurred during setup.
  if (signal?.aborted) {
    requestController.abort('user')
  }

  // Automatically cancel when the timeout is reached.
  const timeoutId = setTimeout(() => {
    requestController.abort('timeout')
  }, timeoutMs)

  try {
    if (requestController.signal.aborted) {
      throw getAbortError(requestController.signal)
    }

    let response: Response

    try {
      response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        signal: requestController.signal,
      })
    } catch {
      if (requestController.signal.aborted) {
        throw getAbortError(requestController.signal)
      }

      throw new Error(
        'Could not connect to the server. Check that the backend is running.'
      )
    }

// Even if an old request somehow finishes after
// being cancelled, we shouldn't use its response.
if (requestController.signal.aborted) {
  throw getAbortError(requestController.signal)
}

    let data: unknown

    try {
      data = await response.json()
    } catch {
      if (requestController.signal.aborted) {
        throw getAbortError(requestController.signal)
      }

      if (!response.ok) {
        throw new Error(
          `Request failed (HTTP ${response.status}). Check the backend connection or logs.`
        )
      }

      throw new Error('The backend returned invalid JSON.')
    }

    if (requestController.signal.aborted) {
      throw getAbortError(requestController.signal)
    }

    if (!response.ok) {
      const message =
        isObject(data) && typeof data.detail === 'string'
          ? data.detail
          : `PDF processing failed (HTTP ${response.status}).`

      throw new Error(message)
    }

    if (!isBook(data)) {
      throw new Error(
        'The backend returned an unexpected PDF response format.'
      )
    }

    return data
} finally {
  // Clean up the timer and listener once we're done.
  clearTimeout(timeoutId)
  signal?.removeEventListener('abort', abortFromCaller)
}
}
