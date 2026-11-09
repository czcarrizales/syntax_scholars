import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Book } from "../../types/book";
import { searchPdf } from "../../utils/searchPdf";
import { shouldIgnoreReaderShortcut } from "../../utils/readerShortcuts";
import "./ReaderSearch.css";

type ReaderSearchProps = {
  book: Book;
  onNavigate: (pageIndex: number) => void;
};

function ReaderSearch({ book, onNavigate }: ReaderSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const results = useMemo(
    () => searchPdf(book.pages, query),
    [book.pages, query],
  );

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      // Escape closes search and returns focus to its button.
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        return;
      }

      // "/" opens search, unless the user is typing.
      if (event.key === "/" && !isOpen && !shouldIgnoreReaderShortcut(event)) {
        event.preventDefault();
        setIsOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleResultClick(pageIndex: number) {
    onNavigate(pageIndex);
    setIsOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <div className="reader-search">
      <button
        ref={buttonRef}
        type="button"
        className="reader-search-toggle"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => setIsOpen(!isOpen)}
      >
        Search PDF
      </button>

      {isOpen && (
        <div
          id={panelId}
          className="reader-search-panel"
          role="search"
          aria-label="Search current PDF"
        >
          <label htmlFor={`${panelId}-input`}>Search this PDF</label>

          <input
            ref={inputRef}
            id={`${panelId}-input`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Enter a word or phrase"
          />

          {query.trim() ? (
            <>
              <p className="reader-search-status" role="status">
                {results.length} matching{" "}
                {results.length === 1 ? "page" : "pages"}
              </p>

              <div className="reader-search-results">
                {results.map((result) => (
                  <button
                    key={result.pageIndex}
                    type="button"
                    onClick={() => handleResultClick(result.pageIndex)}
                    aria-keyshortcuts="/"
                    title="Search PDF (shortcut: /)"
                  >
                    <strong>Page {result.pageNumber}</strong>
                    <span>{result.snippet}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="reader-search-status">
              Search for text anywhere in this PDF.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default ReaderSearch;
