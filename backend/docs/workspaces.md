# Workspaces

A **workspace** is the top-level container for files. Each workspace has
exactly one owner and zero or more shared collaborators.

Two tables back this:

- `workspaces` — owned by the user whose id is in `user_id`.
- `workspace_shares` — `(workspace_id, user_id)` pairs giving non-owners
  access.

See [database.md](./database.md) for the column-level schema.

## `POST /workspaces`

Create a new workspace.

- **Auth:** none. The handler takes `user_id` from the request body and
  trusts it without verifying any JWT, so any caller who knows a valid
  user UUID can create a workspace under that user.
- **Request body** (`WorkspaceCreate`):
  ```json
  { "user_id": "<uuid>", "name": "My workspace" }
  ```
- **200 OK:** the inserted row from the `workspaces` table (Supabase
  returns the full row, including the generated `id`).
- **400 Bad Request:** `{ "detail": "Failed to create workspace" }` when
  Supabase returns no data (RLS denial, missing column, etc.).

## `DELETE /workspaces/{workspace_id}`

Delete a workspace by id.

- **Auth:** none. The handler does not check ownership and does not read
  any `Authorization` header. Any caller able to reach the endpoint can
  delete any workspace whose id they know.
- **Path parameter:** `workspace_id` (UUID).
- **200 OK:** `{ "message": "Workspace deleted", "id": "<uuid>" }`.
- **404 Not Found:** `{ "detail": "Workspace not found" }` when Supabase
  reports no rows deleted.
- **Side effects:** workspace child rows (`files`, `file_links`,
  `workspace_shares`) are removed by Postgres `ON DELETE CASCADE`, not by
  this handler. See [database.md](./database.md).

## `GET /workspaces/{user_id}`

List every workspace the given user can see (owned + shared).

- **Auth:** none. The handler takes `user_id` from the URL and trusts it.
- **Path parameter:** `user_id` (UUID).
- **200 OK:** an array of workspace rows.
  - `db_client.table("workspaces").select("*").eq("user_id", user_id)`
    yields the owned rows.
  - `workspace_shares` is then queried for shared workspace ids and those
    workspace rows are appended.
- **404 Not Found:** `{ "detail": "No workspaces found" }` when both the
  owned and shared lists are empty. Note that an empty list is treated as
  an error here, not as `200 []`.
- **Path collision:** This route shares a path template with
  `DELETE /workspaces/{workspace_id}`. They do not actually conflict
  because FastAPI dispatches by HTTP method, but the URL parameter name
  is misleading — both endpoints take a UUID at that position; only the
  handler decides whether to treat it as a user id or a workspace id.

## `POST /workspaces/{workspace_id}/join`

Add the calling user as a collaborator on the workspace.

- **Auth:** required. The user id is read from the verified JWT, not from
  the request.
- **Path parameter:** `workspace_id` (UUID).
- **Body:** none.
- **200 OK:** `{ "message": "Successfully joined workspace!" }`.
- **404 Not Found:** `{ "detail": "Workspace not found" }`.
- **Idempotency:** the insert into `workspace_shares` is wrapped in a
  bare `try / except: pass`, so a duplicate `(workspace_id, user_id)`
  unique-constraint violation is silently ignored. Calling join twice
  does not error.

## Sharing model

There is no explicit endpoint for inviting a user. The expected flow is:

1. The owner shares the workspace UUID with another user out of band.
2. That user calls `POST /workspaces/{workspace_id}/join` while
   authenticated; this writes a row to `workspace_shares`.
3. From then on, `verify_workspace_ownership()` (used by every file
   endpoint, see [authentication.md](./authentication.md)) treats them as
   authorized.

There is no role distinction between owners and shared users on the
backend — both can save, rename, and delete files in the workspace.
`workspaces.user_id` is the only indicator of who originally created it.
