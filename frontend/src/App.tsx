import { useEffect, useState, useRef } from "react";

import Sidebar from "./components/Sidebar/Sidebar";
import UploadPanel from "./components/UploadPanel/UploadPanel";
import Reader from "./components/Reader/Reader";

import type { Book } from "./types/book";
import { uploadPdf } from "./api/uploadPdf";
import { validatePdfSelection } from "./utils/pdfSelection";

import SummaryPanel from "./components/SummaryPanel";
import { exportWord } from "./api/exportWord";

import "./App.css";

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [documentFilename, setDocumentFilename] = useState("");
  const [isSavingDocument, setIsSavingDocument] = useState(false);
  const [documentSaveError, setDocumentSaveError] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [message, setMessage] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const uploadControllerRef = useRef<AbortController | null>(null);

  // Tracks the current sentence so settings can change during speech without restarting from the beginning of the page.
  const speechChunkRef = useRef(0);
  const activeSpeechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Stores the voices and the selected voice and speech rate
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [speechRate, setSpeechRate] = useState(1);

  // Load the voices available in the browser and set the default voice if none is selected
  useEffect(() => {
    function loadVoices() {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);

      // Ensures that speech has a default voice before user selection
      if (availableVoices.length > 0 && !selectedVoice) {
        setSelectedVoice(availableVoices[0].name);
      }
    }

    loadVoices();

    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, [selectedVoice]);

  // Escape lets the reader leave Focus Mode.
  useEffect(() => {
    if (!isFocusMode) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsFocusMode(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isFocusMode]);

  function handleFileSelection(files: File[]) {
    setIsFocusMode(false);
    // Validate files from either the picker or drag-and-drop.
    const selection = validatePdfSelection(files);

    setFile(selection.file);

    // Clear out the previous PDF so we don't end up
    // showing stuff from the old one.
    setBook(null);
    setCurrentPage(0);

    // Display a validation error, if one occurred.
    setMessage(selection.error);

    // Stop speech from the previous document.
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  async function saveProcessedText() {
    if (!book || isSavingDocument) return;

    if (!documentFilename.trim()) {
      setDocumentSaveError("Please enter a filename.");
      return;
    }

    const text = book.pages
      .map((page) => `Page ${page.page}\n\n${page.text}`)
      .join("\n\n");

    if (!book.pages.some((page) => page.text.trim())) {
      setDocumentSaveError("This document has no readable text to save.");
      return;
    }

    setIsSavingDocument(true);
    setDocumentSaveError("");

    try {
      await exportWord(
        book.title.replace(/\.pdf$/i, ""),
        text,
        documentFilename
      );
    } catch (error) {
      setDocumentSaveError(
        error instanceof Error
          ? error.message
          : "Could not save the processed text."
      );
    } finally {
      setIsSavingDocument(false);
    }
  }

  async function processPdf() {
    if (!file) {
      setMessage("Choose a PDF first.");
      return;
    }

    // Prevent multiple simultaneous requests.
    if (uploadControllerRef.current) return;

    const controller = new AbortController();
    uploadControllerRef.current = controller;
    setIsFocusMode(false);
    setIsUploading(true);
    setMessage("Processing PDF...");
    setBook(null);

    try {
      // Pass the cancellation signal to our API utility.
      const data = await uploadPdf(file, controller.signal);

      // If the upload was cancelled, don't let an old
      // response come back and replace the current PDF.
      if (
        uploadControllerRef.current !== controller ||
        controller.signal.aborted
      ) {
        return;
      }

      setBook(data);
      setCurrentPage(0);
      setMessage("");
    } catch (error) {
      // Same thing with errors. We don't want an old
      // request showing an error after it's been cancelled.
      if (uploadControllerRef.current !== controller) {
        return;
      }

      setMessage(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
      );
    } finally {
      // Only the active request can change the upload state.
      if (uploadControllerRef.current === controller) {
        uploadControllerRef.current = null;
        setIsUploading(false);
      }
    }
  }

  function cancelUpload() {
    const controller = uploadControllerRef.current;

    if (!controller) return;

    // Mark the upload as inactive first so anything
    // that comes back afterward gets ignored.
    uploadControllerRef.current = null;

    // Abort the request.
    controller.abort();

    // Allow another upload without waiting for the old request.
    setIsUploading(false);
    setMessage("PDF processing cancelled.");
  }

  function previousPage() {
    setCurrentPage((page) => Math.max(page - 1, 0));
  }

  function nextPage() {
    if (!book) return;

    setCurrentPage((page) => Math.min(page + 1, book.pages.length - 1));
  }

  function getSpeechChunks(text: string) {
    return text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text];
  }

  function startSpeech(
    voiceName = selectedVoice,
    rate = speechRate
  ) {
    if (!book) return;

    const text = book.pages[currentPage]?.text;
    if (!text) return;

    const chunks = getSpeechChunks(text);
    const chunkIndex = speechChunkRef.current;

    // Reset if the stored position is past the end of the page.
    if (chunkIndex >= chunks.length) {
      speechChunkRef.current = 0;
      return;
    }

    const speech = new SpeechSynthesisUtterance(chunks[chunkIndex]);

    activeSpeechRef.current = speech;

    const voice = voices.find(
      (voice) => voice.name === voiceName
    );

    if (voice) {
      speech.voice = voice;
    }

    speech.rate = rate;
    speech.pitch = 1;

    speech.onend = () => {
      // Ignore an utterance that was replaced by a setting change.
      if (activeSpeechRef.current !== speech) return;

      speechChunkRef.current += 1;

      if (speechChunkRef.current < chunks.length) {
        startSpeech(voiceName, rate);
      } else {
        activeSpeechRef.current = null;
        speechChunkRef.current = 0;
        setIsSpeaking(false);
        setIsPaused(false);
      }
    };

    speech.onerror = () => {
      if (activeSpeechRef.current !== speech) return;

      activeSpeechRef.current = null;
      setIsSpeaking(false);
      setIsPaused(false);
    };

    setIsSpeaking(true);
    window.speechSynthesis.speak(speech);
  }

  function togglePause() {
    if (!isSpeaking) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }

  function toggleSpeech() {
    if (isSpeaking) {
      activeSpeechRef.current = null;
      window.speechSynthesis.cancel();

      speechChunkRef.current = 0;
      setIsSpeaking(false);
      setIsPaused(false);
      return;
    }

    activeSpeechRef.current = null;
    window.speechSynthesis.cancel();
    speechChunkRef.current = 0;

    setIsPaused(false);
    startSpeech();
  }

  function handleVoiceChange(newVoice: string) {
    setSelectedVoice(newVoice);

    if (isSpeaking) {
      // Replace the current sentence using the newly selected voice.
      activeSpeechRef.current = null;
      window.speechSynthesis.cancel();

      startSpeech(newVoice, speechRate);
    }
  }

  function handleRateChange(newRate: number) {
    setSpeechRate(newRate);

    if (isSpeaking) {
      // Replace the current sentence using the newly selected speed.
      activeSpeechRef.current = null;
      window.speechSynthesis.cancel();

      startSpeech(selectedVoice, newRate);
    }
  }

  // Cancels any ongoing speech when the current page changes
  useEffect(() => {
    activeSpeechRef.current = null;
    window.speechSynthesis.cancel();

    speechChunkRef.current = 0;
    setIsSpeaking(false);
    setIsPaused(false);

    return () => {
      activeSpeechRef.current = null;
      window.speechSynthesis.cancel();
    };
  }, [currentPage]);

  return (
    <div className={`app-layout${isFocusMode ? " app-layout--focus" : ""}`}>
      <Sidebar
        book={book}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      <main className="main-content">
        <UploadPanel
          file={file}
          book={book}
          message={message}
          isUploading={isUploading}
          onFilesSelected={handleFileSelection}
          onProcess={processPdf}
          onCancel={cancelUpload}
        />

        {book && (
          <section className="document-export">
            <label>
              Processed text filename:
              <input
                type="text"
                value={documentFilename}
                disabled={isSavingDocument}
                onChange={(event) =>
                  setDocumentFilename(event.target.value)
                }
                placeholder="Enter a filename"
              />
            </label>

            <button
              type="button"
              onClick={saveProcessedText}
              disabled={isSavingDocument}
            >
              {isSavingDocument ? "Saving..." : "Save"}
            </button>

            {documentSaveError && (
              <p role="alert">{documentSaveError}</p>
            )}
          </section>
        )}

        {book && (
          <SummaryPanel
            book={book}
            voices={voices}
            selectedVoice={selectedVoice}
            speechRate={speechRate}
            isPageSpeaking={isSpeaking}
            onSummaryStart={() => setIsSpeaking(false)}
          />
        )}

        {book && (
          <Reader
            book={book}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            isSpeaking={isSpeaking}
            voices={voices}
            selectedVoice={selectedVoice}
            speechRate={speechRate}
            onPrevious={previousPage}
            onNext={nextPage}
            onToggleSpeech={toggleSpeech}
            onVoiceChange={handleVoiceChange}
            onRateChange={handleRateChange}
            isFocusMode={isFocusMode}
            onToggleFocus={() => setIsFocusMode((value) => !value)}
            isPaused={isPaused}
            onTogglePause={togglePause}
          />
        )}
      </main>
    </div>
  );
}

export default App;
