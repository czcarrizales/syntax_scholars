"""Run parser experiments on a single PDF or contiguous PDF samples."""

import random
from html import escape
import time
from datetime import datetime
from pathlib import Path

import pymupdf
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from parser import parse_pdf

### SETTINGS
params = {
    "section_method": "embedded_toc",
    "toc_levels": 0,  # 0 = no limit
    "toc_page_tolerance": 0,  # Keep fuzzy TOC matches on their destination page.
    "content_method": "statistical",
    "reading_order": "position",  # "position" (visual) or "extraction" (PDF stream)
    "reading_order_y_tolerance": 3.0,
    "prose_block_style": True,
    "prose_min_lines": 3,
    "prose_min_avg_line_length": 40,
    "merge_paragraphs": True,
    "prose_group_min_median_chars": 30,
    "prose_single_line_min_chars": 65,
    "filter_equation_sentences": True,  # Skip display equations and interrupted sentences.
    "omit_empty_sections": True,
    "include_pre_section_content": False,
    "heading_strip_chars": ["■"],
    "normalize_heading_spacing": True,
}

##some books
## Jeffrey J. McConnell - Analysis of Algorithms _ An Active Learning Approach-Jones and Bartlett Publishers (2001)
## May_Day-F._Scott_Fitzgerald

file_selection = "single_file"  # "single_file" or "directory_sampling"
file_path = Path("test_pdfs/book_set_01/May_Day-F._Scott_Fitzgerald.pdf")
input_dir = Path("test_pdfs/book_set_01")
sample_size = 20
output_root = Path("test_pdfs")
random_seed = None  # Set to an integer to reproduce the same samples.
### END SETTINGS


def create_sample(pdf_path, sample_dir, rng):
    """Save a contiguous sample and return its path and original page numbers."""
    with pymupdf.open(pdf_path) as original:
        if len(original) == 0:
            return None, []

        count = min(sample_size, len(original))
        start = rng.randint(0, len(original) - count)
        pages = list(range(start + 1, start + count + 1))

        sample_path = sample_dir / f"{pdf_path.stem}_sample.pdf"
        with pymupdf.open() as sample:
            sample.insert_pdf(original, from_page=start, to_page=start + count - 1)
            # insert_pdf does not copy PDF bookmarks. Retain entries in the sample.
            sampled_toc = [
                [level, title, page - start]
                for level, title, page in original.get_toc()
                if start < page <= start + count
            ]
            if sampled_toc:
                # A slice can begin inside a chapter; shift its first level to 1
                # and prevent gaps in the outline depth when ancestors are absent.
                shift = sampled_toc[0][0] - 1
                previous_level = 0
                for entry in sampled_toc:
                    entry[0] = max(1, min(entry[0] - shift, previous_level + 1))
                    previous_level = entry[0]
                sample.set_toc(sampled_toc)
            sample.save(sample_path)

    return sample_path, pages



def create_speech_pdf(result, output_path):
    """Render the parser's page-based API result as a readable, page-aligned PDF.

    Only source pages with speech content are rendered. Source page numbers
    stay unchanged, and long text continues onto a labeled overflow page
    rather than being clipped or silently omitted.
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Prefer an installed Unicode TrueType font. Do not bundle font files.
    font_candidates = [
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
    ]
    font_path = next((path for path in font_candidates if path.is_file()), None)
    font_name = "Helvetica"
    if font_path is not None:
        font_name = "SpeechDejaVu"
        if font_name not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(TTFont(font_name, str(font_path)))

    page_width, page_height = letter
    margin = 54
    top = page_height - 70
    bottom = 55
    usable_width = page_width - 2 * margin
    paragraph_style = ParagraphStyle(
        "SpeechParagraph",
        fontName=font_name,
        fontSize=10,
        leading=14,
        alignment=TA_LEFT,
        textColor=colors.black,
        spaceAfter=12,
        firstLineIndent=24,  # Visually distinguish the original paragraph boundaries.
        splitLongWords=True,
    )
    pdf = canvas.Canvas(str(output_path), pagesize=letter)
    pdf.setTitle(f"Parsed speech: {result.get('title', 'PDF')}")

    def start_page(source_page, continuation=False):
        pdf.setFont(font_name, 9)
        pdf.setFillColor(colors.grey)
        label = f"Source PDF page {source_page}"
        if continuation:
            label += " (continued)"
        pdf.drawString(margin, page_height - 40, label)
        pdf.line(margin, page_height - 47, page_width - margin, page_height - 47)
        pdf.drawRightString(page_width - margin, 35, f"Source page {source_page}")
        pdf.setFillColor(colors.black)
        return top

    for source_page in result["pages"]:
        if not source_page.get("text", "").strip():
            continue
        number = source_page["page"]
        y = start_page(number)
        # Each nonempty line in the API response is one original paragraph.
        # Indent its first line and leave space after it; do not join paragraphs.
        for line in source_page.get("text", "").splitlines():
            if not line.strip():
                continue
            remaining = [Paragraph(escape(line), paragraph_style)]
            while remaining:
                paragraph = remaining.pop(0)
                _, height = paragraph.wrap(usable_width, max(y - bottom, 1))
                if height <= y - bottom:
                    paragraph.drawOn(pdf, margin, y - height)
                    y -= height + paragraph_style.spaceAfter
                    continue
                if y <= bottom + paragraph_style.leading:
                    pdf.showPage()
                    y = start_page(number, continuation=True)
                available = y - bottom
                pieces = paragraph.split(usable_width, available)
                if not pieces:
                    pdf.showPage()
                    y = start_page(number, continuation=True)
                    pieces = paragraph.split(usable_width, y - bottom)
                    if not pieces:
                        raise ValueError(f"Cannot fit text on source page {number}")
                first, *rest = pieces
                _, first_height = first.wrap(usable_width, y - bottom)
                first.drawOn(pdf, margin, y - first_height)
                y -= first_height + paragraph_style.spaceAfter
                remaining = rest + remaining
                if remaining:
                    pdf.showPage()
                    y = start_page(number, continuation=True)
        pdf.showPage()
    pdf.save()


def main():
    if file_selection == "single_file":
        if not file_path.is_file():
            raise FileNotFoundError(f"PDF not found: {file_path}")

        output_path = Path("layout_results") / f"{file_path.stem}_speech.json"
        print(f"Parsing: {file_path}")
        start = time.perf_counter()
        result = parse_pdf(params, file_path, output_path)
        pdf_output = output_path.with_suffix(".pdf")
        create_speech_pdf(result, pdf_output)
        print(f"Parsed in {time.perf_counter() - start:.3f}s -> {output_path}, {pdf_output}")
        return

    if file_selection != "directory_sampling":
        raise ValueError(f"Unknown file_selection: {file_selection}")

    pdf_paths = sorted(input_dir.glob("*.pdf"))
    if not pdf_paths:
        raise FileNotFoundError(f"No PDFs found in {input_dir}")

    batch_dir = output_root / f"sampled_set_{datetime.now():%Y%m%d_%H%M%S}"
    sample_dir = batch_dir / "sample"
    speech_dir = batch_dir / "speech"
    annotated_dir = batch_dir / "annotated"  # Reserved for annotated output.
    for directory in (sample_dir, speech_dir, annotated_dir):
        directory.mkdir(parents=True, exist_ok=True)

    rng = random.Random(random_seed)

    for pdf_path in pdf_paths:
        sample_path, pages = create_sample(pdf_path, sample_dir, rng)
        if sample_path is None:
            print(f"Skipping empty PDF: {pdf_path.name}")
            continue

        output_path = speech_dir / f"{pdf_path.stem}_sample_speech.json"
        print(f"{pdf_path.name}: original pages {pages[0]}-{pages[-1]}")
        start = time.perf_counter()
        result = parse_pdf(params, sample_path, output_path)
        pdf_output = output_path.with_suffix(".pdf")
        create_speech_pdf(result, pdf_output)
        print(f"  Parsed in {time.perf_counter() - start:.3f}s -> {output_path}, {pdf_output}")

    print(f"Results: {batch_dir}")


if __name__ == "__main__":
    main()
