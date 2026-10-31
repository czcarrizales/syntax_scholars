import './ReaderControls.css'

type ReaderControlsProps = {
  currentPage: number
  totalPages: number
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

function ReaderControls({
  currentPage,
  totalPages,
  isSpeaking,
  voices,
  selectedVoice,
  speechRate,
  onPrevious,
  onNext,
  onToggleSpeech,
  onVoiceChange,
  onRateChange
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

      <div className="speech-options">
  <label>
    Voice:
    <select
      value={selectedVoice}
      onChange={(e) => onVoiceChange(e.target.value)}
    >
      {voices.map((voice) => (
        <option key={voice.voiceURI} value={voice.name}>
          {voice.name} - {voice.lang}
        </option>
      ))}
    </select>
  </label>

  <label>
    Speed:
    <select
      value={speechRate}
      onChange={(e) => onRateChange(Number(e.target.value))}
    >
      <option value={0.5}>0.5x</option>
      <option value={0.75}>0.75x</option>
      <option value={1}>1x</option>
      <option value={1.25}>1.25x</option>
      <option value={1.5}>1.5x</option>
      <option value={2}>2x</option>
    </select>
  </label>
</div>


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