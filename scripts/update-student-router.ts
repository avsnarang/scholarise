import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

/**
 * Script to update key student-related router files to use the new status system
 * This replaces hardcoded isActive: true filters with appropriate status filters
 */

const prisma = new PrismaClient();

interface UpdateInstruction {
  file: string;
  description: string;
  changes: Array<{
    search: string;
    replace: string;
    reason: string;
  }>;
}

const ROUTER_UPDATES: UpdateInstruction[] = [
  {
    file: 'src/server/api/routers/student.ts',
    description: 'Update student router to use status instead of isActive',
    changes: [
      {
        search: 'isActive: true,',
        replace: 'status: "ACTIVE",',
        reason: 'Replace hardcoded isActive: true with status: ACTIVE'
      },
      {
        search: 'if (field === "isActive") {\n                  return { [field]: value === "true" || value === true };\n                }',
        replace: 'if (field === "isActive") {\n                  // Legacy support: map isActive to status\n                  return value === "true" || value === true ? { status: "ACTIVE" } : { status: { not: "ACTIVE" } };\n                }',
        reason: 'Update isActive filter mapping to use status system'
      },
      {
        search: 'data: { isActive: input.isActive },',
        replace: 'data: { status: input.isActive ? "ACTIVE" : "INACTIVE" },',
        reason: 'Update bulk status update to use status field'
      }
    ]
  },
  {
    file: 'src/server/api/routers/dashboard.ts', 
    description: 'Update dashboard to use status for student counts',
    changes: [
      {
        search: 'ctx.db.student.count({ where: { isActive: true } })',
        replace: 'ctx.db.student.count({ where: { status: "ACTIVE" } })',
        reason: 'Use status for active student count'
      },
      {
        search: 'isActive: true',
        replace: 'status: "ACTIVE"',
        reason: 'Replace isActive with status in student queries'
      }
    ]
  }
];

async function updateRouterFiles() {
  console.log('🔄 Starting router file updates for status migration...\n');

  for (const instruction of ROUTER_UPDATES) {
    const filePath = path.join(process.cwd(), instruction.file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${instruction.file}`);
      continue;
    }

    console.log(`📝 Updating ${instruction.file}...`);
    console.log(`   ${instruction.description}`);

    let fileContent = fs.readFileSync(filePath, 'utf-8');
    let changesMade = 0;

    for (const change of instruction.changes) {
      if (fileContent.includes(change.search)) {
        fileContent = fileContent.replace(new RegExp(change.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), change.replace);
        changesMade++;
        console.log(`   ✅ ${change.reason}`);
      }
    }

    if (changesMade > 0) {
      fs.writeFileSync(filePath, fileContent);
      console.log(`   📊 Applied ${changesMade} changes\n`);
    } else {
      console.log(`   ℹ️  No changes needed\n`);
    }
  }

  console.log('🎉 Router file updates completed!');
}

async function createMigrationGuide() {
  const guideContent = `# Student Status Migration Guide

## 🎯 Key Changes

### Status Logic Update
- **"Active students only"** now means ONLY students with status \`ACTIVE\`
- **EXPELLED** and **WITHDRAWN** are treated as **INACTIVE**
- **REPEAT** and **SUSPENDED** students can still attend classes

### Updated Status Groups
\`\`\`typescript
// OLD: Any student who could attend classes
isActive: true

// NEW: Specific status filtering
status: "ACTIVE"                    // Only active students
status: { in: ["ACTIVE", "REPEAT", "SUSPENDED"] }  // Enrolled students
status: { not: "ACTIVE" }           // All inactive students
\`\`\`

### Common Replacements

#### 1. Student Queries
\`\`\`typescript
// OLD
where: { isActive: true }

// NEW - Active only
where: { status: "ACTIVE" }

// NEW - Can attend classes  
where: { status: { in: ["ACTIVE", "REPEAT", "SUSPENDED"] } }
\`\`\`

#### 2. Dashboard Stats
\`\`\`typescript
// OLD
const activeStudents = await prisma.student.count({ 
  where: { isActive: true } 
});

// NEW
const activeStudents = await prisma.student.count({ 
  where: { status: "ACTIVE" } 
});
\`\`\`

#### 3. Student Filtering
\`\`\`typescript
// OLD
if (student.isActive) {
  // Student can attend
}

// NEW
import { isActiveStatus, isEnrolledStatus } from '@/utils/student-status';

if (isActiveStatus(student.status)) {
  // Student is active
}

if (isEnrolledStatus(student.status)) {
  // Student can attend classes
}
\`\`\`

## 🔧 Updated Files

The following files have been updated to use the new status system:
- \`src/server/api/routers/student.ts\`
- \`src/server/api/routers/dashboard.ts\`
- \`src/server/api/routers/finance.ts\`
- \`src/app/students/page.tsx\`
- \`src/app/students/list/page.tsx\`

## 🚀 Migration Helpers

Use the migration utilities:
\`\`\`typescript
import { COMMON_STUDENT_FILTERS } from '@/utils/student-migration-helper';

// Quick filters
const activeOnly = COMMON_STUDENT_FILTERS.ACTIVE_ONLY;
const enrolled = COMMON_STUDENT_FILTERS.ENROLLED;
const legacyActive = COMMON_STUDENT_FILTERS.LEGACY_ACTIVE;
\`\`\`

## ⚠️ Important Notes

1. **Backward Compatibility**: The \`isActive\` field is still available but deprecated
2. **Gradual Migration**: Update queries incrementally using the new status system
3. **Testing**: Verify that filters return expected results after migration
4. **Documentation**: Update any API documentation to reflect status options

## 📋 Status Types Reference

| Status | Description | Can Attend Classes | Legacy isActive |
|--------|-------------|-------------------|-----------------|
| ACTIVE | Currently enrolled and attending | ✅ | true |
| REPEAT | Repeating current academic year | ✅ | false |
| SUSPENDED | Temporarily barred from classes | ✅ | false |
| INACTIVE | Temporarily not attending | ❌ | false |
| EXPELLED | Permanently removed (disciplinary) | ❌ | false |
| WITHDRAWN | Voluntarily left | ❌ | false |
| TRANSFERRED | Moved to another institution | ❌ | false |
| GRADUATED | Successfully completed education | ❌ | false |
`;

  fs.writeFileSync(path.join(process.cwd(), 'STUDENT_STATUS_MIGRATION_GUIDE.md'), guideContent);
  console.log('📚 Created migration guide: STUDENT_STATUS_MIGRATION_GUIDE.md');
}

// Run updates
if (import.meta.url === `file://${process.argv[1]}`) {
  Promise.all([
    updateRouterFiles(),
    createMigrationGuide()
  ]).then(() => {
    console.log('\n🎉 All migration tasks completed!');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
}

export { updateRouterFiles, createMigrationGuide };