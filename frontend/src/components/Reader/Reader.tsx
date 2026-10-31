import type { Book } from '../../types/book'
import ReaderControls from '../ReaderControls/ReaderControls'
import './Reader.css'

type ReaderProps = {
  book: Book
  currentPage: number
  isSpeaking: boolean
  voices: SpeechSynthesisVoice[]
  selectedVoice: string
  speechRate: number
  onPrevious: () => void
  onNext: () => void
  onToggleSpeech: () => void
  onVoiceChange: (voiceName: string) => void
  onRateChange: (rate: number) => void
}

function Reader({
  book,
  currentPage,
  isSpeaking,
  voices,
  selectedVoice,
  speechRate,
  onPrevious,
  onNext,
  onToggleSpeech,
  onVoiceChange,
  onRateChange
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
  voices={voices}
  selectedVoice={selectedVoice}
  speechRate={speechRate}
  onPrevious={onPrevious}
  onNext={onNext}
  onToggleSpeech={onToggleSpeech}
  onVoiceChange={onVoiceChange}
  onRateChange={onRateChange}
/>

      <article className="reading-page">
        <p>{book.pages[currentPage]?.text}</p>
      </article>
    </section>
  )
}

export default Reader