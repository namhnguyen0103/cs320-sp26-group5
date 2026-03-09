import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DB_URL")
db_secret = os.getenv("DB_SECRET_KEY")
if not db_url or not db_secret:
    raise ValueError("Missing env vars")

db_client = create_client(db_url, db_secret)