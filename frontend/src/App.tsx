import { useEffect, useState } from 'react'

import Sidebar from './components/Sidebar/Sidebar'
import UploadPanel from './components/UploadPanel/UploadPanel'
import Reader from './components/Reader/Reader'

import type { Book } from './types/book'

import './App.css'

function App() {
  const [file, setFile] = useState<File | null>(null)
const [book, setBook] = useState<Book | null>(null)
const [currentPage, setCurrentPage] = useState(0)
const [message, setMessage] = useState('')
const [isSpeaking, setIsSpeaking] = useState(false)

  async function processPdf() {
    if (!file) {
      setMessage('Choose a PDF first.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setMessage('Processing PDF...')

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        setMessage('Could not process the PDF.')
        return
      }

      const data: Book = await response.json()

      setBook(data)
      setCurrentPage(0)
      setMessage('')
    } catch {
      setMessage('Could not connect to the backend.')
    }
  }

  function previousPage() {
    setCurrentPage((page) =>
      Math.max(page - 1, 0)
    )
  }

  function nextPage() {
    if (!book) return

    setCurrentPage((page) =>
      Math.min(
        page + 1,
        book.pages.length - 1
      )
    )
  }

  function toggleSpeech() {
  if (isSpeaking) {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    return
  }

  if (!book) return

  const text = book.pages[currentPage]?.text
  if (!text) return

  const speech = new SpeechSynthesisUtterance(text)

  speech.onend = () => {
    setIsSpeaking(false)
  }

  speech.onerror = () => {
    setIsSpeaking(false)
  }

  setIsSpeaking(true)
  window.speechSynthesis.speak(speech)
}

  useEffect(() => {
  window.speechSynthesis.cancel()
  setIsSpeaking(false)

  return () => {
    window.speechSynthesis.cancel()
  }
}, [currentPage])

  return (
    <div className="app-layout">
      <Sidebar
        book={book}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      <main className="main-content">
        <UploadPanel
          file={file}
          book={book}
          message={message}
          onFileChange={setFile}
          onProcess={processPdf}
        />

        {book && (
          <Reader
  book={book}
  currentPage={currentPage}
  isSpeaking={isSpeaking}
  onPrevious={previousPage}
  onNext={nextPage}
  onToggleSpeech={toggleSpeech}
/>
        )}
      </main>
    </div>
  )
}

export default App