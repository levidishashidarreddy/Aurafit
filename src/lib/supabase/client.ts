import { createBrowserClient } from '@supabase/ssr';

function formatSupabaseUrl(url?: string): string {
  if (!url || url.startsWith('your-')) return 'https://placeholder.supabase.co';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

export function createClient() {
  const url = formatSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
  return createBrowserClient(url, key);
}
