"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/students/assign-roll-number");
  }, [router]);

  return (
    <div className="flex justify-center items-center h-screen">
      <p>Redirecting to the new location...</p>
    </div>
  );
} 