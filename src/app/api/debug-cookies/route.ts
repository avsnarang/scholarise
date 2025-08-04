import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug Cookies API - GET Request');
    
    // List all cookies
    const allCookies = request.cookies.getAll();
    const cookieHeader = request.headers.get('cookie') || '';
    
    console.log('🔍 Debug Cookies - All cookies:', allCookies.map(c => ({ 
      name: c.name, 
      hasValue: !!c.value, 
      length: c.value?.length || 0,
      preview: c.value?.substring(0, 50) + '...'
    })));
    console.log('🔍 Debug Cookies - Cookie header:', cookieHeader);
    console.log('🔍 Debug Cookies - User-Agent:', request.headers.get('user-agent'));
    console.log('🔍 Debug Cookies - Origin:', request.headers.get('origin'));
    console.log('🔍 Debug Cookies - Referer:', request.headers.get('referer'));
    
    // Check for Supabase cookies specifically
    const supabaseHostname = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
    const projectId = supabaseHostname.split('.')[0];
    const primaryCookieName = `sb-${projectId}-auth-token`;
    console.log('🔍 Debug Cookies - Primary cookie name:', primaryCookieName);
    console.log('🔍 Debug Cookies - Primary cookie value:', request.cookies.get(primaryCookieName)?.value ? 'PRESENT' : 'MISSING');

    const response = {
      timestamp: new Date().toISOString(),
      requestType: 'GET /api/debug-cookies',
      allCookies: allCookies.map(c => ({ name: c.name, hasValue: !!c.value, length: c.value?.length || 0 })),
      cookieHeader: {
        present: !!cookieHeader,
        length: cookieHeader.length,
        preview: cookieHeader.substring(0, 200) + (cookieHeader.length > 200 ? '...' : '')
      },
      supabaseCookies: {
        primaryCookieName,
        primaryCookieExists: !!request.cookies.get(primaryCookieName)?.value,
        allSupabaseCookies: allCookies.filter(c => c.name.startsWith('sb-')).map(c => ({ 
          name: c.name, 
          hasValue: !!c.value 
        }))
      },
      headers: {
        userAgent: request.headers.get('user-agent'),
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
        host: request.headers.get('host'),
      }
    };

    console.log('🔍 Debug Cookies Result:', response);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Debug cookies error:", error);
    return NextResponse.json({ error: error.message || "Failed to debug cookies" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Debug Cookies API - POST Request (simulating upload)');
    
    // List all cookies
    const allCookies = request.cookies.getAll();
    const cookieHeader = request.headers.get('cookie') || '';
    
    console.log('🔍 Debug Cookies POST - All cookies:', allCookies.map(c => ({ 
      name: c.name, 
      hasValue: !!c.value, 
      length: c.value?.length || 0,
      preview: c.value?.substring(0, 50) + '...'
    })));
    console.log('🔍 Debug Cookies POST - Cookie header:', cookieHeader);
    
    // Check for Supabase cookies specifically
    const supabaseHostname = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
    const projectId = supabaseHostname.split('.')[0];
    const primaryCookieName = `sb-${projectId}-auth-token`;
    console.log('🔍 Debug Cookies POST - Primary cookie name:', primaryCookieName);
    console.log('🔍 Debug Cookies POST - Primary cookie value:', request.cookies.get(primaryCookieName)?.value ? 'PRESENT' : 'MISSING');

    const response = {
      timestamp: new Date().toISOString(),
      requestType: 'POST /api/debug-cookies',
      allCookies: allCookies.map(c => ({ name: c.name, hasValue: !!c.value, length: c.value?.length || 0 })),
      cookieHeader: {
        present: !!cookieHeader,
        length: cookieHeader.length,
        preview: cookieHeader.substring(0, 200) + (cookieHeader.length > 200 ? '...' : '')
      },
      supabaseCookies: {
        primaryCookieName,
        primaryCookieExists: !!request.cookies.get(primaryCookieName)?.value,
        allSupabaseCookies: allCookies.filter(c => c.name.startsWith('sb-')).map(c => ({ 
          name: c.name, 
          hasValue: !!c.value 
        }))
      },
      headers: {
        userAgent: request.headers.get('user-agent'),
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
        host: request.headers.get('host'),
      }
    };

    console.log('🔍 Debug Cookies POST Result:', response);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Debug cookies POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to debug cookies" }, { status: 500 });
  }
}