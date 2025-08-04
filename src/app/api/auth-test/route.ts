import { type NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Auth Test: Starting check');
    
    // Create Supabase client with improved cookie handling
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storage: {
            getItem: (key: string) => {
              // Try multiple cookie reading approaches
              const directCookie = request.cookies.get(key)?.value;
              
              // Also try reading from the raw Cookie header
              const cookieHeader = request.headers.get('cookie') || '';
              const cookieMatch = cookieHeader.match(new RegExp(`${key}=([^;]+)`));
              const headerCookie = cookieMatch ? decodeURIComponent(cookieMatch[1]!) : null;
              
              const value = directCookie || headerCookie || null;
              console.log(`🔍 Auth-test Cookie ${key}:`, value ? `present (${value.length} chars)` : 'missing');
              return value;
            },
            setItem: () => {},
            removeItem: () => {},
          },
        },
      }
    );

    // List all cookies with more detail
    const allCookies = request.cookies.getAll();
    const cookieHeader = request.headers.get('cookie') || '';
    
    console.log('🔍 All cookies from getAll():', allCookies.map(c => ({ 
      name: c.name, 
      hasValue: !!c.value,
      valueLength: c.value?.length || 0,
      valuePreview: c.value ? c.value.substring(0, 50) + '...' : null
    })));
    
    console.log('🔍 Raw cookie header:', cookieHeader);
    console.log('🔍 Cookie header length:', cookieHeader.length);
    
    // Parse cookies from header manually
    const headerCookies = cookieHeader.split(';').map(cookie => {
      const [name, ...rest] = cookie.split('=');
      return {
        name: name?.trim(),
        value: rest.join('=')?.trim(),
        hasValue: !!rest.join('=')?.trim()
      };
    }).filter(c => c.name);
    
    console.log('🔍 Cookies from header:', headerCookies);

    // Check specifically for Supabase auth cookies
    const supabaseHostname = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
    const projectId = supabaseHostname.split('.')[0];
    const expectedCookieNames = [
      `sb-${projectId}-auth-token`,
      `sb-${projectId}-auth-token.0`,
      `sb-${projectId}-auth-token.1`,
      `supabase-auth-token`,
      'supabase.auth.token'
    ];
    
    console.log('🔍 Expected cookie names:', expectedCookieNames);
    console.log('🔍 Supabase project ID:', projectId);
    
    // Check each expected cookie
    expectedCookieNames.forEach(cookieName => {
      const cookie = request.cookies.get(cookieName);
      console.log(`🔍 Cookie ${cookieName}:`, cookie ? {
        exists: true,
        length: cookie.value.length,
        preview: cookie.value.substring(0, 100) + '...'
      } : { exists: false });
    });

    // Try to get session
    const { data: { session }, error } = await supabase.auth.getSession();
    console.log('🔍 Session debug:', { 
      hasSession: !!session, 
      sessionKeys: session ? Object.keys(session) : [], 
      error: error?.message 
    });
    
    const response = {
      timestamp: new Date().toISOString(),
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id || null,
      userEmail: session?.user?.email || null,
      error: error?.message || null,
      cookies: allCookies.map(c => ({ name: c.name, hasValue: !!c.value })),
      cookieHeader: {
        present: !!cookieHeader,
        length: cookieHeader.length,
        preview: cookieHeader.substring(0, 200) + (cookieHeader.length > 200 ? '...' : '')
      },
      headerCookies: headerCookies.slice(0, 10), // Limit to first 10 for readability
      headers: {
        authorization: !!request.headers.get('authorization'),
        userAgent: request.headers.get('user-agent'),
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
      }
    };

    console.log('🔍 Auth Test Result:', response);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Auth Test Error:', error);
    return NextResponse.json({ 
      error: 'Auth test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}