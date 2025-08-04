# Enhanced Concession System Documentation

## Overview

The Enhanced Concession System provides comprehensive management of student concessions/scholarships with advanced fee application control, approval workflows, and improved user experience.

## 🚀 Key Features

### 1. **Fee Application Control at Concession Type Level**
- Select specific fee heads and terms when creating concession types
- Percentage concessions apply the same rate to all selected terms
- Fixed amount concessions allow per-term amount specification

### 2. **Improved Student Assignment**
- Streamlined assignment process - no more manual fee selection
- Search students by name or admission number
- Auto-inherit fee application from concession type

### 3. **Enhanced UI/UX**
- Modern Material Design interface
- Card-based layouts with proper spacing
- Dark/light mode support
- Responsive design for all devices
- Real-time form validation with progress tracking

### 4. **Approval Workflow**
- Configurable approval settings per branch/session
- Role-based or individual-based authorization
- Auto-approval thresholds
- Multi-level approval for large amounts

## 📊 Database Schema Changes

### ConcessionType (Updated)
```sql
-- New fields added:
appliedFeeHeads    TEXT[]  -- Array of fee head IDs
appliedFeeTerms    TEXT[]  -- Array of fee term IDs  
feeTermAmounts     JSONB   -- Per-term amounts for FIXED type
```

### StudentConcession (Simplified)
```sql
-- Removed fields:
-- appliedFeeHeads  (moved to ConcessionType)
-- appliedFeeTerms  (moved to ConcessionType)
```

### ConcessionApprovalSettings (New)
```sql
-- Approval workflow configuration
approvalType                STRING   -- '1_PERSON', '2_PERSON', 'COMMITTEE'
authorizationType           STRING   -- 'ROLE_BASED', 'INDIVIDUAL_BASED'
autoApproveBelow            DECIMAL  -- Auto-approve below this amount
maxApprovalAmount           DECIMAL  -- Maximum approvable amount
escalationThreshold         DECIMAL  -- Escalation threshold
-- ... and more approval settings
```

## 🛠️ Running the Migration

### Option 1: Using the Migration Script
```bash
# Run the enhanced migration script
npx tsx scripts/run-concession-migration.ts

# Generate Prisma client
npx prisma generate
```

### Option 2: Manual SQL Execution
```bash
# Connect to your database and run:
psql -d your_database -f prisma/migrations/manual/enhance_concession_system.sql

# Then generate Prisma client
npx prisma generate
```

## 📋 Usage Examples

### 1. Creating a Percentage-Based Concession Type

```typescript
// All selected fee terms get the same percentage
const concessionType = {
  name: "Merit Scholarship",
  type: "PERCENTAGE",
  value: 25, // 25% discount
  appliedFeeHeads: ["tuition_fee_id", "development_fee_id"],
  appliedFeeTerms: ["term1_id", "term2_id", "term3_id"],
  feeTermAmounts: {} // Empty for percentage type
};
```

### 2. Creating a Fixed-Amount Concession Type

```typescript
// Different amounts per term
const concessionType = {
  name: "Financial Hardship Support",
  type: "FIXED",
  value: 5000, // Default amount
  appliedFeeHeads: ["tuition_fee_id"],
  appliedFeeTerms: ["term1_id", "term2_id"],
  feeTermAmounts: {
    "term1_id": 3000, // Custom amount for term 1
    "term2_id": 2000  // Custom amount for term 2
  }
};
```

### 3. Assigning Concession to Student

```typescript
// Simple assignment - fee application is auto-inherited
const studentConcession = {
  studentId: "student_123",
  concessionTypeId: "concession_type_456",
  customValue: 20, // Override default if needed
  reason: "Academic excellence",
  validFrom: new Date(),
  validUntil: new Date("2024-12-31"),
  notes: "Scholarship for outstanding performance"
};
```

## 🔄 Migration Impact

### ✅ What's Improved
- **Performance**: Better indexing on fee application fields
- **Flexibility**: Per-term fixed amounts for complex scenarios
- **Usability**: Streamlined UI with better user experience
- **Maintainability**: Cleaner data structure and relationships

### ⚠️ Important Notes
- **Data Migration**: Existing `appliedFeeHeads` and `appliedFeeTerms` from `StudentConcession` will be removed
- **Backward Compatibility**: Existing concession records will continue to work
- **Default Settings**: All branches get default approval settings
- **Calculation Function**: New SQL function for accurate concession calculations

## 🧪 Testing the Migration

### 1. Verify Schema Changes
```sql
-- Check if new columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'ConcessionType' 
AND column_name IN ('appliedFeeHeads', 'appliedFeeTerms', 'feeTermAmounts');

-- Check if ConcessionApprovalSettings table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'ConcessionApprovalSettings'
);
```

### 2. Test Concession Creation
```typescript
// Test creating a new concession type with fee application
const testConcession = await prisma.concessionType.create({
  data: {
    name: "Test Concession",
    type: "PERCENTAGE",
    value: 10,
    appliedFeeHeads: ["fee_head_1"],
    appliedFeeTerms: ["fee_term_1"],
    branchId: "branch_id",
    sessionId: "session_id"
  }
});
```

### 3. Test Student Assignment
```typescript
// Test assigning the concession to a student
const assignment = await prisma.studentConcession.create({
  data: {
    studentId: "student_id",
    concessionTypeId: testConcession.id,
    branchId: "branch_id",
    sessionId: "session_id"
  }
});
```

## 🔧 Troubleshooting

### Common Issues

1. **Migration Fails**
   - Check database connectivity
   - Ensure proper permissions
   - Verify no conflicting constraints

2. **Missing Columns**
   - Run `npx prisma db push` to sync schema
   - Check if migration was applied completely

3. **Type Errors in Code**
   - Run `npx prisma generate` after migration
   - Update TypeScript interfaces if needed

### Getting Help

If you encounter issues:
1. Check the migration logs in the console
2. Verify database connection settings
3. Ensure all dependencies are up to date
4. Check Prisma schema syntax

## 📚 API Changes

### New TRPC Endpoints Required

The following API endpoints should be updated to support the new schema:

```typescript
// ConcessionType endpoints
- getConcessionTypes: Include appliedFeeHeads, appliedFeeTerms, feeTermAmounts
- createConcessionType: Handle new fee application fields
- updateConcessionType: Support fee application updates

// StudentConcession endpoints  
- createStudentConcession: Remove fee application parameters
- getStudentConcessions: Auto-populate from concession type

// New endpoints
- getConcessionApprovalSettings: Manage approval workflow
- updateApprovalSettings: Configure approval parameters
```

---

**🎉 The Enhanced Concession System is now ready for use!**

For more information or support, refer to the project documentation or contact the development team.