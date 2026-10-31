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

// stores the voices and the selected voice and speech rate
const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
const [selectedVoice, setSelectedVoice] = useState('')
const [speechRate, setSpeechRate] = useState(1)

// Load the voices available in the browser and set the default voice if none is selected
useEffect(() => {
  function loadVoices() {
    const availableVoices = window.speechSynthesis.getVoices()
    setVoices(availableVoices)

    if (availableVoices.length > 0 && !selectedVoice) {
      setSelectedVoice(availableVoices[0].name)
    }
  }

  loadVoices()

  window.speechSynthesis.addEventListener('voiceschanged', loadVoices)

  return () => {
    window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  }
}, [selectedVoice])

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

  
const voice = voices.find(
  (voice) => voice.name === selectedVoice
)

if (voice) {
  speech.voice = voice
}

speech.rate = speechRate
speech.pitch = 1


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
  voices={voices}
  selectedVoice={selectedVoice}
  speechRate={speechRate}
  onPrevious={previousPage}
  onNext={nextPage}
  onToggleSpeech={toggleSpeech}
  onVoiceChange={setSelectedVoice}
  onRateChange={setSpeechRate}
/>
        )}
      </main>
    </div>
  )
}

export default App