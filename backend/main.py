from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from db import db_client

app = FastAPI()

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

class WorkspaceCreate(BaseModel):
    user_id: str
    name: str

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

    if not res.data:
        raise HTTPException(404, "No workspaces found")
    return res.data