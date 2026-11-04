from fastapi import FastAPI, File, HTTPException, UploadFile
import pymupdf

def check_valid_pdf(contents): # returns true if valid. returns false if invalid
    # Attempt to open the PDF
    try:
        document = pymupdf.open(
            stream=contents,
            filetype="pdf"
        )
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not open the PDF. The file may be corrupted or invalid."
        )

    try:
        # Reject password-protected PDFs
        if document.needs_pass:
            raise HTTPException(
                status_code=400,
                detail="Password-protected PDFs are not supported."
            )

        # Reject documents without pages
        if document.page_count == 0:
            raise HTTPException(
                status_code=400,
                detail="The PDF contains no pages."
            )

        return True

    finally:
        # Always release the PDF resource
        document.close()

    raise HTTPException(
        status_code=400,
        detail="Valid PDF failed."
    )
    return False

def parse_text(file):
    contents = file.read()

    if check_valid_pdf(contents):
        document = pymupdf.open(
            stream=contents,
            filetype="pdf"
        )
        # Extract text from each page
        pages = []
        for page_number, page in enumerate(document):
            pages.append({
                "page": page_number + 1,
                "text": page.get_text()
            })
        document.close()

    return {
        "title": file.filename,
        "page_count": len(pages),
        "pages": pages
    }