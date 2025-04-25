import { useState } from "react";
import { type NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useSignIn } from "@clerk/nextjs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Icons
import { Mail, AlertCircle, ArrowLeft } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormValues = z.infer<typeof formSchema>;

const ForgotPasswordPage: NextPage = () => {
  const router = useRouter();
  const { isLoaded, signIn } = useSignIn();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!isLoaded) return;

    try {
      setIsLoading(true);
      setError(null);

      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: data.email,
      });

      setSuccess(true);
    } catch (err: any) {
      console.error("Reset password error:", err);
      setError(err.errors?.[0]?.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Forgot Password | ScholaRise ERP</title>
        <meta name="description" content="Reset your ScholaRise ERP password" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Main container with geometric background */}
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white">
        {/* Geometric shapes for background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {/* Large circle - dark green */}
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[#00501B]/10"></div>
          
          {/* Medium triangle - rust/amber */}
          <div className="absolute bottom-0 left-0 h-0 w-0 border-b-[300px] border-l-[300px] border-r-[300px] border-b-[#A65A20]/10 border-l-transparent border-r-transparent"></div>
          
          {/* Small square - dark green */}
          <div className="absolute bottom-20 right-20 h-40 w-40 rotate-45 transform bg-[#00501B]/5"></div>
          
          {/* Small circle - rust/amber */}
          <div className="absolute left-20 top-20 h-32 w-32 rounded-full bg-[#A65A20]/5"></div>
          
          {/* Diagonal line - dark green */}
          <div className="absolute left-1/4 top-0 h-screen w-1 rotate-45 transform bg-[#00501B]/10"></div>
          
          {/* Diagonal line - rust/amber */}
          <div className="absolute right-1/4 top-0 h-screen w-1 -rotate-45 transform bg-[#A65A20]/10"></div>
        </div>
        
        {/* Card container */}
        <div className="z-10 w-full max-w-md px-4">
          {/* Logo and title */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#00501B] to-[#A65A20]">
              <span className="text-2xl font-bold text-white">SR</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">ScholaRise</h1>
            <p className="mt-1 text-[#00501B]">Reset your password</p>
          </div>
          
          {/* Card with material design */}
          <div className="overflow-hidden rounded-xl bg-white shadow-xl">
            {/* Card header with accent color */}
            <div className="h-2 bg-gradient-to-r from-[#00501B] to-[#A65A20]"></div>
            
            {/* Card content */}
            <div className="p-8">
              {success ? (
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-medium text-gray-900">Check your email</h2>
                  <p className="mt-2 text-sm text-gray-600">
                    We've sent a password reset link to your email address. Please check your inbox and follow the instructions.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/sign-in")}
                    className="mt-6 inline-flex items-center rounded-md bg-[#00501B] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#00501B]/90 focus:outline-none focus:ring-2 focus:ring-[#00501B] focus:ring-offset-2"
                  >
                    Return to sign in
                  </button>
                </div>
              ) : (
                <>
                  {/* Error message */}
                  {error && (
                    <div className="mb-6 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600">
                      <AlertCircle className="h-5 w-5" />
                      <p>{error}</p>
                    </div>
                  )}
                  
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <p className="text-sm text-gray-600">
                      Enter your email address and we'll send you a link to reset your password.
                    </p>
                    
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
                          className={`block w-full rounded-md border ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-[#00501B] focus:ring-[#00501B]'} py-2 pl-10 pr-3 shadow-sm transition-colors`}
                          placeholder="you@example.com"
                          {...register("email")}
                        />
                      </div>
                      {errors.email && (
                        <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                      )}
                    </div>

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={isLoading || !isLoaded}
                      className="flex w-full items-center justify-center rounded-md bg-[#00501B] py-2 px-4 text-sm font-medium text-white shadow-md hover:bg-[#00501B]/90 focus:outline-none focus:ring-2 focus:ring-[#00501B] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 transition-all duration-200"
                    >
                      {isLoading ? (
                        <>
                          <svg className="mr-2 h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        "Reset Password"
                      )}
                    </button>

                    {/* Back to sign in */}
                    <button
                      type="button"
                      onClick={() => router.push("/sign-in")}
                      className="flex w-full items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to sign in
                    </button>
                  </form>
                </>
              )}
            </div>
            
            {/* Card footer */}
            <div className="border-t border-gray-100 bg-gray-50 p-4 text-center text-xs text-gray-500">
              © {new Date().getFullYear()} ScholaRise. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ForgotPasswordPage;
