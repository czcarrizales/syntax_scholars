"""Top-level PDF extraction and text serialization pipeline."""

import argparse
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

    print("sections")
    for section in sections[:300]: print(section)  # -----------------------------
    print("records")
    for record in records[:300]: print(record)  # -----------------------------

    result = serialize(records)

    if output_path is not None:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(result + ("\n" if result else ""), encoding="utf-8")

    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract TTS-ready text from a PDF.")
    parser.add_argument("pdf", type=Path, help="Input PDF file")
    parser.add_argument("-o", "--output", type=Path, help="Output text file")
    args = parser.parse_args()

    output = args.output or args.pdf.with_suffix(".txt")
    parse_pdf({}, args.pdf, output)
    print(f"Saved: {output}")
