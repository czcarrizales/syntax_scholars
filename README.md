# Syntax Scholars

Syntax Scholars is a web-based PDF reader that extracts text into a simpler reading layout. You can navigate pages, search, listen with text-to-speech, adjust the display, generate AI summaries, and export text to Word.

**Stack:** React, TypeScript, and Vite (frontend); Python, FastAPI, and PyMuPDF (backend). Both servers run locally during development.

## Features

- **PDF processing:** Upload one PDF at a time. The custom parser identifies headings and body text, removes pages with no recognized reader text, and renumbers the remaining pages while retaining their original page references.
- **Reader:** Navigate with the sidebar or Previous / Next buttons; search extracted text; adjust font size and line spacing; use Focus Mode.
- **Text-to-speech:** Listen to the current page or a generated summary using voices available in your browser.
- **Gemini summaries:** Summarize a selected range of reader pages at **Short**, **Medium**, or **Detailed** length. A Gemini API key is required during setup.
- **Word exports:** Download extracted text or a generated summary as a `.docx` file.

**Current limitations:** The app needs a text-based PDF; it does not perform OCR or reproduce the original images, tables, equations, or page layout. The custom parser may omit content it does not identify as readable text. Password-protected PDFs are not supported. Books and reading progress are not saved between sessions. PDF bookmark data is processed by the backend, but bookmark navigation currently has a response-field mismatch (see Troubleshooting).

## Quick start — after first-time setup

Open **two terminals** from the project root. Keep both running.

**Terminal 1 — Backend**

Windows (PowerShell):

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
fastapi dev main.py
```

macOS / Linux:

```bash
cd backend
source .venv/bin/activate
fastapi dev main.py
```

Backend: http://127.0.0.1:8000 · API docs: http://127.0.0.1:8000/docs

**Terminal 2 — Frontend** (all platforms):

```bash
cd frontend
npm run dev
```

Open the URL printed by Vite, usually http://localhost:5173.

## First-time setup

### 1. Install the required tools

Install [Git](https://git-scm.com/downloads), [Node.js (LTS) with npm](https://nodejs.org/en/download), and [Python 3](https://www.python.org/downloads/).

Check with `git --version`, `node --version`, `npm --version`, and `python --version` (or `python3 --version` on macOS/Linux; `py --version` may work on Windows).

### 2. Clone the repository

```bash
git clone https://github.com/czcarrizales/syntax_scholars.git
cd syntax_scholars
```

### 3. Install frontend dependencies

```bash
cd frontend
npm ci
cd ..
```

### 4. Set up the backend

From the project root:

```bash
cd backend
```

Windows (PowerShell):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

macOS / Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

The requirements include FastAPI, PyMuPDF, Gemini's Python SDK, Word export support, `python-dotenv`, and `fonttools`. You only create the virtual environment once.

### 5. Configure Gemini (required)

**Every team member running the backend locally needs a Gemini API key.** Gemini powers the project's PDF summarization feature, so configure it as part of first-time setup.

1. Create your own key in [Google AI Studio](https://aistudio.google.com/app/apikey).
2. In the **project root** (next to `.env.example`), create a file named `.env`. You can copy `.env.example` and rename the copy.
3. Add your key to `.env`:

   ```dotenv
   GEMINI_API_KEY=your_key_here
   ```

4. Save the file, then start or restart the backend.

The backend reads the root `.env` automatically. You do **not** need to paste the key into the terminal each time. Each teammate should use their own key. The `.env` file is ignored by Git; `.env.example` can be committed. **Never commit or share a real API key.**

When you generate a summary, the selected document text is sent to Gemini. Avoid sending private or sensitive material without permission; API usage limits or charges may apply. The app currently does not enforce a 50,000-character summary limit.

### 6. Start the app

Follow [Quick start](#quick-start--after-first-time-setup). You only need to create the virtual environment and `.env` file once.

## How to use the reader

1. Choose or drag in a PDF, then click **Process PDF**. You can **Cancel** an in-progress upload.
2. Navigate using the sidebar, **Previous**, or **Next**.
3. Use **Play / Stop** to hear the current page. Change the voice or playback speed as needed.
4. Open **Search PDF** to find a word or phrase; use **Text settings** and **Focus Mode** to adjust your view.
5. Select a page range and summary length, then click **Summarize PDF**. You can play or hide the result.
6. Use **Save** to export the processed text or summary to a Word (`.docx`) file.

| Shortcut | Action |
| --- | --- |
| `←` / `→` | Previous / next page |
| `/` | Open search |
| `Esc` | Close search or leave Focus Mode |

Page shortcuts are ignored while typing in an input.

## Project structure

```text
syntax_scholars/
├── backend/
│   ├── main.py                 # FastAPI endpoints
│   ├── parser.py               # PDF extraction and reader pages
│   ├── font_decoder.py         # Font text decoding
│   ├── section_identifier.py   # Heading/section detection
│   ├── content_identifier.py   # Body-text detection
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── api/                # Backend requests and Word downloads
│   │   ├── components/         # Reader, sidebar, upload, summary, controls
│   │   ├── types/              # Reader data types
│   │   ├── utils/              # PDF validation, search, shortcuts
│   │   └── App.tsx
│   └── package.json
├── .env.example                # API key template (committed)
├── .env                        # Your private API key (NOT committed)
├── .gitignore
└── README.md
```

### API endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/hello` | Check backend connectivity |
| `POST /api/upload` | Parse an uploaded PDF into reader pages |
| `POST /api/summarize` | Generate a Gemini summary |
| `POST /api/export-word` | Export text as a Word document |

Vite forwards `/api` requests to the local FastAPI server on port `8000`.

## Running checks and tests

Frontend — from `frontend/`:

```bash
npm test
npm run build
npm run lint
```

Backend — from `backend/` with the virtual environment active:

```bash
python -m pip install -r requirements-dev.txt
python -m pytest -q
```

Also test PDF upload, navigation, speech, summaries, and Word downloads in the browser after changes.

## Git workflow

### Before starting a feature

Make sure your work is committed or stashed before switching branches:

```bash
git status
git switch main
git pull origin main
git switch -c feature/short-description
```

### Save and push your work

```bash
git status
git add path/to/changed-file
git commit -m "Describe what changed"
git push -u origin feature/short-description
```

Open a pull request into `main`. Review the changed files before merging, especially to ensure no secrets are included.

### Keep your branch updated with `main`

While on your feature branch, with your changes safely committed or stashed:

```bash
git fetch origin
git merge origin/main
```

This merges **main into your branch**, not your branch into main. Resolve any conflicts, run checks, and push again.

| Command | What it does |
| --- | --- |
| `git status` | Show branch and changed files |
| `git branch` | List local branches |
| `git switch name` | Change branches |
| `git fetch origin` | Download remote updates without merging |
| `git pull` | Fetch and integrate the tracked upstream branch |
| `git merge origin/main` | Bring latest fetched `main` into your branch |
| `git add file` | Stage one file |
| `git commit -m "message"` | Record staged changes |
| `git push` | Upload commits to GitHub |

After pulling, rerun `npm ci` if frontend dependencies changed or `python -m pip install -r requirements.txt` (from `backend/`) if backend dependencies changed.

## Troubleshooting

- **Frontend loads but PDF processing fails:** Confirm both servers are running. Check http://127.0.0.1:8000/docs and the backend terminal.
- **`ModuleNotFoundError` (such as `fontTools` or `dotenv`):** Activate `backend/.venv` and run `python -m pip install -r requirements.txt`. Use `python -m pip` to install into the active Python environment.
- **PowerShell blocks virtual environment activation:** From `backend/`, try `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`, then `./.venv/Scripts/Activate.ps1` (PowerShell also accepts `.\.venv\Scripts\Activate.ps1`).
- **Gemini summary fails:** Check that the project-root `.env` contains `GEMINI_API_KEY=...`, restart FastAPI, and inspect backend logs. A missing key, quota, model access, or network issue can cause failure.
- **Blank/missing PDF content:** Scans require OCR, which is not implemented. The custom parser may also filter out certain content or empty reader pages.
- **Bookmarks don't appear:** `backend/main.py` currently returns bookmark data as `toc`, but `frontend/src/types/book.ts` and the sidebar expect `table_of_contents`. Align those names to enable bookmark navigation.
- **Uploads take too long:** The frontend cancels upload requests after 60 seconds; try a smaller PDF.

**Team reminder:** Keep your feature branch updated from `main`, run the relevant checks before opening a PR, and never commit `.env`, virtual environments, or generated files.
