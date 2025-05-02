import { useState, useEffect, useRef } from "react";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { api } from "@/utils/api";
import { Check, ChevronDown, Search, Calendar, School } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { formatShortMonth } from "@/lib/date-utils";

interface AcademicSession {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  isActive: boolean;
}

export function EnhancedAcademicSessionSelector() {
  const { currentSessionId, setCurrentSessionId } = useAcademicSessionContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = api.academicSession.getAll.useQuery();

  // Safely convert data to array
  const sessions: AcademicSession[] = Array.isArray(data) ? data : [];

  useEffect(() => {
    // Debug logging
    console.log("EnhancedAcademicSessionSelector rendered");
    console.log("Current session ID:", currentSessionId);
    console.log("Sessions data type:", data ? typeof data : "undefined");
    console.log("Sessions data isArray:", data ? Array.isArray(data) : "undefined");
    console.log("Sessions count:", sessions.length);
    console.log("Is loading sessions:", isLoading);
    
    if (error) {
      console.error("Error loading academic sessions:", error);
    }
  }, [currentSessionId, data, sessions.length, isLoading, error]);

  const filteredSessions = sessions.filter((session) =>
    session.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Reset search when dropdown opens
      setSearchQuery("");
    }
  }, [isOpen]);

  // Get current session display data
  const currentSession = sessions.find((session) => session.id === currentSessionId);
  const sessionName = currentSession?.name || "Select Session";
  
  // Format dates for display
  const formatSessionDate = (date: string | Date) => {
    if (!date) return "";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return formatShortMonth(dateObj);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Session Selector Button */}
      <div
        className={cn(
          "flex h-10 items-center gap-1 rounded-md border px-3 py-2",
          "text-sm text-muted-foreground cursor-pointer",
          "hover:bg-accent hover:text-accent-foreground",
          "transition-colors"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar size={16} className="shrink-0" />
        <div className="flex items-center gap-1 truncate">
          <span className="truncate font-medium">{sessionName}</span>
          {currentSession?.isActive && (
            <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">Active</span>
          )}
        </div>
        <ChevronDown size={14} className="shrink-0 opacity-50" />
      </div>

      {/* Dropdown Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -5, height: 0 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute left-0 top-11 z-50 w-[280px] overflow-hidden rounded-md border bg-popover shadow-md",
            )}
          >
            {/* Search Input */}
            <div className="flex items-center border-b px-3 py-2">
              <Search size={14} className="mr-2 opacity-50" />
              <Input
                placeholder="Search sessions..."
                className="h-8 border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Session List */}
            <div className="max-h-[280px] overflow-y-auto p-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  Loading sessions...
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  {searchQuery ? "No sessions found" : "No sessions available"}
                </div>
              ) : (
                filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                      "hover:bg-accent hover:text-accent-foreground",
                      session.id === currentSessionId
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                    onClick={() => {
                      setCurrentSessionId(session.id);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{session.name}</span>
                        {session.isActive && (
                          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">Active</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Calendar size={10} className="shrink-0 opacity-70" />
                        <span className="truncate opacity-70">
                          {formatSessionDate(session.startDate)} - {formatSessionDate(session.endDate)}
                        </span>
                      </div>
                    </div>
                    {session.id === currentSessionId && (
                      <Check size={16} className="shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
