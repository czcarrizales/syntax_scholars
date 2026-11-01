import type { Book } from "../../types/book";
import "./UploadPanel.css";

type UploadPanelProps = {
  file: File | null;
  book: Book | null;
  message: string;
  isUploading: boolean;
  onFileChange: (file: File | null) => void;
  onProcess: () => void;
};

function UploadPanel({
  file,
  book,
  message,
  isUploading,
  onFileChange,
  onProcess,
}: UploadPanelProps) {
  return (
    <section className="upload-panel">
      <input
        type="file"
        accept=".pdf,application/pdf"
        disabled={isUploading}
        onChange={(event) => {
          onFileChange(event.target.files?.[0] ?? null);
        }}
      />

      <button onClick={onProcess} disabled={isUploading}>
        {isUploading ? "Processing..." : "Process PDF"}
      </button>

      {file && (
        <p>
          {file.name}
          {book && ` — ${book.page_count} pages`}
        </p>
      )}

      {message && <p>{message}</p>}
    </section>
  );
}

export default UploadPanel;
