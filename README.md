# Syntax Scholars

Syntax Scholars is a web application that turns PDF documents into a text-based reading experience. Upload a PDF, move between pages, listen with text-to-speech, search its extracted text, and adjust the reader to make longer documents more comfortable to read.

The project has a **React / TypeScript / Vite frontend** and a **Python / FastAPI / PyMuPDF backend**. They run separately during local development.

## Features

- **PDF upload:** Choose or drag in a PDF. The backend checks the file and extracts text one page at a time.
- **Navigation:** Move between pages with the sidebar or Previous / Next buttons. PDF bookmarks, when available, also appear in the sidebar.
- **Text-to-speech:** Use your browser's available voices, choose a playback speed, and play or stop the current page.
- **Search:** Find a word or phrase in the extracted text, see matching pages and snippets, and jump to a result.
- **Text settings:** Adjust font size and line spacing. These preferences are saved in your browser.
- **Focus Mode:** Hide the sidebar, upload bar, summary, and extra controls so you can concentrate on reading.
- **PDF summaries:** Generate a short summary of the extracted text through Google's Gemini API when an API key is configured.
- **Keyboard support:** Use the Left / Right arrow keys to change pages, `/` to open search, and `Esc` to close search or leave Focus Mode.

**Current limits:** The reader uses extractable PDF text. It does not perform OCR on scanned pages, and it does not display the original PDF's images or page formatting. Search is case-insensitive and returns one result per matching page rather than highlighting every occurrence. Password-protected PDFs are not supported. Summarization currently rejects documents whose combined extracted text exceeds **50,000 characters**. The app does not currently save books or reading progress between sessions.

## Quick start — after first-time setup

Open **two terminals** from the project folder. Both servers must be running for PDF upload and processing to work.

**Terminal 1 — Backend**

Windows (PowerShell):

```powershell
cd backend
.venv\Scripts\Activate.ps1
fastapi dev main.py
```

macOS / Linux:

```bash
cd backend
source .venv/bin/activate
fastapi dev main.py
```

The backend normally runs at **http://127.0.0.1:8000**. API documentation is at **http://127.0.0.1:8000/docs**.

**Terminal 2 — Frontend** (all platforms):

```bash
cd frontend
npm run dev
```

Open the address printed by Vite, normally **http://localhost:5173**.

> If this is your first time running the project, follow the setup instructions below before using Quick start.

## First-time setup

### 1. Install the required tools

You need **Git**, **Node.js + npm**, and **Python**.

- Git: https://git-scm.com/downloads
- Node.js (LTS): https://nodejs.org/en/download
- Python: https://www.python.org/downloads/

Check that they are available:

Windows (PowerShell):

```powershell
git --version
node --version
npm --version
python --version
```

If `python` isn't available on Windows, try `py --version` instead.

macOS / Linux:

```bash
git --version
node --version
npm --version
python3 --version
```

### 2. Clone the repository

```bash
git clone https://github.com/czcarrizales/syntax_scholars.git
cd syntax_scholars
```

The commands in the following steps start from the **project root** (`syntax_scholars/`).

### 3. Install frontend dependencies

```bash
cd frontend
npm ci
cd ..
```

`npm ci` installs the dependencies recorded in `package-lock.json`. Use `npm install` when you intentionally add or change dependencies.

### 4. Create the backend virtual environment

```bash
cd backend
```

Windows (PowerShell):

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

Use `py -m venv .venv` if Windows recognizes `py` rather than `python`.

macOS / Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

A `(.venv)` prefix usually appears in the terminal after activation. The virtual environment is local to your machine and should not be committed.

### 5. Install backend dependencies

With the virtual environment active and your terminal in `backend/`:

```bash
python -m pip install -r requirements.txt
```

The backend dependencies include `fastapi[standard]`, `pymupdf`, and `google-genai`.

### 6. Start both servers

From here, follow [Quick start](#quick-start--after-first-time-setup). You do not need to recreate the virtual environment or reinstall packages every time you start the app.

## Optional: Set up Gemini PDF summaries

**You do not need a Gemini API key to upload PDFs, navigate, search, adjust text settings, or use browser text-to-speech.** The key is only required when you click **Summarize PDF**.

1. Create a Gemini API key through [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Set the `GEMINI_API_KEY` environment variable in the **same terminal session** you'll use to start the FastAPI backend.
3. Start (or restart) the backend with `fastapi dev main.py`.

Windows (PowerShell):

```powershell
$env:GEMINI_API_KEY = Read-Host "Paste Gemini API key"
fastapi dev main.py
```

macOS / Linux (bash or zsh):

```bash
read -s GEMINI_API_KEY
echo
export GEMINI_API_KEY
fastapi dev main.py
```

For the macOS/Linux commands, paste the key when `read` is waiting for input and press Enter; the key will not be displayed. In PowerShell, `Read-Host` may echo what you type, so avoid showing or sharing terminal screenshots containing the key.

**Keep the key private.** Do not put it in `main.py`, frontend code, Git commits, screenshots, or the README. These commands set the variable for the current terminal session; you may need to repeat them in a new terminal.

The summary endpoint currently accepts up to **50,000 characters** of extracted text. Requests exceeding that limit are rejected by the app; the limit is not a general statement about Gemini's capacity. Google API access may have rate limits or costs depending on your account and usage. Also, selecting **Summarize PDF** sends the extracted document text to an external AI service, so avoid submitting private or sensitive material unless you have permission to do so.

## How to use the reader

1. Open the frontend in your browser.
2. Choose a PDF or drop one into the upload area, then select **Process PDF**.
3. Use the sidebar, **Previous**, or **Next** to move through pages.
4. Use **Play / Stop** to listen to the current page. Available voices depend on your browser and operating system.
5. Open **Search PDF** to find text and jump to a matching page.
6. Open **Text settings** to change the font size and line spacing; use **Reset** for the defaults.
7. Select **Focus Mode** to give reading more space; select **Exit Focus** to restore the normal layout.
8. If Gemini is configured and the document meets the length limit, select **Summarize PDF**. The summary can be shown or hidden after it is generated.

### Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Left Arrow` | Previous page |
| `Right Arrow` | Next page |
| `/` | Open PDF search |
| `Esc` | Close search or exit Focus Mode |
| `Tab` / `Shift + Tab` | Move between controls |
| `Enter` / `Space` | Activate a focused button |

Page shortcuts are ignored while typing or using form controls. Browser shortcut behavior may vary by operating system and browser.

## Project structure

```text
syntax_scholars/
├── backend/
│   ├── main.py                 # FastAPI upload and summary endpoints
│   ├── requirements.txt        # Runtime dependencies
│   ├── requirements-dev.txt    # Test dependencies
│   ├── tests/                  # Backend tests
│   └── .venv/                  # Local only; not committed
├── frontend/
│   ├── src/
│   │   ├── api/                # Requests to the backend
│   │   ├── components/
│   │   │   ├── Reader/         # Reading area, search, text settings
│   │   │   ├── ReaderControls/ # Page and speech controls
│   │   │   ├── Sidebar/        # PDF bookmark and page navigation
│   │   │   └── UploadPanel/    # File selection and upload UI
│   │   ├── types/              # Shared frontend data types
│   │   ├── utils/              # Validation, search, shortcuts
│   │   ├── App.tsx             # Main application state and layout
│   │   └── App.css
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.ts          # Proxies /api requests to FastAPI
├── .gitignore
└── README.md
```

The frontend also contains the summary panel component at `frontend/src/components/SummaryPanel.tsx`.

### API endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/hello` | Simple backend response for checking connectivity |
| `POST /api/upload` | Accepts a PDF and returns its extracted pages and any PDF bookmarks |
| `POST /api/summarize` | Accepts extracted text and returns a Gemini summary; requires an API key |

During development, Vite proxies `/api` requests to the backend at `http://127.0.0.1:8000`.

## Running checks and tests

**Frontend:** from `frontend/`:

```bash
npm test
npm run build
npm run lint
```

- `npm test` runs the Vitest tests.
- `npm run build` checks TypeScript and builds the frontend.
- `npm run lint` runs Oxlint.

**Backend:** from `backend/` with `.venv` activated:

```bash
python -m pip install -r requirements-dev.txt
python -m pytest -q
```

The dev requirements include the runtime dependencies plus `httpx` and `pytest`. You normally only need to install them once or when the requirements change.

After code changes, also do a quick browser check of upload, navigation, search, text settings, Focus Mode, and speech playback. Check summarization when an API key is available.

## Git workflow

### Before starting a feature

Make sure you know which branch you're on and that your working changes are safe:

```bash
git status
git switch main
git pull origin main
git switch -c feature/short-description
```

Only switch branches when your current changes are committed, stashed, or otherwise safe. If you already have a feature branch, switch to it instead of creating another one.

### Save and push your changes

```bash
git status
git add path/to/changed-file
# Repeat git add for other files you intend to include.
git commit -m "Describe what changed"
git push -u origin feature/short-description
```

After setting the upstream for the first time, `git push` is normally enough.

Use focused commits that explain *what changed*. A commit should not mix unrelated features and cleanup if they can reasonably be separate.

### Keep your feature branch up to date with main

Other team members will keep merging changes while you work. Regularly bring the latest `main` into your feature branch:

```bash
git status
git fetch origin
git merge origin/main
```

Run those commands **while checked out on your feature branch**, with local work safely committed or stashed.

- `git fetch origin` downloads remote updates but does **not** merge them into your working branch.
- `git merge origin/main` brings the latest fetched `main` into your current branch.
- If Git reports conflicts, open the marked files, resolve the conflicts, `git add` the resolved files, and complete the merge commit if prompted.
- Then run the relevant tests and `git push` your branch.

**Direction matters:** `git merge origin/main` while on `feature/foo` brings **main into feature/foo**. It does *not* merge `feature/foo` into main. Your feature gets into main after its pull request is reviewed and merged.

### Git cheat sheet

| Command | What it does |
| --- | --- |
| `git status` | Shows your branch and changes |
| `git branch` | Lists local branches |
| `git switch branch-name` | Switches branches |
| `git switch -c branch-name` | Creates and switches to a new branch |
| `git add file` | Stages a specific file |
| `git add .` | Stages changes in the current directory and below; review first |
| `git commit -m "message"` | Records the staged changes |
| `git push` | Sends committed changes to GitHub |
| `git pull` | Fetches and integrates changes for the selected upstream branch |
| `git fetch origin` | Downloads remote branch updates without merging |
| `git merge origin/main` | Merges the latest fetched `main` into the current branch |
| `git log --oneline` | Shows recent commits in a compact format |

### After pulling updates

If `frontend/package.json` or `frontend/package-lock.json` changed:

```bash
cd frontend
npm ci
```

If `backend/requirements.txt` or `backend/requirements-dev.txt` changed, activate the virtual environment and install the relevant requirements again:

```bash
python -m pip install -r requirements.txt
```

For backend test dependencies, use `requirements-dev.txt` instead. Restart development servers when needed.

## Troubleshooting

### Frontend opens, but processing fails

Check that **both** terminals are running. Visit **http://127.0.0.1:8000/docs** to confirm the backend started. Vite's `/api` proxy depends on the backend being available.

### `npm` or `node` is not recognized

Install Node.js LTS, then restart your terminal and check `node --version` and `npm --version`.

### `python` is not recognized

Confirm Python is installed. On Windows, try `py --version`; on macOS/Linux, use `python3 --version` before creating the virtual environment.

### PowerShell won't activate `.venv`

If the execution policy blocks activation, you can allow scripts for only the current PowerShell session:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.venv\Scripts\Activate.ps1
```

Run this from `backend/`. Alternatively, use the virtual environment's Python directly without activating it, for example `.venv\Scripts\python.exe -m pip install -r requirements.txt`.

### `fastapi` or a Python package is missing

Activate the backend virtual environment, then run:

```bash
python -m pip install -r requirements.txt
```

If you see `ModuleNotFoundError: No module named 'google'`, make sure `google-genai` was installed from `backend/requirements.txt` **inside the active virtual environment**.

### PDF has no readable text

Some PDFs are scanned images or contain unusual layouts. The current backend extracts embedded text; it does not perform OCR. Try a different text-based PDF.

### Summarization fails

Check that `GEMINI_API_KEY` is set in the same terminal running FastAPI, then read the backend terminal output. A missing key, model/API access issue, quota limit, or network error may cause summarization to fail. Don't share the key when asking for help.

If the app reports **“This PDF is too long for the current summary feature”**, the extracted text exceeded the app's 50,000-character limit. Try a shorter text-based PDF; uploading the same file again won't bypass that limit.

### Pulled code stopped working

Check `git status`, reinstall dependencies if their files changed, restart both servers, and check the backend terminal plus browser console for the actual error. Avoid deleting local changes or resetting branches just to fix a setup issue.

## Team reminder

Before writing new code, check `git status` and pull the latest `main` into your feature branch when needed. That reduces the chance of spending days implementing something on top of outdated code.

Use pull requests to review changes before they enter `main`, and keep API keys, virtual environments, `node_modules`, and generated build files out of Git.
