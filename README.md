# Syntax Scholars

Syntax Scholars is a web application for processing PDF documents into a more accessible reading interface with page navigation and text-to-speech.

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Web Speech API

### Backend
- Python
- FastAPI
- PyMuPDF

The frontend and backend run separately during development.

**Both must be running for the full application to work.**

---

# Quick Run

> [!WARNING]
> ## First time running the project?
> **STOP HERE AND COMPLETE THE [First-Time Setup](#first-time-setup) FIRST.**
>
> The commands below assume you have already installed the frontend dependencies and created the backend virtual environment.

You need **two terminals**.

## Terminal 1 — Backend

### Windows

```powershell
cd backend
.venv\Scripts\Activate.ps1
fastapi dev main.py
```

### macOS / Linux

```bash
cd backend
source .venv/bin/activate
fastapi dev main.py
```

The backend should start at:

```text
http://127.0.0.1:8000
```

---

## Terminal 2 — Frontend

Windows, macOS, and Linux:

```bash
cd frontend
npm run dev
```

Vite will normally start the frontend at:

```text
http://localhost:5173
```

Open that address in your browser.

### That's it.

You should now have:

```text
Frontend: http://localhost:5173
Backend:  http://127.0.0.1:8000
```

---

# First-Time Setup

You only need to complete this section after cloning the repository for the first time.

## 1. Requirements

Before starting, make sure you have:

- Git
- Node.js
- npm
- Python

### Node.js

Download an **LTS version** of Node.js:

https://nodejs.org/en/download

npm is included with Node.js.

Check the installation:

```bash
node -v
npm -v
```

### Python

Download Python:

https://www.python.org/downloads/

Check the installation:

### Windows

```powershell
python --version
```

If that does not work:

```powershell
py --version
```

### macOS / Linux

```bash
python3 --version
```

---

## 2. Clone the Repository

```bash
git clone https://github.com/czcarrizales/syntax_scholars
cd syntax_scholars
```

---

## 3. Set Up the Frontend

From the project root:

```bash
cd frontend
npm install
cd ..
```

`npm install` installs everything listed in `frontend/package.json`.

---

## 4. Set Up the Backend

From the project root:

```bash
cd backend
```

The backend uses a Python virtual environment so that project packages are kept separate from the rest of your computer.

### Windows

Create the virtual environment:

```powershell
python -m venv .venv
```

If `python` does not work:

```powershell
py -m venv .venv
```

Activate it:

```powershell
.venv\Scripts\Activate.ps1
```

### macOS / Linux

Create the virtual environment:

```bash
python3 -m venv .venv
```

Activate it:

```bash
source .venv/bin/activate
```

When activated, your terminal should normally begin with something similar to:

```text
(.venv)
```

---

## 5. Install Backend Dependencies

With the virtual environment activated:

```bash
python -m pip install -r requirements.txt
```

If your system uses `python3`:

```bash
python3 -m pip install -r requirements.txt
```

This installs the backend dependencies, including:

- FastAPI
- PyMuPDF

---

## 6. Run the Project

Return to the [Quick Run](#quick-run) section.

From now on, you normally only need to start the backend and frontend servers.

You do **not** need to repeat the entire first-time setup every time.

---

# Project Structure

```text
syntax_scholars/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .venv/                  # Local only; not committed
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Reader/
│   │   │   ├── ReaderControls/
│   │   │   ├── Sidebar/
│   │   │   └── UploadPanel/
│   │   │
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   │
│   ├── package.json
│   └── vite.config.ts
│
├── .gitignore
└── README.md
```

---

# Backend Development

The backend runs using FastAPI.

Start it from the `backend` directory with the virtual environment activated:

```bash
fastapi dev main.py
```

The backend runs at:

```text
http://127.0.0.1:8000
```

FastAPI automatically provides interactive API documentation at:

```text
http://127.0.0.1:8000/docs
```

This is useful for directly testing backend endpoints.

---

# Frontend Development

The frontend uses React, TypeScript, and Vite.

Start it from the `frontend` directory:

```bash
npm run dev
```

Vite will display the local development address, normally:

```text
http://localhost:5173
```

During development, the frontend and backend should normally both remain running in separate terminals.

---

# Git Workflow

## Before You Start Working

**Keep your copy of the repository up to date.**

If you are working directly on `main`:

```bash
git switch main
git pull
```

This downloads the latest changes from the remote `main` branch and updates your local `main`.

---

## Working on a Branch

Create a branch from an up-to-date `main`:

```bash
git switch main
git pull
git switch -c feature/your-feature
```

Example:

```bash
git switch -c feature/pdf-cleanup
```

Make your changes, then:

```bash
git add .
git commit -m "Describe what you changed"
git push -u origin feature/your-feature
```

After the first push, you can normally use:

```bash
git push
```

---

# Keeping Your Branch Updated With Main

While you are working, other people may continue adding changes to `main`.

**Do not let your branch sit on an extremely old version of `main`.**

First, make sure your current work is committed.

Then:

```bash
git fetch origin
git merge origin/main
```

This brings the newest remote `main` changes into your current branch without deleting your branch's work.

If Git finds conflicting edits, it may ask you to resolve a merge conflict before completing the merge.

After resolving conflicts:

```bash
git add .
git commit
```

Then continue working or push your updated branch.

---

# Git Cheat Sheet

| Command | What it does |
| --- | --- |
| `git status` | Shows changed files and the current branch |
| `git branch` | Shows your local branches |
| `git switch branch-name` | Switches to another branch |
| `git switch -c branch-name` | Creates a new branch and switches to it |
| `git add .` | Stages your current changes |
| `git commit -m "message"` | Saves the staged changes as a commit |
| `git push` | Sends your commits to GitHub |
| `git pull` | Fetches and integrates updates for the branch you are pulling from |
| `git fetch origin` | Downloads information about the newest remote commits without changing your working files |
| `git merge origin/main` | Merges the latest downloaded `main` into your current branch |
| `git log --oneline` | Shows a compact commit history |

### Important distinction

```bash
git fetch origin
```

**does not automatically put `main`'s code into your branch.**

It only downloads information about the newest remote changes.

To actually bring the newest `main` into your current branch:

```bash
git fetch origin
git merge origin/main
```

---

# After Pulling New Changes

Sometimes another teammate may add or update project dependencies.

If you pull new frontend code and dependencies changed:

```bash
cd frontend
npm install
```

If backend dependencies changed:

### Windows

```powershell
cd backend
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

### macOS / Linux

```bash
cd backend
source .venv/bin/activate
python -m pip install -r requirements.txt
```

You do not need to reinstall dependencies after every pull — only when the dependency files have changed or when something is missing.

---

# Common Problems

## `npm` is not recognized

Install Node.js:

https://nodejs.org/en/download

Then close and reopen your terminal.

Check:

```bash
node -v
npm -v
```

---

## `python` is not recognized

Make sure Python is installed:

https://www.python.org/downloads/

On Windows, you can also try:

```powershell
py --version
```

On macOS/Linux:

```bash
python3 --version
```

---

## PowerShell will not activate `.venv`

If PowerShell refuses to run:

```powershell
.venv\Scripts\Activate.ps1
```

because of its execution policy, you can temporarily allow scripts for the current terminal session:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then try activating the environment again:

```powershell
.venv\Scripts\Activate.ps1
```

---

## `fastapi` is not recognized

Make sure the backend virtual environment is activated.

### Windows

```powershell
cd backend
.venv\Scripts\Activate.ps1
```

### macOS / Linux

```bash
cd backend
source .venv/bin/activate
```

Then install the backend requirements if needed:

```bash
python -m pip install -r requirements.txt
```

---

## `ModuleNotFoundError` for a Python package

Your backend dependencies may be out of date.

Activate the backend virtual environment and run:

```bash
python -m pip install -r requirements.txt
```

---

## Frontend loads but PDF processing fails

Make sure the backend is also running.

You should have both:

```text
Frontend: http://localhost:5173
Backend:  http://127.0.0.1:8000
```

You can also check the FastAPI documentation page:

```text
http://127.0.0.1:8000/docs
```

---

## I pulled new code and the project suddenly stopped working

First check whether dependencies changed.

Frontend:

```bash
cd frontend
npm install
```

Backend:

```bash
cd backend
```

Activate the virtual environment, then:

```bash
python -m pip install -r requirements.txt
```

Then restart both development servers.

---

# Development Reminder

Before starting work:

```bash
git status
```

Make sure you know which branch you are on.

If working from `main`, update it:

```bash
git switch main
git pull
```

If working from another branch, regularly bring the latest `main` into it:

```bash
git fetch origin
git merge origin/main
```

The goal is simple:

**Do not spend several days building new code on top of a severely outdated version of `main`.**
