import type { Book } from "../types/book";
import { useState } from "react";

type SummaryPanelProps = {
    book: Book;
};

function SummaryPanel({ book }: SummaryPanelProps) {

    const [summary, setSummary] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    async function summarizePdf() {
        if (isLoading) return;

        const text = book.pages
            .map((page) => page.text)
            .join("\n\n")
            .trim();

        if (!text) {
            setError("This PDF has no readable text to summarize.");
            return;
        }

        if (text.length > 50000) {
            setError("This PDF is too long for the current summary feature.");
            return;
        }

        setIsLoading(true);
        setError("");
        setSummary("");

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
            <button onClick={summarizePdf} disabled={isLoading}>
                {isLoading ? "Summarizing..." : "Summarize PDF"}
            </button>

            <p>Selected document: {book.title}</p>

            {error && <p role="alert">{error}</p>}

            <div aria-live="polite">
                {summary && (
                    <>
                        <h2>Summary</h2>
                        <p>{summary}</p>
                    </>
                )}
            </div>
        </section>
    );
}

export default SummaryPanel;