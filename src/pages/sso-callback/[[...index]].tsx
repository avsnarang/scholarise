import { useEffect } from "react";
import { type NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useClerk } from "@clerk/nextjs";

const SSOCallbackPage: NextPage = () => {
  const router = useRouter();
  const { handleRedirectCallback } = useClerk();

  useEffect(() => {
    // This page is just a callback handler for OAuth providers
    // We'll handle the OAuth callback and redirect to dashboard
    void handleRedirectCallback({
      // Note: Multiple sessions are controlled by Clerk Dashboard settings
      // under Session settings > Session token configuration
      afterCallback: () => {
        void router.push("/dashboard");
      },
    });
  }, [router, handleRedirectCallback]);

  return (
    <>
      <Head>
        <title>Signing In... | ScholaRise ERP</title>
        <meta name="description" content="Completing sign in process" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex min-h-screen flex-col items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#00501B] border-t-transparent"></div>
          <h1 className="text-xl font-semibold text-gray-900">Signing you in...</h1>
          <p className="mt-2 text-gray-600">Please wait while we complete the authentication process.</p>
        </div>
      </div>
    </>
  );
};

export default SSOCallbackPage;
