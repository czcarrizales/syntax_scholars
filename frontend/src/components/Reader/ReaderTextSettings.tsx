
import './ReaderTextSettings.css'

type ReaderTextSettingsProps = {
  fontSize: number
  lineSpacing: number
  onFontSizeChange: (value: number) => void
  onLineSpacingChange: (value: number) => void
}

function ReaderTextSettings({
  fontSize,
  lineSpacing,
  onFontSizeChange,
  onLineSpacingChange,
}: ReaderTextSettingsProps) {
  return (
    <details className="reader-text-settings">
      <summary>Text settings</summary>

      <div className="reader-text-settings-panel">
        <label htmlFor="reader-font-size">
          Font size
        </label>

        <select
          id="reader-font-size"
          value={fontSize}
          onChange={(event) =>
            onFontSizeChange(Number(event.target.value))
          }
        >
          {[16, 18, 20, 22, 24, 26, 28].map((size) => (
            <option key={size} value={size}>
              {size}px
            </option>
          ))}
        </select>

        <label htmlFor="reader-line-spacing">
          Line spacing
        </label>

        <select
          id="reader-line-spacing"
          value={lineSpacing}
          onChange={(event) =>
            onLineSpacingChange(Number(event.target.value))
          }
        >
          <option value={1.4}>Compact</option>
          <option value={1.6}>Normal</option>
          <option value={1.75}>Comfortable</option>
          <option value={2}>Spacious</option>
        </select>

        <button
          type="button"
          onClick={() => {
            onFontSizeChange(20)
            onLineSpacingChange(1.75)
          }}
        >
          Reset
        </button>
      </div>
    </details>
  )
}

export default ReaderTextSettings
