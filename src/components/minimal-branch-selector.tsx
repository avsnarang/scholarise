"use client";

import { useState } from "react";
import { useBranchContext } from "@/hooks/useBranchContext";
import { api } from "@/utils/api";
import { Check, ChevronDown, Building, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface Branch {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  logoUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  order: number;
}

export function MinimalBranchSelector() {
  const { currentBranchId, setCurrentBranchId } = useBranchContext();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data, isLoading } = api.branch.getUserBranches.useQuery();
  
  // Safely convert data to array
  const branches: Branch[] = Array.isArray(data) ? data : [];
  
  // Get current branch
  const currentBranch = branches.find((branch) => branch.id === currentBranchId);
  
  // Filter branches based on search
  const filteredBranches = branches.filter((branch) =>
    branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.code.toLowerCase().includes(searchQuery.toLowerCase())
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
          <div className="flex items-center gap-1.5">
            {currentBranch?.logoUrl ? (
              <img 
                src={currentBranch.logoUrl} 
                alt={`${currentBranch.name} logo`}
                className="h-4 w-4 rounded object-contain"
              />
            ) : (
              <Building className="h-4 w-4 text-gray-500 dark:text-[#808080]" />
            )}
            <span className="font-medium text-gray-900 dark:text-[#e6e6e6] truncate max-w-[120px] sm:max-w-[200px]">
              {isLoading ? "Loading..." : currentBranch?.name || "Select Branch"}
            </span>
            {currentBranch && (
              <span className="text-xs text-gray-500 dark:text-[#808080] hidden sm:inline">
                ({currentBranch.code})
              </span>
            )}
          </div>
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
              placeholder="Search branches..."
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
        
        {/* Branches List */}
        <div className="max-h-[320px] overflow-y-auto">
          {filteredBranches.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-[#808080]">
              No branches found
            </div>
          ) : (
            <div className="py-1">
              {filteredBranches.map((branch) => {
                const isSelected = branch.id === currentBranchId;
                const isHeadquarters = branch.id === 'headquarters';
                
                return (
                  <button
                    key={branch.id}
                    onClick={() => {
                      setCurrentBranchId(branch.id);
                      setOpen(false);
                      setSearchQuery("");
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors",
                      "hover:bg-gray-50 dark:hover:bg-[#404040]",
                      isSelected && "bg-gray-50 dark:bg-[#404040]",
                      isHeadquarters && "bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-md border",
                        isHeadquarters ? "border-red-200 bg-red-100 dark:border-red-800 dark:bg-red-900/40" : "border-gray-200 dark:border-[#505050]"
                      )}>
                        {branch.logoUrl ? (
                          <img 
                            src={branch.logoUrl} 
                            alt={`${branch.name} logo`}
                            className="h-full w-full rounded-md object-contain"
                          />
                        ) : (
                          <Building className={cn(
                            "h-3.5 w-3.5",
                            isHeadquarters ? "text-red-800 dark:text-red-400" : "text-gray-500 dark:text-[#808080]"
                          )} />
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-medium",
                            isSelected 
                              ? "text-gray-900 dark:text-[#e6e6e6]" 
                              : "text-gray-700 dark:text-[#c0c0c0]",
                            isHeadquarters && "text-red-800 dark:text-red-400"
                          )}>
                            {branch.code}
                          </span>
                        </div>
                        <span className={cn(
                          "text-xs",
                          isHeadquarters ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-[#808080]"
                        )}>
                          {branch.name}
                        </span>
                      </div>
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