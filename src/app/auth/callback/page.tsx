"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          router.push('/sign-in?error=callback_error');
          return;
        }

        if (data.session) {
          // Successful authentication
          router.push('/dashboard');
        } else {
          // No session found, redirect to sign-in
          router.push('/sign-in');
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error);
        router.push('/sign-in?error=unexpected_error');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#00501B] border-t-transparent"></div>
        <h1 className="text-xl font-semibold text-gray-900">Processing authentication...</h1>
        <p className="mt-2 text-gray-600">Please wait while we complete your sign-in.</p>
      </div>
    </div>
  );
} 