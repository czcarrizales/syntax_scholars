
type PdfSelection = {
  file: File | null
  error: string
}

export function validatePdfSelection(files: File[]): PdfSelection {
  // No file selected
  if (files.length === 0) {
    return { file: null, error: '' }
  }

  // The application only handles one PDF at a time.
  if (files.length > 1) {
    return {
      file: null,
      error: 'Please select only one PDF at a time.',
    }
  }

  const file = files[0]

  // Check the extension and any reported MIME type.
  const validExtension = file.name.toLowerCase().endsWith('.pdf')
  const validType = !file.type || file.type === 'application/pdf'

  if (!validExtension || !validType) {
    return {
      file: null,
      error: 'Only PDF files are supported.',
    }
  }

  return { file, error: '' }
}
