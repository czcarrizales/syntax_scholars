import type { Book } from "../types/book";
import { useEffect, useRef, useState } from "react";
import { exportWord } from "../api/exportWord";

type SummaryPanelProps = {
    book: Book;
    voices: SpeechSynthesisVoice[];
    selectedVoice: string;
    speechRate: number;
    isPageSpeaking: boolean;
    onSummaryStart: () => void;
};

function SummaryPanel({
    book,
    voices,
    selectedVoice,
    speechRate,
    isPageSpeaking,
    onSummaryStart,
}: SummaryPanelProps) {
    const [summary, setSummary] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);
    const [startPage, setStartPage] = useState(1);
    const [endPage, setEndPage] = useState(book.pages.length);
    const [summaryLength, setSummaryLength] = useState<
        "short" | "medium" | "detailed"
    >("medium");

    const [summaryFilename, setSummaryFilename] = useState(
        `${book.title.replace(/\.pdf$/i, "")}-summary`
    );
    const [isSavingSummary, setIsSavingSummary] = useState(false);
    const [isReadingSummary, setIsReadingSummary] = useState(false);
    const summarySpeechRef = useRef<SpeechSynthesisUtterance | null>(null);

    function toggleSummarySpeech() {
        if (summarySpeechRef.current) {
            summarySpeechRef.current = null;
            window.speechSynthesis.cancel();
            setIsReadingSummary(false);
            return;
        }

        if (!summary.trim()) return;

        onSummaryStart();
        window.speechSynthesis.cancel();

        const speech = new SpeechSynthesisUtterance(summary);
        const voice = voices.find(
            (voice) => voice.name === selectedVoice
        );

        if (voice) {
            speech.voice = voice;
        }

        speech.rate = speechRate;
        speech.pitch = 1;

        function finishReading() {
            if (summarySpeechRef.current === speech) {
                summarySpeechRef.current = null;
                setIsReadingSummary(false);
            }
        }

        speech.onend = finishReading;
        speech.onerror = finishReading;

        summarySpeechRef.current = speech;
        setIsReadingSummary(true);
        window.speechSynthesis.speak(speech);
    }

    useEffect(() => {
        setIsReadingSummary(false);

        return () => {
            if (summarySpeechRef.current) {
                summarySpeechRef.current = null;
                window.speechSynthesis.cancel();
            }
        };
    }, [summary, book]);

    useEffect(() => {
        if (isPageSpeaking) {
            summarySpeechRef.current = null;
            setIsReadingSummary(false);
        }
    }, [isPageSpeaking]);

    async function saveSummary() {
        if (!summary || isSavingSummary || isLoading) return;

        if (!summaryFilename.trim()) {
            setError("Please enter a filename for the summary.");
            return;
        }

        setIsSavingSummary(true);
        setError("");

        try {
            await exportWord(
                `Summary of ${book.title}`,
                summary,
                summaryFilename
            );
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Could not save the summary."
            );
        } finally {
            setIsSavingSummary(false);
        }
    }

    async function summarizePdf() {
        if (isLoading || isSavingSummary) return;

        if (
            !Number.isInteger(startPage) ||
            !Number.isInteger(endPage) ||
            startPage < 1 ||
            endPage > book.pages.length ||
            startPage > endPage
        ) {
            setError("Enter a valid page range within this PDF.");
            return;
        }

        const text = book.pages
            .slice(startPage - 1, endPage)
            .map((page) => page.text)
            .join("\n\n")
            .trim();

        if (!text) {
            setError("The selected pages have no readable text to summarize.");
            return;
        }

        setIsLoading(true);
        setError("");
        setSummary("");
        setIsExpanded(false);

        try {
            const response = await fetch("/api/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, length: summaryLength }),
            });

            if (!response.ok) {
                throw new Error("Could not summarize the PDF. Please try again.");
            }

            const data = await response.json();

            if (typeof data.summary !== "string" || !data.summary.trim()) {
                throw new Error("The service returned an invalid summary.");
            }

            setSummary(data.summary.trim());
            setIsExpanded(true);
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Could not connect to the summary service."
            );
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <section className="summary-panel">
            <div className="summary-header">
                <div className="summary-page-range">
                    <label>
                        From page:
                        <input
                            type="number"
                            min={1}
                            max={book.pages.length}
                            value={startPage}
                            disabled={isLoading || isSavingSummary}
                            onChange={(event) =>
                                setStartPage(Number(event.target.value))
                            }
                        />
                    </label>

                    <label>
                        To page:
                        <input
                            type="number"
                            min={1}
                            max={book.pages.length}
                            value={endPage}
                            disabled={isLoading || isSavingSummary}
                            onChange={(event) =>
                                setEndPage(Number(event.target.value))
                            }
                        />
                    </label>
                </div>

                <label>
                    Summary length:
                    <select
                        value={summaryLength}
                        disabled={isLoading}
                        onChange={(event) => {
                            const value = event.target.value;

                            if (
                                value === "short" ||
                                value === "medium" ||
                                value === "detailed"
                            ) {
                                setSummaryLength(value);
                            }
                        }}
                    >
                        <option value="short">Short</option>
                        <option value="medium">Medium</option>
                        <option value="detailed">Detailed</option>
                    </select>
                </label>

                <button
                    type="button"
                    onClick={summarizePdf}
                    disabled={isLoading || isSavingSummary}
                >
                    {isLoading
                        ? "Summarizing..."
                        : summary
                            ? "Summarize again"
                            : "Summarize PDF"}
                </button>


            </div>

            {summary && (
                <button
                    type="button"
                    className={
                        isReadingSummary
                            ? "summary-speech stop"
                            : "summary-speech play"
                    }
                    onClick={toggleSummarySpeech}
                    disabled={isLoading}
                    aria-pressed={isReadingSummary}
                >
                    {isReadingSummary ? "■ Stop" : "▶ Play Summary"}
                </button>
            )}

            {summary && (
                <button
                    type="button"
                    className="summary-toggle"
                    aria-expanded={isExpanded}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {isExpanded ? "Hide summary" : "Show summary"}
                </button>
            )}

            {error && (
                <p className="summary-error" role="alert">
                    {error}
                </p>
            )}

            {summary && (
                <div className="summary-export">
                    <label>
                        Summary filename:
                        <input
                            type="text"
                            value={summaryFilename}
                            disabled={isSavingSummary}
                            onChange={(event) =>
                                setSummaryFilename(event.target.value)
                            }
                            placeholder="Enter a filename"
                        />
                    </label>

                    <button
                        type="button"
                        onClick={saveSummary}
                        disabled={isSavingSummary || isLoading}
                    >
                        {isSavingSummary ? "Saving..." : "Save"}
                    </button>
                </div>
            )}

            {summary && isExpanded && (
                <div className="summary-content" aria-live="polite">
                    <h2>Summary</h2>
                    <p>{summary}</p>
                </div>
            )}
        </section>
    );
}

export default SummaryPanel;