import { useState, useEffect, createContext, useContext } from "react";
import type { ReactNode } from "react";
import React from "react";
import { useRouter } from "next/router";
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

export const AcademicSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Fetch sessions to get active one
  const { data: sessions, isLoading: isSessionsLoading, error: sessionsError } = api.academicSession.getAll.useQuery();

  // Handle sessions data when it's loaded
  useEffect(() => {
    if (sessions && !isSessionsLoading) {
      // If we don't have a session ID in localStorage, use the active one
      if (!localStorage.getItem("academicSessionId")) {
        const activeSession = sessions.find((session: AcademicSession) => session.isActive);
        if (activeSession) {
          setCurrentSessionId(activeSession.id);
          localStorage.setItem("academicSessionId", activeSession.id);
        }
      }
      setIsLoading(false);
    } else if (sessionsError) {
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to load academic sessions. Please try again later.",
        variant: "destructive",
      });
    }
  }, [sessions, isSessionsLoading, sessionsError]);

  // Initialize from localStorage
  useEffect(() => {
    const storedSessionId = localStorage.getItem("academicSessionId");
    if (storedSessionId) {
      setCurrentSessionId(storedSessionId);
    }
  }, []);

  // Function to set session ID in state and localStorage
  const handleSetSessionId = (id: string) => {
    setCurrentSessionId(id);
    localStorage.setItem("academicSessionId", id);

    // Show toast notification with session name
    if (sessions) {
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
    localStorage.removeItem("academicSessionId");
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

export const useAcademicSessionContext = () => useContext(AcademicSessionContext);
