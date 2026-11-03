
import { useRef, useState } from 'react'
import type { DragEvent } from 'react'

import type { Book } from '../../types/book'
import './UploadPanel.css'

type UploadPanelProps = {
  file: File | null
  book: Book | null
  message: string
  isUploading: boolean
  onFilesSelected: (files: File[]) => void
  onProcess: () => void
  onCancel: () => void
}

function UploadPanel({
  file,
  book,
  message,
  isUploading,
  onFilesSelected,
  onProcess,
  onCancel,
}: UploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false)

  // Prevent drag events from nested elements causing flickering.
  const dragDepth = useRef(0)

  // Keep the native file input synchronized with dropped files.
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleDragEnter(event: DragEvent<HTMLElement>) {
    if (!event.dataTransfer.types.includes('Files')) return

    event.preventDefault()
    dragDepth.current += 1

    if (!isUploading) {
      setIsDragging(true)
    }
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    if (!event.dataTransfer.types.includes('Files')) return

    // Required to allow dropping files onto this element.
    event.preventDefault()

    event.dataTransfer.dropEffect = isUploading
      ? 'none'
      : 'copy'
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    if (!event.dataTransfer.types.includes('Files')) return

    event.preventDefault()

    dragDepth.current = Math.max(0, dragDepth.current - 1)

    if (dragDepth.current === 0) {
      setIsDragging(false)
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    // Stop the browser from opening the dropped PDF.
    event.preventDefault()

    dragDepth.current = 0
    setIsDragging(false)

    // Don't replace the file during an active upload.
    if (isUploading) return

    const droppedFiles = Array.from(event.dataTransfer.files)

    // Clear the native file picker so its displayed filename
    // cannot disagree with the newly dropped file.
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    // The same handler is used by the normal file picker.
    onFilesSelected(droppedFiles)
  }

  return (
    <section
      className={`upload-panel${isDragging ? ' drag-active' : ''}`}
      aria-label="PDF upload area with drag and drop"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        disabled={isUploading}
        onChange={(event) => {
          onFilesSelected(
            Array.from(event.target.files ?? [])
          )
        }}
      />

      <span className="drop-hint">
        or drag a PDF here
      </span>

      <button
        onClick={onProcess}
        disabled={isUploading}
      >
        {isUploading ? 'Processing...' : 'Process PDF'}
      </button>

      {isUploading && (
        <button
          type="button"
          className="cancel-button"
          onClick={onCancel}
        >
          Cancel
        </button>
      )}

      {file && (
        <p>
          {file.name}
          {book && ` — ${book.page_count} pages`}
        </p>
      )}

      {message && <p role="status">{message}</p>}
    </section>
  )
}

export default UploadPanel