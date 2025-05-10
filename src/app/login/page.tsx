"use client";

import Image from "next/image";
import { useState, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { useSignIn, useAuth, useUser } from "@clerk/nextjs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useBranchContext } from "@/hooks/useBranchContext";
import { LockClosedIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

// Define user roles type for better type safety
type UserRole = "SuperAdmin" | "Admin" | "Teacher" | "Student" | "Employee";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const id = useId();
  const router = useRouter();
  const { isLoaded: isAuthLoaded, userId } = useAuth();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setCurrentBranchId } = useBranchContext();

  // Redirect to dashboard if already signed in
  useEffect(() => {
    if (isAuthLoaded && userId) {
      router.push('/dashboard');
    }
  }, [isAuthLoaded, userId, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false
    }
  });

  const handleBranchSelection = async (user: any) => {
    try {
      if (!user) {
        throw new Error("User data not available");
      }

      const userMetadata = user.publicMetadata;
      const userRole = userMetadata.role as UserRole;
      const assignedBranchId = userMetadata.branchId as string;

      // If user is SuperAdmin, default to Paonta Sahib branch
      if (userRole === "SuperAdmin") {
        const defaultBranchId = "1"; // Paonta Sahib branch
        setCurrentBranchId(defaultBranchId);
        return defaultBranchId;
      }

      // For other roles, use their assigned branch
      if (!assignedBranchId) {
        throw new Error("No branch assigned to user");
      }

      setCurrentBranchId(assignedBranchId);
      return assignedBranchId;

    } catch (error) {
      console.error("Error handling branch selection:", error);
      // Default to Paonta Sahib branch in case of errors
      const defaultBranchId = "1";
      setCurrentBranchId(defaultBranchId);
      return defaultBranchId;
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    if (!isLoaded) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn.create({
        identifier: data.email,
        password: data.password,
      });

      if (result.status === "complete") {
        // Set the active session
        await setActive({ session: result.createdSessionId });
        
        // Redirect to dashboard immediately after successful sign-in
        // The branch selection will be handled in the dashboard layout or page
        router.push(`/dashboard`);
      } else {
        console.log("Sign in result:", result);
        setError("Something went wrong. Please try again.");
      }
    } catch (err: any) {
      console.error("Sign in error:", err);
      setError(err?.errors?.[0]?.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isLoaded) return;
    
    try {
      signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard"
      });
    } catch (err) {
      console.error("Google sign in error:", err);
      setError("An error occurred with Google sign in. Please try again.");
    }
  };

  // If still loading auth state, show a loading spinner
  if (!isAuthLoaded) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#00501B] border-t-transparent"></div>
      </div>
    );
  }

  // Only show the login form if not signed in
  if (isAuthLoaded && !userId) {
    return (
      <div className="w-full max-w-12xl">
        <div className="rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] bg-gradient-to-b from-white to-gray-50/50 mx-auto max-w-2xl w-[560px] backdrop-blur-sm p-8">
          <div className="flex flex-col items-center gap-2">
            {/* Logo Circle */}
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full border bg-white">
              <Image
                src="/logo.png"
                alt="ScholaRise Logo"
                width={40}
                height={40}
                className="h-auto w-auto"
                priority
              />
            </div>
            
            {/* Title */}
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl font-semibold text-[#00501B]">Welcome to ScholaRise</h1>
              <p className="text-sm text-gray-500">Enter your credentials to login to your ScholaRise account.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div className="space-y-4">
              {/* Email field */}
              <div className="*:not-first:mt-2">
                <Label htmlFor={`${id}-email`} className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <Input
                  id={`${id}-email`}
                  type="email"
                  placeholder="name@example.com"
                  className="w-full bg-white/70 border-gray-200 focus:ring-[#00501B]/20 focus:border-[#00501B] hover:border-gray-300 transition-colors"
                  {...register("email")}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Password field */}
              <div className="*:not-first:mt-2">
                <Label htmlFor={`${id}-password`} className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <Input
                  id={`${id}-password`}
                  type="password"
                  placeholder="Enter your password"
                  className="w-full bg-white/70 border-gray-200 focus:ring-[#00501B]/20 focus:border-[#00501B] hover:border-gray-300 transition-colors"
                  {...register("password")}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>
            </div>

            {/* Remember me and Forgot password */}
            <div className="flex justify-between gap-2">
              <div className="flex items-center gap-2">
                <Checkbox id={`${id}-remember`} {...register("remember")} />
                <Label
                  htmlFor={`${id}-remember`}
                  className="text-muted-foreground font-normal text-sm"
                >
                  Remember me
                </Label>
              </div>
              <button 
                type="button"
                onClick={() => router.push("/forgot-password")}
                className="text-sm text-[#00501B] hover:text-[#003513] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-lg bg-red-50/50 p-3 border border-red-100 backdrop-blur-sm">
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              </div>
            )}

            {/* Sign in button */}
            <Button 
              type="submit" 
              className="w-full bg-[#00501B] hover:bg-[#003513] text-white font-medium h-10 text-sm transition-colors"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></span>
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="before:bg-border after:bg-border flex items-center gap-3 my-4 before:h-px before:flex-1 after:h-px after:flex-1">
            <span className="text-muted-foreground text-sm font-medium">Or continue with</span>
          </div>

          {/* Social login */}
          <Button
            variant="outline"
            type="button"
            className="w-full h-10 border-gray-200 hover:bg-gray-50/50 text-sm font-medium"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <svg className="mr-2 h-4 w-4" aria-hidden="true" viewBox="0 0 24 24">
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
            </svg>
            Sign in with Google
          </Button>
        </div>

        {/* Copyright footer */}
        <p className="mt-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} ScholaRise
        </p>
      </div>
    );
  }

  return null; // Should never reach here due to redirect in useEffect
}
