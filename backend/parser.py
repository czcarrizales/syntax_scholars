"""Top-level PDF extraction and text serialization pipeline."""

import argparse
import json
from pathlib import Path

import pymupdf

from font_decoder import FontDecoder

from section_identifier import identify_sections
from content_identifier import identify_content


def extract_pdf_data(params, pdf_path):
    """Extract PDF-native lines in page reading order and embedded outline data."""
    with pymupdf.open(pdf_path) as pdf:
        font_decoder = FontDecoder(pdf)
        data = {
            "source": str(pdf_path),
            "toc": pdf.get_toc(),
            "pages": [],
        }

        for page_number, page in enumerate(pdf, start=1):
            page_mappings = font_decoder.page_mappings(page)
            items = []
            for block_index, block in enumerate(page.get_text("dict")["blocks"]):
                if block["type"] != 0:
                    continue

                block_lines = [line for line in block.get("lines", [])
                               if "".join(span["text"] for span in line["spans"]).strip()]

                for line in block_lines:
                    spans = [
                        {**span, "text": font_decoder.correct_span(span, page_mappings)}
                        for span in line["spans"]
                    ]
                    text = "".join(span["text"] for span in spans).strip()
                    if not text:
                        continue

                    items.append({
                        "id": f"p{page_number}_i{len(items)}",
                        "page": page_number,
                        "block_id": f"p{page_number}_b{block_index}",
                        "block_line_count": len(block_lines),
                        "text": text,
                        "bbox": list(line["bbox"]),
                        "spans": spans,
                    })

            # PDF content stream order can differ from visual reading order.
            # For Version 0.1, order single-column pages top-to-bottom, then
            # left-to-right within a small vertical tolerance.
            order = params.get("reading_order", "position")
            if order == "position":
                tolerance = float(params.get("reading_order_y_tolerance", 3.0))
                if tolerance <= 0:
                    raise ValueError("reading_order_y_tolerance must be positive")
                items.sort(key=lambda item: (round(item["bbox"][1] / tolerance),
                                             item["bbox"][0]))
            elif order != "extraction":
                raise ValueError(f"Unknown reading_order: {order}")

            # IDs refer to each item's location in the final reading order.
            for i, item in enumerate(items):
                item["id"] = f"p{page_number}_i{i}"

            data["pages"].append({
                "number": page_number,
                "width": page.rect.width,
                "height": page.rect.height,
                "items": items,
            })

    return data


def serialize(records):
    """Output one heading or complete body paragraph per line."""
    return "\n".join(
        " ".join(record["content"].split())
        for record in records
        if record["type"] in {"heading", "body_text"}
        and record["content"].strip()
    )


def parse_pdf(params, pdf_path, output_path=None):
    """Run extraction, section identification, and content identification."""
    pdf_path = Path(pdf_path)
    pdf_data = extract_pdf_data(params, pdf_path)

    sections = identify_sections(params, pdf_data)
    records = identify_content(params, pdf_data, sections)

    strip_chars = "".join(params.get("heading_strip_chars", []))
    for record in records:
        if record["type"] == "heading":
            record["content"] = record["content"].lstrip(strip_chars).strip()

    # print("sections")
    # for section in sections[:300]: print(section)  # -----------------------------
    # print("records")
    # for record in records[:300]: print(record)  # -----------------------------

    # Match the existing page-based API response, using filtered parser text.
    # A paragraph spanning pages is assigned to its starting page; the parser's
    # current record format does not contain page-specific paragraph slices.
    page_text = [[] for _ in pdf_data["pages"]]
    for record in records:
        if record["type"] not in {"heading", "body_text"}:
            continue
        content = " ".join(record["content"].split())
        if content and record["pages"]:
            page_number = record["pages"][0]
            page_text[page_number - 1].append(content)

    result = {
        "title": pdf_path.name,
        "page_count": len(pdf_data["pages"]),
        "pages": [
            {"page": index, "text": "\n".join(text)}
            for index, text in enumerate(page_text, start=1)
        ],
    }

    if output_path is not None:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return result

def parse_uploaded_pdf(filename, contents):
    """Parse uploaded PDF bytes and return the standard page-based result."""
    import tempfile

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

    if not contents:
        raise ValueError("The uploaded PDF is empty.")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temporary:
        temporary_path = Path(temporary.name)
        temporary.write(contents)

    try:
        result = parse_pdf(params, temporary_path)
        result["title"] = str(filename).replace("\\", "/").rsplit("/", 1)[-1]

        # Remove pages without readable text
        result["pages"] = [
            page for page in result["pages"]
            if page["text"].strip()
        ]

        # Preserve original page numbers and assign new page numbers
        for page_number, page in enumerate(result["pages"], start=1):
            page["source_page"] = page["page"]
            page["page"] = page_number

        # Update page count
        result["page_count"] = len(result["pages"])

        return result

    finally:
        temporary_path.unlink(missing_ok=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract page-grouped TTS-ready text from a PDF.")
    parser.add_argument("pdf", type=Path, help="Input PDF file")
    parser.add_argument("-o", "--output", type=Path, help="Output text file")
    args = parser.parse_args()

    output = args.output or args.pdf.with_suffix(".json")
    parse_pdf({}, args.pdf, output)
    print(f"Saved: {output}")
