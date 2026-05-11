# CS320-SP26-Group5

A graph-based collaborative note-taking web app. It's similar to Obsidian, but with sharing and collaboration built in.

---

## Project Structure

```
CS320-SP26-GROUP5/
├── backend/       # Backend (Flask/Django/FastAPI) + Supabase
└── frontend/      # React + Vite + TypeScript
```

---

## Frontend Setup

**Requirements:** Node.js (latest LTS version recommended)

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5173`

---

## Backend Setup

1. Pip install
   ```bash
   pip install uvicorn
   ```
2. Navigate to backend
    ```bash
    cd backend
    ```
3. Run backend
   ```bash
   python -m uvicorn main:app --reload
   ```
---

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** FastAPI
- **Database/Auth:** Supabase (PostgreSQL)
- **Graph Visualization:** react-force-graph-2d
