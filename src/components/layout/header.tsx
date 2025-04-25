import Link from "next/link";
import { Menu, Bell } from "lucide-react";
import { EnhancedAcademicSessionSelector } from "@/components/enhanced-academic-session-selector";
import { GlobalSearch } from "@/components/global-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

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
  const { user } = useAuth();
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return "SR";
    
    const nameParts = user.name.trim().split(/\s+/);
    
    if (nameParts.length >= 2) {
      const first = nameParts[0]?.charAt(0) || '';
      const last = nameParts[1]?.charAt(0) || '';
      return (first + last).toUpperCase();
    }
    
    return (user.name.substring(0, 2) || "SR").toUpperCase();
  };
  
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
        <Link href="/dashboard" className="md:hidden items-center gap-2 flex">
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

      {/* Right side of header with notifications and user profile */}
      <div className="flex items-center gap-3 mr-4">
        {/* Session selector */}
        <div className="relative z-[60]">
          <EnhancedAcademicSessionSelector />
        </div>
        
        {/* Theme toggle */}
        <ThemeToggle />
        
        {/* Notification button */}
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-[#A65A20]/10 text-[#A65A20]">
          <Bell className="h-5 w-5" />
        </Button>
        
        {/* User avatar */}
        <Avatar className="h-8 w-8 bg-gradient-to-r from-[#00501B] to-[#A65A20] text-white cursor-pointer">
          <AvatarFallback>{getUserInitials()}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
