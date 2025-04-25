import { type NextPage } from "next";
import Head from "next/head";
import { useEffect } from "react";
import { useRouter } from "next/router";

const LoginPage: NextPage = () => {
  const router = useRouter();

  useEffect(() => {
    void router.replace("/sign-in");
  }, [router]);

  return (
    <>
      <Head>
        <title>Login | ScholaRise</title>
        <meta name="description" content="Login to ScholaRise ERP" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex min-h-screen flex-col items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#00501B] border-t-transparent"></div>
          <h1 className="text-xl font-semibold text-gray-900">Redirecting...</h1>
          <p className="mt-2 text-gray-600">Please wait while we redirect you to the sign-in page.</p>
        </div>
      </div>
    </>
  );
};

export default LoginPage;