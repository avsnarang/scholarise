"use client";

import { useState, useEffect, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRouter } from "next/navigation";
import { Search, User, GraduationCap, Users, Building, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { api } from "@/utils/api";
import { useDebounce } from "@/hooks/useDebounce";

// Define the navigation items for quick access
const quickNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: <Building className="h-3 w-3" />, category: "Overview" },
  { name: "Students", href: "/students", icon: <GraduationCap className="h-3 w-3" />, category: "Academic" },
  { name: "Staff", href: "/staff", icon: <Users className="h-3 w-3" />, category: "Academic" },
  { name: "Classes", href: "/classes", icon: <Building className="h-3 w-3" />, category: "Academic" },
  { name: "Finance", href: "/finance", icon: <Building className="h-3 w-3" />, category: "Finance" },
  { name: "Settings", href: "/settings", icon: <Building className="h-3 w-3" />, category: "System" },
];

export function MinimalGlobalSearch() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const router = useRouter();
  const isMobile = useIsMobile();

  // Search for students
  const { 
    data: students = [], 
    isLoading: isLoadingStudents,
    error: studentsError,
    isError: hasStudentsError 
  } = api.student.fuzzySearchStudents.useQuery(
    {
      searchTerm: debouncedSearchQuery,
      limit: 3
    },
    {
      enabled: debouncedSearchQuery.length >= 2,
      retry: 1
    }
  );

  // Search for teachers
  const { 
    data: teachers = [], 
    isLoading: isLoadingTeachers,
    error: teachersError,
    isError: hasTeachersError 
  } = api.teacher.search.useQuery(
    {
      search: debouncedSearchQuery,
      limit: 3
    },
    {
      enabled: debouncedSearchQuery.length >= 2,
      retry: 1
    }
  );

  const isLoading = isLoadingStudents || isLoadingTeachers;
  const hasErrors = hasStudentsError || hasTeachersError;
  const hasResults = students.length > 0 || teachers.length > 0;
  const showEmptyState = debouncedSearchQuery.length >= 2 && !isLoading && !hasResults && !hasErrors;

  // Handle keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleNavigation = useCallback((href: string) => {
    router.push(href);
    setOpen(false);
    setSearchQuery("");
  }, [router]);

  const handleStudentClick = useCallback((studentId: string) => {
    router.push(`/students/${studentId}`);
    setOpen(false);
    setSearchQuery("");
  }, [router]);

  const handleTeacherClick = useCallback((teacherId: string) => {
    router.push(`/staff/teachers/${teacherId}`);
    setOpen(false);
    setSearchQuery("");
  }, [router]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex h-9 items-center rounded-lg py-2 text-sm transition-all",
            "bg-transparent hover:bg-gray-50/50",
            "dark:hover:bg-[#303030]/50",
            "focus:outline-none",
            // Responsive layout
            "w-9 justify-center px-2", // Mobile: icon-only, centered
            "md:w-auto md:justify-start md:gap-2 md:px-3" // Desktop: full width with text
          )}
        >
          <Search className="h-4 w-4 text-gray-500 dark:text-[#808080] flex-shrink-0" />
          <span className="hidden md:inline text-gray-500 dark:text-[#808080] truncate">
            Search...
          </span>
          <kbd className="hidden lg:inline-flex pointer-events-none select-none items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground ml-auto">
            ⌘K
          </kbd>
        </button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[280px] sm:w-[400px] p-0 border-0 shadow-sm bg-white dark:bg-[#303030]"
        align={isMobile ? "end" : "start"}
        alignOffset={0}
        sideOffset={4}
      >
        {/* Search Header */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-[#808080]" />
            <Input
              placeholder="Search students, staff, classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "h-9 w-full pl-9 pr-3 border-0",
                "bg-gray-50/50 dark:bg-[#404040]/50",
                "text-gray-900 dark:text-[#e6e6e6]",
                "placeholder:text-gray-400 dark:placeholder:text-[#808080]",
                "focus:ring-0 focus-visible:ring-0"
              )}
              autoFocus
            />
          </div>
        </div>
        
        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400 dark:text-[#808080]" />
              <span className="ml-2 text-sm text-gray-500 dark:text-[#808080]">Searching...</span>
            </div>
          )}

          {/* Error State */}
          {hasErrors && (
            <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
              <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mb-2" />
              <p className="text-sm text-gray-500 dark:text-[#808080]">
                Search error. Please try again.
              </p>
            </div>
          )}

          {/* Empty State */}
          {showEmptyState && (
            <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
              <Search className="h-5 w-5 text-gray-400 dark:text-[#808080] mb-2" />
              <p className="text-sm text-gray-500 dark:text-[#808080]">
                No results found for "{debouncedSearchQuery}"
              </p>
            </div>
          )}

          {/* Quick Navigation (shown when no search query) */}
          {!debouncedSearchQuery && (
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-medium text-gray-400 dark:text-[#606060]">
                Quick Navigation
              </div>
              {quickNavItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => handleNavigation(item.href)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors text-sm",
                    "hover:bg-gray-50 dark:hover:bg-[#404040]"
                  )}
                >
                  {item.icon}
                  <span className="text-gray-900 dark:text-[#e6e6e6]">{item.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Search Results */}
          {(students.length > 0 || teachers.length > 0) && (
            <div className="py-1">
              {/* Students */}
              {students.length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs font-medium text-gray-400 dark:text-[#606060]">
                    Students
                  </div>
                  {students.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => handleStudentClick(student.id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors text-sm",
                        "hover:bg-gray-50 dark:hover:bg-[#404040]"
                      )}
                    >
                      <GraduationCap className="h-3 w-3 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-[#e6e6e6] truncate">
                          {student.firstName} {student.lastName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-[#808080] truncate">
                          {student.admissionNumber} • {student.section?.class?.name}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* Teachers */}
              {teachers.length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs font-medium text-gray-400 dark:text-[#606060]">
                    Staff
                  </div>
                  {teachers.map((teacher) => (
                    <button
                      key={teacher.id}
                      onClick={() => handleTeacherClick(teacher.id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors text-sm",
                        "hover:bg-gray-50 dark:hover:bg-[#404040]"
                      )}
                    >
                      <User className="h-3 w-3 text-green-500 dark:text-green-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-[#e6e6e6] truncate">
                          {teacher.firstName} {teacher.lastName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-[#808080] truncate">
                          {teacher.employeeCode} • Teacher
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}