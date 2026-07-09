const PLACEHOLDER_MARKERS = [
  "your_supabase",
  "your-n8n",
  "your_webhook",
];

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) return false;

  const looksLikePlaceholder = PLACEHOLDER_MARKERS.some(
    (marker) => url.includes(marker) || key.includes(marker)
  );

  return !looksLikePlaceholder;
}

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase ist nicht konfiguriert. Bitte NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local setzen."
    );
  }

  return { url: url!, key: key! };
}
