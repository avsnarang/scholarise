import { type NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/hooks/useAuth";

type PageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

const Home: PageWithLayout = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect based on authentication status
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // If user is logged in, redirect to dashboard
        void router.push('/dashboard');
      } else {
        // If user is not logged in, redirect to sign-in
        void router.push('/sign-in');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[#00501B]"></div>
          <p className="text-lg font-medium text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  // This won't be shown as we're redirecting, but it's good to have a fallback
  return (
    <>
      <Head>
        <title>ScholaRise ERP</title>
        <meta name="description" content="ScholaRise ERP System" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="container mx-auto py-8">
        <h1 className="mb-6 text-3xl font-bold">Welcome to ScholaRise ERP</h1>
        <p className="text-gray-600">Redirecting you to the appropriate page...</p>
      </main>
    </>
  );
};

Home.getLayout = function getLayout(page: React.ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default Home;
