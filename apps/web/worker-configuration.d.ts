interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  // Service role must NEVER be bound for browser exposure; import tooling uses CI/local env only.
}
