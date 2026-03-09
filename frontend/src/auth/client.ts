import { createClient } from "@supabase/supabase-js";

const dbUrl = import.meta.env.VITE_DB_URL;
const dbKey = import.meta.env.VITE_DB_PUBLIC_KEY;

export const db_client = createClient(dbUrl, dbKey);