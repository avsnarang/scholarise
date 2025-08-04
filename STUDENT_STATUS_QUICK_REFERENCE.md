# Quick Reference: Student Status Migration

## 🎯 New Status Logic

### When to use which filter:

| Use Case | OLD | NEW | Status Filter |
|----------|-----|-----|---------------|
| Show only active students | `isActive: true` | `status: "ACTIVE"` | ACTIVE only |
| Students who can attend class | `isActive: true` | `status: { in: ["ACTIVE", "REPEAT", "SUSPENDED"] }` | Enrolled |
| Fee collection eligibility | `isActive: true` | Use enrolled filter | Enrolled students |
| Send communications | `isActive: true` | Use enrolled filter | Enrolled students |
| Attendance tracking | `isActive: true` | Use enrolled filter | Enrolled students |
| Show inactive students | `isActive: false` | `status: { not: "ACTIVE" }` | Non-active |

## 🛠️ Quick Replacements

### Dashboard Queries
```typescript
// OLD
const activeStudents = await prisma.student.count({ where: { isActive: true } });

// NEW  
const activeStudents = await prisma.student.count({ where: { status: "ACTIVE" } });
```

### Communication Targeting
```typescript
// OLD
where: { isActive: true }

// NEW - For messages/communications
where: { status: { in: ["ACTIVE", "REPEAT", "SUSPENDED"] } }
```

### Fee Collection
```typescript
// OLD
where: { isActive: true }

// NEW - For fee-related operations
where: { status: { in: ["ACTIVE", "REPEAT", "SUSPENDED"] } }
```

## 📋 Status Reference

| Status | Description | Can Attend | Legacy isActive |
|--------|-------------|------------|-----------------|
| ACTIVE | Currently enrolled | ✅ | true |
| REPEAT | Repeating year | ✅ | false |
| SUSPENDED | Temp. suspended | ✅ | false |
| INACTIVE | Temp. not attending | ❌ | false |
| EXPELLED | Permanently removed | ❌ | false |
| WITHDRAWN | Voluntarily left | ❌ | false |
| TRANSFERRED | Moved schools | ❌ | false |
| GRADUATED | Completed | ❌ | false |

## 🚀 Import Statements

```typescript
import { 
  STUDENT_STATUS, 
  isActiveStatus, 
  isEnrolledStatus, 
  COMMON_STUDENT_FILTERS 
} from '@/utils/student-status';
```