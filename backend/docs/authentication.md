# Authentication

The backend delegates identity to **Supabase Auth**. There is no local user
table — accounts live in `auth.users` inside Supabase, and the backend
holds short-lived JWTs handed out by Supabase.

## Tokens

`POST /login` returns the access and refresh tokens that
`db_client.auth.sign_in_with_password()` produces. The frontend stores the
access token in `localStorage` under the key `access_token` and sends it
on subsequent requests as:

```
Authorization: Bearer <access_token>
```

The backend never persists either token. Refresh is the client's
responsibility — the backend exposes no `/refresh` endpoint.

## Verification helpers (internal)

Two helpers in `main.py` are used by every authenticated route:

### `get_user_id(authorization: str) -> str`

(Defined at `main.py:125`.)

1. Rejects requests without a header beginning with `Bearer ` (`401 Missing
   or malformed Authorization header`).
2. Calls `db_client.auth.get_user(token)`; this round-trips to Supabase
   Auth to verify the JWT signature, expiry, and user existence.
3. Rejects empty results (`401 Invalid or expired token`).
4. Returns the verified `user.id` (a UUID string).

### `verify_workspace_ownership(workspace_id, user_id)`

(Defined at `main.py:136`.)

1. Looks up the workspace by id (`404 Workspace not found` if absent).
2. Allows access if `workspaces.user_id == user_id` (the caller is the
   owner).
3. Otherwise checks `workspace_shares` for a row matching both ids; if one
   exists the caller is treated as a collaborator.
4. Otherwise raises `403 You don't own this workspace`.

This is the only authorization check; it gates every file route and the
`/workspaces/.../join` endpoint.

## Endpoints

### `POST /signup`

Creates a Supabase Auth user.

- **Auth:** none.
- **Request body** (`AuthRequest`):
  ```json
  { "email": "user@example.com", "password": "pw" }
  ```
- **200 OK:** `{ "message": "User created" }`.
- **400 Bad Request:** `{ "detail": "Signup failed" }` when Supabase
  returns no user (email already in use, password rule violation, etc.).
- **Notes:** Whatever email-confirmation policy is configured on the
  Supabase project applies; this handler does not opt out of it. The user
  may need to confirm before `POST /login` succeeds.

### `POST /login`

Exchanges email/password for tokens.

- **Auth:** none.
- **Request body** (`AuthRequest`): same shape as `/signup`.
- **200 OK:**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "..."
  }
  ```
- **401 Unauthorized:** `{ "detail": "Invalid login" }` if the Supabase
  call returns no session.
- **Notes:** Supabase itself raises an exception (rather than returning
  `None`) on invalid credentials, which surfaces as a `500` from FastAPI's
  default handler before this endpoint's explicit `401` is reached. The
  net behavior from the client's point of view is still "login failed"; if
  a uniform 401 is needed, wrap the Supabase call in a try/except.

## Calling authenticated endpoints

A typical request from the frontend looks like:

```javascript
const token = localStorage.getItem("access_token") || "";
fetch("http://localhost:8000/files/save", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify(payload),
});
```

Endpoints that do **not** require a Bearer token are listed explicitly in
[workspaces.md](./workspaces.md) — they are notable because they accept
identifiers (`user_id`) in the body or URL that are trusted without
verification.
