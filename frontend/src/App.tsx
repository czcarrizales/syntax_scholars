import { useEffect, useState } from "react";

import Sidebar from "./components/Sidebar/Sidebar";
import UploadPanel from "./components/UploadPanel/UploadPanel";
import Reader from "./components/Reader/Reader";

import type { Book } from "./types/book";
import { uploadPdf } from "./api/uploadPdf";

import "./App.css";

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [message, setMessage] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Stores the voices and the selected voice and speech rate
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [speechRate, setSpeechRate] = useState(1)

  // Load the voices available in the browser and set the default voice if none is selected
  useEffect(() => {
    function loadVoices() {
      const availableVoices = window.speechSynthesis.getVoices()
      setVoices(availableVoices)

      // Ensures that speech has a default voice before user selection
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

  function handleFileChange(newFile: File | null) {
  setFile(newFile)
  setBook(null)
  setCurrentPage(0)
  setMessage('')

  window.speechSynthesis.cancel()
  setIsSpeaking(false)
}

  async function processPdf() {
    if (!file) {
      setMessage("Choose a PDF first.");
      return;
    }

    if (isUploading) return;

    setIsUploading(true);
    setMessage("Processing PDF...");
    setBook(null);

    try {
      // The API utility handles requests and validation.
      const data = await uploadPdf(file);

      setBook(data);
      setCurrentPage(0);
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  function previousPage() {
    setCurrentPage((page) => Math.max(page - 1, 0));
  }

  function nextPage() {
    if (!book) return;

    setCurrentPage((page) => Math.min(page + 1, book.pages.length - 1));
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

    // Matches the user selected voice to an available voice in the browser  
    const voice = voices.find(
      (voice) => voice.name === selectedVoice
    )

    if (voice) {
      speech.voice = voice
    }

    speech.rate = speechRate
    speech.pitch = 1

    // Keeps the UI synchronized when the speech ends or encounters an error
    speech.onend = () => {
      setIsSpeaking(false)
    }

    speech.onerror = () => {
      setIsSpeaking(false)
    }

    setIsSpeaking(true)
    window.speechSynthesis.speak(speech)
  }

  // Cancels any ongoing speech when the current page changes
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
  isUploading={isUploading}
  onFileChange={handleFileChange}
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
  );
}

export default App;
