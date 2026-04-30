# Backend Documentation

The backend is a FastAPI application that wraps a Supabase (PostgreSQL +
Supabase Auth) project. It exposes REST endpoints for authentication,
workspaces, and file storage. All persistent state lives in Supabase; the
service holds no local state.

Source layout:

```
backend/
├── main.py    # FastAPI app, route handlers, request models
├── db.py      # Supabase client + a few helper functions
└── docs/      # this directory
```

## Documentation index

| Document | Contents |
| --- | --- |
| [setup.md](./setup.md) | Dependencies, environment variables, running the server |
| [authentication.md](./authentication.md) | `/signup`, `/login`, JWT verification helpers |
| [workspaces.md](./workspaces.md) | Workspace creation, deletion, listing, sharing |
| [files.md](./files.md) | File save / get / list / delete / rename and `[[link]]` tracking |
| [database.md](./database.md) | Schema inferred from code, foreign-key behavior |

## Conventions used in these docs

- **Method + path** is shown verbatim, e.g. `POST /files/save`.
- **Auth: required** means the handler calls `get_user_id()` and rejects
  requests without a valid `Authorization: Bearer <jwt>` header.
- **Auth: none** means the handler does not verify any token. Where this is
  the case it is called out explicitly because some such endpoints accept
  identifiers (like `user_id`) in the body or path that are trusted as-is.
- Request bodies are described with the same field names and types declared
  on the Pydantic models in `main.py`.
- Response shapes are taken from the `return` statements; error responses
  are taken from the `raise HTTPException(...)` calls.

## Notes on accuracy

These documents describe the code as it exists in `backend/main.py` and
`backend/db.py`. Several behaviors that are easy to mis-read from the code
alone (URL collisions resolved by HTTP method, fields accepted in both URL
and body, endpoints that skip JWT verification) are flagged inline.
