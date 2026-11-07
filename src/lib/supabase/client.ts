import { createBrowserClient } from '@supabase/ssr';

function formatSupabaseUrl(url?: string): string {
  if (!url || url.startsWith('your-')) return 'https://placeholder.supabase.co';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

// Backward-compatible stubs (circuit breaker removed to allow standard, reliable network auth)
export function isOfflineCircuitActive(): boolean {
  return false;
}

export function tripOfflineCircuit(): void {
  // No-op: Supabase client uses standard fetch without artificial abort timeouts
}

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (browserClient) return browserClient;

  const url = formatSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  // Standard client without artificial 1800ms abort controller
  browserClient = createBrowserClient(url, key);

  return browserClient;
}

// In-memory cache for instant route transitions (<0.1ms)
let cachedAuthUser: { id: string; email?: string } | null = null;
let cachedAuthChecked = false;

export async function getFastAuthUser(): Promise<{ id: string; email?: string } | null> {
  if (cachedAuthChecked) {
    return cachedAuthUser;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const supabase = createClient();
    // getSession checks localStorage synchronously without network calls
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      cachedAuthUser = null;
      cachedAuthChecked = true;
      return null;
    }

    const u = sessionData.session.user;
    cachedAuthUser = u ? { id: u.id, email: u.email } : null;
    cachedAuthChecked = true;
    return cachedAuthUser;
  } catch {
    cachedAuthUser = null;
    cachedAuthChecked = true;
    return null;
  }
}

// Listen for login/logout events to update the cached user
if (typeof window !== 'undefined') {
  try {
    const supabase = createClient();
    supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        cachedAuthUser = { id: session.user.id, email: session.user.email };
      } else {
        cachedAuthUser = null;
      }
      cachedAuthChecked = true;
    });
  } catch {
    // Ignore in non-browser context
  }
}
