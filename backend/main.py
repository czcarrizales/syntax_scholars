from fastapi import FastAPI, File, HTTPException, UploadFile
import pymupdf

app = FastAPI()


@app.get("/api/hello")
def hello():
    return {"message": "Hello from FastAPI"}


@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    contents = await file.read()

    try:
        document = pymupdf.open(
            stream=contents,
            filetype="pdf"
        )
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not open the PDF."
        )

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