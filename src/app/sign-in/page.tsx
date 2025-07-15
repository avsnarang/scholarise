"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { RiGoogleFill, RiGithubFill } from "@remixicon/react";
import { useSignIn, useAuth } from "@clerk/nextjs";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SignInFormProps {
  onSubmit?: (email: string, password: string) => void;
}

const SignInForm = ({ onSubmit }: SignInFormProps) => {
  const router = useRouter();
  const { isLoaded: isAuthLoaded, userId } = useAuth();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Get redirect URL from query parameters
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirectUrl');
      setRedirectUrl(redirect);
    }
  }, []);

  // Redirect to root page if already signed in (let root page handle role-based routing)
  useEffect(() => {
    if (isAuthLoaded && userId) {
      const destination = redirectUrl || '/';
      router.push(destination);
    }
  }, [isAuthLoaded, userId, router, redirectUrl]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    
    if (!isLoaded || !signIn) {
      setError("Authentication system is not ready. Please try again.");
      return;
    }
    
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn.create({
        identifier: email,
        password: password,
      });

      if (result.status === "complete" && setActive) {
        // Set the active session
        await setActive({ session: result.createdSessionId });
        
        // Redirect to original destination or root page (let root page handle role-based routing)
        const destination = redirectUrl || '/';
        router.push(destination);
      } else {
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
    if (!isLoaded || !signIn) return;
    
    try {
      const destination = redirectUrl || "/";
      signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: destination
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-background rounded-2xl shadow-xl overflow-hidden border border-border relative">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-background p-4 rounded-2xl shadow-lg mb-6">
              <svg
                width="48"
                height="48"
                viewBox="0 0 110 106"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100.83 28.63L66.86 3.95c-7.25-5.26-17.07-5.26-24.35 0L8.54 28.63C1.29 33.89-1.76 43.23 1.01 51.77l12.98 39.93c2.77 8.53 10.72 14.3 19.7 14.3h41.97c8.98 0 16.93-5.76 19.7-14.3l12.98-39.93c2.77-8.53-.28-17.88-7.53-23.14ZM64.81 63.13l-10.13 18.55-10.13-18.55-18.55-10.13 18.55-10.13 10.13-18.55 10.13 18.55 18.55 10.13-18.55 10.13Z"
                  fill="currentColor"
                  className="text-primary"
                />
              </svg>
            </div>
            <div className="p-0">
              <h2 className="text-2xl font-bold text-foreground text-center">
                Welcome Back
              </h2>
              <p className="text-center text-muted-foreground mt-2">
                Sign in to continue to your account
              </p>
            </div>
          </div>

          <form onSubmit={handleSignIn} className="space-y-6 p-0">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                </span>
                <Input
                  id="email"
                  className="pl-10"
                  placeholder="Enter your email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <a href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Lock className="w-4 h-4" />
                </span>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="pl-10 pr-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground hover:bg-accent inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-3"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff size={16} strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <Eye size={16} strokeWidth={2} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}

            <Button className="w-full h-12" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="flex items-center my-4">
              <div className="flex-1 h-px bg-border"></div>
              <span className="px-4 text-sm text-muted-foreground">
                or continue with
              </span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Button 
                variant="outline" 
                type="button" 
                className="h-12 flex items-center justify-center gap-2"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <RiGoogleFill className="text-foreground" size={18} />
                <span className="whitespace-nowrap">Google</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default function SignInPage() {
  return <SignInForm />;
} 