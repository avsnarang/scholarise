"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useUserRole } from "@/hooks/useUserRole";

export default function Home() {
  const router = useRouter();
  const { isLoaded, userId } = useAuth();
  const { isTeacher } = useUserRole();

  useEffect(() => {
    if (isLoaded) {
      if (userId) {
        // Redirect teachers to their specific dashboard
        if (isTeacher) {
          router.push("/staff/teachers/dashboard");
        } else {
          // Redirect other users to main dashboard
          router.push("/dashboard");
        }
      } else {
        router.push("/sign-in");
      }
    }
  }, [isLoaded, userId, isTeacher, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#00501B] border-t-transparent"></div>
        <h1 className="text-xl font-semibold text-gray-900">Loading...</h1>
        <p className="mt-2 text-gray-600">Please wait while we redirect you.</p>
      </div>
    </div>
  );
} 