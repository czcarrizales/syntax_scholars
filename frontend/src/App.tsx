import { useState } from 'react'

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
      setMessage('')
    } catch {
      setMessage('Could not connect to the backend.')
    }
  }

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
          <p>{book.page_count} pages</p>

          <h3>Page 1</h3>
          <p>{book.pages[0]?.text}</p>
        </section>
      )}
    </main>
  )
}

export default App