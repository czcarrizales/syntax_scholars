import type { Book } from "../../types/book";
import ReaderControls from "../ReaderControls/ReaderControls";
import "./Reader.css";
import { useEffect, useLayoutEffect, useState, useRef } from "react";
import ReaderSearch from "./ReaderSearch";
import ReaderTextSettings from "./ReaderTextSettings";
import { shouldIgnoreReaderShortcut } from "../../utils/readerShortcuts";

type ReaderProps = {
  book: Book;
  currentPage: number;
  isSpeaking: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: string;
  speechRate: number;
  onPrevious: () => void;
  onNext: () => void;
  onToggleSpeech: () => void;
  onVoiceChange: (voiceName: string) => void;
  onRateChange: (rate: number) => void;
  onPageChange: (pageIndex: number) => void;
  isFocusMode: boolean;
  onToggleFocus: () => void;
  isPaused: boolean
  onTogglePause: () => void
};

function readSetting(
  key: string,
  defaultValue: number,
  allowedValues: number[],
): number {
  try {
    const saved = localStorage.getItem(key);

    if (saved === null) return defaultValue;

    const value = Number(saved);

    return allowedValues.includes(value) ? value : defaultValue;
  } catch {
    return defaultValue;
  }
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
  onRateChange,
  onPageChange,
  isFocusMode,
  onToggleFocus,
  isPaused,
  onTogglePause
}: ReaderProps) {
  const [fontSize, setFontSize] = useState(() =>
    readSetting("syntax-scholars-font-size", 20, [16, 18, 20, 22, 24, 26, 28]),
  );

  const [lineSpacing, setLineSpacing] = useState(() =>
    readSetting("syntax-scholars-line-spacing", 1.75, [1.4, 1.6, 1.75, 2]),
  );

  // Remember the settings when the user changes PDFs.
  useEffect(() => {
    try {
      localStorage.setItem("syntax-scholars-font-size", String(fontSize));

      localStorage.setItem("syntax-scholars-line-spacing", String(lineSpacing));
    } catch {
      // Settings still work if browser storage is unavailable.
    }
  }, [fontSize, lineSpacing]);

  const displayTitle = book.title.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");

  const readingPageRef = useRef<HTMLElement>(null);

  // Start at the top whenever the displayed page changes.
  useLayoutEffect(() => {
    if (readingPageRef.current) {
      readingPageRef.current.scrollTop = 0;
    }
  }, [currentPage, book]);

  function handleSearchNavigate(pageIndex: number) {
    // Clicking a search result on the current page should
    // still return to the beginning of that page.
    if (pageIndex === currentPage && readingPageRef.current) {
      readingPageRef.current.scrollTop = 0;
    }

    onPageChange(pageIndex);
  }

  // Let readers change pages without using the mouse.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreReaderShortcut(event) || event.repeat) {
        return;
      }

      if (event.key === "ArrowLeft" && currentPage > 0) {
        event.preventDefault();
        onPrevious();
      }

      if (event.key === "ArrowRight" && currentPage < book.pages.length - 1) {
        event.preventDefault();
        onNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentPage, book.pages.length, onPrevious, onNext]);

  return (
    <section className={`reader${isFocusMode ? " reader--focus" : ""}`}>
      <h2>{displayTitle}</h2>

      <div className="reader-toolbar">
        {!isFocusMode && (
          <>
            <ReaderSearch book={book} onNavigate={handleSearchNavigate} />

            <ReaderTextSettings
              fontSize={fontSize}
              lineSpacing={lineSpacing}
              onFontSizeChange={setFontSize}
              onLineSpacingChange={setLineSpacing}
            />
          </>
        )}

        <button
          type="button"
          className="reader-focus-button"
          aria-pressed={isFocusMode}
          onClick={onToggleFocus}
        >
          {isFocusMode ? "Exit Focus" : "Focus Mode"}
        </button>
      </div>

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
        isPaused={isPaused}
        onTogglePause={onTogglePause}
      />

      <article ref={readingPageRef} className="reading-page">
        <p
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: lineSpacing,
          }}
        >
          {book.pages[currentPage]?.text}
        </p>
      </article>
    </section>
  );
}

export default Reader;
