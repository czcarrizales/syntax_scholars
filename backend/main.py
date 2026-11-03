from fastapi import FastAPI, File, HTTPException, UploadFile
import pymupdf

app = FastAPI()


@app.get("/api/hello")
def hello():
    return {"message": "Hello from FastAPI"}


@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    # Validate the uploaded file type
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    contents = await file.read()

    # Reject empty files
    if not contents:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty."
        )

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

        # Extract text from each page
        pages = []

        for page_number, page in enumerate(document):
            pages.append({
                "page": page_number + 1,
                "text": page.get_text()
            })

    finally:
        # Always release the PDF resource
        document.close()

    return {
        "title": file.filename,
        "page_count": len(pages),
        "pages": pages
    }