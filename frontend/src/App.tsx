import { useEffect, useState } from 'react'

type Page = {
  page: number
  text: string
}

type Book = {
  title: string
  page_count: number
  pages: Page[]
}

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [message, setMessage] = useState('')

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
    setCurrentPage((page) => Math.max(page - 1, 0))
  }

  function nextPage() {
    if (!book) return

    setCurrentPage((page) =>
      Math.min(page + 1, book.pages.length - 1)
    )
  }

  function listen() {
    if (!book) return

    const text = book.pages[currentPage]?.text

    if (!text) return

    window.speechSynthesis.cancel()

    const speech = new SpeechSynthesisUtterance(text)
    window.speechSynthesis.speak(speech)
  }

  function stopListening() {
    window.speechSynthesis.cancel()
  }

  useEffect(() => {
    // Stop reading if the user changes pages.
    window.speechSynthesis.cancel()

    return () => {
      window.speechSynthesis.cancel()
    }
  }, [currentPage])

  return (
    <main>
      <h1>Syntax Scholars</h1>

      <input
        type="file"
        accept=".pdf,application/pdf"
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null)
        }}
      />

      <button onClick={processPdf}>
        Process PDF
      </button>

      {message && <p>{message}</p>}

      {book && (
        <section>
          <h2>{book.title}</h2>

          <p>
            Page {currentPage + 1} of {book.page_count}
          </p>

          <div>
            <button
              onClick={previousPage}
              disabled={currentPage === 0}
            >
              Previous
            </button>

            <button
              onClick={nextPage}
              disabled={currentPage === book.pages.length - 1}
            >
              Next
            </button>
          </div>

          <div>
            <button onClick={listen}>
              Listen
            </button>

            <button onClick={stopListening}>
              Stop
            </button>
          </div>

          <hr />

          <p>
            {book.pages[currentPage]?.text}
          </p>
        </section>
      )}
    </main>
  )
}

export default App