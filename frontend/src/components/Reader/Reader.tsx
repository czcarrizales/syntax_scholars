import type { Book } from '../../types/book'
import ReaderControls from '../ReaderControls/ReaderControls'
import './Reader.css'

type ReaderProps = {
  book: Book
  currentPage: number
  onPrevious: () => void
  onNext: () => void
  onListen: () => void
  onStop: () => void
}

function Reader({
  book,
  currentPage,
  onPrevious,
  onNext,
  onListen,
  onStop,
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
        onPrevious={onPrevious}
        onNext={onNext}
        onListen={onListen}
        onStop={onStop}
      />

      <article className="reading-page">
        <p>{book.pages[currentPage]?.text}</p>
      </article>
    </section>
  )
}

export default Reader