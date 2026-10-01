"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClientSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // During static build, env vars may be absent — return a dummy that won't be called
    return createBrowserClient("https://placeholder.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder");
  }
  return createBrowserClient(url, key);
}
