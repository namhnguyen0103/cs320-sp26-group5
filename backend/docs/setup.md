# Setup

## Requirements

- Python 3.10 or newer (`str | None` syntax in `FileSaveRequest` requires
  3.10+).
- A Supabase project with the tables described in
  [database.md](./database.md) already created.

## Python dependencies

The backend imports the following packages directly:

| Package | Used for |
| --- | --- |
| `fastapi` | Web framework, request validation |
| `uvicorn` | ASGI server (entry point: `uvicorn main:app`) |
| `pydantic` | Pulled in transitively by FastAPI; used for request models |
| `supabase` | Official Python client for Supabase Auth + PostgREST |
| `python-dotenv` | Loads `backend/.env` into `os.environ` (`db.py` line 3) |

There is no `requirements.txt` checked in. Install with:

```bash
pip install fastapi uvicorn supabase python-dotenv
```

## Environment variables

`backend/db.py` reads two variables via `python-dotenv`:

| Variable | Description |
| --- | --- |
| `DB_URL` | Supabase project URL, e.g. `https://<project-ref>.supabase.co` |
| `DB_SECRET_KEY` | Supabase API key. Most write paths bypass row-level security, which means this is the **service-role** key in practice. Keep it out of any client-side code. |

If either is missing, `db.py` raises `ValueError("Missing env vars")` at
import time and the server fails to start.

Place these in `backend/.env`:

```
DB_URL=https://your-project.supabase.co
DB_SECRET_KEY=ey...your-service-role-key...
```

`.env` files are excluded by the repository's `.gitignore` (`*.env`).

## Running the server

From the `backend/` directory:

```bash
python -m uvicorn main:app --reload
```

Defaults:

- Host: `127.0.0.1`
- Port: `8000`
- The frontend (`frontend/src/Graph.tsx`, `TextEditor.tsx`, etc.) hard-codes
  `http://localhost:8000` in its `fetch` calls, so changing the port
  requires updating the frontend.

`--reload` watches the source tree and restarts on file save; it should not
be used in any deployed environment.

## CORS

`main.py` installs `CORSMiddleware` with:

```python
allow_origins=["*"]
allow_credentials=True
allow_methods=["*"]
allow_headers=["*"]
```

This combination (`*` origin together with credentials) is rejected by
browsers per the CORS specification — credentialed requests require an
explicit origin. The current frontend uses a `Bearer` token in the
`Authorization` header rather than cookies, so credentialed mode is not
actually exercised, but the configuration is worth being aware of when
adding cookie-based flows.

## Interactive API docs

FastAPI auto-generates two browsable views once the server is running:

- Swagger UI: <http://localhost:8000/docs>
- ReDoc: <http://localhost:8000/redoc>

These reflect the live route table and Pydantic models; if a discrepancy
exists between this documentation and Swagger, Swagger is authoritative.
