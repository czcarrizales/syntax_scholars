
from fastapi.testclient import TestClient
import pymupdf

from main import app


client = TestClient(app)


def make_pdf(page_count=1):
    """Generate a valid PDF for testing."""
    document = pymupdf.open()

    try:
        for i in range(page_count):
            page = document.new_page()
            page.insert_text(
                (72, 72),
                f"Test page {i + 1}"
            )

        return document.tobytes()
    finally:
        document.close()


def upload(filename, contents, content_type="application/pdf"):
    """Submit a test file to the upload endpoint."""
    return client.post(
        "/api/upload",
        files={
            "file": (filename, contents, content_type)
        }
    )


def test_single_page_pdf():
    response = upload("one.pdf", make_pdf())

    assert response.status_code == 200

    data = response.json()
    assert data["title"] == "one.pdf"
    assert data["page_count"] == 1
    assert len(data["pages"]) == 1
    assert "Test page 1" in data["pages"][0]["text"]


def test_multi_page_pdf():
    response = upload("three.pdf", make_pdf(3))

    assert response.status_code == 200

    data = response.json()
    assert data["page_count"] == 3
    assert [page["page"] for page in data["pages"]] == [1, 2, 3]


def test_unsupported_file():
    response = upload(
        "notes.txt",
        b"hello",
        "text/plain"
    )

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "Only PDF files are supported."
    )


def test_empty_file():
    response = upload("empty.pdf", b"")

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "The uploaded file is empty."
    )


def test_corrupted_pdf():
    response = upload(
        "damaged.pdf",
        b"not actually a PDF"
    )

    assert response.status_code == 400
    assert "Could not open the PDF" in (
        response.json()["detail"]
    )


def test_password_protected_pdf():
    document = pymupdf.open()

    try:
        document.new_page().insert_text(
            (72, 72),
            "Hidden"
        )

        locked_pdf = document.tobytes(
            encryption=pymupdf.PDF_ENCRYPT_AES_256,
            owner_pw="owner",
            user_pw="secret"
        )
    finally:
        document.close()

    response = upload("locked.pdf", locked_pdf)

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "Password-protected PDFs are not supported."
    )
