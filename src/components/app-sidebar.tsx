"use client"

import * as React from "react"
import {
  Award,
  Users,
  GraduationCap,
  Building,
  Bus,
  CreditCard,
  FileText,
  Settings,
  Bell,
  LayoutDashboard,
  School,
  ChevronsUpDown,
  ChevronRight,
  AlertCircle,
  Clock,
  LogOut,
  User,
  Settings2,
  BadgeCheck,
  Calendar,
  DollarSign,
  BookOpen,
  Plus,
  ClipboardCheck,
  MessageSquare,
  BarChart3,
  MonitorSpeaker,
  UserPlus,
  FolderOpen,
  CheckSquare,
  Activity,
  ListTodo,
} from "lucide-react"
import { type Prisma } from "@prisma/client"
import { useBranchContext } from "@/hooks/useBranchContext"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { useUserRole } from "@/hooks/useUserRole"
import { Permission, Role } from "@/types/permissions"
import { api } from "@/utils/api"

// Simple permission mapping to replace legacy RBAC system
const navPermissions = {
  dashboard: ["view_dashboard"],
  admission: ["manage_admissions"],
  students: ["view_students"],
  transfer: ["manage_transfer_certificates"],
  teachers: ["view_teachers"],
  employees: ["view_employees"],
  createTeacher: ["create_teacher"],
  createEmployee: ["create_employee"],
  departments: ["view_departments"],
  designations: ["view_designations"],
  classes: ["view_classes"],
  classStudents: ["manage_class_students"],
  attendance: ["view_attendance"],
  markAttendance: ["mark_attendance"],
  leaves: ["view_leaves"],
  leaveApplications: ["manage_leave_applications"],
  leavePolicies: ["manage_leave_policies"],
  finance: ["view_finance_module"],
  feeHeads: ["manage_fee_heads"],
  feeTerms: ["manage_fee_terms"],
  classwiseFees: ["manage_classwise_fees"],
  feeCollection: ["collect_fees"],
  moneyCollection: ["view_money_collection"],
  salary: ["view_salary"],
  salaryStructures: ["manage_salary_structures"],
  teacherSalaries: ["manage_teacher_salaries"],
  employeeSalaries: ["manage_employee_salaries"],
  salaryIncrements: ["manage_salary_increments"],
  salaryPayments: ["process_salary_payments"],
  transport: ["view_transport"],
  transportRoutes: ["manage_transport_routes"],
  transportStops: ["manage_transport_stops"],
  transportAssignments: ["manage_transport_assignments"],
  settings: ["view_settings"],
  branches: ["manage_branches"],
  academicSessions: ["manage_academic_sessions"],
  subjects: ["manage_subjects"],
  users: ["manage_roles"],
  attendanceConfig: ["manage_attendance_config"],
  questionPapers: ["view_question_papers"],
  createQuestionPaper: ["create_question_paper"],
  manageQuestionPapers: ["manage_question_papers"],
  examination: ["view_examinations"],
  manageAssessments: ["manage_assessments"],
  gradeScales: ["manage_grade_scales"],
  terms: ["manage_academic_sessions"],
  enterMarks: ["enter_marks"],
  communication: ["view_communication"],
  sendMessage: ["create_communication_message"],
  manageTemplates: ["manage_whatsapp_templates"],
  communicationHistory: ["view_communication_logs"],
  courtesyCalls: ["view_courtesy_calls"],
  viewOwnCourtesyCallFeedback: ["view_own_courtesy_call_feedback"],
  viewAllCourtesyCallFeedback: ["view_all_courtesy_call_feedback"],
  actionItems: ["view_action_items"],
  viewOwnActionItems: ["view_own_action_items"],
  viewAllActionItems: ["view_all_action_items"],
  attendanceReports: ["view_attendance_reports"],
  examReports: ["view_exam_reports"],
  financeReports: ["view_finance_reports"],
  reports: ["view_reports"],
};
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { usePathname } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export * from "@/components/ui/app-sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { user, logout } = useAuth();

  // Fetch user-specific branches from API
  const { data: branches = [], isLoading: isLoadingBranches } = api.branch.getUserBranches.useQuery();
  const { currentBranchId, setCurrentBranchId } = useBranchContext();
  const { canAccess, isSuperAdmin, can } = usePermissions();
  const { isTeacher, isEmployee, isERPManager } = useUserRole();

  // Define Branch type based on the API response
  type Branch = {
    id: string;
    name: string;
    code: string;
    logoUrl?: string | null;
  };

  // Define navigation item types
  interface NavItem {
    title: string;
    href: string;
    icon?: any;
    permissions: Permission[];
    children?: NavItem[];
    target?: string;
  }

  // Find the selected branch using currentBranchId
  const selectedBranch = React.useMemo(() => {
    // Ensure branches is an array before using find on it
    const branchesArray = Array.isArray(branches) ? branches : [];
    return branchesArray.find((branch: Branch) => branch.id === currentBranchId);
  }, [branches, currentBranchId]);

  // Add usePathname hook
  const pathname = usePathname();

  const [forceAdminMode, setForceAdminMode] = React.useState(false);
  
  // Check for force admin mode in localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const isForceAdmin = localStorage.getItem('forceAdmin') === 'true';
      setForceAdminMode(isForceAdmin);
      
      // For debugging
      if (isForceAdmin) {
        console.log("Force admin mode active in sidebar");
      }
    }
  }, []);

  // Function to determine which section should be expanded based on current pathname
  const getExpandedSectionsFromPath = (currentPath: string) => {
    // ERP section paths
    const erpPaths = [
      '/admissions', '/students', '/staff', '/classes', '/attendance', '/leaves', 
      '/finance', '/money-collection', '/salary', '/transportation', '/settings',
      '/communication', '/subjects'
    ];
    
    // LMS section paths
    const lmsPaths = ['/question-papers', '/examination'];
    
    // Reports section paths
    const reportsPaths = ['/reports/automation-logs', '/courtesy-calls', '/attendance/reports', '/examination/reports', '/finance/reports', '/reports'];
    
    const isInErp = erpPaths.some(path => currentPath.startsWith(path));
    const isInLms = lmsPaths.some(path => currentPath.startsWith(path));
    const isInReports = reportsPaths.some(path => currentPath.startsWith(path));
    
    return {
      ERP: isInErp,
      LMS: isInLms,
      Reports: isInReports,
    };
  };

  // Function to determine which parent menu items should be expanded based on current pathname
  const getExpandedItemsFromPath = (currentPath: string) => {
    const expandedItems: Record<string, boolean> = {};
    
    // ERP section parent items
    if (currentPath.startsWith('/admissions/')) {
      expandedItems.Admissions = true;
    }
    if (currentPath.startsWith('/students/')) {
      expandedItems.Students = true;
    }
    if (currentPath.startsWith('/staff/')) {
      expandedItems.Staff = true;
      // Check for nested items in Staff
      if (currentPath.startsWith('/staff/teachers/')) {
        expandedItems['Staff-Teachers'] = true;
      }
    }
    if (currentPath.startsWith('/classes/')) {
      expandedItems.Classes = true;
    }
    if (currentPath.startsWith('/attendance/')) {
      expandedItems.Attendance = true;
    }
    if (currentPath.startsWith('/leaves/')) {
      expandedItems['Leave Management'] = true;
    }
    if (currentPath.startsWith('/finance/')) {
      expandedItems.Finance = true;
    }
    if (currentPath.startsWith('/money-collection/')) {
      expandedItems['Money Collection'] = true;
    }
    if (currentPath.startsWith('/salary/')) {
      expandedItems['Salary Management'] = true;
    }
    if (currentPath.startsWith('/communication/')) {
      expandedItems.Communication = true;
    }
    if (currentPath.startsWith('/subjects/')) {
      expandedItems.Subjects = true;
    }
    if (currentPath.startsWith('/transportation/')) {
      expandedItems.Transport = true;
    }
    if (currentPath.startsWith('/settings/')) {
      expandedItems.Settings = true;
    }
    
    // LMS section parent items
    if (currentPath.startsWith('/question-papers/')) {
      expandedItems['Question Papers'] = true;
    }
    if (currentPath.startsWith('/examination/')) {
      expandedItems.Examination = true;
      // Check for nested items in Examination
      if (currentPath.startsWith('/examination/config/')) {
        expandedItems['Examination-Configuration'] = true;
      }
    }
    
    // Reports section parent items
    if (currentPath.startsWith('/courtesy-calls/')) {
      expandedItems['Courtesy Calls'] = true;
    }
    
    return expandedItems;
  };

  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>(() => {
    // Initialize expanded items based on current pathname
    return getExpandedItemsFromPath(pathname || '');
  });
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>(() => {
    // Initialize expanded sections based on current pathname
    return getExpandedSectionsFromPath(pathname || '');
  });

  // Update expanded sections and items when pathname changes
  React.useEffect(() => {
    if (pathname) {
      const newExpandedSections = getExpandedSectionsFromPath(pathname);
      const newExpandedItems = getExpandedItemsFromPath(pathname);
      setExpandedSections(newExpandedSections);
      setExpandedItems(newExpandedItems);
    }
  }, [pathname]);

  // Temporary hardcoded super admin check for specific user
  const isHardcodedSuperAdmin = user?.id === 'user_2y1xEACdC5UpJaTuVRuuzH75bOA';
  const effectiveIsSuperAdmin = isSuperAdmin || forceAdminMode || isHardcodedSuperAdmin;

  const toggleExpand = (title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedItems(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // ERP section items (main business operations)
  const erpItems = [
    {
      title: "Admissions",
      href: "/admissions",
      icon: School,
      permissions: [Permission.MANAGE_ADMISSIONS],
      children: [
        {
          title: "Inquiries",
          href: "/admissions/inquiries",
          permissions: [Permission.MANAGE_ADMISSIONS],
        },
        {
          title: "Register Student",
          href: "/admissions/inquiries?openModal=true",
          permissions: [Permission.MANAGE_ADMISSIONS],
        },
        {
          title: "Staff",
          href: "/admissions/staff",
          permissions: [Permission.VIEW_EMPLOYEES],
        },
        {
          title: "Settings",
          href: "/admissions/settings",
          permissions: [Permission.MANAGE_ADMISSIONS],
        },
      ],
    },
    {
      title: "Students",
      href: "/students",
      icon: GraduationCap,
      permissions: [Permission.VIEW_STUDENTS],
      children: [
        {
          title: "All Students",
          href: "/students/list",
          permissions: [Permission.VIEW_STUDENTS],
        },
        {
          title: "Assign Roll Numbers",
          href: "/students/assign-roll-number",
          permissions: [Permission.EDIT_STUDENT],
        },
        {
          title: "Transfer Certificates",
          href: "/students/tc",
          permissions: [Permission.MANAGE_TRANSFER_CERTIFICATES],
        },
      ],
    },
    {
      title: "Staff",
      href: "/staff",
      icon: Users,
      permissions: [Permission.VIEW_TEACHERS, Permission.VIEW_EMPLOYEES],
      children: [
        {
          title: "Teachers",
          href: "/staff/teachers",
          permissions: [Permission.VIEW_TEACHERS],
          children: [
            {
              title: "Dashboard",
              href: "/teachers/dashboard",
              permissions: [Permission.VIEW_TEACHERS],
            },
            {
              title: "All Teachers",
              href: "/staff/teachers",
              permissions: [Permission.VIEW_TEACHERS],
            },
          ],
        },
        {
          title: "Add Teacher",
          href: "/staff/teachers/create",
          permissions: [Permission.CREATE_TEACHER],
        },
        {
          title: "Employees",
          href: "/staff/employees",
          permissions: [Permission.VIEW_EMPLOYEES],
          children: [
            {
              title: "Dashboard",
              href: "/staff/employees/dashboard",
              permissions: [Permission.VIEW_EMPLOYEES],
            },
            {
              title: "All Employees",
              href: "/staff/employees",
              permissions: [Permission.VIEW_EMPLOYEES],
            },
          ],
        },
        {
          title: "Add Employee",
          href: "/staff/employees/create",
          permissions: [Permission.CREATE_EMPLOYEE],
        },
        {
          title: "Departments",
          href: "/staff/departments/list",
          permissions: [Permission.VIEW_DEPARTMENTS],
        },
        {
          title: "Designations",
          href: "/staff/designations/list",
          permissions: [Permission.VIEW_DESIGNATIONS],
        },
      ],
    },
    {
      title: "Classes",
      href: "/classes",
      icon: Building,
      permissions: [Permission.VIEW_CLASSES],
      children: [
        {
          title: "All Classes",
          href: "/classes/list",
          permissions: [Permission.VIEW_CLASSES],
        },
        {
          title: "Class Students",
          href: "/classes/students",
          permissions: [Permission.MANAGE_CLASS_STUDENTS],
        },
      ],
    },
    {
      title: "Subjects",
      href: "/subjects",
      icon: BookOpen,
      permissions: [Permission.MANAGE_SUBJECTS],
      children: [
        {
          title: "Manage Subjects",
          href: "/subjects/manage",
          permissions: [Permission.MANAGE_SUBJECTS],
        },
        {
          title: "Teacher Assignments",
          href: "/subjects/teacher-assignments",
          permissions: [Permission.VIEW_TEACHERS],
        },
        {
          title: "Class Mapping",
          href: "/subjects/class-mapping",
          permissions: [Permission.MANAGE_SUBJECTS],
        },
        {
          title: "Student Mapping",
          href: "/subjects/student-mapping",
          permissions: [Permission.MANAGE_SUBJECTS],
        },
        {
          title: "Class Overview",
          href: "/subjects/class-overview",
          permissions: [Permission.MANAGE_SUBJECTS],
        },
      ],
    },
    {
      title: "Attendance",
      href: "/attendance",
      icon: Clock,
      permissions: [
        Permission.VIEW_ATTENDANCE,
        Permission.MARK_ATTENDANCE,
        Permission.MARK_SELF_ATTENDANCE,
        Permission.MARK_ALL_STAFF_ATTENDANCE,
      ],
      children: [
        {
          title: "Dashboard",
          href: "/attendance",
          permissions: [Permission.VIEW_ATTENDANCE],
        },
        {
          title: "Mark Attendance",
          href: "/attendance/mark",
          permissions: [Permission.MARK_ATTENDANCE],
        },
        {
          title: "Student Attendance",
          href: "/attendance/students",
          permissions: [Permission.VIEW_ATTENDANCE],
        },
      ],
    },
    {
      title: "Leave Management",
      href: "/leave-management",
      icon: Calendar,
      permissions: [
        Permission.VIEW_LEAVES,
        Permission.MANAGE_LEAVE_POLICIES,
        Permission.MANAGE_LEAVE_APPLICATIONS,
      ],
      children: [
        {
          title: "Apply for Leave",
          href: "/leave-management/application",
          permissions: [Permission.MANAGE_LEAVE_APPLICATIONS],
        },
        {
          title: "Manage Leave Policies",
          href: "/leave-management/policies",
          permissions: [Permission.MANAGE_LEAVE_POLICIES],
        },
      ],
    },
    {
      title: "Finance",
      href: "/finance",
      icon: CreditCard,
      permissions: [Permission.VIEW_FINANCE_MODULE],
      children: [
        {
          title: "Fee Heads",
          href: "/finance/fee-head",
          permissions: [Permission.MANAGE_FEE_HEADS],
        },
        {
          title: "Fee Terms",
          href: "/finance/fee-term",
          permissions: [Permission.MANAGE_FEE_TERMS],
        },
        {
          title: "Classwise Fees",
          href: "/finance/classwise-fee",
          permissions: [Permission.MANAGE_CLASSWISE_FEES],
        },
        {
          title: "Fee Collection",
          href: "/finance/fee-collection",
          permissions: [Permission.COLLECT_FEES],
        },
        {
          title: "Payment History",
          href: "/finance/payment-history",
          permissions: [Permission.VIEW_FINANCE_MODULE],
        },
        {
          title: "Concession Types",
          href: "/finance/concession-types",
          permissions: [Permission.MANAGE_CONCESSION_TYPES],
        },
        {
          title: "Student Concessions",
          href: "/finance/student-concessions",
          permissions: [Permission.MANAGE_STUDENT_CONCESSIONS],
        },
        {
          title: "Concession Approvals",
          href: "/finance/concession-approvals",
          permissions: [Permission.MANAGE_STUDENT_CONCESSIONS],
        },
        {
          title: "Fee Reminders",
          href: "/finance/reminders",
          permissions: [Permission.MANAGE_FEE_REMINDERS],
        },
        {
          title: "Reports",
          href: "/finance/reports",
          permissions: [Permission.VIEW_FINANCE_REPORTS],
        },
      ],
    },
    {
      title: "Money Collection",
      href: "/money-collection",
      icon: DollarSign,
      permissions: [
        Permission.VIEW_MONEY_COLLECTION,
        Permission.CREATE_MONEY_COLLECTION,
      ],
      children: [
        {
          title: "All Collections",
          href: "/money-collection",
          permissions: [Permission.VIEW_MONEY_COLLECTION],
        },
        {
          title: "New Collection",
          href: "/money-collection/new",
          permissions: [Permission.CREATE_MONEY_COLLECTION],
        },
      ],
    },
    {
      title: "Salary Management",
      href: "/salary",
      icon: DollarSign,
      permissions: [Permission.VIEW_SALARY],
      children: [
        {
          title: "Overview",
          href: "/salary",
          permissions: [Permission.VIEW_SALARY],
        },
        {
          title: "Salary Structures",
          href: "/salary/structures",
          permissions: [Permission.MANAGE_SALARY_STRUCTURES],
        },
        {
          title: "Teacher Salaries",
          href: "/salary/teachers/assign",
          permissions: [Permission.MANAGE_TEACHER_SALARIES],
        },
        {
          title: "Employee Salaries",
          href: "/salary/employees/assign",
          permissions: [Permission.MANAGE_EMPLOYEE_SALARIES],
        },
        {
          title: "Salary Increments",
          href: "/salary/increments",
          permissions: [Permission.MANAGE_SALARY_INCREMENTS],
        },
        {
          title: "Increment History",
          href: "/salary/increments/history",
          permissions: [Permission.MANAGE_SALARY_INCREMENTS],
        },
        {
          title: "Process Payments",
          href: "/salary/payments",
          permissions: [Permission.PROCESS_SALARY_PAYMENTS],
        },
      ],
    },
    {
      title: "Communication",
      href: "/communication",
      icon: MessageSquare,
      permissions: [Permission.VIEW_COMMUNICATION],
      children: [
        {
          title: "WhatsApp Chat",
          href: "/chat",
          permissions: [Permission.VIEW_COMMUNICATION_LOGS],
          target: "_blank",
        },
        {
          title: "Send Message",
          href: "/communication/send",
          permissions: [Permission.CREATE_COMMUNICATION_MESSAGE],
        },
        {
          title: "Templates",
          href: "/communication/templates",
          permissions: [Permission.MANAGE_WHATSAPP_TEMPLATES],
        },
        {
          title: "Message History",
          href: "/communication/history",
          permissions: [Permission.VIEW_COMMUNICATION_LOGS],
        },
        {
          title: "Settings",
          href: "/communication/settings",
          permissions: [Permission.MANAGE_COMMUNICATION_SETTINGS],
        },
        {
          title: "Chat Settings",
          href: "/communication/chat",
          permissions: [Permission.MANAGE_CHAT_SETTINGS],
        },
      ],
    },
    {
      title: "Transport",
      href: "/transportation",
      icon: Bus,
      permissions: [Permission.VIEW_TRANSPORT],
      children: [
        {
          title: "Bus Management",
          href: "/transportation/buses",
          permissions: [Permission.MANAGE_TRANSPORT_ROUTES],
        },
        {
          title: "Staff Management",
          href: "/transportation/staff",
          permissions: [Permission.MANAGE_TRANSPORT_ROUTES],
        },
        {
          title: "Routes & Stops",
          href: "/transportation/routes",
          permissions: [Permission.MANAGE_TRANSPORT_ROUTES],
        },
        {
          title: "Student Assignments",
          href: "/transportation/assignments",
          permissions: [Permission.MANAGE_TRANSPORT_ASSIGNMENTS],
        },
        {
          title: "Trip Manager",
          href: "/transportation/trips",
          permissions: [Permission.MANAGE_TRANSPORT_ROUTES],
        },
        {
          title: "Fee Management",
          href: "/transportation/fees",
          permissions: [Permission.MANAGE_TRANSPORT_ROUTES],
        },
        {
          title: "Fuel Tracking",
          href: "/transportation/fuel-logs",
          permissions: [Permission.MANAGE_TRANSPORT_ROUTES],
        },
        {
          title: "Maintenance Logs",
          href: "/transportation/maintenance",
          permissions: [Permission.MANAGE_TRANSPORT_ROUTES],
        },
        {
          title: "Bus Inspections",
          href: "/transportation/inspections",
          permissions: [Permission.MANAGE_TRANSPORT_ROUTES],
        },
        {
          title: "Configuration",
          href: "/transportation/configuration",
          permissions: [Permission.MANAGE_TRANSPORT_ROUTES],
        },
        {
          title: "Reports",
          href: "/transportation/reports",
          permissions: [Permission.VIEW_TRANSPORT],
        },
      ],
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
      permissions: [Permission.VIEW_SETTINGS],
      children: [
        {
          title: "Branches",
          href: "/settings/branches",
          permissions: [Permission.MANAGE_BRANCHES],
        },
        {
          title: "Academic Sessions",
          href: "/settings/academic-sessions",
          permissions: [Permission.MANAGE_ACADEMIC_SESSIONS],
        },

        {
          title: "Users",
          href: "/settings/users",
          permissions: [Permission.MANAGE_ROLES],
        },
        {
          title: "Roles",
          href: "/settings/roles",
          permissions: [Permission.MANAGE_ROLES],
        },
        {
          title: "Attendance Configuration",
          href: "/settings/attendance-config",
          permissions: [Permission.MANAGE_ATTENDANCE_CONFIG],
        },
        {
          title: "Email Configuration",
          href: "/settings/email-config",
          permissions: [Permission.VIEW_SETTINGS],
        },
        {
          title: "Background Services",
          href: "/settings/background-services",
          permissions: [Permission.VIEW_SETTINGS],
        },
        {
          title: "AI Configuration",
          href: "/settings/ai-configuration",
          permissions: [Permission.MANAGE_AI_CONFIG],
        },
        {
          title: "Location Configuration",
          href: "/settings/location-config",
          permissions: [Permission.MANAGE_LOCATION_CONFIG],
        },
        {
          title: "RBAC Settings",
          href: "/settings/rbac",
          permissions: [Permission.VIEW_RBAC_SETTINGS],
        },
      ],
    },
  ];

  // Learning Management System section items
  const lmsItems = [
    {
      title: "Question Papers",
      href: "/question-papers",
      icon: BookOpen,
      permissions: [Permission.VIEW_QUESTION_PAPERS, Permission.MANAGE_QUESTION_PAPERS],
      children: [
        {
          title: "Dashboard",
          href: "/question-papers",
          permissions: [Permission.VIEW_QUESTION_PAPERS],
        },
        {
          title: "Create Blueprint",
          href: "/question-papers/blueprints/create",
          permissions: [Permission.CREATE_QUESTION_PAPER],
        },
        {
          title: "Create Question Paper",
          href: "/question-papers/create",
          permissions: [Permission.CREATE_QUESTION_PAPER],
        },
        {
          title: "All Question Papers",
          href: "/question-papers/list",
          permissions: [Permission.VIEW_QUESTION_PAPERS],
        },
        {
          title: "Manage Question Papers",
          href: "/question-papers/manage",
          permissions: [Permission.MANAGE_QUESTION_PAPERS],
        },
      ],
    },
    {
      title: "Examination",
      href: "/examination",
      icon: ClipboardCheck,
      permissions: [Permission.VIEW_EXAMINATIONS],
      children: [
        {
          title: "Configuration",
          href: "/examination/config",
          permissions: [Permission.MANAGE_EXAM_CONFIGURATIONS],
          children: [
            {
              title: "Assessment Schemas",
              href: "/examination/assessment-schemas",
              permissions: [Permission.MANAGE_ASSESSMENTS],
            },
            {
              title: "Grade Configuration",
              href: "/examination/grade-scales",
              permissions: [Permission.MANAGE_GRADE_SCALES],
            },
            {
              title: "Term Configuration",
              href: "/examination/config/terms",
              permissions: [Permission.MANAGE_ACADEMIC_SESSIONS],
            },
          ],
        },
        {
          title: "Score Entry",
          href: "/examination/score-entry",
          permissions: [Permission.ENTER_MARKS],
        },
        {
          title: "Report Cards",
          href: "/examination/report-cards",
          permissions: [Permission.VIEW_EXAMINATIONS],
        },
        {
          title: "Results & Analytics",
          href: "/examination/results-dashboard",
          permissions: [Permission.VIEW_EXAMINATIONS],
        },
        {
          title: "Results Analysis",
          href: "/examination/analysis",
          permissions: [Permission.VIEW_EXAMINATIONS],
        },
      ],
    },
  ];

  // Reports section items
  const reportsItems = [
    {
      title: "Automation Logs",
      href: "/reports/automation-logs",
      icon: Activity,
      permissions: [Permission.VIEW_COMMUNICATION_LOGS],
    },
    {
      title: "Courtesy Calls",
      href: "/courtesy-calls",
      icon: MessageSquare,
      permissions: [
        Permission.VIEW_COURTESY_CALLS,
        Permission.VIEW_OWN_COURTESY_CALL_FEEDBACK,
        Permission.VIEW_ALL_COURTESY_CALL_FEEDBACK,
        Permission.VIEW_COURTESY_CALLS_DASHBOARD,
      ],
      children: [
        {
          title: "Teacher View",
          href: "/courtesy-calls/teacher",
          permissions: [Permission.VIEW_OWN_COURTESY_CALL_FEEDBACK],
        },
        {
          title: "Head View",
          href: "/courtesy-calls/head",
          permissions: [Permission.VIEW_ALL_COURTESY_CALL_FEEDBACK],
        },
      ],
    },
    {
      title: "Action Items",
      href: "/action-items",
      icon: ListTodo,
      permissions: [
        Permission.VIEW_ACTION_ITEMS,
        Permission.VIEW_OWN_ACTION_ITEMS,
        Permission.VIEW_ALL_ACTION_ITEMS,
      ],
    },
    {
      title: "Attendance Reports",
      href: "/attendance/reports",
      icon: BarChart3,
      permissions: [Permission.VIEW_ATTENDANCE_REPORTS],
    },
    {
      title: "Examination Reports",
      href: "/examination/reports",
      icon: FileText,
      permissions: [Permission.VIEW_EXAM_REPORTS],
    },
    {
      title: "Finance Reports",
      href: "/finance/reports",
      icon: CreditCard,
      permissions: [Permission.VIEW_FINANCE_REPORTS],
    },
    {
      title: "System Reports",
      href: "/reports",
      icon: FileText,
      permissions: [Permission.VIEW_REPORTS],
    },
  ];

  // Revise the filteredNavItems logic to be completely generic for any module
  const filterMenuItems = (items: NavItem[]) => {
    return effectiveIsSuperAdmin
      ? items  // Superadmin or force mode sees everything
      : items.filter(item => {
          // Check if user has any of the item's permissions
          const hasItemPermission = canAccess(item.permissions);
          
          if (hasItemPermission) {
            return true;
          }
          
          // If no match in permission check, check if any child items are accessible
          const hasPermissionViaChildren = item.children?.some(child => canAccess(child.permissions));
          
          const shouldShow = hasPermissionViaChildren;
          
          return shouldShow;
        }).map(item => {
          // If the item has children, filter those too
          if (item.children) {
            return {
              ...item,
              children: item.children.filter(child => {
                const hasChildPermission = canAccess(child.permissions);
                
                return hasChildPermission;
              }).map(child => {
                // If the child has grandchildren, filter those too
                if (child.children) {
                  return {
                    ...child,
                    children: child.children.filter((grandchild: any) => {
                      const hasGrandchildPermission = canAccess(grandchild.permissions);
                      
                      return hasGrandchildPermission;
                    })
                  };
                }
                return child;
              })
            };
          }
          return item;
        });
  };

  // Filter items for each section
  const filteredErpItems = isHardcodedSuperAdmin ? erpItems : filterMenuItems(erpItems);
  const filteredLmsItems = isHardcodedSuperAdmin ? lmsItems : filterMenuItems(lmsItems);
  const filteredReportsItems = isHardcodedSuperAdmin ? reportsItems : filterMenuItems(reportsItems);

  // Check if main dashboard should be shown
  const showMainDashboard = effectiveIsSuperAdmin || canAccess([Permission.VIEW_DASHBOARD]);

  console.log('🔍 Filtered nav items:', {
    isHardcodedSuperAdmin,
    erpCount: filteredErpItems.length,
    lmsCount: filteredLmsItems.length,
    reportsCount: filteredReportsItems.length,
    showMainDashboard,
  });

  // Add a check to determine if a submenu item is enabled based on permissions
  const isMenuItemEnabled = (permissions: Permission[]): boolean => {
    if (effectiveIsSuperAdmin) return true;
    
    // Check if the permissions array contains any create/edit permissions
    // If it has only VIEW permissions, we'll show the item but disable interactions
    return canAccess(permissions);
  };

  // Function to check if a route is active
  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  const handleSignOut = async () => {
    try {
      // Sign out with redirect to login page
      await logout();
    } catch (error) {
      console.error("Error signing out:", error);
      // Fallback: redirect to login page even if there's an error
      window.location.href = "/sign-in";
    }
  };

  const renderMenuItems = (items: NavItem[]) => {
    return items.map((item) => (
      <div key={item.title} className="relative">
        <SidebarMenuItem>
          <Link href={item.href} className="flex-1" target={item.target}>
            <SidebarMenuButton 
              className={`${!isCollapsed && item.children && item.children.length > 0 ? 'pr-10' : ''}`}
              isActive={isActive(item.href)}
            >
              {item.icon && <item.icon className="h-4 w-4" />}
              <span>{item.title}</span>
            </SidebarMenuButton>
          </Link>
          
          {!isCollapsed && item.children && item.children.length > 0 && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10">
              <button
                onClick={(e) => toggleExpand(item.title, e)}
                className={`
                  h-7 w-7 flex items-center justify-center rounded-md 
                  hover:bg-sidebar-accent text-sidebar-foreground
                  transition-all duration-200
                  ${expandedItems[item.title] ? "bg-sidebar-accent" : ""}
                `}
                aria-label={`Toggle ${item.title} submenu`}
              >
                <ChevronRight 
                  className={`h-4 w-4 transition-transform duration-200 ${
                    expandedItems[item.title] ? 'rotate-90' : ''
                  }`}
                />
              </button>
            </div>
          )}
        </SidebarMenuItem>
        
        {!isCollapsed && item.children && item.children.length > 0 && (
          <div className={`overflow-hidden transition-all duration-200 ${
            expandedItems[item.title] ? 'max-h-[500px]' : 'max-h-0'
          }`}>
            <SidebarMenuSub>
              {item.children.map((child) => {
                // Check if this item should be disabled (greyed out)
                const isEnabled = isMenuItemEnabled(child.permissions);
                // Special handling for attendance items
                const isAttendanceItem = item.title === "Attendance";
                // If it's attendance and user only has VIEW_ATTENDANCE, 
                // only the dashboard should be enabled
                const isAttendanceDashboard = isAttendanceItem && child.title === "Dashboard";
                const showDisabled = 
                  (isAttendanceItem && !isAttendanceDashboard && 
                  !canAccess([Permission.MARK_ATTENDANCE]) && 
                  !canAccess([Permission.MARK_SELF_ATTENDANCE]) &&
                  !canAccess([Permission.MARK_ALL_STAFF_ATTENDANCE])) ||
                  (!isEnabled);

                const hasGrandchildren = child.children && child.children.length > 0;

                return (
                  <div key={child.href}>
                    <SidebarMenuSubItem>
                      <div className="relative flex-1">
                        <SidebarMenuSubButton
                          asChild
                          isActive={isActive(child.href)}
                          className={`${hasGrandchildren ? 'pr-8' : ''} ${showDisabled ? 'pointer-events-none opacity-50' : ''}`}
                        >
                          <Link 
                            href={showDisabled ? "#" : child.href}
                            onClick={e => showDisabled && e.preventDefault()}
                            target={child.target}
                          >
                            <span>{child.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                        
                        {hasGrandchildren && (
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10">
                            <button
                              onClick={(e) => toggleExpand(`${item.title}-${child.title}`, e)}
                              className={`
                                h-6 w-6 flex items-center justify-center rounded-md 
                                hover:bg-sidebar-accent text-sidebar-foreground
                                transition-all duration-200
                                ${expandedItems[`${item.title}-${child.title}`] ? "bg-sidebar-accent" : ""}
                              `}
                              aria-label={`Toggle ${child.title} submenu`}
                            >
                              <ChevronRight 
                                className={`h-3 w-3 transition-transform duration-200 ${
                                  expandedItems[`${item.title}-${child.title}`] ? 'rotate-90' : ''
                                }`}
                              />
                            </button>
                          </div>
                        )}
                      </div>
                    </SidebarMenuSubItem>
                    
                    {hasGrandchildren && (
                      <div className={`overflow-hidden transition-all duration-200 ml-4 ${
                        expandedItems[`${item.title}-${child.title}`] ? 'max-h-96' : 'max-h-0'
                      }`}>
                        <SidebarMenuSub>
                          {child.children?.map((grandchild: any) => {
                            const grandchildEnabled = isMenuItemEnabled(grandchild.permissions);
                            
                            return (
                              <SidebarMenuSubItem key={grandchild.href}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isActive(grandchild.href)}
                                  className={`pl-4 ${!grandchildEnabled ? 'pointer-events-none opacity-50' : ''}`}
                                >
                                  <Link 
                                    href={!grandchildEnabled ? "#" : grandchild.href}
                                    onClick={e => !grandchildEnabled && e.preventDefault()}
                                    target={grandchild.target}
                                  >
                                    <span>{grandchild.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </div>
                    )}
                  </div>
                );
              })}
            </SidebarMenuSub>
          </div>
        )}
      </div>
    ));
  };

  return (
    <Sidebar
      className="border-r dark:border-sidebar-border shadow-sm max-h-screen overflow-hidden dark:shadow-none pr-0"
      collapsible="icon"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground dark:hover:bg-sidebar-accent/30"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden">
                    {isLoadingBranches ? (
                      <Skeleton className="h-4 w-4 rounded-full dark:bg-gray-600" />
                    ) : selectedBranch?.logoUrl ? (
                      <img 
                        src={selectedBranch.logoUrl} 
                        alt={`${selectedBranch.name} logo`}
                        className="w-full h-full object-contain rounded-lg"
                        onError={(e) => {
                          // Fallback to School icon if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.setAttribute('style', 'display: flex');
                        }}
                      />
                    ) : (
                      <div className="bg-sidebar-primary text-sidebar-primary-foreground dark:bg-primary/20 flex aspect-square size-8 items-center justify-center rounded-lg">
                        <School className="size-4 dark:text-primary" />
                      </div>
                    )}
                    {selectedBranch?.logoUrl && (
                      <div className="bg-sidebar-primary text-sidebar-primary-foreground dark:bg-primary/20 flex aspect-square size-8 items-center justify-center rounded-lg" style={{ display: 'none' }}>
                        <School className="size-4 dark:text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium dark:text-foreground">ScholaRise</span>
                    {isLoadingBranches ? (
                      <Skeleton className="h-3 w-16 dark:bg-gray-600" />
                    ) : (
                      <span className="truncate text-xs dark:text-muted-foreground">{selectedBranch?.name || "Select Branch"}</span>
                    )}
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 dark:text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                align="start"
                side={isMobile ? "bottom" : "right"}
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-gray-500 text-xs">
                  Select Branch
                </DropdownMenuLabel>
                {isLoadingBranches ? (
                  <div className="p-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full mt-1" />
                  </div>
                ) : branches.length === 0 ? (
                  <div className="p-4 text-sm text-center text-muted-foreground">
                    <AlertCircle className="h-4 w-4 mx-auto mb-2" />
                    No branches found
                  </div>
                ) : (
                  // Ensure branches is an array before using map
                  (Array.isArray(branches) ? branches : [])
                    .map((branch: Branch) => (
                      <DropdownMenuItem
                        key={branch.id}
                        onClick={() => setCurrentBranchId(branch.id)}
                        className={`gap-2 p-2 ${branch.id === 'headquarters' ? 'bg-red-50 hover:bg-red-100' : ''}`}
                      >
                        <div className={`flex size-6 items-center justify-center rounded-md overflow-hidden ${branch.logoUrl ? '' : 'border border-gray-200'} ${branch.id === 'headquarters' && !branch.logoUrl ? 'border-red-200 bg-red-100' : ''}`}>
                          {branch.logoUrl ? (
                            <img 
                              src={branch.logoUrl} 
                              alt={`${branch.name} logo`}
                              className="w-full h-full object-contain rounded-md"
                              onError={(e) => {
                                // Fallback to School icon if image fails to load
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.setAttribute('style', 'display: flex');
                              }}
                            />
                          ) : (
                            <School className={`size-3.5 shrink-0 ${branch.id === 'headquarters' ? 'text-red-800' : ''}`} />
                          )}
                          {branch.logoUrl && (
                            <div className={`flex size-6 items-center justify-center border border-gray-200 rounded-md ${branch.id === 'headquarters' ? 'border-red-200 bg-red-100' : ''}`} style={{ display: 'none' }}>
                              <School className={`size-3.5 shrink-0 ${branch.id === 'headquarters' ? 'text-red-800' : ''}`} />
                            </div>
                          )}
                        </div>
                        <span className={`font-medium ${branch.id === 'headquarters' ? 'text-red-800' : ''}`}>{branch.code}</span>
                        <span className={`flex-1 ${branch.id === 'headquarters' ? 'text-red-800' : 'text-gray-500'}`}>{branch.name}</span>
                        {currentBranchId === branch.id && (
                          <DropdownMenuShortcut>✓</DropdownMenuShortcut>
                        )}
                      </DropdownMenuItem>
                    ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Main Dashboard */}
        {showMainDashboard && (
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href={
                  isTeacher ? "/staff/teachers/dashboard" : 
                  isEmployee ? "/staff/employees/dashboard" : 
                  isERPManager ? "/erp-manager/dashboard" : 
                  "/dashboard"
                } className="flex-1">
                  <SidebarMenuButton isActive={isActive(
                    isTeacher ? "/staff/teachers/dashboard" : 
                    isEmployee ? "/staff/employees/dashboard" : 
                    isERPManager ? "/erp-manager/dashboard" : 
                    "/dashboard"
                  )}>
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* ERP Section */}
        {filteredErpItems.length > 0 && (
          <Collapsible
            open={expandedSections.ERP}
            onOpenChange={() => toggleSection('ERP')}
            className="group/collapsible"
          >
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between p-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md">
                  <span className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    ERP
                  </span>
                  <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${expandedSections.ERP ? 'rotate-90' : ''}`} />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {renderMenuItems(filteredErpItems)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* LMS Section */}
        {filteredLmsItems.length > 0 && (
          <Collapsible
            open={expandedSections.LMS}
            onOpenChange={() => toggleSection('LMS')}
            className="group/collapsible"
          >
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between p-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md">
                  <span className="flex items-center gap-2">
                    <MonitorSpeaker className="h-4 w-4" />
                    LMS
                  </span>
                  <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${expandedSections.LMS ? 'rotate-90' : ''}`} />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {renderMenuItems(filteredLmsItems)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Reports Section */}
        {filteredReportsItems.length > 0 && (
          <Collapsible
            open={expandedSections.Reports}
            onOpenChange={() => toggleSection('Reports')}
            className="group/collapsible"
          >
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between p-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Reports
                  </span>
                  <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${expandedSections.Reports ? 'rotate-90' : ''}`} />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {renderMenuItems(filteredReportsItems)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  {user ? (
                    <>
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                          {(user.name 
                            ? user.name.split(' ').map((n: string) => n[0]?.[0] || '').join('').toUpperCase() 
                            : 'U').slice(0,2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{user.name || "User"}</span>
                        <span className="truncate text-xs text-muted-foreground">{user.email || ""}</span>
                      </div>
                      <ChevronsUpDown className="ml-auto size-4" />
                    </>
                  ) : (
                    <>
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <div className="grid flex-1 gap-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <ChevronsUpDown className="ml-auto size-4 opacity-30" />
                    </>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={user?.image || undefined} alt={user?.name || "User"} />
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                        {(user?.name 
                          ? user.name.split(' ').map((n: string) => n[0]?.[0] || '').join('').toUpperCase() 
                          : 'U').slice(0,2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user?.name || "User"}</span>
                      <span className="truncate text-xs">{user?.email || ""}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <Link href="/profile" passHref>
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      Profile Settings
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem>
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                    <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <Settings2 className="mr-2 h-4 w-4" />
                    Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <BadgeCheck className="mr-2 h-4 w-4" />
                    Staff Permissions
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                  <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
