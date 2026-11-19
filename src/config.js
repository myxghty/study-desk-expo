// The anon/publishable key is designed to live in the app. Row-level security in
// the database (schema.sql) is what keeps data private. Never put a secret or
// service-role key here.
export const SUPABASE_URL = 'https://zwnuyamwyqosswypsxjo.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_pX3Cba4bRQPEYXXfjARy8g_aAzAWlk_';

// 'friend'  = demo build: sharing switches start ON (including notes and procrastination flags).
// 'public'  = release build: only marks, hours, tasks and finished items start on; notes and flags start off.
// Students can still change every switch in either edition.
export const EDITION = 'friend';
