
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
  // Drag events can fire multiple times when moving
// over stuff inside the box. This keeps it from flickering.
  const dragDepth = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes('Files')) return

    event.preventDefault()

    if (isUploading) return

    dragDepth.current += 1
    setIsDragging(true)
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes('Files')) return

    event.preventDefault()

    event.dataTransfer.dropEffect = isUploading
      ? 'none'
      : 'copy'
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()

    dragDepth.current = Math.max(0, dragDepth.current - 1)

    if (dragDepth.current === 0) {
      setIsDragging(false)
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()

    dragDepth.current = 0
    setIsDragging(false)

    if (isUploading) return

    const droppedFiles = Array.from(event.dataTransfer.files)
// Clear the file picker so it doesn't keep
// an older file selected.
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    onFilesSelected(droppedFiles)
  }

  
// Once the PDF is ready, shrink the upload section
// so there's more room for actually reading.
if (book) {
    return (
      <section
        className="upload-panel upload-panel--compact"
        aria-label="Current document"
      >
        <span className="current-document-name" title={book.title}>
          {book.title}
        </span>

        <input
          ref={fileInputRef}
          id="pdf-file-input"
          className="file-picker-input"
          type="file"
          accept=".pdf,application/pdf"
          disabled={isUploading}
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? [])
            event.currentTarget.value = ''

            if (files.length > 0) {
              onFilesSelected(files)
            }
          }}
        />

        <label htmlFor="pdf-file-input" className="file-picker-button">
          Change PDF
        </label>
      </section>
    )
  }


  return (
    <section className="upload-panel">
      <header className="upload-heading">
        <h2>Syntax Scholars</h2>
        <p>Turn PDFs into a more accessible reading experience.</p>
      </header>

      <div
        className={[
          'upload-dropzone',
          isDragging ? 'drag-active' : '',
          isUploading ? 'upload-disabled' : '',
        ].filter(Boolean).join(' ')}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          id="pdf-file-input"
          className="file-picker-input"
          type="file"
          accept=".pdf,application/pdf"
          disabled={isUploading}
          onChange={(event) => {
            onFilesSelected(
              Array.from(event.currentTarget.files ?? [])
            )

            // Allow reselecting the same file.
            event.currentTarget.value = ''
          }}
        />

        {file ? (
          <div className="selected-file-row">
            <span className="selected-file-name" title={file.name}>
              {file.name}
            </span>

            <label
              htmlFor="pdf-file-input"
              className="file-picker-button"
            >
              Change PDF
            </label>
          </div>
        ) : (
          <div className="empty-dropzone">
            <span className="drop-title">
              Drop a PDF here
            </span>

            <label
              htmlFor="pdf-file-input"
              className="file-picker-button"
            >
              Choose PDF
            </label>
          </div>
        )}
      </div>

      <div className="upload-actions">
        <button
          type="button"
          className="process-button"
          onClick={onProcess}
          disabled={!file || isUploading}
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

        {book && (
          <span className="upload-page-count">
            {book.page_count} pages
          </span>
        )}
      </div>

      {message && !isUploading && (
        <p className="upload-message" role="status">
          {message}
        </p>
      )}
    </section>
  )
}

export default UploadPanel
