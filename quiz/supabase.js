const SUPABASE_URL = "https://rzttubrgtjmhdozkgime.supabase.co";

const SUPABASE_KEY = "sb_publishable_lHaolzol8NrcaqV4kaTmlw_OfIkXxw1";

const supabaseClient = window.supabase?.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;
