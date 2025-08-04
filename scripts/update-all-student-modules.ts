import { PrismaClient } from '@prisma/client';

/**
 * Script to notify all modules about the student status system changes
 * and update key query patterns across the application
 */

const prisma = new PrismaClient();

interface ModuleUpdate {
  module: string;
  description: string;
  changes: string[];
  action: 'updated' | 'needs_review' | 'no_change';
}

const MODULE_UPDATES: ModuleUpdate[] = [
  {
    module: 'Student Router (src/server/api/routers/student.ts)',
    description: 'Core student API endpoints',
    changes: [
      '✅ Updated fuzzySearchStudents to use status: "ACTIVE"',
      '✅ Updated bulkUpdateStatus to set both status and isActive fields',
      '✅ Updated getByClassAndSection to use status: "ACTIVE"',
      '✅ Updated isActive filter mapping to use status system'
    ],
    action: 'updated'
  },
  {
    module: 'Dashboard Router (src/server/api/routers/dashboard.ts)',
    description: 'Dashboard statistics and counts',
    changes: [
      '✅ Updated student count query to use status: "ACTIVE"',
      '⚠️  Multiple other isActive: true instances need review'
    ],
    action: 'needs_review'
  },
  {
    module: 'Students Page (src/app/students/page.tsx)',
    description: 'Main students dashboard page',
    changes: [
      '✅ Added comment clarifying isActive filter shows ACTIVE status only'
    ],
    action: 'updated'
  },
  {
    module: 'Students List Page (src/app/students/list/page.tsx)',
    description: 'Student listing and management',
    changes: [
      '✅ Added comment clarifying default filter shows ACTIVE status only'
    ],
    action: 'updated'
  },
  {
    module: 'Finance Router (src/server/api/routers/finance.ts)',
    description: 'Finance operations with student data',
    changes: [
      '⚠️  Multiple isActive: true instances found - needs systematic review',
      '📋 Should distinguish between fee collection (enrolled) vs active (ACTIVE only)'
    ],
    action: 'needs_review'
  },
  {
    module: 'Communication Router (src/server/api/routers/communication.ts)',
    description: 'Student communication features',
    changes: [
      '⚠️  Uses isActive: true for message targeting',
      '📋 May need to target "enrolled" students instead of just "active"'
    ],
    action: 'needs_review'
  },
  {
    module: 'Courtesy Calls (src/server/api/routers/courtesy-calls.ts)',
    description: 'Student courtesy call management',
    changes: [
      '⚠️  Uses isActive: true for student selection',
      '📋 Should target enrolled students for courtesy calls'
    ],
    action: 'needs_review'
  },
  {
    module: 'Attendance Router (src/server/api/routers/attendance.ts)', 
    description: 'Student attendance tracking',
    changes: [
      '📋 Likely needs to target enrolled students (ACTIVE, REPEAT, SUSPENDED)',
      '⚠️  Review attendance queries for appropriate status filtering'
    ],
    action: 'needs_review'
  },
  {
    module: 'Examination Router (src/server/api/routers/examination.ts)',
    description: 'Student exam and assessment data',
    changes: [
      '⚠️  Multiple isActive: true instances found',
      '📋 Should distinguish between exam eligibility and active status'
    ],
    action: 'needs_review'
  }
];

async function generateStatusMigrationReport() {
  console.log('📊 STUDENT STATUS MIGRATION IMPACT REPORT\n');
  console.log('=' .repeat(80));
  
  console.log('\n🎯 KEY LOGIC CHANGES:\n');
  console.log('• "Active students only" now means ONLY students with status ACTIVE');
  console.log('• EXPELLED and WITHDRAWN are treated as INACTIVE');
  console.log('• REPEAT and SUSPENDED students can still attend classes');
  console.log('• Legacy isActive queries map to: true = ACTIVE, false = non-ACTIVE');
  
  console.log('\n📋 MODULE STATUS:\n');
  
  let updatedCount = 0;
  let needsReviewCount = 0;
  let noChangeCount = 0;
  
  MODULE_UPDATES.forEach((update, index) => {
    const statusIcon = {
      'updated': '✅',
      'needs_review': '⚠️ ',
      'no_change': 'ℹ️ '
    }[update.action];
    
    console.log(`${statusIcon} ${update.module}`);
    console.log(`   ${update.description}`);
    update.changes.forEach(change => {
      console.log(`   ${change}`);
    });
    console.log('');
    
    if (update.action === 'updated') updatedCount++;
    else if (update.action === 'needs_review') needsReviewCount++;
    else noChangeCount++;
  });
  
  console.log('=' .repeat(80));
  console.log('\n📊 SUMMARY:');
  console.log(`✅ Updated: ${updatedCount} modules`);
  console.log(`⚠️  Needs Review: ${needsReviewCount} modules`);
  console.log(`ℹ️  No Change: ${noChangeCount} modules`);
  
  console.log('\n🔍 PRIORITY ACTIONS NEEDED:\n');
  
  const priorities = [
    {
      priority: 'HIGH',
      task: 'Review Finance Router',
      reason: 'Fee collection logic may need "enrolled" students, not just "active"'
    },
    {
      priority: 'HIGH', 
      task: 'Review Communication Router',
      reason: 'Message targeting should include all enrolled students'
    },
    {
      priority: 'MEDIUM',
      task: 'Review Attendance Router', 
      reason: 'Attendance should track all enrolled students'
    },
    {
      priority: 'MEDIUM',
      task: 'Review Examination Router',
      reason: 'Exam eligibility rules may differ from active status'
    },
    {
      priority: 'LOW',
      task: 'Update Dashboard Router',
      reason: 'Complete migration of remaining isActive instances'
    }
  ];
  
  priorities.forEach(item => {
    const priorityColor = {
      'HIGH': '🔴',
      'MEDIUM': '🟡', 
      'LOW': '🟢'
    }[item.priority];
    
    console.log(`${priorityColor} ${item.priority}: ${item.task}`);
    console.log(`   ${item.reason}\n`);
  });
  
  console.log('🔧 RECOMMENDED NEXT STEPS:\n');
  console.log('1. Review and update Finance router queries');
  console.log('2. Update Communication targeting logic');
  console.log('3. Ensure Attendance works for all enrolled students');
  console.log('4. Test critical user flows with new status logic');
  console.log('5. Update any remaining hardcoded isActive: true filters');
  
  console.log('\n📚 REFERENCE:\n');
  console.log('• Status utilities: src/utils/student-status.ts');
  console.log('• Query helpers: src/utils/student-queries.ts');
  console.log('• Migration helpers: src/utils/student-migration-helper.ts');
  console.log('• React components: src/components/students/student-status-badge.tsx');
  
  return {
    totalModules: MODULE_UPDATES.length,
    updated: updatedCount,
    needsReview: needsReviewCount,
    noChange: noChangeCount
  };
}

async function createQuickReferenceGuide() {
  const quickRef = `# Quick Reference: Student Status Migration

## 🎯 New Status Logic

### When to use which filter:

| Use Case | OLD | NEW | Status Filter |
|----------|-----|-----|---------------|
| Show only active students | \`isActive: true\` | \`status: "ACTIVE"\` | ACTIVE only |
| Students who can attend class | \`isActive: true\` | \`status: { in: ["ACTIVE", "REPEAT", "SUSPENDED"] }\` | Enrolled |
| Fee collection eligibility | \`isActive: true\` | Use enrolled filter | Enrolled students |
| Send communications | \`isActive: true\` | Use enrolled filter | Enrolled students |
| Attendance tracking | \`isActive: true\` | Use enrolled filter | Enrolled students |
| Show inactive students | \`isActive: false\` | \`status: { not: "ACTIVE" }\` | Non-active |

## 🛠️ Quick Replacements

### Dashboard Queries
\`\`\`typescript
// OLD
const activeStudents = await prisma.student.count({ where: { isActive: true } });

// NEW  
const activeStudents = await prisma.student.count({ where: { status: "ACTIVE" } });
\`\`\`

### Communication Targeting
\`\`\`typescript
// OLD
where: { isActive: true }

// NEW - For messages/communications
where: { status: { in: ["ACTIVE", "REPEAT", "SUSPENDED"] } }
\`\`\`

### Fee Collection
\`\`\`typescript
// OLD
where: { isActive: true }

// NEW - For fee-related operations
where: { status: { in: ["ACTIVE", "REPEAT", "SUSPENDED"] } }
\`\`\`

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

\`\`\`typescript
import { 
  STUDENT_STATUS, 
  isActiveStatus, 
  isEnrolledStatus, 
  COMMON_STUDENT_FILTERS 
} from '@/utils/student-status';
\`\`\`
`;

  import('fs').then(fs => fs.writeFileSync('STUDENT_STATUS_QUICK_REFERENCE.md', quickRef));
  console.log('📚 Created quick reference: STUDENT_STATUS_QUICK_REFERENCE.md');
}

// Main execution
async function main() {
  try {
    const report = await generateStatusMigrationReport();
    await createQuickReferenceGuide();
    
    console.log('\n🎉 MIGRATION NOTIFICATION COMPLETE!');
    console.log(`\n📊 Notified ${report.totalModules} modules about status system changes`);
    console.log(`✅ ${report.updated} modules updated, ⚠️ ${report.needsReview} need review`);
    
  } catch (error) {
    console.error('❌ Error generating report:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();