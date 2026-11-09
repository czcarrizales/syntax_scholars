"""Run parser experiments on a single PDF or contiguous PDF samples."""

import random
import time
from datetime import datetime
from pathlib import Path

import pymupdf

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


def main():
    if file_selection == "single_file":
        if not file_path.is_file():
            raise FileNotFoundError(f"PDF not found: {file_path}")

        output_path = Path("layout_results") / f"{file_path.stem}_speech.txt"
        print(f"Parsing: {file_path}")
        start = time.perf_counter()
        parse_pdf(params, file_path, output_path)
        print(f"Parsed in {time.perf_counter() - start:.3f}s -> {output_path}")
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

        output_path = speech_dir / f"{pdf_path.stem}_sample_speech.txt"
        print(f"{pdf_path.name}: original pages {pages[0]}-{pages[-1]}")
        start = time.perf_counter()
        parse_pdf(params, sample_path, output_path)
        print(f"  Parsed in {time.perf_counter() - start:.3f}s -> {output_path}")

    print(f"Results: {batch_dir}")


if __name__ == "__main__":
    main()
