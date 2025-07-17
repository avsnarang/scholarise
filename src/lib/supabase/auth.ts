import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';

export const createServerSupabaseAuthClient = async () => {
  const cookieStore = await cookies();
  
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        storage: {
          getItem: (key: string) => {
            return cookieStore.get(key)?.value || null;
          },
          setItem: (key: string, value: string) => {
            cookieStore.set(key, value);
          },
          removeItem: (key: string) => {
            cookieStore.delete(key);
          },
        },
      },
    }
  );
};

export const getServerSession = async () => {
  const supabase = await createServerSupabaseAuthClient();
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting server session:', error);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Unexpected error getting server session:', error);
    return null;
  }
};

export const getServerUser = async () => {
  const session = await getServerSession();
  return session?.user ?? null;
}; 