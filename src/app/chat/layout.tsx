"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Building, ChevronDown, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EnhancedAcademicSessionSelector } from "@/components/enhanced-academic-session-selector";
import { GlobalSearch } from "@/components/global-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { TaskProgressDropdown } from "@/components/ui/task-progress-dropdown";
import { useAuth } from "@/hooks/useAuth";
import { BranchProvider } from "@/hooks/useBranchContext";
import { AcademicSessionProvider } from "@/hooks/useAcademicSessionContext";
import { SessionLoadingWrapper } from "@/components/layout/session-loading-wrapper";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { useBranchContext } from "@/hooks/useBranchContext";
import { api } from "@/utils/api";
import { cn } from "@/lib/utils";

interface ChatLayoutProps {
  children: React.ReactNode;
}

function BranchSelector() {
  const { currentBranchId, setCurrentBranchId } = useBranchContext();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: branches = [], isLoading } = api.branch.getUserBranches.useQuery();

  // Get current branch display data
  const currentBranch = branches.find((branch) => branch.id === currentBranchId);
  const branchName = currentBranch?.name || "Select Branch";

  // Filter branches based on search
  const filteredBranches = branches.filter((branch) =>
    branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex h-10 items-center gap-1 rounded-md border px-3 py-2 text-sm text-muted-foreground">
        <Building size={16} className="shrink-0" />
        <span className="truncate">Loading...</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-10 items-center gap-1 rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
        <Building size={16} className="shrink-0" />
        <div className="flex items-center gap-1 truncate">
          <span className="truncate font-medium">{branchName}</span>
          {currentBranch?.code && (
            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
              {currentBranch.code}
            </span>
          )}
        </div>
        <ChevronDown size={14} className="shrink-0 opacity-50" />
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-[280px]">
        <div className="flex items-center border-b px-3 py-2">
          <Search size={14} className="mr-2 opacity-50" />
          <Input
            placeholder="Search branches..."
            className="h-8 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="max-h-60 overflow-y-auto">
          {filteredBranches.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No branches found
            </div>
          ) : (
            filteredBranches.map((branch) => (
              <DropdownMenuItem
                key={branch.id}
                onClick={() => setCurrentBranchId(branch.id)}
                className="flex items-center justify-between px-3 py-2 cursor-pointer"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{branch.name}</span>
                  {branch.city && (
                    <span className="text-xs text-muted-foreground">
                      {branch.city}, {branch.state}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {branch.code && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {branch.code}
                    </span>
                  )}
                  {currentBranchId === branch.id && (
                    <Check size={14} className="text-primary" />
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ChatHeader() {
  const { isSuperAdmin } = usePermissions();
  const { isTeacher } = useUserRole();
  
  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between bg-white/95 backdrop-blur-sm shadow-sm border-b border-[#00501B]/10 w-full dark:bg-[#101010]/95"
    )}>
      <div className="flex items-center gap-2 ml-4">
        {/* Back to Communication button */}
        <Link href="/communication">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Communication
          </Button>
        </Link>
        
        <div className="h-4 w-px bg-border mx-2" />
        
        {/* Logo */}
        <Link href={isTeacher ? "/staff/teachers/dashboard" : "/dashboard"} className="items-center gap-2 flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-r from-[#00501B] to-[#A65A20]">
            <span className="text-xs font-bold text-white">SR</span>
          </div>
          <span className="text-base font-heading text-gray-900 dark:text-white">ScholaRise</span>
        </Link>

        <div className="h-4 w-px bg-border mx-2" />
        <h1 className="text-lg font-semibold">WhatsApp Chat</h1>
      </div>

      {/* Right side of header */}
      <div className="flex items-center gap-3 mr-4">
        {/* Branch Selector */}
        <div className="relative z-[60]">
          <BranchSelector />
        </div>
        
        {/* Session selector */}
        <div className="relative z-[60]">
          <EnhancedAcademicSessionSelector />
        </div>
        
        {/* External link to main app */}
        <Link href="/communication" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Open Main App
          </Button>
        </Link>
        
        {/* Theme toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#00501B] border-t-transparent"></div>
          <p className="mt-4 text-sm text-gray-600">Loading WhatsApp Chat...</p>
        </div>
      </div>
    );
  }

  return (
    <BranchProvider>
      <AcademicSessionProvider>
        <div className="min-h-screen bg-background">
          {/* Custom Chat Header */}
          <ChatHeader />
          
          {/* Chat Content */}
          <div className="mt-14 h-[calc(100vh-56px)]">
            <SessionLoadingWrapper>
              <div className="h-full">
                {children}
              </div>
            </SessionLoadingWrapper>
          </div>
        </div>
      </AcademicSessionProvider>
    </BranchProvider>
  );
} 