import type { Book } from "../types/book";
import { useState } from "react";

type SummaryPanelProps = {
    book: Book;
};

function SummaryPanel({ book }: SummaryPanelProps) {
    const [summary, setSummary] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);
    const [startPage, setStartPage] = useState(1);
    const [endPage, setEndPage] = useState(book.pages.length);

    async function summarizePdf() {
        if (isLoading) return;

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
            setError("The selected pages have no readable text to summarize."); return;
        }



        setIsLoading(true);
        setError("");
        setSummary("");
        setIsExpanded(false);

        try {
            const response = await fetch("/api/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
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
                    : "Could not connect to the summary service.",
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
                            disabled={isLoading}
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
                            disabled={isLoading}
                            onChange={(event) =>
                                setEndPage(Number(event.target.value))
                            }
                        />
                    </label>
                </div>

                <button
                    type="button"
                    onClick={summarizePdf}
                    disabled={isLoading}
                >
                    {isLoading
                        ? "Summarizing..."
                        : summary
                            ? "Summarize again"
                            : "Summarize PDF"}
                </button>

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
            </div>

            {error && (
                <p className="summary-error" role="alert">
                    {error}
                </p>
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
