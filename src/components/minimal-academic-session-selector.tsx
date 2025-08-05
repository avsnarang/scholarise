"use client";

import { useState } from "react";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { api } from "@/utils/api";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

// Simple date formatter function
function formatSessionDates(startDate: Date, endDate: Date): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const startMonth = months[startDate.getMonth()];
  const startYear = startDate.getFullYear();
  const endMonth = months[endDate.getMonth()];
  const endYear = endDate.getFullYear();
  
  return `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
}

export function MinimalAcademicSessionSelector() {
  const { currentSessionId, setCurrentSessionId } = useAcademicSessionContext();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: sessions = [], isLoading } = api.academicSession.getAll.useQuery();
  
  // Get current session
  const currentSession = sessions.find((session) => session.id === currentSessionId);
  
  // Filter sessions based on search
  const filteredSessions = sessions.filter((session) =>
    session.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex h-9 items-center gap-1 sm:gap-2 rounded-lg px-2 sm:px-3 py-2 text-sm transition-all",
            "bg-transparent hover:bg-gray-50/50",
            "dark:hover:bg-[#303030]/50",
            "focus:outline-none"
          )}
        >
          <span className="font-medium text-gray-900 dark:text-[#e6e6e6] truncate max-w-[120px] sm:max-w-[200px]">
            {isLoading ? "Loading..." : currentSession?.name || "Select Session"}
          </span>
          {currentSession?.isActive && (
            <span className="hidden sm:inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-400/20 dark:text-green-300">
              Active
            </span>
          )}
          <ChevronDown className={cn(
            "ml-auto h-4 w-4 text-gray-500 transition-transform",
            "dark:text-[#909090]",
            open && "rotate-180"
          )} />
        </button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[280px] sm:w-[320px] p-0 border-0 shadow-sm bg-white dark:bg-[#303030]"
        align="start"
        sideOffset={4}
      >
        {/* Search Header */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-[#808080]" />
            <Input
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "h-9 w-full pl-9 pr-3 border-0",
                "bg-gray-50/50 dark:bg-[#404040]/50",
                "text-gray-900 dark:text-[#e6e6e6]",
                "placeholder:text-gray-400 dark:placeholder:text-[#808080]",
                "focus:ring-0 focus-visible:ring-0"
              )}
            />
          </div>
        </div>
        
        {/* Sessions List */}
        <div className="max-h-[320px] overflow-y-auto">
          {filteredSessions.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-[#808080]">
              No sessions found
            </div>
          ) : (
            <div className="py-1">
              {filteredSessions.map((session) => {
                const isSelected = session.id === currentSessionId;
                
                return (
                  <button
                    key={session.id}
                    onClick={() => {
                      setCurrentSessionId(session.id);
                      setOpen(false);
                      setSearchQuery("");
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors",
                      "hover:bg-gray-50 dark:hover:bg-[#404040]",
                      isSelected && "bg-gray-50 dark:bg-[#404040]"
                    )}
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium",
                          isSelected 
                            ? "text-gray-900 dark:text-[#e6e6e6]" 
                            : "text-gray-700 dark:text-[#c0c0c0]"
                        )}>
                          {session.name}
                        </span>
                        {session.isActive && (
                          <span className="inline-flex items-center rounded-md bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-400/20 dark:text-green-300">
                            Active
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-[#808080]">
                        {formatSessionDates(new Date(session.startDate), new Date(session.endDate))}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-gray-900 dark:text-[#e6e6e6]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}