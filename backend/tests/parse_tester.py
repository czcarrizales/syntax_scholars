import pymupdf

from parse import check_valid_pdf
from pathlib import Path


def create_side_by_side_comparison(file, pg_nums, output_path):
    """Create a PDF with the original page beside its extracted text."""
    with pymupdf.open(file) as original, pymupdf.open() as comparison:
        pages = [page.get_text() for page in original]

        for page_number in pg_nums:
            page_index = page_number - 1
            output_page = comparison.new_page(width=1200, height=850)

            # Original PDF on the left.
            output_page.show_pdf_page(
                pymupdf.Rect(20, 20, 590, 830),
                original,
                page_index,
                keep_proportion=True,
            )

            # Extracted text on the right.
            output_page.insert_textbox(
                pymupdf.Rect(620, 20, 1180, 830),
                pages[page_index],
                fontsize=10,
            )

        comparison.save(output_path)


def side_by_side_test_text(pg_nums):

    testing_dir = Path("test_pdfs")

    for file in testing_dir.glob("*.pdf"):
        contents = file.read_bytes()

        if check_valid_pdf(contents):
            create_side_by_side_comparison(
                file,
                pg_nums,
                file.with_name(f"{file.stem}_comparison.pdf"),
            )

side_by_side_test_text([1,3,5])
