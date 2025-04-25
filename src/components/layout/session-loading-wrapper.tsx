import { useEffect, useState } from "react";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { Loader2 } from "lucide-react";

interface SessionLoadingWrapperProps {
  children: React.ReactNode;
}

export function SessionLoadingWrapper({ children }: SessionLoadingWrapperProps) {
  const { isLoading, currentSessionId } = useAcademicSessionContext();
  const [showLoading, setShowLoading] = useState(false);
  const [previousSessionId, setPreviousSessionId] = useState<string | null>(null);

  // Show loading spinner when session changes
  useEffect(() => {
    if (previousSessionId && previousSessionId !== currentSessionId) {
      setShowLoading(true);
      
      // Hide loading spinner after a delay
      const timer = setTimeout(() => {
        setShowLoading(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    
    setPreviousSessionId(currentSessionId);
  }, [currentSessionId, previousSessionId]);

  if (isLoading || showLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-12">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#00501B]" />
          <p className="mt-4 text-sm text-gray-600">
            {isLoading ? "Loading session data..." : "Switching session..."}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
