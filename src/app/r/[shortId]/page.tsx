"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { Loader2 } from "lucide-react";

export default function ShortUrlRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const shortId = params.shortId as string;

  const { data, isLoading, error } = api.shortUrl.getUrl.useQuery(
    { shortId },
    { enabled: !!shortId }
  );

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (error) {
      console.error("Failed to resolve short URL:", error);
      router.replace("/404");
    }

    if (data?.originalUrl) {
      window.location.href = data.originalUrl;
    } else if (!isLoading) {
      router.replace("/404");
    }
  }, [data, isLoading, error, router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-4 bg-gray-50">
      <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
      <p className="text-lg text-gray-600">Redirecting you to the registration form...</p>
      <p className="text-sm text-gray-500">If you are not redirected automatically, please check the link and try again.</p>
    </div>
  );
}
