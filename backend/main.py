from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from db import db_client, create_file, get_files_by_workspace, delete_file

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AuthRequest(BaseModel):
    email: str
    password: str


@app.post("/signup")
def signup(data: AuthRequest):

    res = db_client.auth.sign_up({
        "email": data.email,
        "password": data.password
    })

    if res.user is None:
        raise HTTPException(400, "Signup failed")

    return {"message": "User created"}


@app.post("/login")
def login(data: AuthRequest):
    
    res = db_client.auth.sign_in_with_password({
        "email": data.email,
        "password": data.password
    })

    if res.session is None:
        raise HTTPException(401, "Invalid login")

    return {
        "access_token": res.session.access_token,
        "refresh_token": res.session.refresh_token
    }


# ── workspace models ───────────────────────────────────────────────────────────

class WorkspaceCreate(BaseModel):
    user_id: str
    name: str


# ── workspace endpoints (unchanged) ───────────────────────────────────────────

# Create Workspace
@app.post("/workspaces")
def create_workspace(body: WorkspaceCreate):
    res = db_client.table("workspaces").insert({
        "user_id": body.user_id,
        "name": body.name,
    }).execute()

    if not res.data:
        raise HTTPException(400, "Failed to create workspace")
    return res.data[0]


# Delete Workspace
@app.delete("/workspaces/{workspace_id}")
def delete_workspace(workspace_id: str):
    res = db_client.table("workspaces").delete().eq("id", workspace_id).execute()

    if not res.data:
        raise HTTPException(404, "Workspace not found")
    return {"message": "Workspace deleted", "id": workspace_id}


# Access All Workspaces for a User
@app.get("/workspaces/{user_id}")
def get_workspaces(user_id: str):
    res = db_client.table("workspaces").select("*").eq("user_id", user_id).execute()
    owned = res.data or []
    
    shares = db_client.table("workspace_shares").select("workspace_id").eq("user_id", user_id).execute()
    shared_ids = [s["workspace_id"] for s in (shares.data or [])]
    
    shared = []
    if shared_ids:
        shared_res = db_client.table("workspaces").select("*").in_("id", shared_ids).execute()
        shared = shared_res.data or []

    if not owned and not shared:
        raise HTTPException(404, "No workspaces found")
    return owned + shared


@app.post("/workspaces/{workspace_id}/join")
def join_workspace(workspace_id: str, authorization: str = Header(None)):
    user_id = get_user_id(authorization)
    ws = db_client.table("workspaces").select("id").eq("id", workspace_id).execute()
    
    if not ws.data:
        raise HTTPException(404, "Workspace not found")
        
    try:
        db_client.table("workspace_shares").insert({
            "workspace_id": workspace_id,
            "user_id": user_id
        }).execute()
    except Exception:
        pass

    return {"message": "Successfully joined workspace!"}


# ── helpers (new) ─────────────────────────────────────────────────────────────

def get_user_id(authorization: str) -> str:
    """Extract + verify JWT, return user_id. Raises 401 if invalid."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or malformed Authorization header")
    token = authorization.split(" ")[1]
    res = db_client.auth.get_user(token)
    if not res or not res.user:
        raise HTTPException(401, "Invalid or expired token")
    return res.user.id


def verify_workspace_ownership(workspace_id: str, user_id: str):
    """Confirm workspace belongs to user. Raises 403 if not."""
    res = db_client.table("workspaces") \
        .select("user_id") \
        .eq("id", workspace_id) \
        .single() \
        .execute()
    if not res.data:
        raise HTTPException(404, "Workspace not found")
    
    if res.data["user_id"] == user_id:
        return 
        
    share = db_client.table("workspace_shares").select("*").eq("workspace_id", workspace_id).eq("user_id", user_id).execute()
    if share.data:
        return 

    raise HTTPException(403, "You don't own this workspace")


# ── file models (new) ─────────────────────────────────────────────────────────

class FileSaveRequest(BaseModel):
    workspace_id: str
    file_id: str | None = None
    file_name: str
    file_contents: str
    linked_file_names: list[str] = []


class FileRenameRequest(BaseModel):
    file_id: str
    new_name: str


# ── file endpoints (new) ──────────────────────────────────────────────────────

@app.post("/files/save")
def save_file(body: FileSaveRequest, authorization: str = Header(None)):
    user_id = get_user_id(authorization)
    verify_workspace_ownership(body.workspace_id, user_id)

    # 1. Check if we have a real database ID from the frontend
    if body.file_id and not body.file_id.startswith("temp-"):
        # UPDATE the existing file using its ID
        res = db_client.table("files") \
            .update({
                "title": body.file_name, 
                "content": body.file_contents
            }) \
            .eq("id", body.file_id) \
            .execute()
            
        # FIXED: Prevent silent database failures!
        if not res.data:
            raise HTTPException(403, "Update blocked by Supabase. You likely need to update your RLS policies to allow shared users to edit files.")
            
        file_id = body.file_id
        
    else:
        # INSERT a brand new file
        res = db_client.table("files").insert({
            "workspace_id": body.workspace_id,
            "title": body.file_name,
            "content": body.file_contents
        }).execute()
        
        if not res.data:
            raise HTTPException(400, "Failed to create file")
        file_id = res.data[0]["id"]

    # update file_links: clear old links for this file, insert new ones
    db_client.table("file_links") \
        .delete() \
        .eq("source_file_id", file_id) \
        .execute()

    for linked_name in body.linked_file_names:
        target = db_client.table("files") \
            .select("id") \
            .eq("workspace_id", body.workspace_id) \
            .eq("title", linked_name) \
            .execute()
        if target.data:
            db_client.table("file_links").insert({
                "source_file_id": file_id,
                "target_file_id": target.data[0]["id"],
                "source_file_name": body.file_name,     
                "target_file_name": linked_name         
            }).execute()

    return {"file_id": file_id, "message": "File saved"}

@app.delete("/workspaces/{workspace_id}/files/{file_id}")
def delete_file_endpoint(workspace_id: str, file_id: str, authorization: str = Header(None)):
    user_id = get_user_id(authorization)
    verify_workspace_ownership(workspace_id, user_id)

    # Because of ON DELETE CASCADE, this single command also deletes all related file_links!
    db_client.table("files") \
        .delete() \
        .eq("id", file_id) \
        .execute()

    return {"message": "File deleted successfully"}


@app.get("/files/{file_id}")
def get_file(file_id: str, authorization: str = Header(None)):
    user_id = get_user_id(authorization)

    res = db_client.table("files") \
        .select("*, workspaces(user_id)") \
        .eq("id", file_id) \
        .single() \
        .execute()

    if not res.data:
        raise HTTPException(404, "File not found")
        
    verify_workspace_ownership(res.data["workspace_id"], user_id)

    return {
        "file_id": res.data["id"],
        "title": res.data["title"],
        "content": res.data.get("content", ""),
        "workspace_id": res.data["workspace_id"]
    }


@app.get("/workspaces/{workspace_id}/files")
def list_files(workspace_id: str, authorization: str = Header(None)):
    user_id = get_user_id(authorization)
    verify_workspace_ownership(workspace_id, user_id)

    res = get_files_by_workspace(db_client, workspace_id)
    return res.data or []


@app.delete("/files/{file_id}")
def remove_file(file_id: str, authorization: str = Header(None)):
    user_id = get_user_id(authorization)

    res = db_client.table("files") \
        .select("id, workspace_id") \
        .eq("id", file_id) \
        .single() \
        .execute()

    if not res.data:
        raise HTTPException(404, "File not found")
        
    verify_workspace_ownership(res.data["workspace_id"], user_id)

    # delete links first (foreign key safety)
    db_client.table("file_links") \
        .delete() \
        .eq("source_file_id", file_id) \
        .execute()
    db_client.table("file_links") \
        .delete() \
        .eq("target_file_id", file_id) \
        .execute()

    delete_file(db_client, file_id)
    return {"message": "File deleted", "id": file_id}


@app.patch("/files/{file_id}/rename")
def rename_file(file_id: str, body: FileRenameRequest, authorization: str = Header(None)):
    user_id = get_user_id(authorization)

    res = db_client.table("files") \
        .select("id, workspace_id") \
        .eq("id", file_id) \
        .single() \
        .execute()

    if not res.data:
        raise HTTPException(404, "File not found")
        
    verify_workspace_ownership(res.data["workspace_id"], user_id)

    db_client.table("files") \
        .update({"title": body.new_name}) \
        .eq("id", file_id) \
        .execute()

    return {"message": "File renamed", "new_name": body.new_name}