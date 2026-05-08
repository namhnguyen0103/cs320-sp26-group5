# Database

The backend talks to a Supabase project; all persistence is in Postgres.
Schema is **not** managed in this repository — the tables are expected
to exist already on the Supabase side, and migrations (if any) live in
the Supabase dashboard / project, not in `backend/`.

This document describes the schema **inferred from how `main.py` and
`db.py` use it**. It is a description, not a migration script. If you
need authoritative column types, check the table definitions in the
Supabase project itself.

## Tables

### `workspaces`

| Column | Inferred type | Notes |
| --- | --- | --- |
| `id` | UUID, primary key | Generated server-side by Postgres; returned by `INSERT` so the app never has to allocate it. |
| `user_id` | UUID | Owner. References `auth.users(id)` (Supabase Auth). |
| `name` | text | Display name of the workspace. |

Reads: `GET /workspaces/{user_id}`. Writes: `POST /workspaces`,
`DELETE /workspaces/{workspace_id}`.

### `workspace_shares`

A simple join table that grants a user access to a workspace they don't
own.

| Column | Inferred type | Notes |
| --- | --- | --- |
| `workspace_id` | UUID | FK to `workspaces.id`. |
| `user_id` | UUID | FK to `auth.users(id)`. |

The pair `(workspace_id, user_id)` should be unique. The join handler
(`POST /workspaces/{workspace_id}/join`) wraps the insert in a bare
`try/except: pass`, so a duplicate insert that would violate that unique
constraint silently no-ops — implying the constraint exists.

### `files`

| Column | Inferred type | Notes |
| --- | --- | --- |
| `id` | UUID, primary key | Generated server-side. |
| `workspace_id` | UUID | FK to `workspaces.id`. |
| `title` | text | Filename as shown in the editor. Used as the lookup key when resolving `[[link]]` targets. |
| `content` | text | HTML produced by the editor. Written by `POST /files/save`, returned by `GET /files/{file_id}`. |
| `storage_path` | text | Written only by the legacy helper `db.create_file()` (currently unused by `main.py`). The current save path stores HTML in `content` instead. The column likely still exists in the table, just unused by today's flow. |

Reads: `GET /files/{file_id}`, `GET /workspaces/{workspace_id}/files`,
indirectly by every workspace-graph or link-resolution query. Writes:
`POST /files/save`, `PATCH /files/{file_id}/rename`,
`DELETE /files/{file_id}`,
`DELETE /workspaces/{workspace_id}/files/{file_id}`.

### `file_links`

Tracks `[[link]]` edges between files in the same workspace.

| Column | Inferred type | Notes |
| --- | --- | --- |
| `source_file_id` | UUID | FK to `files.id`. The file containing the link. |
| `target_file_id` | UUID | FK to `files.id`. The file being linked to. |
| `source_file_name` | text | Denormalized title of the source at write time. Not refreshed on rename. |
| `target_file_name` | text | Denormalized title of the target at write time. Not refreshed on rename. |

Each row represents one outbound link. There is no uniqueness
guarantee from the application side: if a file links to the same
target twice, two rows are written. The `POST /files/save` handler
deletes every existing row with the saved file's `source_file_id`
before inserting the new set, so duplicates only persist within a
single save call.

Reads: traversed by the workspace-graph endpoint when present (see
`graph-view` branch). Writes: `POST /files/save` (rebuilds the rows for
one file at a time), `DELETE /files/{file_id}` (clears both directions
explicitly).

## Foreign-key cascade behavior

The handler `DELETE /workspaces/{workspace_id}/files/{file_id}` deletes
only from the `files` table and relies on the comment

> Because of ON DELETE CASCADE, this single command also deletes all
> related file_links!

…to clean up `file_links`. That implies `file_links.source_file_id`
and `file_links.target_file_id` both have `ON DELETE CASCADE` to
`files.id`.

`DELETE /workspaces/{workspace_id}` similarly relies on cascading deletes
from `workspaces` down to `files`, `workspace_shares`, and (transitively)
`file_links`. The handler does not delete child rows itself.

If you ever rebuild this database from scratch, the foreign-key
declarations need to include `ON DELETE CASCADE` for these endpoints to
behave the way `main.py` expects.

## Row-level security

The Supabase client is constructed with `DB_SECRET_KEY` (see
[setup.md](./setup.md)). When that key is the project's service-role
key, RLS policies are bypassed entirely and any policy violations the
app might trigger become invisible.

`POST /files/save` does check for empty update results and raises a
`403` with the message about RLS — that path implies that some other
combination of keys/policies has been observed in practice where an
RLS policy denied a shared user's update silently. If the production
deployment moves off the service-role key, expect that branch to start
firing for shared collaborators until policies are widened.

## Helpers in `db.py`

Three convenience functions are defined in `db.py`. Only one is
currently used by `main.py`.

| Function | Used by | Notes |
| --- | --- | --- |
| `create_file(supabase, workspace_id, title, storage_path)` | nothing in `main.py` | Inserts a `files` row populating `storage_path` instead of `content`. Effectively dead code at present. |
| `get_files_by_workspace(supabase, workspace_id)` | `GET /workspaces/{workspace_id}/files` | Selects `*` from `files` filtered by `workspace_id`. |
| `delete_file(supabase, file_id)` | `DELETE /files/{file_id}` | Plain delete on `files` by `id`. The workspace-scoped delete in `main.py` does its own delete instead of calling this. |
