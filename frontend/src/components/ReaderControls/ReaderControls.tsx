import './ReaderControls.css'

type ReaderControlsProps = {
  currentPage: number
  totalPages: number
  onPrevious: () => void
  onNext: () => void
  onListen: () => void
  onStop: () => void
}

function ReaderControls({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  onListen,
  onStop,
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

      <button onClick={onListen}>
        Listen
      </button>

      <button onClick={onStop}>
        Stop
      </button>
    </div>
  )
}

export default ReaderControls