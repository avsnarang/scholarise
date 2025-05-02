'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command";
import {
  Search,
  User,
  GraduationCap,
  Users,
  Building,
  Calendar,
  Bus,
  CreditCard,
  FileText,
  Settings
} from "lucide-react";
import { api } from "@/utils/api";
import { useDebounce } from "@/hooks/useDebounce";
import { Kbd } from "@/components/ui/kbd";

// Define the navigation items for quick access
const navigationItems = [
  { name: "Dashboard", href: "/dashboard", icon: <Building className="h-4 w-4" /> },
  { name: "Students", href: "/students", icon: <GraduationCap className="h-4 w-4" /> },
  { name: "Teachers", href: "/teachers", icon: <Users className="h-4 w-4" /> },
  { name: "Employees", href: "/employees", icon: <User className="h-4 w-4" /> },
  { name: "Classes", href: "/classes", icon: <Building className="h-4 w-4" /> },
  { name: "Transport", href: "/transport", icon: <Bus className="h-4 w-4" /> },
  { name: "Fees", href: "/fees", icon: <CreditCard className="h-4 w-4" /> },
  { name: "Reports", href: "/reports", icon: <FileText className="h-4 w-4" /> },
  { name: "Settings", href: "/settings", icon: <Settings className="h-4 w-4" /> },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const router = useRouter();

  // Search for students
  const { data: students = [], isLoading: isLoadingStudents } = api.student.fuzzySearchStudents.useQuery(
    {
      searchTerm: debouncedSearchQuery,
      limit: 5
    },
    {
      enabled: debouncedSearchQuery.length > 1
    }
  );

  // Search for teachers
  const { data: teachers = [], isLoading: isLoadingTeachers } = api.teacher.search.useQuery(
    {
      search: debouncedSearchQuery,
      limit: 5
    },
    {
      enabled: debouncedSearchQuery.length > 1
    }
  );

  // Search for employees
  const { data: employees = [], isLoading: isLoadingEmployees } = api.employee.search.useQuery(
    {
      search: debouncedSearchQuery,
      limit: 5
    },
    {
      enabled: debouncedSearchQuery.length > 1
    }
  );

  // Filter navigation items based on search query
  const filteredNavigationItems = navigationItems.filter(item =>
    item.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  // Handle keyboard shortcut to open search
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

  // Handle navigation
  const handleSelect = useCallback((href: string) => {
    setOpen(false);
    router.push(href);
  }, [router]);

  // Handle student selection
  const handleSelectStudent = useCallback((studentId: string) => {
    setOpen(false);
    router.push(`/students/${studentId}`);
  }, [router]);

  // Handle teacher selection
  const handleSelectTeacher = useCallback((teacherId: string) => {
    setOpen(false);
    router.push(`/teachers/${teacherId}`);
  }, [router]);

  // Handle employee selection
  const handleSelectEmployee = useCallback((employeeId: string) => {
    setOpen(false);
    router.push(`/employees/${employeeId}`);
  }, [router]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-500 shadow-sm transition-colors hover:border-gray-300 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00501B] dark:border-[#303030] dark:bg-[#252525] dark:text-[#c0c0c0] dark:hover:border-[#404040] dark:hover:text-[#e6e6e6] dark:focus-visible:ring-[#7aad8c]"
      >
        <Search className="h-4 w-4 flex-shrink-0" />
        <span className="hidden md:inline truncate">Search students, teachers, employees or pages...</span>
        <Kbd className="hidden md:flex ml-auto flex-shrink-0 dark:bg-[#303030] dark:text-[#c0c0c0] dark:border-[#404040]">⌘K</Kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command className="rounded-lg border shadow-md dark:bg-[#252525] dark:border-[#303030]">
          <CommandInput
            placeholder="Search students, teachers, employees or pages..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="dark:placeholder-[#808080]"
          />
          <CommandList className="dark:border-t dark:border-[#303030]">
            <CommandEmpty className="dark:text-[#c0c0c0]">No results found.</CommandEmpty>

            {/* Navigation Items */}
            {filteredNavigationItems.length > 0 && (
              <CommandGroup heading="Pages" className="dark:text-[#c0c0c0]">
                {filteredNavigationItems.map((item) => (
                  <CommandItem
                    key={item.href}
                    onSelect={() => handleSelect(item.href)}
                    className="flex items-center gap-2 dark:text-[#e6e6e6] dark:aria-selected:bg-[#2a2a2a] dark:aria-selected:text-[#7aad8c]"
                  >
                    <div className="dark:text-[#7aad8c]">{item.icon}</div>
                    <span>{item.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Students */}
            {students.length > 0 && (
              <>
                <CommandSeparator className="dark:bg-[#303030]" />
                <CommandGroup heading="Students" className="dark:text-[#c0c0c0]">
                  {students.map((student) => (
                    <CommandItem
                      key={student.id}
                      onSelect={() => handleSelectStudent(student.id)}
                      className="flex items-center gap-2 dark:text-[#e6e6e6] dark:aria-selected:bg-[#2a2a2a] dark:aria-selected:text-[#7aad8c]"
                    >
                      <GraduationCap className="h-4 w-4 text-[#00501B] dark:text-[#7aad8c]" />
                      <span>
                        {student.firstName} {student.lastName}
                        <span className="ml-2 text-xs text-gray-500 dark:text-[#c0c0c0]">
                          ({student.admissionNumber})
                        </span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Teachers */}
            {teachers.length > 0 && (
              <>
                <CommandSeparator className="dark:bg-[#303030]" />
                <CommandGroup heading="Teachers" className="dark:text-[#c0c0c0]">
                  {teachers.map((teacher) => (
                    <CommandItem
                      key={teacher.id}
                      onSelect={() => handleSelectTeacher(teacher.id)}
                      className="flex items-center gap-2 dark:text-[#e6e6e6] dark:aria-selected:bg-[#2a2a2a] dark:aria-selected:text-[#7aad8c]"
                    >
                      <Users className="h-4 w-4 text-[#00501B] dark:text-[#7aad8c]" />
                      <span>
                        {teacher.firstName} {teacher.lastName}
                        {teacher.employeeCode && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-[#c0c0c0]">
                            ({teacher.employeeCode})
                          </span>
                        )}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Employees */}
            {employees.length > 0 && (
              <>
                <CommandSeparator className="dark:bg-[#303030]" />
                <CommandGroup heading="Employees" className="dark:text-[#c0c0c0]">
                  {employees.map((employee) => (
                    <CommandItem
                      key={employee.id}
                      onSelect={() => handleSelectEmployee(employee.id)}
                      className="flex items-center gap-2 dark:text-[#e6e6e6] dark:aria-selected:bg-[#2a2a2a] dark:aria-selected:text-[#7aad8c]"
                    >
                      <User className="h-4 w-4 text-[#00501B] dark:text-[#7aad8c]" />
                      <span>
                        {employee.firstName} {employee.lastName}
                        {employee.designation && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-[#c0c0c0]">
                            ({employee.designation})
                          </span>
                        )}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Loading states */}
            {(isLoadingStudents || isLoadingTeachers || isLoadingEmployees) && debouncedSearchQuery.length > 0 && (
              <div className="py-6 text-center text-sm dark:text-[#c0c0c0]">
                Searching...
              </div>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
