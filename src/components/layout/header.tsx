"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { MinimalAcademicSessionSelector } from "@/components/minimal-academic-session-selector";
import { MinimalBranchSelector } from "@/components/minimal-branch-selector";
import { MobileSelectorsDropdown } from "@/components/mobile-selectors-dropdown";
import { MinimalGlobalSearch } from "@/components/minimal-global-search";
import { MinimalThemeToggle } from "@/components/minimal-theme-toggle";
import { useBranchContext } from "@/hooks/useBranchContext";
import { api } from "@/utils/api";
import { Building } from "lucide-react";
import { TaskProgressDropdown } from "@/components/ui/task-progress-dropdown";
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserRole } from "@/hooks/useUserRole";

interface HeaderProps {
  // Note: Sidebar functionality is now handled by SidebarTrigger component
}

export function Header({}: HeaderProps = {}) {
  const { isSuperAdmin } = usePermissions();
  const { isTeacher, isEmployee, isERPManager, employee } = useUserRole();
  
  // Branch context for logo
  const { currentBranchId } = useBranchContext();
  const { data: branches = [], isLoading: isLoadingBranches } = api.branch.getUserBranches.useQuery();
  
  // Find current branch
  const currentBranch = branches.find((branch: any) => branch.id === currentBranchId);
  
  return (
    <header className={cn(
      "sticky top-0 z-20 flex h-14 items-center justify-between bg-white shadow-sm border-b border-[#00501B]/10 w-full dark:bg-[#101010]"
    )}>
      <div className="flex items-center gap-2 ml-2 md:ml-4 flex-1">
        {/* Mobile sidebar trigger - always visible on mobile */}
        <SidebarTrigger className="flex md:hidden h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-[#00501B]/10 hover:text-[#00501B]" />

        {/* Desktop sidebar trigger */}
        <SidebarTrigger className="hidden md:flex text-[#00501B] hover:bg-[#00501B]/10 hover:text-[#00501B]" />

        {/* Desktop/Tablet search - next to sidebar trigger */}
        <div className="relative z-[60] hidden sm:block">
          <MinimalGlobalSearch />
        </div>

        {/* Mobile logo - only visible on mobile */}
        <Link href={
          isTeacher ? "/staff/teachers/dashboard" : 
          (employee && employee.designation === "Managing Director") ? "/md-dashboard" :
          isEmployee ? "/staff/employees/dashboard" : 
          isERPManager ? "/erp-manager/dashboard" : 
          "/dashboard"
        } className="md:hidden items-center gap-2 flex flex-shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md overflow-hidden">
            {isLoadingBranches ? (
              <div className="bg-gradient-to-r from-[#00501B] to-[#A65A20] h-full w-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">SR</span>
              </div>
            ) : currentBranch?.logoUrl ? (
              <img 
                src={currentBranch.logoUrl} 
                alt={`${currentBranch.name} logo`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback to SR logo if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.setAttribute('style', 'display: flex');
                }}
              />
            ) : (
              <div className="bg-gradient-to-r from-[#00501B] to-[#A65A20] h-full w-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">SR</span>
              </div>
            )}
            {currentBranch?.logoUrl && (
              <div className="bg-gradient-to-r from-[#00501B] to-[#A65A20] h-full w-full flex items-center justify-center" style={{ display: 'none' }}>
                <span className="text-xs font-bold text-white">SR</span>
              </div>
            )}
          </div>
          <span className="text-base font-heading text-gray-900 dark:text-gray-100">ScholaRise</span>
        </Link>


      </div>

      {/* Right side of header with session selector and theme toggle */}
      <div className="flex items-center gap-1 sm:gap-2 md:gap-3 mr-2 sm:mr-4">
        {/* Task Progress Dropdown - Only visible to superadmins on larger screens */}
        {isSuperAdmin && (
          <div className="relative z-[60] hidden sm:block">
            <TaskProgressDropdown />
          </div>
        )}
        
        {/* Branch selector - responsive */}
        <div className="relative z-[60] hidden sm:block">
          <MinimalBranchSelector />
        </div>
        
        {/* Session selector - responsive */}
        <div className="relative z-[60] hidden sm:block">
          <MinimalAcademicSessionSelector />
        </div>
        
        {/* Mobile search - visible only on mobile */}
        <div className="relative z-[60] sm:hidden">
          <MinimalGlobalSearch />
        </div>
        
        {/* Mobile selectors dropdown - visible only on mobile */}
        <div className="relative z-[60] sm:hidden">
          <MobileSelectorsDropdown />
        </div>
        
        {/* Theme toggle - responsive */}
        <div className="relative z-[60]">
          <MinimalThemeToggle />
        </div>
      </div>
    </header>
  );
}
