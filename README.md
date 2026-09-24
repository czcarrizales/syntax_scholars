# Syntax Scholars

## Tech Stack

### Frontend
- React
- TypeScript
- Vite

### Backend
- Python
- FastAPI

The frontend and backend run separately during development. **Both need to be running for the full application to work.**

---

## Requirements

Before starting, make sure you have the following installed:

### Node.js

Download Node.js:

https://nodejs.org/en/download

Use an **LTS** version. npm is included with Node.js.

Check that Node.js and npm are installed:

```bash
node -v
npm -v
```

### Python

Download Python:

https://www.python.org/downloads/

Check that Python is installed:

```bash
python --version
```

On some macOS/Linux systems, the command may instead be:

```bash
python3 --version
```

---

# First-Time Setup

You only need to do this after cloning the repository for the first time.

## 1. Clone the Repository

```bash
git clone https://github.com/czcarrizales/syntax_scholars
cd syntax_scholars
```

---

## 2. Set Up the Frontend

Go into the frontend folder:

```bash
cd frontend
```

Install the frontend dependencies:

```bash
npm install
```

This installs everything listed in `frontend/package.json`.

Return to the project root:

```bash
cd ..
```

---

## 3. Set Up the Backend

Go into the backend folder:

```bash
cd backend
```

### Create a Python Virtual Environment

A virtual environment keeps this project's Python packages separate from the rest of your computer.

### Windows

```powershell
python -m venv .venv
```

If `python` does not work, try:

```powershell
py -m venv .venv
```

Activate it:

```powershell
.venv\Scripts\Activate.ps1
```

### macOS / Linux

```bash
python3 -m venv .venv
```

Activate it:

```bash
source .venv/bin/activate
```

When the virtual environment is active, you should see something similar to this at the beginning of your terminal:

```text
(.venv)
```

### Install Backend Dependencies

With the virtual environment activated:

```bash
python -m pip install -r requirements.txt
```

On systems where Python uses the `python3` command, use:

```bash
python3 -m pip install -r requirements.txt
```

This installs the Python packages required by the backend, including FastAPI.

---

# Running the Project

You need **two terminals**: one for the backend and one for the frontend.

## Backend

Open a terminal in the repository.

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

The backend should run at:

```text
http://127.0.0.1:8000
```

Test endpoint:

```text
http://127.0.0.1:8000/api/hello
```

FastAPI also automatically provides API documentation at:

```text
http://127.0.0.1:8000/docs
```

---

## Frontend

Open a **second terminal**.

```bash
cd frontend
npm run dev
```

Vite will display the address for the frontend, normally:

```text
http://localhost:5173
```

Open that address in your browser.

---

# Normal Startup

After completing the first-time setup, you do **not** need to reinstall everything every time.

Just start both servers.

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

## Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

---

# Project Structure

```text
syntax_scholars/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .venv/              # Local only; not committed
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
├── .gitignore
└── README.md
```

---

# Git Workflow

Clone the repository:

```bash
git clone https://github.com/czcarrizales/syntax_scholars
```

Create a branch for your work:

```bash
git switch -c feature/your-feature
```

For example:

```bash
git switch -c feature/pdf-upload
```

After making changes:

```bash
git add .
git commit -m "Add PDF upload"
```

Push your branch to GitHub:

```bash
git push -u origin feature/pdf-upload
```

Then create a pull request on GitHub when the work is ready to be merged into `main`.

Try to avoid making development changes directly on `main`.

---

# Common Problems

### `npm` is not recognized

Install Node.js:

https://nodejs.org/en/download

Then close and reopen your terminal.

---

### `python` is not recognized

Install Python:

https://www.python.org/downloads/

On macOS/Linux, try:

```bash
python3 --version
```

---

### `fastapi` is not recognized

Make sure the backend virtual environment is activated first.

Windows:

```powershell
.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Then make sure the backend dependencies have been installed:

```bash
python -m pip install -r requirements.txt
```

---

### The frontend loads, but backend requests fail

Make sure **FastAPI is also running**.

You should have:

```text
Frontend: http://localhost:5173
Backend:  http://127.0.0.1:8000
```

Both development servers need to be running.

---

### I pulled new code and something suddenly stopped working

If frontend dependencies changed:

```bash
cd frontend
npm install
```

If backend dependencies changed, activate the backend virtual environment and run:

```bash
python -m pip install -r requirements.txt
```
