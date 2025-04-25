import { useState, useEffect, useRef } from "react";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { api } from "@/utils/api";
import { Check, ChevronDown, Search, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";


// Simple date formatter function to avoid date-fns dependency issues
function formatShortMonth(date: Date): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${month} ${year}`;
}

export function AcademicSessionSelector() {
  const { currentSessionId, setCurrentSessionId } = useAcademicSessionContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: sessions = [], isLoading } = api.academicSession.getAll.useQuery();

  const filteredSessions = sessions.filter((session) =>
    session.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get the current session name
  const currentSession = sessions.find((session) => session.id === currentSessionId);
  const currentSessionName = currentSession?.name || "Select Session";

  // Handle session selection
  const handleSessionSelect = (sessionId: string) => {
    if (sessionId !== currentSessionId) {
      setCurrentSessionId(sessionId);
    }
    setIsOpen(false);
  };

  // Handle click outside to close dropdown
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-[200px] items-center justify-between rounded-md border border-gray-200 bg-white/90 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-[#00501B]/30 hover:text-[#00501B] focus:outline-none focus:ring-2 focus:ring-[#00501B]/20 transition-colors dark:border-[#303030] dark:bg-[#252525]/90 dark:text-[#e6e6e6] dark:hover:border-[#7aad8c]/30 dark:hover:text-[#7aad8c] dark:focus:ring-[#7aad8c]/20"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="truncate">
          {isLoading ? "Loading..." : currentSessionName}
        </span>
        <ChevronDown
          className={cn(
            "ml-1 h-4 w-4 opacity-70 transition-transform duration-200 dark:text-[#c0c0c0]",
            isOpen && "rotate-180 dark:text-[#7aad8c]"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-1 w-[300px] rounded-md border border-gray-200 bg-white shadow-lg dark:border-[#303030] dark:bg-[#252525]">
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-[#c0c0c0]" />
              <Input
                type="text"
                placeholder="Search sessions..."
                className="pl-8 pr-4 dark:bg-[#303030] dark:border-[#404040] dark:text-[#e6e6e6] dark:placeholder:text-[#808080]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                role="option"
                aria-selected={session.id === currentSessionId}
                className={cn(
                  "flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2a2a2a]",
                  session.id === currentSessionId && "bg-[#00501B]/5 text-[#00501B] dark:bg-[#7aad8c]/10 dark:text-[#7aad8c]"
                )}
                onClick={() => handleSessionSelect(session.id)}
              >
                <div className="flex flex-col min-w-0">
                  <span className={cn(
                    "font-medium truncate",
                    session.id === currentSessionId 
                      ? "text-[#00501B] dark:text-[#7aad8c]" 
                      : "text-gray-900 dark:text-[#e6e6e6]"
                  )}>
                    {session.name}
                    {session.isActive && (
                      <span className="ml-2 text-xs text-green-600 dark:text-[#7aad8c]">(Current)</span>
                    )}
                  </span>
                  <div className="mt-0.5 text-xs text-gray-500 dark:text-[#c0c0c0] flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-gray-400 dark:text-[#c0c0c0]" />
                    {formatShortMonth(new Date(session.startDate))} - {formatShortMonth(new Date(session.endDate))}
                  </div>
                </div>
                {session.id === currentSessionId && (
                  <Check className="h-4 w-4 text-[#00501B] dark:text-[#7aad8c] flex-shrink-0" />
                )}
              </div>
            ))}

            {filteredSessions.length === 0 && (
              <div className="px-3 py-4 text-sm text-[#00501B]/70 text-center italic dark:text-[#7aad8c]/70">
                No sessions found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
