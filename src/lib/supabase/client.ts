import { createBrowserClient } from '@supabase/ssr';

function formatSupabaseUrl(url?: string): string {
  if (!url || url.startsWith('your-')) return 'https://placeholder.supabase.co';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

// Circuit breaker for unreachable / dead Supabase instances
let isSupabaseOffline = false;
let lastOfflineCheck = 0;
const OFFLINE_RETRY_INTERVAL_MS = 60000; // 60s cooldown before retrying network

export function isOfflineCircuitActive(): boolean {
  if (!isSupabaseOffline) return false;
  if (Date.now() - lastOfflineCheck > OFFLINE_RETRY_INTERVAL_MS) {
    isSupabaseOffline = false;
    return false;
  }
  return true;
}

export function tripOfflineCircuit(): void {
  isSupabaseOffline = true;
  lastOfflineCheck = Date.now();
}

// Custom fast fetch with 1800ms abort timeout & circuit breaker
async function fastFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (isOfflineCircuitActive()) {
    throw new TypeError('Supabase offline circuit active (skipping network to prevent lag)');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 1800);

  if (init?.signal) {
    init.signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } catch (err: any) {
    // Network failure, DNS resolution failure, or timeout abort
    tripOfflineCircuit();
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (browserClient) return browserClient;

  const url = formatSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  browserClient = createBrowserClient(url, key, {
    global: {
      fetch: fastFetch,
    },
  });

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
