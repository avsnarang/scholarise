import { useState, useEffect } from "react";
import { type NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useSignIn, useAuth } from "@clerk/nextjs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Icons
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof formSchema>;

const SignInPage: NextPage = () => {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to dashboard if already signed in
  useEffect(() => {
    if (isSignedIn) {
      void router.replace("/dashboard");
    }
  }, [isSignedIn, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!isLoaded) return;

    // If already signed in, redirect to dashboard
    if (isSignedIn) {
      void router.push("/dashboard");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      try {
        // Create a new sign-in attempt
        const result = await signIn.create({
          identifier: data.email,
          password: data.password,
          strategy: "password",
        });

        if (result.status === "complete") {
          // Set the session as active
          await setActive({
            session: result.createdSessionId,
          });

          void router.push("/dashboard");
        } else {
          // This should not happen with email/password auth
          setError("Something went wrong. Please try again.");
        }
      } catch (clerkError) {
        // Handle specific Clerk errors
        const error = clerkError as { errors?: Array<{ message?: string }> };
        if (error.errors?.[0]?.message?.includes("already signed in")) {
          // User is already signed in, redirect to dashboard
          void router.push("/dashboard");
          return;
        }

        // Re-throw for general error handling
        throw clerkError;
      }
    } catch (err) {
      console.error("Sign in error:", err);
      const error = err as { errors?: Array<{ message?: string }> };
      setError(error.errors?.[0]?.message ?? "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign In | ScholaRise ERP</title>
        <meta name="description" content="Sign in to ScholaRise ERP" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Main container with enhanced background */}
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-white via-gray-50 to-white">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute h-full w-full" style={{ backgroundImage: 'radial-gradient(#00501B 1px, transparent 1px), radial-gradient(#A65A20 1px, transparent 1px)', backgroundSize: '40px 40px', backgroundPosition: '0 0, 20px 20px' }}></div>
        </div>

        {/* Geometric shapes for background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {/* Large circle - dark green */}
          <div className="absolute -right-20 -top-20 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[#00501B]/10 to-[#00501B]/5 blur-xl"></div>

          {/* Medium circle - rust/amber */}
          <div className="absolute -left-40 bottom-0 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-[#A65A20]/10 to-[#A65A20]/5 blur-xl"></div>

          {/* Small square - dark green */}
          <div className="absolute bottom-20 right-20 h-60 w-60 rotate-45 transform bg-[#00501B]/5 blur-md"></div>

          {/* Small circle - rust/amber */}
          <div className="absolute left-20 top-20 h-40 w-40 rounded-full bg-[#A65A20]/5 blur-md"></div>

          {/* Diagonal line - dark green */}
          <div className="absolute left-1/4 top-0 h-screen w-1 rotate-45 transform bg-gradient-to-b from-[#00501B]/20 to-transparent"></div>

          {/* Diagonal line - rust/amber */}
          <div className="absolute right-1/4 top-0 h-screen w-1 -rotate-45 transform bg-gradient-to-b from-[#A65A20]/20 to-transparent"></div>

          {/* Floating shapes - animated */}
          <div className="absolute left-1/3 top-1/4 h-16 w-16 animate-float rounded-full border border-[#00501B]/20 bg-white/30 backdrop-blur-sm"></div>
          <div className="absolute right-1/4 top-2/3 h-12 w-12 animate-float-delayed rounded-md border border-[#A65A20]/20 bg-white/30 backdrop-blur-sm"></div>
          <div className="absolute left-2/3 top-1/3 h-20 w-20 animate-float-slow rotate-45 transform border border-[#00501B]/20 bg-white/30 backdrop-blur-sm"></div>
        </div>

        {/* Light effect overlay */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/60 via-transparent to-white/60"></div>

        {/* Login card container */}
        <div className="z-10 w-full max-w-md px-4">
          {/* Logo and title */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#00501B] to-[#A65A20] shadow-lg shadow-[#00501B]/10">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-center">
                <span className="text-3xl font-bold bg-gradient-to-br from-[#00501B] to-[#A65A20] bg-clip-text text-transparent">SR</span>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900">ScholaRise</h1>
            <p className="mt-2 text-[#00501B] font-medium">Sign in to your account</p>
          </div>

          {/* Card with material design */}
          <div className="overflow-hidden rounded-xl bg-white/95 backdrop-blur-sm shadow-2xl shadow-[#00501B]/10 ring-1 ring-gray-100">
            {/* Card header with accent color */}
            <div className="h-2 bg-gradient-to-r from-[#00501B] to-[#A65A20]"></div>

            {/* Card content */}
            <div className="p-8">
              {/* Error message */}
              {error && (
                <div className="mb-6 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Email field */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      className={`block w-full rounded-md border ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-[#00501B] focus:ring-[#00501B]'} py-2.5 pl-10 pr-3 shadow-sm transition-all duration-200 bg-white/80 hover:bg-white focus:bg-white`}
                      placeholder="you@example.com"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                  )}
                </div>

                {/* Password field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className={`block w-full rounded-md border ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-[#00501B] focus:ring-[#00501B]'} py-2.5 pl-10 pr-10 shadow-sm transition-all duration-200 bg-white/80 hover:bg-white focus:bg-white`}
                      placeholder="••••••••"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                  )}
                </div>

                {/* Forgot password link */}
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    className="text-sm font-medium text-[#A65A20] hover:text-[#A65A20]/80"
                    onClick={() => router.push("/forgot-password")}
                  >
                    Forgot your password?
                  </button>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading || !isLoaded}
                  className="flex w-full items-center justify-center rounded-md bg-gradient-to-r from-[#00501B] to-[#00501B]/90 py-2.5 px-4 text-sm font-medium text-white shadow-md hover:shadow-lg hover:from-[#00501B]/95 hover:to-[#00501B] focus:outline-none focus:ring-2 focus:ring-[#00501B] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  {isLoading ? (
                    <>
                      <svg className="mr-2 h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>

                {/* Google sign in */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-gray-500">Or continue with</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    // If already signed in, redirect to dashboard
                    if (isSignedIn) {
                      void router.push("/dashboard");
                      return;
                    }

                    if (isLoaded) {
                      try {
                        signIn.authenticateWithRedirect({
                          strategy: "oauth_google",
                          redirectUrl: "/sso-callback",
                          redirectUrlComplete: "/dashboard",
                        });
                      } catch (err) {
                        // If error contains "already signed in", redirect to dashboard
                        const error = err as { errors?: Array<{ message?: string }> };
                        if (error.errors?.[0]?.message?.includes("already signed in")) {
                          void router.push("/dashboard");
                        } else {
                          console.error("Google sign-in error:", error);
                          setError(error.errors?.[0]?.message ?? "Error signing in with Google");
                        }
                      }
                    }
                  }}
                  disabled={isLoading || !isLoaded}
                  className="flex w-full items-center justify-center gap-3 rounded-md border border-gray-200 bg-white/90 py-2.5 px-4 text-sm font-medium text-gray-700 shadow-sm hover:shadow-md hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#A65A20] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                  Google
                </button>
              </form>
            </div>

            {/* Card footer */}
            <div className="border-t border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100/50 p-4 text-center text-xs text-gray-500">
              <p>© {new Date().getFullYear()} ScholaRise. All rights reserved.</p>
              <p className="mt-1 text-[#00501B]/70">Empowering Education Management</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignInPage;
