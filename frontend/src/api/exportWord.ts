
//requests the Word document and downloads it using the filename
export async function exportWord(
    title: string,
    text: string,
    filename: string
) {
    const response = await fetch("/api/export-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, text }),
    });

    if (!response.ok) {
        throw new Error("Could not create the Word document. Please try again.");
    }

    const safeName = filename
        .trim()
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
        .replace(/[. ]+$/, "");

    if (!safeName) {
        throw new Error("Please enter a filename.");
    }

    const downloadName = safeName.toLowerCase().endsWith(".docx")
        ? safeName
        : `${safeName}.docx`;

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}