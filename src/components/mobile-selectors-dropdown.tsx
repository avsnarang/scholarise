"use client";

import { useState } from "react";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { api } from "@/utils/api";
import { Check, ChevronDown, Building, Calendar, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Branch {
  id: string;
  name: string;
  code: string;
  logoUrl?: string | null;
}

interface Session {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

export function MobileSelectorsDropdown() {
  const [open, setOpen] = useState(false);
  
  // Branch context
  const { currentBranchId, setCurrentBranchId } = useBranchContext();
  const { data: branchData, isLoading: branchLoading } = api.branch.getUserBranches.useQuery();
  const branches: Branch[] = Array.isArray(branchData) ? branchData : [];
  const currentBranch = branches.find((branch) => branch.id === currentBranchId);
  
  // Session context
  const { currentSessionId, setCurrentSessionId } = useAcademicSessionContext();
  const { data: sessionData, isLoading: sessionLoading } = api.academicSession.getAll.useQuery();
  const sessions: Session[] = Array.isArray(sessionData) ? sessionData : [];
  const currentSession = sessions.find((session) => session.id === currentSessionId);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg transition-all",
            "bg-transparent hover:bg-gray-50/50",
            "dark:hover:bg-[#303030]/50",
            "focus:outline-none"
          )}
        >
          <Settings className="h-4 w-4 text-gray-500 dark:text-[#808080]" />
        </button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[280px] p-0 border-0 shadow-sm bg-white dark:bg-[#303030]"
        align="end"
      >
        <div className="p-3">
          <div className="text-xs font-medium text-gray-500 dark:text-[#808080] mb-3">
            Branch & Session
          </div>
          
          {/* Branch Selection */}
          <div className="space-y-2 mb-4">
            <div className="text-xs text-gray-400 dark:text-[#606060]">Branch</div>
            {branchLoading ? (
              <div className="text-xs text-gray-500">Loading branches...</div>
            ) : (
              <div className="space-y-1">
                {branches.map((branch) => {
                  const isSelected = branch.id === currentBranchId;
                  const isHeadquarters = branch.id === 'headquarters';
                  
                  return (
                    <button
                      key={branch.id}
                      onClick={() => {
                        setCurrentBranchId(branch.id);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 px-2 py-1.5 rounded text-left transition-colors text-xs",
                        "hover:bg-gray-50 dark:hover:bg-[#404040]",
                        isSelected && "bg-gray-50 dark:bg-[#404040]",
                        isHeadquarters && "bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                      )}
                    >
                      <div className={cn(
                        "flex h-4 w-4 items-center justify-center rounded border",
                        isHeadquarters ? "border-red-200 bg-red-100 dark:border-red-800 dark:bg-red-900/40" : "border-gray-200 dark:border-[#505050]"
                      )}>
                        {branch.logoUrl ? (
                          <img 
                            src={branch.logoUrl} 
                            alt={`${branch.name} logo`}
                            className="h-full w-full rounded object-contain"
                          />
                        ) : (
                          <Building className={cn(
                            "h-2.5 w-2.5",
                            isHeadquarters ? "text-red-800 dark:text-red-400" : "text-gray-500 dark:text-[#808080]"
                          )} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "font-medium truncate",
                          isHeadquarters ? "text-red-800 dark:text-red-400" : "text-gray-900 dark:text-[#e6e6e6]"
                        )}>
                          {branch.code}
                        </div>
                        <div className={cn(
                          "text-xs truncate",
                          isHeadquarters ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-[#808080]"
                        )}>
                          {branch.name}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-3 w-3 text-gray-900 dark:text-[#e6e6e6] flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Session Selection */}
          <div className="space-y-2 border-t border-gray-100 dark:border-[#404040] pt-3">
            <div className="text-xs text-gray-400 dark:text-[#606060]">Academic Session</div>
            {sessionLoading ? (
              <div className="text-xs text-gray-500">Loading sessions...</div>
            ) : (
              <div className="space-y-1">
                {sessions.slice(0, 3).map((session) => {
                  const isSelected = session.id === currentSessionId;
                  
                  return (
                    <button
                      key={session.id}
                      onClick={() => {
                        setCurrentSessionId(session.id);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 px-2 py-1.5 rounded text-left transition-colors text-xs",
                        "hover:bg-gray-50 dark:hover:bg-[#404040]",
                        isSelected && "bg-gray-50 dark:bg-[#404040]"
                      )}
                    >
                      <Calendar className="h-3 w-3 text-gray-400 dark:text-[#606060] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-[#e6e6e6] truncate">
                          {session.name}
                          {session.isActive && (
                            <span className="ml-1 text-[10px] text-green-600 dark:text-green-400">(Active)</span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-3 w-3 text-gray-900 dark:text-[#e6e6e6] flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
                {sessions.length > 3 && (
                  <div className="text-xs text-gray-400 dark:text-[#606060] px-2 py-1">
                    +{sessions.length - 3} more sessions
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}