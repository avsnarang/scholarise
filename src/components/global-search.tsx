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
  Settings,
  Users2,
  BookOpen,
  School,
  FolderOpen,
  Home,
  ChartBar,
  MessageSquare,
  ClipboardList,
  UserCheck,
  Phone,
  DollarSign,
  Loader2,
  AlertCircle
} from "lucide-react";
import { api } from "@/utils/api";
import { useDebounce } from "@/hooks/useDebounce";
import { Kbd } from "@/components/ui/kbd";

// Define the navigation items for quick access with better categorization
const navigationItems = [
  // Dashboard & Overview
  { name: "Dashboard", href: "/dashboard", icon: <Home className="h-4 w-4" />, category: "Overview" },
  
  // Academic Management
  { name: "Students", href: "/students", icon: <GraduationCap className="h-4 w-4" />, category: "Academic" },
  { name: "Classes", href: "/classes", icon: <School className="h-4 w-4" />, category: "Academic" },
  { name: "Subjects", href: "/subjects", icon: <BookOpen className="h-4 w-4" />, category: "Academic" },
  { name: "Examination", href: "/examination", icon: <ClipboardList className="h-4 w-4" />, category: "Academic" },
  { name: "Question Papers", href: "/question-papers", icon: <FileText className="h-4 w-4" />, category: "Academic" },
  
  // Staff Management  
  { name: "Teachers", href: "/staff/teachers", icon: <Users className="h-4 w-4" />, category: "Staff" },
  { name: "Employees", href: "/staff/employees", icon: <User className="h-4 w-4" />, category: "Staff" },
  { name: "Attendance", href: "/attendance", icon: <UserCheck className="h-4 w-4" />, category: "Staff" },
  { name: "Salary", href: "/salary", icon: <DollarSign className="h-4 w-4" />, category: "Staff" },
  
  // Operations
  { name: "Transportation", href: "/transportation", icon: <Bus className="h-4 w-4" />, category: "Operations" },
  { name: "Finance", href: "/finance", icon: <CreditCard className="h-4 w-4" />, category: "Operations" },
  { name: "Communication", href: "/communication", icon: <MessageSquare className="h-4 w-4" />, category: "Operations" },
  { name: "Chat", href: "/chat", icon: <Phone className="h-4 w-4" />, category: "Operations" },
  
  // System
  { name: "Settings", href: "/settings", icon: <Settings className="h-4 w-4" />, category: "System" },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const router = useRouter();

  // Debug logging
  useEffect(() => {
    if (debouncedSearchQuery) {
      console.log('Global Search - Query:', debouncedSearchQuery);
      console.log('Global Search - Query length:', debouncedSearchQuery.length);
      console.log('Global Search - Should enable API calls:', debouncedSearchQuery.length >= 1);
    }
  }, [debouncedSearchQuery]);

  // Search for students
  const { 
    data: students = [], 
    isLoading: isLoadingStudents,
    error: studentsError,
    isError: hasStudentsError 
  } = api.student.fuzzySearchStudents.useQuery(
    {
      searchTerm: debouncedSearchQuery,
      limit: 5
    },
    {
      enabled: debouncedSearchQuery.length >= 1, // Temporarily lowered to 1 for testing
      retry: 1
    }
  );

  // Debug students
  useEffect(() => {
    console.log('=== Students Debug ===');
    console.log('Query:', debouncedSearchQuery);
    console.log('Query enabled:', debouncedSearchQuery.length >= 1);
    console.log('Is loading:', isLoadingStudents);
    console.log('Has error:', hasStudentsError);
    console.log('Error:', studentsError);
    console.log('Results count:', students?.length || 0);
    console.log('Results:', students);
    console.log('=====================');
  }, [debouncedSearchQuery, isLoadingStudents, hasStudentsError, studentsError, students]);

  // Search for teachers
  const { 
    data: teachers = [], 
    isLoading: isLoadingTeachers,
    error: teachersError,
    isError: hasTeachersError 
  } = api.teacher.search.useQuery(
    {
      search: debouncedSearchQuery,
      limit: 5
    },
    {
      enabled: debouncedSearchQuery.length >= 1, // Temporarily lowered to 1 for testing
      retry: 1
    }
  );

  // Debug teachers
  useEffect(() => {
    console.log('=== Teachers Debug ===');
    console.log('Query:', debouncedSearchQuery);
    console.log('Query enabled:', debouncedSearchQuery.length >= 1);
    console.log('Is loading:', isLoadingTeachers);
    console.log('Has error:', hasTeachersError);
    console.log('Error:', teachersError);
    console.log('Results count:', teachers?.length || 0);
    console.log('Results:', teachers);
    console.log('======================');
  }, [debouncedSearchQuery, isLoadingTeachers, hasTeachersError, teachersError, teachers]);

  // Search for employees
  const { 
    data: employees = [], 
    isLoading: isLoadingEmployees,
    error: employeesError,
    isError: hasEmployeesError 
  } = api.employee.search.useQuery(
    {
      search: debouncedSearchQuery,
      limit: 5
    },
    {
      enabled: debouncedSearchQuery.length >= 1, // Temporarily lowered to 1 for testing
      retry: 1
    }
  );

  // Debug employees
  useEffect(() => {
    console.log('=== Employees Debug ===');
    console.log('Query:', debouncedSearchQuery);
    console.log('Query enabled:', debouncedSearchQuery.length >= 1);
    console.log('Is loading:', isLoadingEmployees);
    console.log('Has error:', hasEmployeesError);
    console.log('Error:', employeesError);
    console.log('Results count:', employees?.length || 0);
    console.log('Results:', employees);
    console.log('========================');
  }, [debouncedSearchQuery, isLoadingEmployees, hasEmployeesError, employeesError, employees]);

  // Search for parents
  const { 
    data: parentsResult, 
    isLoading: isLoadingParents,
    error: parentsError 
  } = api.parent.getAll.useQuery(
    {
      search: debouncedSearchQuery,
      limit: 5
    },
    {
      enabled: debouncedSearchQuery.length >= 2, // Changed back to >= 2 for better performance
      retry: 1
    }
  );
  const parents = parentsResult?.items || [];

  // Search for classes
  const { 
    data: classes = [], 
    isLoading: isLoadingClasses,
    error: classesError 
  } = api.class.getAll.useQuery(
    {
      search: debouncedSearchQuery,
      includeSections: false
    },
    {
      enabled: debouncedSearchQuery.length >= 2, // Changed back to >= 2 for better performance
      retry: 1
    }
  );

  // Search for subjects
  const { 
    data: subjectsResult, 
    isLoading: isLoadingSubjects,
    error: subjectsError 
  } = api.subject.getAll.useQuery(
    {
      search: debouncedSearchQuery,
      limit: 5,
      isActive: true
    },
    {
      enabled: debouncedSearchQuery.length >= 2, // Changed back to >= 2 for better performance
      retry: 1
    }
  );
  const subjects = subjectsResult?.items || [];

  // Search for sections
  const { 
    data: sections = [], 
    isLoading: isLoadingSections,
    error: sectionsError 
  } = api.section.getAll.useQuery(
    {
      search: debouncedSearchQuery,
      includeClass: true,
      isActive: true
    },
    {
      enabled: debouncedSearchQuery.length >= 2, // Changed back to >= 2 for better performance
      retry: 1
    }
  );

  // Filter navigation items based on search query
  const filteredNavigationItems = navigationItems.filter(item =>
    item.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  // Group navigation items by category
  const groupedNavigationItems = filteredNavigationItems.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, typeof filteredNavigationItems>);

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
    router.push(`/staff/teachers/${teacherId}`);
  }, [router]);

  // Handle employee selection
  const handleSelectEmployee = useCallback((employeeId: string) => {
    setOpen(false);
    router.push(`/staff/employees/${employeeId}`);
  }, [router]);

  // Handle parent selection
  const handleSelectParent = useCallback((parentId: string) => {
    setOpen(false);
    router.push(`/students?parentId=${parentId}`);
  }, [router]);

  // Handle class selection
  const handleSelectClass = useCallback((classId: string) => {
    setOpen(false);
    router.push(`/classes/${classId}`);
  }, [router]);

  // Handle subject selection
  const handleSelectSubject = useCallback((subjectId: string) => {
    setOpen(false);
    router.push(`/subjects/${subjectId}`);
  }, [router]);

  // Handle section selection
  const handleSelectSection = useCallback((sectionId: string, classId: string) => {
    setOpen(false);
    router.push(`/classes/${classId}/sections/${sectionId}`);
  }, [router]);

  const isLoading = isLoadingStudents || isLoadingTeachers || isLoadingEmployees || 
                   isLoadingParents || isLoadingClasses || isLoadingSubjects || isLoadingSections;

  const hasErrors = studentsError || teachersError || employeesError || parentsError || 
                   classesError || subjectsError || sectionsError;

  // Separate API results from navigation results
  const hasApiResults = students.length > 0 || teachers.length > 0 || employees.length > 0 || 
                       parents.length > 0 || classes.length > 0 || subjects.length > 0 || 
                       sections.length > 0;

  const hasNavigationResults = Object.keys(groupedNavigationItems).length > 0;
  
  const hasAnyResults = hasApiResults || hasNavigationResults;

  // Show empty state only when we have a search query, not loading, no errors, and no results
  const showEmptyState = debouncedSearchQuery.length >= 1 && !isLoading && !hasErrors && !hasAnyResults;

  // Debug logging for the new logic
  useEffect(() => {
    if (debouncedSearchQuery.length >= 1) {
      console.log('=== Search Debug ===');
      console.log('Query:', debouncedSearchQuery);
      console.log('Students:', students?.length || 0);
      console.log('Teachers:', teachers?.length || 0);
      console.log('Employees:', employees?.length || 0);
      console.log('Navigation items:', Object.keys(groupedNavigationItems || {}).length);
      console.log('Has API results:', hasApiResults);
      console.log('Has navigation results:', hasNavigationResults);
      console.log('Is loading:', isLoading);
      console.log('Has errors:', hasErrors);
      console.log('Show empty state:', showEmptyState);
      console.log('==================');
    }
  }, [debouncedSearchQuery, students?.length, teachers?.length, employees?.length, hasApiResults, hasNavigationResults, isLoading, hasErrors, showEmptyState]);

  // Debug rendering conditions
  useEffect(() => {
    if (debouncedSearchQuery.length >= 1) {
      console.log('🔍 UI Rendering Debug:');
      console.log('  - students.length:', students.length, 'should show:', students.length > 0);
      console.log('  - teachers.length:', teachers.length, 'should show:', teachers.length > 0);
      console.log('  - employees.length:', employees.length, 'should show:', employees.length > 0);
      console.log('  - showEmptyState:', showEmptyState);
      console.log('  - hasErrors:', hasErrors);
      console.log('  - students data:', students);
      console.log('  - employees data:', employees);
    }
  }, [debouncedSearchQuery, students.length, teachers.length, employees.length, showEmptyState, hasErrors, students, employees]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-500 shadow-sm transition-colors hover:border-gray-300 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00501B] dark:border-[#303030] dark:bg-[#252525] dark:text-[#c0c0c0] dark:hover:border-[#404040] dark:hover:text-[#e6e6e6] dark:focus-visible:ring-[#7aad8c]"
      >
        <Search className="h-4 w-4 flex-shrink-0" />
        <span className="hidden md:inline truncate">Search everything...</span>
        <Kbd className="hidden md:flex ml-auto flex-shrink-0 dark:bg-[#303030] dark:text-[#c0c0c0] dark:border-[#404040]">⌘K</Kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command className="rounded-lg border shadow-md dark:bg-[#252525] dark:border-[#303030]">
          <CommandInput
            placeholder="Start typing to search students, staff, classes..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="dark:placeholder-[#808080]"
          />
          <CommandList className="dark:border-t dark:border-[#303030]">
            {/* Custom Empty State */}
            {showEmptyState && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="rounded-full bg-gray-100 p-3 dark:bg-[#303030]">
                  <Search className="h-6 w-6 text-gray-400 dark:text-[#808080]" />
                </div>
                <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">
                  No results found
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-[#c0c0c0]">
                  No students, staff, classes, or pages match "{debouncedSearchQuery}"
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-[#808080]">
                  Try searching with different keywords
                </p>
              </div>
            )}

            {/* Error State */}
            {hasErrors && (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/20">
                  <AlertCircle className="h-6 w-6 text-red-500 dark:text-red-400" />
                </div>
                <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-[#e6e6e6]">
                  Search Error
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-[#c0c0c0]">
                  There was an error searching. Please try again.
                </p>
              </div>
            )}

            {/* Don't show default CommandEmpty when we have our custom empty states */}
            {!showEmptyState && !hasErrors && <CommandEmpty className="hidden" />}

            {/* DEBUG: Show rendering conditions */}
            {process.env.NODE_ENV === 'development' && debouncedSearchQuery.length >= 1 && (
              <div className="p-2 bg-yellow-100 text-xs border-b dark:bg-yellow-900/20 dark:text-yellow-200">
                <div>🐛 Debug: students.length = {students.length}, should show = {students.length > 0 ? 'YES' : 'NO'}</div>
                <div>🐛 Debug: teachers.length = {teachers.length}, should show = {teachers.length > 0 ? 'YES' : 'NO'}</div>
                <div>🐛 Debug: employees.length = {employees.length}, should show = {employees.length > 0 ? 'YES' : 'NO'}</div>
                <div>🐛 Debug: showEmptyState = {showEmptyState ? 'YES' : 'NO'}</div>
                <div>🐛 Debug: hasErrors = {hasErrors ? 'YES' : 'NO'}</div>
              </div>
            )}

            {/* Navigation Items - grouped by category */}
            {Object.entries(groupedNavigationItems).map(([category, items]) => (
              <CommandGroup key={category} heading={`${category} Pages`} className="dark:text-[#c0c0c0]">
                {items.map((item) => (
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
            ))}

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

            {/* Parents */}
            {parents.length > 0 && (
              <>
                <CommandSeparator className="dark:bg-[#303030]" />
                <CommandGroup heading="Parents" className="dark:text-[#c0c0c0]">
                  {parents.map((parent) => (
                    <CommandItem
                      key={parent.id}
                      onSelect={() => handleSelectParent(parent.id)}
                      className="flex items-center gap-2 dark:text-[#e6e6e6] dark:aria-selected:bg-[#2a2a2a] dark:aria-selected:text-[#7aad8c]"
                    >
                      <Users2 className="h-4 w-4 text-[#00501B] dark:text-[#7aad8c]" />
                      <span>
                        {parent.fatherName || parent.motherName || parent.guardianName || 'Parent'}
                        <span className="ml-2 text-xs text-gray-500 dark:text-[#c0c0c0]">
                          (Parent)
                        </span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Classes */}
            {classes.length > 0 && (
              <>
                <CommandSeparator className="dark:bg-[#303030]" />
                <CommandGroup heading="Classes" className="dark:text-[#c0c0c0]">
                  {classes.map((classItem) => (
                    <CommandItem
                      key={classItem.id}
                      onSelect={() => handleSelectClass(classItem.id)}
                      className="flex items-center gap-2 dark:text-[#e6e6e6] dark:aria-selected:bg-[#2a2a2a] dark:aria-selected:text-[#7aad8c]"
                    >
                      <School className="h-4 w-4 text-[#00501B] dark:text-[#7aad8c]" />
                      <span>
                        Class {classItem.name}
                        {classItem.description && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-[#c0c0c0]">
                            ({classItem.description})
                          </span>
                        )}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Subjects */}
            {subjects.length > 0 && (
              <>
                <CommandSeparator className="dark:bg-[#303030]" />
                <CommandGroup heading="Subjects" className="dark:text-[#c0c0c0]">
                  {subjects.map((subject) => (
                    <CommandItem
                      key={subject.id}
                      onSelect={() => handleSelectSubject(subject.id)}
                      className="flex items-center gap-2 dark:text-[#e6e6e6] dark:aria-selected:bg-[#2a2a2a] dark:aria-selected:text-[#7aad8c]"
                    >
                      <BookOpen className="h-4 w-4 text-[#00501B] dark:text-[#7aad8c]" />
                      <span>
                        {subject.name}
                        {subject.code && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-[#c0c0c0]">
                            ({subject.code})
                          </span>
                        )}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Sections */}
            {sections.length > 0 && (
              <>
                <CommandSeparator className="dark:bg-[#303030]" />
                <CommandGroup heading="Sections" className="dark:text-[#c0c0c0]">
                  {sections.map((section) => (
                    <CommandItem
                      key={section.id}
                      onSelect={() => handleSelectSection(section.id, section.classId)}
                      className="flex items-center gap-2 dark:text-[#e6e6e6] dark:aria-selected:bg-[#2a2a2a] dark:aria-selected:text-[#7aad8c]"
                    >
                      <FolderOpen className="h-4 w-4 text-[#00501B] dark:text-[#7aad8c]" />
                      <span>
                        {section.class?.name} - {section.name}
                        <span className="ml-2 text-xs text-gray-500 dark:text-[#c0c0c0]">
                          (Section)
                        </span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Loading states */}
            {isLoading && debouncedSearchQuery.length > 0 && (
              <div className="flex items-center justify-center py-8 px-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#c0c0c0]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Searching...</span>
                </div>
              </div>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
