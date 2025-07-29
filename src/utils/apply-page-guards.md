# Complete Page Guard Implementation Guide

## Pattern for Adding Page Guards

### Method 1: Client Component with Guard Wrapper
```tsx
"use client";

import { YourPageComponent } from "@/components/your-component";
import { PageGuard } from "@/components/auth/page-guard";

function YourPageContent() {
  // Your existing page content
  return (
    <div>
      {/* existing content */}
    </div>
  );
}

export default function YourPage() {
  return (
    <PageGuard
      permissions={["required_permission"]}
      title="Custom Access Required"
      message="You need specific permissions to access this page."
    >
      <YourPageContent />
    </PageGuard>
  );
}
```

### Method 2: Using Pre-built Guards
```tsx
import { SubjectsPageGuard } from "@/components/auth/page-guard";

export default function SubjectsPage() {
  return (
    <SubjectsPageGuard>
      <YourPageContent />
    </SubjectsPageGuard>
  );
}
```

## Remaining Pages to Protect

### Communication Module
- [ ] `/communication/templates` - PageGuard with ["manage_whatsapp_templates"]
- [ ] `/communication/settings` - PageGuard with ["manage_communication_settings"]
- [ ] `/communication/history` - PageGuard with ["view_communication_logs"]
- [ ] `/communication/chat` - PageGuard with ["view_communication_logs"]

### Subjects Module  
- [ ] `/subjects` - SubjectsPageGuard
- [ ] `/subjects/teacher-assignments` - PageGuard with ["manage_subject_assignments"]
- [ ] `/subjects/class-mapping` - PageGuard with ["manage_class_subjects"]
- [ ] `/subjects/student-mapping` - PageGuard with ["manage_student_subjects"]
- [ ] `/subjects/class-overview` - SubjectsPageGuard

### Staff Module
- [ ] `/staff` - PageGuard with ["view_employees"]
- [ ] `/staff/teachers` - PageGuard with ["view_teachers"]
- [ ] `/staff/employees` - PageGuard with ["view_employees"]

### Finance Module
- [ ] `/finance` - PageGuard with ["view_finance_module"]
- [ ] `/finance/fee-collection` - PageGuard with ["collect_fees"]
- [ ] `/finance/reports` - PageGuard with ["view_finance_reports"]

### Settings Module
- [ ] `/settings` - PageGuard with ["view_settings"]
- [ ] `/settings/users` - AdminOnlyPageGuard
- [ ] `/settings/roles` - AdminOnlyPageGuard
- [ ] `/settings/branches` - PageGuard with ["manage_branches"]

### Examination Module
- [ ] `/examination` - PageGuard with ["view_examinations"]
- [ ] `/examination/score-entry` - PageGuard with ["enter_marks"]
- [ ] `/examination/reports` - PageGuard with ["view_exam_reports"]

### Attendance Module
- [ ] `/attendance` - PageGuard with ["view_attendance"]
- [ ] `/attendance/mark` - PageGuard with ["mark_attendance"]
- [ ] `/attendance/reports` - PageGuard with ["view_attendance_reports"]

### Money Collection Module
- [ ] `/money-collection` - PageGuard with ["view_money_collection"]
- [ ] `/money-collection/new` - PageGuard with ["create_money_collection"]

### Other Important Pages
- [ ] `/dashboard` - No guard needed (everyone should access)
- [ ] `/profile` - No guard needed 
- [ ] `/classes` - PageGuard with ["view_classes"]
- [ ] `/question-papers` - PageGuard with ["view_question_papers"]

## Quick Implementation Script

For each remaining page:

1. **Add import**: `import { PageGuard } from "@/components/auth/page-guard";`
2. **Convert to client component**: Add `"use client";` if needed
3. **Rename function**: Change `export default function` to `function PageContent`
4. **Add wrapper**: Create new default export with PageGuard
5. **Test access**: Verify unauthorized users see "no access" page

## Example Implementations

### Communication Templates Page
```tsx
"use client";
import { PageGuard } from "@/components/auth/page-guard";

function TemplatesPageContent() {
  // existing content
}

export default function TemplatesPage() {
  return (
    <PageGuard
      permissions={["manage_whatsapp_templates"]}
      title="Templates Management Access Required"
      message="You need WhatsApp template management permissions to access this page."
    >
      <TemplatesPageContent />
    </PageGuard>
  );
}
```

### Finance Module Page
```tsx
"use client";
import { PageGuard } from "@/components/auth/page-guard";

function FinancePageContent() {
  // existing content
}

export default function FinancePage() {
  return (
    <PageGuard
      permissions={["view_finance_module"]}
      title="Finance Module Access Required"
      message="You need finance permissions to access financial data and reports."
    >
      <FinancePageContent />
    </PageGuard>
  );
}
```

## Testing Instructions

1. **Remove permissions** from your user role
2. **Try accessing URLs directly**:
   - https://yoursite.com/students/create
   - https://yoursite.com/communication/send
   - https://yoursite.com/finance/reports
3. **Verify** you see the professional "no access" page
4. **Check** that super admins can access everything

## Permission Mapping Reference

| Route Pattern | Required Permission | Guard Type |
|---------------|-------------------|------------|
| `/students/*` | `view_students`, `create_student`, `edit_student` | StudentManagementPageGuard or specific |
| `/admissions/*` | `manage_admissions` | AdmissionsPageGuard |
| `/communication/*` | `view_communication`, `create_communication_message` | CommunicationPageGuard or specific |
| `/subjects/*` | `view_subjects`, `manage_subjects` | SubjectsPageGuard or specific |
| `/finance/*` | `view_finance_module`, specific finance perms | PageGuard with specific permissions |
| `/settings/*` | `view_settings`, `manage_*` | AdminOnlyPageGuard or specific |

This systematic approach ensures all pages are properly protected while maintaining a consistent user experience. 