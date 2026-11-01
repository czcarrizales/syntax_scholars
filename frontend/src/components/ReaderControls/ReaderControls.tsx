import './ReaderControls.css'

type ReaderControlsProps = {
  currentPage: number
  totalPages: number
  isSpeaking: boolean
  onPrevious: () => void
  onNext: () => void
  onToggleSpeech: () => void
}

function ReaderControls({
  currentPage,
  totalPages,
  isSpeaking,
  onPrevious,
  onNext,
  onToggleSpeech,
}: ReaderControlsProps) {
  return (
    <div className="reader-controls">
      <button
        onClick={onPrevious}
        disabled={currentPage === 0}
      >
        Previous
      </button>

      <span>
        Page {currentPage + 1} of {totalPages}
      </span>

      <button
        onClick={onNext}
        disabled={currentPage === totalPages - 1}
      >
        Next
      </button>

      <button
  className={isSpeaking ? 'speech-button stop' : 'speech-button play'}
  onClick={onToggleSpeech}
>
  {isSpeaking ? '■ Stop' : '▶ Play'}
</button>
    </div>
  )
}

export default ReaderControls