"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useUserRole } from "@/hooks/useUserRole";

export default function Home() {
  const router = useRouter();
  const { isLoaded, userId } = useAuth();
  const { isTeacher, teacherId } = useUserRole();
  const [hasCheckedTeacher, setHasCheckedTeacher] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      if (userId) {
        // For teachers, wait for teacher data to load before redirecting
        if (isTeacher) {
          if (!hasCheckedTeacher) {
            // Give some time for teacher data to load
            setTimeout(() => setHasCheckedTeacher(true), 1000);
            return;
          }

          // If we have a teacher ID, redirect to teacher dashboard
          if (teacherId) {
            router.push("/staff/teachers/dashboard");
          } else {
            // Teacher role but no teacher record - redirect to main dashboard with info
            router.push("/dashboard?teacherSetupNeeded=true");
          }
        } else {
          // Redirect other users to main dashboard
          router.push("/dashboard");
        }
      } else {
        router.push("/sign-in");
      }
    }
  }, [isLoaded, userId, isTeacher, teacherId, hasCheckedTeacher, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#00501B] border-t-transparent"></div>
        <h1 className="text-xl font-semibold text-gray-900">Loading...</h1>
        <p className="mt-2 text-gray-600">
          {isTeacher && !hasCheckedTeacher 
            ? "Checking teacher profile..." 
            : "Please wait while we redirect you."
          }
        </p>
      </div>
    </div>
  );
} 