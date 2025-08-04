"use client";

import { useState, useEffect, createContext, useContext, Suspense } from "react";
import type { ReactNode } from "react";
import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/utils/api";
import { toast } from "@/components/ui/use-toast";

// Add this interface to define the session type
interface AcademicSession {
  id: string;
  name: string;
  isActive: boolean;
  startDate: Date;
  endDate: Date;
}

interface AcademicSessionContextType {
  currentSessionId: string | null;
  setCurrentSessionId: (id: string) => void;
  clearSessionId: () => void;
  isLoading: boolean;
}

const AcademicSessionContext = createContext<AcademicSessionContextType>({
  currentSessionId: null,
  setCurrentSessionId: () => {},
  clearSessionId: () => {},
  isLoading: true,
});

const AcademicSessionProviderContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Fetch sessions to get active one
  const { 
    data: sessionsData, 
    isLoading: isSessionsLoading, 
    error: sessionsError 
  } = api.academicSession.getAll.useQuery(undefined, {
    retry: 3,
    retryDelay: 1000
  });

  // Explicitly ensure sessions is always an array
  const sessions = Array.isArray(sessionsData) ? sessionsData : [];

  // Logging for debugging session loading issues
  useEffect(() => {
    if (sessionsData) {
      console.log('Academic sessions fetched successfully:', Array.isArray(sessionsData) ? `${sessionsData.length} sessions` : typeof sessionsData);
      if (!Array.isArray(sessionsData)) {
        console.error('Error: Expected sessions to be an array but got:', typeof sessionsData);
      }
    }
    if (sessionsError) {
      console.error('Error fetching academic sessions:', sessionsError);
    }
  }, [sessionsData, sessionsError]);

  // Handle sessions data when it's loaded
  useEffect(() => {
    if (!isSessionsLoading) {
      // If we have a sessions error, notify user but still allow the app to continue
      if (sessionsError) {
        setIsLoading(false);
        toast({
          title: "Error",
          description: "Failed to load academic sessions. Please try again later.",
          variant: "destructive",
        });
        return;
      }
      
      console.log(`Processing ${sessions.length} academic sessions`);
      
      // If we don't have a session ID in localStorage, use the active one
      if (typeof window !== 'undefined' && !localStorage.getItem("academicSessionId")) {
        const activeSession = sessions.find((session: AcademicSession) => session.isActive);
        if (activeSession) {
          console.log(`Found active session: ${activeSession.name}`);
          setCurrentSessionId(activeSession.id);
          localStorage.setItem("academicSessionId", activeSession.id);
        } else {
          console.log('No active session found');
        }
      }
      setIsLoading(false);
    }
  }, [sessionsData, isSessionsLoading, sessionsError]);

  // Initialize from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSessionId = localStorage.getItem("academicSessionId");
      if (storedSessionId) {
        setCurrentSessionId(storedSessionId);
      }
    }
  }, []);

  // Function to set session ID in state and localStorage
  const handleSetSessionId = (id: string) => {
    setCurrentSessionId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem("academicSessionId", id);
    }

    // Show toast notification with session name
    if (sessions.length > 0) {
      const sessionName = sessions.find((s: AcademicSession) => s.id === id)?.name;
      if (sessionName) {
        toast({
          title: "Academic Session Changed",
          description: `Now viewing data for ${sessionName}`,
          variant: "default",
          className: "bg-[#00501B]/10 border-[#00501B]/20 dark:bg-[#7aad8c]/10 dark:border-[#7aad8c]/20",
        });
      }
    }
  };

  // Function to clear session ID
  const clearSessionId = () => {
    setCurrentSessionId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem("academicSessionId");
    }
  };

  return (
    <AcademicSessionContext.Provider
      value={{
        currentSessionId,
        setCurrentSessionId: handleSetSessionId,
        clearSessionId,
        isLoading,
      }}
    >
      {children}
    </AcademicSessionContext.Provider>
  );
};

export const AcademicSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8">Loading session data...</div>}>
      <AcademicSessionProviderContent>{children}</AcademicSessionProviderContent>
    </Suspense>
  );
};

export const useAcademicSessionContext = () => useContext(AcademicSessionContext);
