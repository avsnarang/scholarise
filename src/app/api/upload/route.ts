import { type NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';
// No additional imports needed for File API approach

// Initialize Supabase configuration
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Upload API: Starting authentication check');
    
    // Use EXACT same authentication logic as working tRPC route
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          storage: {
            getItem: (key: string) => {
              return request.cookies.get(key)?.value || null;
            },
            setItem: () => {},
            removeItem: () => {},
          },
        },
      }
    );

    // Try multiple approaches to get the session (exact copy from tRPC)
    let session = null;
    let user = null;
    let userId = null;
    
    console.log('🔍 Upload API: Starting tRPC-style authentication');
    
    // Debug: Show all cookies and headers
    console.log('🔍 Upload API - All cookies:', request.cookies.getAll().map(c => ({ 
      name: c.name, 
      hasValue: !!c.value, 
      length: c.value?.length || 0,
      preview: c.value?.substring(0, 50) + '...'
    })));
    console.log('🔍 Upload API - Cookie header:', request.headers.get('cookie')?.substring(0, 200) + '...');
    console.log('🔍 Upload API - User-Agent:', request.headers.get('user-agent'));
    console.log('🔍 Upload API - Origin:', request.headers.get('origin'));
    console.log('🔍 Upload API - Referer:', request.headers.get('referer'));
    
    // Check for specific Supabase cookies
    const supabaseHostname = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname;
    const projectId = supabaseHostname.split('.')[0];
    const primaryCookieName = `sb-${projectId}-auth-token`;
    console.log('🔍 Upload API - Primary cookie name:', primaryCookieName);
    console.log('🔍 Upload API - Primary cookie value:', request.cookies.get(primaryCookieName)?.value ? 'PRESENT' : 'MISSING');

    // Approach 1: Try getSession first
    console.log('🔍 Upload API - Approach 1: getSession');
    const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession();
    console.log('🔍 Upload API - getSession result:', { 
      hasSession: !!supabaseSession, 
      hasUser: !!supabaseSession?.user,
      error: sessionError?.message 
    });
    if (supabaseSession?.user) {
      session = supabaseSession;
      user = supabaseSession.user;
      userId = user.id;
      console.log('🔍 Success with getSession:', { userId, email: user.email });
    }

    // Approach 2: If no session, try to extract access token from cookies directly
    if (!session) {
      console.log('🔍 Upload API - Approach 2: direct cookie access');
      const cookieName = primaryCookieName;
      
      const accessToken = request.cookies.get(cookieName)?.value;
      console.log('🔍 Upload API - Access token found:', !!accessToken, accessToken ? `(${accessToken.length} chars)` : '');
      
      if (accessToken) {
        try {
          const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(accessToken);
          console.log('🔍 Upload API - getUser result:', { 
            hasUser: !!tokenUser, 
            error: tokenError?.message 
          });
          
          if (tokenUser) {
            user = tokenUser;
            userId = tokenUser.id;
            console.log('🔍 Success with access token:', { userId, email: tokenUser.email });
          }
        } catch (error: unknown) {
          console.log('🔍 Upload API - Token validation error:', error);
        }
      }
    }

    // Approach 3: Check for authorization header as fallback
    if (!user && request.headers.get('authorization')) {
      console.log('🔍 Upload API - Approach 3: authorization header');
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      console.log('🔍 Upload API - Auth header token found:', !!token);
      
      if (token) {
        try {
          const { data: { user: headerUser }, error: headerError } = await supabase.auth.getUser(token);
          console.log('🔍 Upload API - Header user result:', { 
            hasUser: !!headerUser, 
            error: headerError?.message 
          });
          
          if (headerUser) {
            user = headerUser;
            userId = headerUser.id;
            console.log('🔍 Success with auth header:', { userId, email: headerUser.email });
          }
        } catch (error: unknown) {
          console.log('🔍 Upload API - Header validation error:', error);
        }
      }
    }

    // Approach 4: Check common cookie names for Supabase auth tokens
    if (!user) {
      console.log('🔍 Upload API - Approach 4: trying common cookie names');
      const cookieNames = [
        `sb-${new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]}-auth-token`,
        'sb-access-token', 
        'supabase-auth-token',
        'supabase.auth.token'
      ];
      
      console.log('🔍 Upload API - Trying cookie names:', cookieNames);
      
      for (const cookieName of cookieNames) {
        const token = request.cookies.get(cookieName)?.value;
        console.log(`🔍 Upload API - Cookie ${cookieName}:`, token ? `PRESENT (${token.length} chars)` : 'MISSING');
        
        if (token) {
          try {
            const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser(token);
            console.log(`🔍 Upload API - Cookie ${cookieName} getUser result:`, { 
              hasUser: !!cookieUser, 
              error: cookieError?.message 
            });
            
            if (cookieUser) {
              user = cookieUser;
              userId = cookieUser.id;
              console.log('🔍 Success with cookie approach 4:', { userId, email: cookieUser.email, cookieName });
              break;
            }
          } catch (error: unknown) {
            console.log(`🔍 Upload API - Cookie ${cookieName} validation error:`, error);
          }
        }
      }
    }
    
    console.log('🔍 Final tRPC-style auth result:', { hasUser: !!user, userId });
    
    if (!userId) {
      console.log('❌ Authentication failed - returning 401');
      return NextResponse.json({ 
        error: "Unauthorized", 
        debug: "No valid authentication found"
      }, { status: 401 });
    }

    console.log('✅ Authentication successful for user:', userId);

    const startTime = Date.now();
    console.log('⏱️ Upload process started');

    console.log('⏱️ Starting form parsing...');
    const parseStartTime = Date.now();
    
    // Parse multipart form data using Next.js App Router approach
    const formData = await request.formData();
    
    console.log(`⏱️ Form parsing completed in ${Date.now() - parseStartTime}ms`);

    // Get the file and bucket from the form
    const file = formData.get('file') as File | null;
    const bucket = (formData.get('bucket') as string) ?? 'avatars'; // Default to avatars bucket

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log(`📁 File details: ${file.name}, ${(file.size / 1024).toFixed(1)}KB`);

    // Read the file
    console.log('⏱️ Reading file into buffer...');
    const readStartTime = Date.now();
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    console.log(`⏱️ File read completed in ${Date.now() - readStartTime}ms`);

    // Generate a unique path for the file
    const filePath = `${userId}/${Date.now()}-${file.name ?? 'file'}`;

    // Create a new Supabase client with service role for uploads
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Upload the file to Supabase Storage
    console.log('⏱️ Starting Supabase upload...');
    const uploadStartTime = Date.now();
    
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType: file.type ?? 'application/octet-stream',
        cacheControl: '3600',
        upsert: true
      });

    console.log(`⏱️ Supabase upload completed in ${Date.now() - uploadStartTime}ms`);

    if (error) {
      console.error('❌ Supabase upload error:', error);
      throw error;
    }

    // Get the public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath);

    // No cleanup needed with File API approach

    const totalTime = Date.now() - startTime;
    console.log(`✅ Upload completed successfully in ${totalTime}ms`);

    // Return the file path and URL
    const response = {
      path: filePath,
      url: urlData.publicUrl,
    };
    
    console.log('📤 Sending response:', response);
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error("❌ Upload error:", error);
    console.error("❌ Error stack:", error.stack);
    return NextResponse.json({ 
      error: error.message || "Failed to upload file",
      details: error.toString()
    }, { status: 500 });
  }
}

// No helper classes needed - using native Next.js File API 