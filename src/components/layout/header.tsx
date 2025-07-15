"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { EnhancedAcademicSessionSelector } from "@/components/enhanced-academic-session-selector";
import { GlobalSearch } from "@/components/global-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { TaskProgressDropdown } from "@/components/ui/task-progress-dropdown";
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserRole } from "@/hooks/useUserRole";

interface HeaderProps {
  onMenuToggle?: () => void;
  isSidebarCollapsed?: boolean;
  onSidebarCollapseToggle?: () => void;
}

export function Header({
  onMenuToggle,
  isSidebarCollapsed = false,
  onSidebarCollapseToggle
}: HeaderProps) {
  const { isSuperAdmin } = usePermissions();
  const { isTeacher } = useUserRole();
  
  return (
    <header className={cn(
      "sticky top-0 z-20 flex h-14 items-center justify-between bg-white shadow-sm border-b border-[#00501B]/10 w-full dark:bg-[#101010]"
    )}>
      <div className="flex items-center gap-2 md:ml-4">
        {/* Mobile menu toggle - only visible on mobile */}
        {onMenuToggle && (
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-[#00501B]/10 hover:text-[#00501B] md:hidden"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </button>
        )}

        {/* Mobile logo - only visible on mobile */}
        <Link href={isTeacher ? "/staff/teachers/dashboard" : "/dashboard"} className="md:hidden items-center gap-2 flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-r from-[#00501B] to-[#A65A20]">
            <span className="text-xs font-bold text-white">SR</span>
          </div>
          <span className="text-base font-heading text-gray-900">ScholaRise</span>
        </Link>

        {/* Sidebar trigger from shadcn ui */}
        <SidebarTrigger className="hidden md:flex text-[#00501B] hover:bg-[#00501B]/10 hover:text-[#00501B]" />

        {/* Global search */}
        <div className={cn(
          "flex-1",
          "transition-all duration-300"
        )}>
          <GlobalSearch />
        </div>
      </div>

      {/* Right side of header with session selector and theme toggle */}
      <div className="flex items-center gap-3 mr-4">
        {/* Task Progress Dropdown - Only visible to superadmins */}
        {isSuperAdmin && (
          <div className="relative z-[60]">
            <TaskProgressDropdown />
          </div>
        )}
        
        {/* Session selector */}
        <div className="relative z-[60]">
          <EnhancedAcademicSessionSelector />
        </div>
        
        {/* Theme toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}
