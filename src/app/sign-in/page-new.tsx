"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { RiGoogleFill, RiGithubFill, RiFacebookFill } from "@remixicon/react";
import { useAuth } from "@/providers/auth-provider";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SignInFormProps {
  onSubmit?: (email: string, password: string) => void;
}

const SignInForm = ({ onSubmit }: SignInFormProps) => {
  const router = useRouter();
  const { user, loading, signIn, signInWithGoogle } = useAuth();
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

  // Redirect to root page if already signed in
  useEffect(() => {
    if (!loading && user) {
      const destination = redirectUrl || '/';
      router.push(destination);
    }
  }, [loading, user, router, redirectUrl]);

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
    
    setError("");
    setIsLoading(true);

    try {
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        setError(signInError.message || "Invalid email or password");
      } else {
        const destination = redirectUrl || '/';
        router.push(destination);
      }
    } catch (err: any) {
      console.error("Sign in error:", err);
      setError("Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError("An error occurred with Google sign in. Please try again.");
      }
    } catch (err) {
      console.error("Google sign in error:", err);
      setError("An error occurred with Google sign in. Please try again.");
    }
  };

  // If still loading auth state, show a loading spinner
  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#00501B] via-[#003d15] to-[#002a0e] flex items-center justify-center">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-[#001a08]" />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-secondary/10 to-secondary/20" />
        </div>
        
        <div className="relative z-10">
          <div className="h-16 w-16 animate-spin rounded-full bg-gradient-to-r from-primary to-secondary p-1">
            <div className="h-full w-full rounded-full bg-background/10 backdrop-blur-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#00501B] via-[#003d15] to-[#002a0e]">
      {/* Deep gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-[#001a08]" />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-secondary/10 to-secondary/20" />
      </div>

      {/* 3D Liquid Blob Shapes */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large blob top left */}
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] animate-blob">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 via-primary/20 to-transparent blur-3xl" />
          <div className="absolute inset-10 rounded-full bg-gradient-to-br from-primary/60 to-primary/30 blur-2xl" />
          <div className="absolute inset-20 rounded-full bg-gradient-to-br from-primary/80 to-primary/40 blur-xl" />
        </div>

        {/* Medium blob top right */}
        <div className="absolute -top-40 right-10 w-[400px] h-[400px] animate-blob animation-delay-2000">
          <div className="absolute inset-0 rounded-full bg-gradient-to-bl from-secondary/30 via-secondary/15 to-transparent blur-3xl" />
          <div className="absolute inset-10 rounded-full bg-gradient-to-bl from-secondary/50 to-secondary/20 blur-2xl" />
          <div className="absolute inset-16 rounded-full bg-gradient-to-bl from-secondary/70 to-secondary/30 blur-xl" />
        </div>

        {/* Large center blob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] animate-blob animation-delay-4000">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 via-transparent to-secondary/20 blur-3xl" />
          <div className="absolute inset-20 rounded-full bg-gradient-to-r from-primary/30 via-primary/10 to-secondary/30 blur-2xl" />
        </div>

        {/* Bottom right blob */}
        <div className="absolute -bottom-32 -right-32 w-[450px] h-[450px] animate-blob animation-delay-6000">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tl from-primary/40 via-primary/20 to-transparent blur-3xl" />
          <div className="absolute inset-12 rounded-full bg-gradient-to-tl from-primary/60 to-primary/30 blur-2xl" />
        </div>

        {/* Small accent blobs */}
        <div className="absolute top-1/4 left-1/4 w-[200px] h-[200px] animate-blob animation-delay-3000">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-secondary/40 to-transparent blur-2xl" />
        </div>

        <div className="absolute bottom-1/4 right-1/3 w-[250px] h-[250px] animate-blob animation-delay-5000">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tl from-primary/30 to-transparent blur-2xl" />
        </div>

        {/* Glossy overlay for 3D effect */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute bottom-40 right-40 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-24 h-24 rounded-full bg-white/15 blur-xl" />
        </div>
      </div>

      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        {/* Main card container */}
        <div className="w-full max-w-[380px]">
          {/* Clean glass card */}
          <div className="relative bg-white/10 dark:bg-white/5 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="mb-4">
                <Image
                  src="/mobile_logo.png"
                  alt="Your logo"
                  width={56}
                  height={56}
                  className="object-contain mx-auto"
                />
              </div>
              
              <h2 className="text-2xl font-semibold text-white">
                Login
              </h2>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-white/90 text-sm">
                  Email
                </Label>
                <Input
                  id="email"
                  className="h-10 bg-white/90 backdrop-blur-sm border-0 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-white/30"
                  placeholder="username@gmail.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-white/90 text-sm">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="h-10 pr-10 bg-white/90 backdrop-blur-sm border-0 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-white/30"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff size={18} strokeWidth={2} aria-hidden="true" />
                    ) : (
                      <Eye size={18} strokeWidth={2} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
              
              {/* Forgot Password Link */}
              <div className="text-right">
                <a href="/forgot-password" className="text-xs text-white/70 hover:text-white transition-colors">
                  Forgot Password?
                </a>
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-sm text-red-100">{error}</p>
                </div>
              )}

              {/* Sign In Button */}
              <Button 
                className="w-full h-10 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white border-0 font-medium" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </Button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 text-white/60">or continue with</span>
                </div>
              </div>

              {/* Social Login Options */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="flex-1 h-10 bg-white hover:bg-gray-100 text-gray-700 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
                >
                  <RiGoogleFill size={18} />
                </button>
                <button
                  type="button"
                  disabled
                  className="flex-1 h-10 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-colors opacity-50 cursor-not-allowed"
                >
                  <RiGithubFill size={18} />
                </button>
                <button
                  type="button"
                  disabled
                  className="flex-1 h-10 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-colors opacity-50 cursor-not-allowed"
                >
                  <RiFacebookFill size={18} />
                </button>
              </div>

              {/* Register Link */}
              <div className="text-center pt-4">
                <span className="text-xs text-white/60">
                  Don't have an account yet?{" "}
                  <a href="/register" className="text-white/90 hover:text-white underline">
                    Register for free
                  </a>
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function NewSignInPage() {
  return <SignInForm />;
}