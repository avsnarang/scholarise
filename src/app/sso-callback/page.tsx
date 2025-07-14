"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";

export default function SSOCallback() {
  const { handleRedirectCallback } = useClerk();
  const router = useRouter();

  useEffect(() => {
    // Get redirect URL from query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirectUrl') || "/dashboard";
    
    // Handle the OAuth callback
    void handleRedirectCallback({
      redirectUrl: redirectUrl,
      afterSignInUrl: redirectUrl,
      afterSignUpUrl: redirectUrl,
    });
  }, [handleRedirectCallback, router]);

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