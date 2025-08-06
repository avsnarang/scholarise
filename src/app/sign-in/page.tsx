"use client";

import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { RiGoogleFill } from "@remixicon/react";
import { useAuth } from "@/providers/auth-provider";
import { useGlobalLoading } from "@/providers/global-loading-provider";

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
  const globalLoading = useGlobalLoading();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Performance optimizations
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const blobContainerRef = useRef<HTMLDivElement>(null);
  
  // Get redirect URL from query parameters
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Intersection Observer for animation optimization
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            element.style.animationPlayState = 'running';
          } else {
            element.style.animationPlayState = 'paused';
          }
        });
      },
      { threshold: 0.1 }
    );

    if (blobContainerRef.current) {
      const animatedElements = blobContainerRef.current.querySelectorAll('[class*="animate-"]');
      animatedElements.forEach(el => observer.observe(el));
    }

    return () => observer.disconnect();
  }, []);

  // Optimized animation class helper
  const getAnimationClass = useCallback((baseClass: string) => {
    return prefersReducedMotion ? '' : `${baseClass} gpu-optimized`;
  }, [prefersReducedMotion]);
  
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

  // Show global loading when auth is loading
  React.useEffect(() => {
    if (loading) {
      globalLoading.show("Authenticating...");
    } else {
      globalLoading.hide();
    }
  }, [loading, globalLoading]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#E6A880] via-[#C27C54] to-[#A66642]">
      {/* Deep gradient background - Layer 1 */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E6A880]/90 via-[#C27C54]/80 to-[#A66642]/90" />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#D4926A]/20 to-[#B86B48]/30" />
      </div>

      {/* Optimized 3D Liquid Blob Shapes - Layer 2 */}
      <div ref={blobContainerRef} className="absolute inset-0 overflow-hidden z-1">
        {/* Large 3D blob top left - Optimized */}
        <div className={`absolute -top-32 -left-32 w-[500px] h-[500px] ${getAnimationClass('animate-blob')}`}>
          <div className="absolute inset-0 gpu-optimized">
            {/* Simplified blob with CSS custom properties */}
            <div 
              className="absolute inset-0 opacity-90"
              style={{
                background: "var(--blob-gradient-green)",
                borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%",
                transform: "rotate(10deg) translateZ(0)",
              }}
            />
            {/* Optimized highlight */}
            <div className="absolute top-16 left-16 w-24 h-24 rounded-full blur-sm opacity-60" 
                 style={{ background: "var(--blob-highlight)" }} />
            {/* Optimized shadow */}
            <div className="absolute -bottom-2 -right-2 w-full h-full rounded-full blur-lg transform scale-95 opacity-10" 
                 style={{ background: "var(--blob-shadow)" }} />
          </div>
        </div>

        {/* Orange 3D blob top right - Optimized */}
        <div className={`absolute -top-20 right-20 w-[400px] h-[400px] ${getAnimationClass('animate-blob animation-delay-2000')}`}>
          <div className="absolute inset-0 gpu-optimized">
            {/* Simplified orange blob */}
            <div 
              className="absolute inset-0 opacity-80"
              style={{
                background: "var(--blob-gradient-orange)",
                borderRadius: "60% 40% 30% 70% / 70% 60% 40% 30%",
                transform: "rotate(-45deg) translateZ(0)"
              }}
            />
            {/* Optimized highlight */}
            <div className="absolute top-12 right-16 w-20 h-32 rounded-full blur-sm opacity-50 transform rotate-12" 
                 style={{ background: "var(--blob-highlight)" }} />
            {/* Optimized shadow */}
            <div className="absolute -bottom-3 -left-3 w-full h-full rounded-full blur-lg transform scale-90 opacity-10" 
                 style={{ background: "var(--blob-shadow)" }} />
          </div>
        </div>

        {/* Large center 3D blob - Optimized */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] ${getAnimationClass('animate-blob animation-delay-4000')}`}>
          <div className="absolute inset-0 gpu-optimized">
            {/* Simplified emerald blob */}
            <div 
              className="absolute inset-0 opacity-70"
              style={{
                background: "var(--blob-gradient-emerald)",
                borderRadius: "42% 58% 70% 30% / 45% 60% 40% 55%",
                transform: "rotate(25deg) translateZ(0)"
              }}
            />
            {/* Optimized highlight */}
            <div className="absolute top-20 left-32 w-36 h-24 rounded-full blur-sm opacity-40 transform -rotate-12" 
                 style={{ background: "var(--blob-highlight)" }} />
            {/* Optimized shadow */}
            <div className="absolute -bottom-4 -right-4 w-full h-full rounded-full blur-lg transform scale-95 opacity-8" 
                 style={{ background: "var(--blob-shadow)" }} />
          </div>
        </div>

        {/* Bottom right 3D blob - Optimized */}
        <div className={`absolute -bottom-24 -right-24 w-[450px] h-[450px] ${getAnimationClass('animate-blob animation-delay-6000')}`}>
          <div className="absolute inset-0 gpu-optimized">
            {/* Simplified lime blob */}
            <div 
              className="absolute inset-0 opacity-85"
              style={{
                background: "var(--blob-gradient-lime)",
                borderRadius: "70% 30% 30% 70% / 30% 70% 70% 30%",
                transform: "rotate(90deg) translateZ(0)"
              }}
            />
            {/* Optimized highlight */}
            <div className="absolute bottom-16 right-16 w-32 h-32 rounded-full blur-sm opacity-50" 
                 style={{ background: "var(--blob-highlight)" }} />
            {/* Optimized shadow */}
            <div className="absolute -top-2 -left-2 w-full h-full rounded-full blur-lg transform scale-90 opacity-10" 
                 style={{ background: "var(--blob-shadow)" }} />
          </div>
        </div>

        {/* Small floating 3D blob - Optimized */}
        <div className={`absolute top-1/3 left-1/4 w-[250px] h-[250px] ${getAnimationClass('animate-blob animation-delay-3000')}`}>
          <div className="absolute inset-0 gpu-optimized">
            {/* Simplified amber blob */}
            <div 
              className="absolute inset-0 opacity-75"
              style={{
                background: "var(--blob-gradient-amber)",
                borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
                transform: "rotate(-30deg) translateZ(0)"
              }}
            />
            {/* Optimized highlight */}
            <div className="absolute top-8 left-12 w-16 h-16 rounded-full blur-sm opacity-50" 
                 style={{ background: "var(--blob-highlight)" }} />
            {/* Optimized shadow */}
            <div className="absolute -bottom-2 -right-2 w-full h-full rounded-full blur-md transform scale-85 opacity-8" 
                 style={{ background: "var(--blob-shadow)" }} />
          </div>
        </div>

        {/* Optimized 3D Decorative Squiggly Lines */}
        {/* Shared gradient definitions */}
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <defs>
            <linearGradient id="green-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
            <linearGradient id="orange-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
            <linearGradient id="highlight-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>

        {/* Top left 3D squiggle - Optimized */}
        <div className={`absolute top-20 left-20 w-40 h-40 opacity-80 ${getAnimationClass('animate-float')}`}>
          <svg className="absolute inset-0 gpu-optimized" viewBox="-10 -10 120 120" style={{ overflow: "visible" }}>
            {/* Simplified structure */}
            <path
              d="M5 50 Q 20 20, 35 50 T 65 50 T 95 50"
              fill="none"
              stroke="url(#green-gradient)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M5 50 Q 20 20, 35 50 T 65 50 T 95 50"
              fill="none"
              stroke="url(#highlight-gradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="30 70"
            />
          </svg>
        </div>

        {/* Bottom right 3D squiggle - Optimized */}
        <div className={`absolute bottom-32 right-16 w-48 h-48 opacity-70 rotate-45 ${getAnimationClass('animate-float-delayed')}`}>
          <svg className="absolute inset-0 gpu-optimized" viewBox="-15 -15 150 150" style={{ overflow: "visible" }}>
            <path
              d="M10 60 Q 30 25, 50 60 T 80 60 Q 95 95, 110 60"
              fill="none"
              stroke="url(#orange-gradient)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M10 60 Q 30 25, 50 60 T 80 60 Q 95 95, 110 60"
              fill="none"
              stroke="url(#highlight-gradient)"
              strokeWidth="2"
              strokeLinecap="round"
              transform="translate(-1, -1)"
            />
          </svg>
        </div>

        {/* Remaining optimized squiggly lines */}
        <div className={`absolute top-1/2 left-10 w-32 h-56 opacity-60 -translate-y-1/2 ${getAnimationClass('animate-blob animation-delay-4000')}`}>
          <svg className="absolute inset-0 gpu-optimized" viewBox="-10 -10 80 140" style={{ overflow: "visible" }}>
            <path d="M30 15 Q 10 35, 30 65 Q 50 95, 30 115" fill="none" stroke="url(#green-gradient)" strokeWidth="5" strokeLinecap="round" />
            <path d="M30 15 Q 10 35, 30 65 Q 50 95, 30 115" fill="none" stroke="url(#highlight-gradient)" strokeWidth="2" strokeLinecap="round" strokeDasharray="20 80" />
          </svg>
        </div>

        <div className={`absolute top-32 right-1/3 w-36 h-36 opacity-75 ${getAnimationClass('animate-float animation-delay-2000')}`}>
          <svg className="absolute inset-0 gpu-optimized" viewBox="-15 -15 130 130" style={{ overflow: "visible" }}>
            <path d="M50 50 Q 65 35, 65 50 Q 65 65, 50 65 Q 35 65, 35 50 Q 35 35, 50 35 Q 70 35, 70 55" fill="none" stroke="url(#orange-gradient)" strokeWidth="4" strokeLinecap="round" />
            <path d="M50 50 Q 65 35, 65 50 Q 65 65, 50 65 Q 35 65, 35 50 Q 35 35, 50 35 Q 70 35, 70 55" fill="none" stroke="url(#highlight-gradient)" strokeWidth="1.5" strokeLinecap="round" transform="translate(-1, -1)" />
          </svg>
        </div>

        <div className={`absolute bottom-40 left-1/3 w-44 h-24 opacity-65 ${getAnimationClass('animate-float-delayed')}`}>
          <svg className="absolute inset-0 gpu-optimized" viewBox="-10 -10 140 60" style={{ overflow: "visible" }}>
            <path d="M5 25 Q 15 15, 25 25 T 45 25 T 65 25 T 85 25 T 105 25 T 125 25" fill="none" stroke="url(#green-gradient)" strokeWidth="5" strokeLinecap="round" />
            <path d="M5 25 Q 15 15, 25 25 T 45 25 T 65 25 T 85 25 T 105 25 T 125 25" fill="none" stroke="url(#highlight-gradient)" strokeWidth="2" strokeLinecap="round" strokeDasharray="40 60" />
          </svg>
        </div>

        <div className={`absolute top-2/3 right-1/4 w-28 h-28 opacity-70 ${getAnimationClass('animate-blob animation-delay-3000')}`}>
          <svg className="absolute inset-0 gpu-optimized" viewBox="-10 -10 100 100" style={{ overflow: "visible" }}>
            <path d="M15 45 Q 25 25, 40 45 T 65 45" fill="none" stroke="url(#orange-gradient)" strokeWidth="4" strokeLinecap="round" />
            <path d="M15 45 Q 25 25, 40 45 T 65 45" fill="none" stroke="url(#highlight-gradient)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

      </div>

      {/* Login form container - Layer 3 */}
      <div className="min-h-screen flex items-center justify-center p-4 relative z-[2] gpu-optimized">
        {/* Main card container */}
        <div className="w-full max-w-[380px]">
          {/* Optimized glass card */}
          <div className="relative bg-white/10 dark:bg-white/5 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20 gpu-optimized">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="mb-4">
                <Image
                  src="/mobile_logo.png"
                  alt="Your logo"
                  width={80}
                  height={80}
                  className="object-contain mx-auto"
                />
              </div>
              
              <p className="mb-2 text-2xl font-bold text-white/80">
                Imagine. Educate. Transform.
              </p>
              
              
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

              {/* Liquid Glass Sign In Button */}
              <div className="relative group">
                {/* Glow effect container */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-lg blur-lg opacity-60 group-hover:opacity-100 transition duration-500 group-hover:duration-200 animate-gradient-x"></div>
                
                {/* Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="relative w-full h-12 px-7 py-3 bg-gradient-to-b from-white/20 to-white/10 backdrop-blur-xl rounded-lg leading-none flex items-center justify-center text-white font-medium transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden group"
                  style={{
                    boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.4), inset 0 -1px 0 0 rgba(0,0,0,0.2), 0 10px 30px -10px rgba(16,185,129,0.5)"
                  }}
                >
                  {/* Glass shine effect */}
                  <div className="absolute inset-0 w-full h-full">
                    <div className="absolute top-0 left-0 w-full h-[50%] bg-gradient-to-b from-white/30 to-transparent rounded-t-lg"></div>
                  </div>
                  
                  {/* Liquid animation on hover */}
                  <div className="absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-r from-green-400/30 to-emerald-400/30 rounded-full blur-3xl group-hover:translate-x-full group-hover:translate-y-full transition-transform duration-700"></div>
                  <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-l from-teal-400/30 to-green-400/30 rounded-full blur-3xl group-hover:-translate-x-full group-hover:-translate-y-full transition-transform duration-700"></div>
                  
                  {/* Button content */}
                  <span className="relative flex items-center gap-2 text-base">
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="font-semibold tracking-wide">Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold tracking-wide">Sign in</span>
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </span>
                  
                  {/* Ripple effect on click */}
                  <div className="absolute inset-0 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/20"></div>
                  </div>
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 py-1 text-white/60 bg-gradient-to-br from-[#E6A880] via-[#C27C54] to-[#A66642] rounded-full border border-white/10">or continue with</span>
                </div>
              </div>

              {/* Google Sign In */}
              <div className="relative group">
                {/* Google glow effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-red-500 to-green-500 rounded-lg blur-lg opacity-50 group-hover:opacity-80 transition duration-500 group-hover:duration-200 animate-gradient-x"></div>
                
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="relative w-full h-12 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg flex items-center justify-center gap-3 font-medium transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border border-white/20"
                  style={{
                    boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.2), 0 8px 25px -8px rgba(66,133,244,0.3)"
                  }}
                >
                  {/* Google G logo */}
                  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  
                  <span className="font-semibold tracking-wide">Continue with Google</span>
                  
                  {/* Subtle inner glow */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/10 via-red-500/10 to-green-500/10"></div>
                </button>
              </div>
            </form>

            {/* Footer Links */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-xs">
                <a 
                  href="/privacy-policy" 
                  className="text-white/70 hover:text-white transition-colors underline decoration-white/30 hover:decoration-white"
                >
                  Privacy Policy
                </a>
                <span className="hidden sm:inline text-white/40">•</span>
                <a 
                  href="/terms-and-conditions" 
                  className="text-white/70 hover:text-white transition-colors underline decoration-white/30 hover:decoration-white"
                >
                  Terms and Conditions
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function SignInPage() {
  return <SignInForm />;
}