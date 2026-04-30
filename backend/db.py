import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()


db_url = os.getenv("DB_URL")
db_secret = os.getenv("DB_SECRET_KEY")
if not db_url or not db_secret:
    raise ValueError("Missing env vars")

db_client = create_client(db_url, db_secret)

# -------- FILE DATABASE FUNCTIONS -------- #

def create_file(supabase, workspace_id, title, storage_path):
    response = supabase.table("files").insert({
        "workspace_id": workspace_id,
        "title": title,
        "storage_path": storage_path
    }).execute()

    return response


def get_files_by_workspace(supabase, workspace_id):
    response = supabase.table("files") \
        .select("*") \
        .eq("workspace_id", workspace_id) \
        .execute()

    return response


def delete_file(supabase, file_id):
    response = supabase.table("files") \
        .delete() \
        .eq("id", file_id) \
        .execute()

    return response