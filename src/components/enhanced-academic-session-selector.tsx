import { useState, useEffect, useRef } from "react";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { api } from "@/utils/api";
import { Check, ChevronDown, Search, Calendar, School } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";


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

export function EnhancedAcademicSessionSelector() {
  const { currentSessionId, setCurrentSessionId } = useAcademicSessionContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: sessions = [], isLoading } = api.academicSession.getAll.useQuery();

  const filteredSessions = sessions.filter((session) =>
    session.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get the current session
  const currentSession = sessions.find((session) => session.id === currentSessionId);

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

  // Get session color based on active status
  const getSessionColor = (isActive: boolean) => {
    return isActive ? "#00501B" : "#A65A20";
  };

  // Get session color for dark mode based on active status
  const getDarkSessionColor = (isActive: boolean) => {
    return isActive ? "#7aad8c" : "#e2bd8c";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Session selector button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 items-center gap-2.5 rounded-lg border px-3 py-2",
          "text-sm font-medium shadow-sm transition-all duration-200",
          "relative", // Added for the badge
          isOpen
            ? "border-[#00501B] bg-[#F0F9F1] text-[#00501B] dark:border-[#7aad8c] dark:bg-[#7aad8c]/10 dark:text-[#7aad8c]"
            : "border-gray-200 bg-white text-gray-700 hover:border-[#00501B]/30 hover:bg-[#F0F9F1]/50 dark:border-[#303030] dark:bg-[#252525] dark:text-[#e6e6e6] dark:hover:border-[#7aad8c]/30 dark:hover:bg-[#7aad8c]/5",
          "focus:outline-none focus:ring-2 focus:ring-[#00501B]/20 dark:focus:ring-[#7aad8c]/20"
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-2">
          {/* Session badge */}
          <div className="relative">
            <Calendar className="h-4 w-4 text-[#00501B] dark:text-[#7aad8c]" />
          </div>

          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs font-normal text-gray-500 dark:text-[#c0c0c0]">Session</span>
            <span className="font-medium truncate max-w-[120px] dark:text-[#e6e6e6]">
              {isLoading ? "Loading..." : (currentSession?.name || "Select Session")}
            </span>
          </div>

          <ChevronDown
            className={cn(
              "ml-1 h-4 w-4 flex-shrink-0 opacity-70 transition-transform duration-200 dark:text-[#c0c0c0]",
              isOpen && "rotate-180 text-[#00501B] dark:text-[#7aad8c]"
            )}
          />
        </div>
      </button>

      {/* Dropdown menu with animation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 z-[100] mt-2 w-[300px] origin-top-right rounded-xl border border-gray-100 bg-white shadow-xl dark:border-[#303030] dark:bg-[#252525]">

            {/* Search input */}
            <div className="p-3 border-b border-gray-100 dark:border-[#303030]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-[#c0c0c0]" />
                <Input
                  type="text"
                  placeholder="Search sessions..."
                  className="pl-9 pr-4 h-9 bg-gray-50 border-gray-200 dark:bg-[#303030] dark:border-[#404040] dark:text-[#e6e6e6] dark:placeholder:text-[#808080]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Session list */}
            <div className="py-2 max-h-[300px] overflow-y-auto">
              <div className="px-3 py-1.5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-[#c0c0c0]">Academic Sessions</h3>
              </div>

              {filteredSessions.map((session, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: index * 0.03 }}
                  key={session.id}
                  role="option"
                  aria-selected={session.id === currentSessionId}
                  className={cn(
                    "group flex items-center gap-3 mx-2 px-3 py-2.5 cursor-pointer rounded-lg",
                    "transition-all duration-150",
                    session.id === currentSessionId
                      ? "bg-[#F0F9F1] text-[#00501B] dark:bg-[#7aad8c]/10 dark:text-[#7aad8c]"
                      : "hover:bg-gray-50 dark:hover:bg-[#2a2a2a] dark:text-[#e6e6e6]"
                  )}
                  onClick={() => handleSessionSelect(session.id)}
                >
                  {/* Session icon/avatar */}
                  <div
                    className={cn(
                      "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg",
                      session.id === currentSessionId
                        ? session.isActive 
                          ? "bg-[#00501B]/10 dark:bg-[#7aad8c]/20" 
                          : "bg-[#A65A20]/10 dark:bg-[#e2bd8c]/20"
                        : "bg-gray-100 group-hover:bg-[#00501B]/5 dark:bg-[#303030] dark:group-hover:bg-[#7aad8c]/10"
                    )}
                  >
                    <School
                      className={cn(
                        "h-5 w-5",
                        session.id === currentSessionId 
                          ? session.isActive
                            ? "text-[#00501B] dark:text-[#7aad8c]"
                            : "text-[#A65A20] dark:text-[#e2bd8c]"
                          : "text-gray-500 group-hover:text-[#00501B] dark:text-[#c0c0c0] dark:group-hover:text-[#7aad8c]"
                      )}
                    />
                  </div>

                  {/* Session details */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "font-medium truncate",
                        session.id === currentSessionId 
                          ? "text-[#00501B] dark:text-[#7aad8c]" 
                          : "text-gray-900 group-hover:text-[#00501B] dark:text-[#e6e6e6] dark:group-hover:text-[#7aad8c]"
                      )}>
                        {session.name}
                        {session.isActive && (
                          <span className="ml-2 text-xs text-green-600 dark:text-[#7aad8c]">(Current)</span>
                        )}
                      </span>

                      {session.id === currentSessionId && (
                        <Check className="h-4 w-4 text-[#00501B] dark:text-[#7aad8c] flex-shrink-0" />
                      )}
                    </div>

                    {/* Session date range */}
                    <div className="flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3 text-gray-400 dark:text-[#c0c0c0]" />
                      <span className="text-xs text-gray-500 dark:text-[#c0c0c0] truncate">
                        {formatShortMonth(new Date(session.startDate))} - {formatShortMonth(new Date(session.endDate))}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}

              {filteredSessions.length === 0 && (
                <div className="px-3 py-6 text-sm text-[#00501B]/70 text-center dark:text-[#7aad8c]/70">
                  No sessions found matching "{searchQuery}"
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
