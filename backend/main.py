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