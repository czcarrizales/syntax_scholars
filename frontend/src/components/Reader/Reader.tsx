import type { Book } from '../../types/book'
import ReaderControls from '../ReaderControls/ReaderControls'
import './Reader.css'

type ReaderProps = {
  book: Book
  currentPage: number
  isSpeaking: boolean
  onPrevious: () => void
  onNext: () => void
  onToggleSpeech: () => void
}

function Reader({
  book,
  currentPage,
  isSpeaking,
  onPrevious,
  onNext,
  onToggleSpeech,
}: ReaderProps) {
    const displayTitle = book.title
    .replace(/\.pdf$/i, '')
    .replace(/[-_]/g, ' ')

  return (
    <section className="reader">
      <h2>{displayTitle}</h2>

      <ReaderControls
  currentPage={currentPage}
  totalPages={book.pages.length}
  isSpeaking={isSpeaking}
  onPrevious={onPrevious}
  onNext={onNext}
  onToggleSpeech={onToggleSpeech}
/>

      <article className="reading-page">
        <p>{book.pages[currentPage]?.text}</p>
      </article>
    </section>
  )
}

export default Reader