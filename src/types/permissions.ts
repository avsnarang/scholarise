// Define all possible permissions in the system
export enum Permission {
  // Dashboard
  VIEW_DASHBOARD = "view_dashboard",
  
  // Student Management permissions
  VIEW_STUDENTS = "view_students",
  CREATE_STUDENT = "create_student",
  EDIT_STUDENT = "edit_student",
  DELETE_STUDENT = "delete_student",
  IMPORT_STUDENTS = "import_students",
  EXPORT_STUDENTS = "export_students",
  MANAGE_TRANSFER_CERTIFICATES = "manage_transfer_certificates",
  MANAGE_ROLL_NUMBERS = "manage_roll_numbers",
  VIEW_OWN_STUDENTS = "view_own_students",

  // Admissions permissions
  MANAGE_ADMISSIONS = "manage_admissions",
  VIEW_ADMISSION_INQUIRIES = "view_admission_inquiries",
  CREATE_ADMISSION_INQUIRY = "create_admission_inquiry",
  EDIT_ADMISSION_INQUIRY = "edit_admission_inquiry",
  MANAGE_ADMISSION_WORKFLOW = "manage_admission_workflow",
  ACCESS_ADMISSION_REPORTS = "access_admission_reports",
  MANAGE_ADMISSION_SETTINGS = "manage_admission_settings",
  
  // Money Collection permissions
  VIEW_MONEY_COLLECTION = "view_money_collection",
  CREATE_MONEY_COLLECTION = "create_money_collection",
  EDIT_MONEY_COLLECTION = "edit_money_collection",
  DELETE_MONEY_COLLECTION = "delete_money_collection",
  
  // Teacher permissions
  VIEW_TEACHERS = "view_teachers",
  CREATE_TEACHER = "create_teacher",
  EDIT_TEACHER = "edit_teacher",
  DELETE_TEACHER = "delete_teacher",
  
  // Employee permissions
  VIEW_EMPLOYEES = "view_employees",
  CREATE_EMPLOYEE = "create_employee",
  EDIT_EMPLOYEE = "edit_employee",
  DELETE_EMPLOYEE = "delete_employee",
  
  // Department permissions
  VIEW_DEPARTMENTS = "view_departments",
  CREATE_DEPARTMENT = "create_department",
  EDIT_DEPARTMENT = "edit_department",
  DELETE_DEPARTMENT = "delete_department",
  
  // Designation permissions
  VIEW_DESIGNATIONS = "view_designations",
  CREATE_DESIGNATION = "create_designation",
  EDIT_DESIGNATION = "edit_designation",
  DELETE_DESIGNATION = "delete_designation",
  
  // Classes permissions
  VIEW_CLASSES = "view_classes",
  CREATE_CLASS = "create_class",
  EDIT_CLASS = "edit_class",
  DELETE_CLASS = "delete_class",
  MANAGE_CLASS_STUDENTS = "manage_class_students",
  
  // Attendance permissions
  VIEW_ATTENDANCE = "view_attendance",
  MARK_ATTENDANCE = "mark_attendance",
  MARK_ATTENDANCE_ANY_DATE = "mark_attendance_any_date",
  OVERRIDE_MARKED_ATTENDANCE = "override_marked_attendance",
  MARK_SELF_ATTENDANCE = "mark_self_attendance",
  MARK_ALL_STAFF_ATTENDANCE = "mark_all_staff_attendance",
  VIEW_ATTENDANCE_REPORTS = "view_attendance_reports",
  
  // Leave management permissions
  VIEW_LEAVES = "view_leaves",
  MANAGE_LEAVE_APPLICATIONS = "manage_leave_applications",
  MANAGE_LEAVE_POLICIES = "manage_leave_policies",
  
  // Salary management permissions
  VIEW_SALARY = "view_salary",
  MANAGE_SALARY_STRUCTURES = "manage_salary_structures",
  MANAGE_TEACHER_SALARIES = "manage_teacher_salaries",
  MANAGE_EMPLOYEE_SALARIES = "manage_employee_salaries",
  MANAGE_SALARY_INCREMENTS = "manage_salary_increments",
  PROCESS_SALARY_PAYMENTS = "process_salary_payments",
  
  // Transport permissions
  VIEW_TRANSPORT = "view_transport",
  MANAGE_TRANSPORT_ROUTES = "manage_transport_routes",
  MANAGE_TRANSPORT_STOPS = "manage_transport_stops",
  MANAGE_TRANSPORT_ASSIGNMENTS = "manage_transport_assignments",
  CREATE_TRANSPORT_ROUTE = "create_transport_route",
  EDIT_TRANSPORT_ROUTE = "edit_transport_route",
  DELETE_TRANSPORT_ROUTE = "delete_transport_route",
  VIEW_TRANSPORT_ROUTES = "view_transport_routes",
  CREATE_TRANSPORT_STOP = "create_transport_stop",
  EDIT_TRANSPORT_STOP = "edit_transport_stop",
  DELETE_TRANSPORT_STOP = "delete_transport_stop",
  VIEW_TRANSPORT_STOPS = "view_transport_stops",
  MANAGE_TRANSPORT_VEHICLES = "manage_transport_vehicles",
  CREATE_TRANSPORT_VEHICLE = "create_transport_vehicle",
  EDIT_TRANSPORT_VEHICLE = "edit_transport_vehicle",
  DELETE_TRANSPORT_VEHICLE = "delete_transport_vehicle",
  VIEW_TRANSPORT_VEHICLES = "view_transport_vehicles",
  MANAGE_TRANSPORT_DRIVERS = "manage_transport_drivers",
  CREATE_TRANSPORT_DRIVER = "create_transport_driver",
  EDIT_TRANSPORT_DRIVER = "edit_transport_driver",
  DELETE_TRANSPORT_DRIVER = "delete_transport_driver",
  VIEW_TRANSPORT_DRIVERS = "view_transport_drivers",
  MANAGE_TRANSPORT_FEES = "manage_transport_fees",
  VIEW_TRANSPORT_FEES = "view_transport_fees",
  COLLECT_TRANSPORT_FEES = "collect_transport_fees",
  MANAGE_TRANSPORT_SCHEDULES = "manage_transport_schedules",
  VIEW_TRANSPORT_SCHEDULES = "view_transport_schedules",
  TRACK_TRANSPORT_VEHICLES = "track_transport_vehicles",
  VIEW_TRANSPORT_TRACKING = "view_transport_tracking",
  MANAGE_TRANSPORT_MAINTENANCE = "manage_transport_maintenance",
  VIEW_TRANSPORT_MAINTENANCE = "view_transport_maintenance",
  GENERATE_TRANSPORT_REPORTS = "generate_transport_reports",
  VIEW_TRANSPORT_REPORTS = "view_transport_reports",
  MANAGE_TRANSPORT_ATTENDANCE = "manage_transport_attendance",
  VIEW_TRANSPORT_ATTENDANCE = "view_transport_attendance",
  SEND_TRANSPORT_ALERTS = "send_transport_alerts",
  MANAGE_TRANSPORT_SETTINGS = "manage_transport_settings",
  
  // Fees permissions
  VIEW_FEES = "view_fees",
  MANAGE_FEES = "manage_fees",
  
  // Finance Module Permissions
  VIEW_FINANCE_MODULE = "view_finance_module",
  MANAGE_FEE_HEADS = "manage_fee_heads",
  MANAGE_FEE_TERMS = "manage_fee_terms",
  MANAGE_CLASSWISE_FEES = "manage_classwise_fees",
  COLLECT_FEES = "collect_fees",
  DELETE_PAYMENT = "delete_payment",
  VIEW_FINANCE_REPORTS = "view_finance_reports",
  
  // System permissions
  MANAGE_ROLES = "manage_roles",
  MANAGE_BRANCHES = "manage_branches",
  MANAGE_ACADEMIC_SESSIONS = "manage_academic_sessions",
  MANAGE_SUBJECTS = "manage_subjects",
  MANAGE_ATTENDANCE_CONFIG = "manage_attendance_config",
  
  // Subject-specific permissions
  VIEW_SUBJECTS = "view_subjects",
  MANAGE_SUBJECT_ASSIGNMENTS = "manage_subject_assignments",
  MANAGE_CLASS_SUBJECTS = "manage_class_subjects",
  MANAGE_STUDENT_SUBJECTS = "manage_student_subjects",
  
  // Question Paper permissions
  VIEW_QUESTION_PAPERS = "view_question_papers",
  CREATE_QUESTION_PAPER = "create_question_paper",
  MANAGE_QUESTION_PAPERS = "manage_question_papers",
  
  // Examination permissions
  VIEW_EXAMINATIONS = "view_examinations",
  MANAGE_EXAM_TYPES = "manage_exam_types",
  MANAGE_EXAM_CONFIGURATIONS = "manage_exam_configurations",
  MANAGE_EXAM_SCHEDULES = "manage_exam_schedules",
  MANAGE_SEATING_PLANS = "manage_seating_plans",
  ENTER_MARKS = "enter_marks",
  MANAGE_ASSESSMENTS = "manage_assessments",
  MANAGE_GRADE_SCALES = "manage_grade_scales",
  VIEW_EXAM_REPORTS = "view_exam_reports",
  
  // Courtesy Calls Feedback permissions
  VIEW_COURTESY_CALLS = "view_courtesy_calls",
  VIEW_COURTESY_CALLS_DASHBOARD = "view_courtesy_calls_dashboard",
  CREATE_COURTESY_CALL_FEEDBACK = "create_courtesy_call_feedback",
  VIEW_OWN_COURTESY_CALL_FEEDBACK = "view_own_courtesy_call_feedback",
  VIEW_ALL_COURTESY_CALL_FEEDBACK = "view_all_courtesy_call_feedback",
  EDIT_COURTESY_CALL_FEEDBACK = "edit_courtesy_call_feedback",
  DELETE_COURTESY_CALL_FEEDBACK = "delete_courtesy_call_feedback",
  
  // Action Items permissions
  VIEW_ACTION_ITEMS = "view_action_items",
  VIEW_OWN_ACTION_ITEMS = "view_own_action_items",
  VIEW_ALL_ACTION_ITEMS = "view_all_action_items",
  CREATE_ACTION_ITEM = "create_action_item",
  EDIT_ACTION_ITEM = "edit_action_item",
  DELETE_ACTION_ITEM = "delete_action_item",
  ASSIGN_ACTION_ITEM = "assign_action_item",
  COMPLETE_ACTION_ITEM = "complete_action_item",
  VERIFY_ACTION_ITEM = "verify_action_item",
  REJECT_ACTION_ITEM = "reject_action_item",
  
  // Communication permissions
  VIEW_COMMUNICATION = "view_communication",
  CREATE_COMMUNICATION_MESSAGE = "create_communication_message",
  SEND_COMMUNICATION_MESSAGE = "send_communication_message",
  MANAGE_WHATSAPP_TEMPLATES = "manage_whatsapp_templates",
  VIEW_COMMUNICATION_LOGS = "view_communication_logs",
  MANAGE_COMMUNICATION_SETTINGS = "manage_communication_settings",
  SEND_TO_ALL_STUDENTS = "send_to_all_students",
  SEND_TO_ALL_TEACHERS = "send_to_all_teachers",
  SEND_TO_ALL_EMPLOYEES = "send_to_all_employees",
  SEND_TO_PARENTS = "send_to_parents",
  
  // Chat permissions
  VIEW_CHAT = "view_chat",
  MANAGE_CHAT_SETTINGS = "manage_chat_settings",
  
  // Reports permissions
  VIEW_REPORTS = "view_reports",
  
  // Settings permissions
  VIEW_SETTINGS = "view_settings",
  MANAGE_LOCATION_CONFIG = "manage_location_config",
  MANAGE_EMAIL_CONFIG = "manage_email_config",
  MANAGE_AI_CONFIG = "manage_ai_config",
  MANAGE_BACKGROUND_SERVICES = "manage_background_services",
  
  // RBAC Management permissions
  MANAGE_PERMISSIONS = "manage_permissions",
  ASSIGN_USER_ROLES = "assign_user_roles",
  VIEW_RBAC_SETTINGS = "view_rbac_settings",
  
  // Location-based attendance permissions
  MANAGE_ATTENDANCE_LOCATIONS = "manage_attendance_locations",
  VIEW_ATTENDANCE_LOCATIONS = "view_attendance_locations",
  
  // Finance Module Extensions
  MANAGE_CONCESSION_TYPES = "manage_concession_types",
  MANAGE_STUDENT_CONCESSIONS = "manage_student_concessions",
  MANAGE_FEE_REMINDERS = "manage_fee_reminders",
  VIEW_COLLECTION_REPORTS = "view_collection_reports",
  
  // Enhanced Examination permissions
  VIEW_REPORT_CARDS = "view_report_cards",
  GENERATE_REPORT_CARDS = "generate_report_cards",
  MANAGE_EXAM_TERMS = "manage_exam_terms",
  EXPORT_EXAM_DATA = "export_exam_data",
  
  // Additional Admin permissions
  MANAGE_SYSTEM_SETTINGS = "manage_system_settings",
  VIEW_SYSTEM_LOGS = "view_system_logs",
  MANAGE_DATA_EXPORT = "manage_data_export",
}

// Define user roles
export enum Role {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  PRINCIPAL = "principal",
  TEACHER = "teacher",
  ACCOUNTANT = "accountant",
  RECEPTIONIST = "receptionist",
  TRANSPORT_MANAGER = "transport_manager",
  STAFF = "staff",
}

// Interface for resources that have permissions
export interface HasPermissions {
  requiredPermissions: Permission[];
}

export type PermissionMap = Record<Role, Permission[]>; 