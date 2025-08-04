import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';

export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: {
        getItem: (key: string) => {
          if (typeof window !== 'undefined') {
            return document.cookie
              .split('; ')
              .find((row) => row.startsWith(`${key}=`))
              ?.split('=')[1] || null;
          }
          return null;
        },
        setItem: (key: string, value: string) => {
          if (typeof window !== 'undefined') {
            document.cookie = `${key}=${value}; path=/; SameSite=Strict; Secure=${window.location.protocol === 'https:'}`;
          }
        },
        removeItem: (key: string) => {
          if (typeof window !== 'undefined') {
            document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
          }
        },
      },
    }
  }
);
