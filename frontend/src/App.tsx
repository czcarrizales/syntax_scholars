import { useState } from 'react'

function App() {
  const [message, setMessage] = useState('Backend not tested yet')

  async function checkBackend() {
    const response = await fetch('/api/hello')
    const data = await response.json()

    setMessage(data.message)
  }

  return (
    <main>
      <h1>Syntax Scholars</h1>

      <button onClick={checkBackend}>
        Check Backend
      </button>

      <p>{message}</p>
    </main>
  )
}

export default App