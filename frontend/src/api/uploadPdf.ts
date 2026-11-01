
import type { Book } from '../types/book'

// Check whether a value is a non-null object.
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
}

// Verify that the backend returned a usable Book.
function isBook(value: unknown): value is Book {
  if (!isObject(value)) return false

  const { title, page_count, pages } = value

  if (typeof title !== 'string' || !title.trim()) return false
  if (typeof page_count !== 'number'
      || !Number.isInteger(page_count)
      || page_count < 1) return false

  if (!Array.isArray(pages) || pages.length !== page_count) {
    return false
  }

  return pages.every((page, index) =>
    isObject(page)
    && page.page === index + 1
    && typeof page.text === 'string'
  )
}

// Upload a PDF and return a validated Book.
export async function uploadPdf(file: File): Promise<Book> {
  const formData = new FormData()
  formData.append('file', file)

  let response: Response

  // Send the request to FastAPI.
  try {
    response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })
  } catch {
    throw new Error(
      'Could not connect to the server. Check that the backend is running.'
    )
  }

  // Parse the response as JSON.
  let data: unknown

  try {
    data = await response.json()
  } catch {
    if (!response.ok) {
      throw new Error(
        `Request failed (HTTP ${response.status}). Check the backend connection or logs.`
      )
    }

    throw new Error('The backend returned invalid JSON.')
  }

  // Handle an unsuccessful HTTP response.
  if (!response.ok) {
    const message = isObject(data) && typeof data.detail === 'string'
      ? data.detail
      : `PDF processing failed (HTTP ${response.status}).`

    throw new Error(message)
  }

  // Verify the successful response before using it.
  if (!isBook(data)) {
    throw new Error(
      'The backend returned an unexpected PDF response format.'
    )
  }

  return data
}