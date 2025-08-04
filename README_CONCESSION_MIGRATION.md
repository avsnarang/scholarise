# 🎯 Enhanced Concession System Migration Guide

## Quick Start

### 1. **Run the Database Migration**

```bash
# Option A: Using the migration script (recommended)
npx tsx scripts/run-concession-migration.ts

# Option B: Direct SQL execution
psql -d your_database_name -f prisma/migrations/manual/enhance_concession_system.sql
```

### 2. **Update Prisma Client**

```bash
npx prisma generate
```

### 3. **Verify Migration Success**

The migration script will automatically verify the changes, or you can manually check:

```sql
-- Check new ConcessionType columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'ConcessionType' AND column_name LIKE 'applied%';

-- Check ConcessionApprovalSettings table
SELECT COUNT(*) FROM "ConcessionApprovalSettings";
```

## 🔧 What This Migration Does

### **Database Schema Updates**

1. **ConcessionType** (Enhanced)
   - ✅ Added `appliedFeeHeads` array field
   - ✅ Added `appliedFeeTerms` array field  
   - ✅ Added `feeTermAmounts` JSON field for per-term amounts

2. **StudentConcession** (Simplified)
   - ❌ Removed `appliedFeeHeads` (moved to ConcessionType)
   - ❌ Removed `appliedFeeTerms` (moved to ConcessionType)

3. **ConcessionApprovalSettings** (New Table)
   - ✅ Created approval workflow configuration
   - ✅ Added default settings for all branches

### **Performance Improvements**

- ✅ Added GIN indexes for array fields
- ✅ Added unique constraints for data integrity
- ✅ Created helper function for concession calculations

### **Data Safety**

- ✅ All existing concession data is preserved
- ✅ Migration uses transactions for safety
- ✅ Default values are set for new fields

## 🎨 UI/UX Changes Already Applied

The frontend components have been updated to match the new database structure:

### **Concession Type Form** (`concession-type-form-modal.tsx`)
- ✅ Modern card-based 2-column layout
- ✅ Fee heads and terms selection UI
- ✅ Per-term amount configuration for FIXED types
- ✅ Progress tracking and validation

### **Student Concession Form** (`student-concession-form-modal.tsx`)
- ✅ Streamlined assignment process
- ✅ Student search with lazy loading
- ✅ Removed fee selection (now auto-inherited)
- ✅ Enhanced validation and error handling

## 🚨 Important Notes

### **Before Migration**
- ⚠️ Take a database backup
- ⚠️ Ensure no active transactions on concession tables
- ⚠️ Verify database connectivity

### **After Migration**
- ✅ Test concession type creation
- ✅ Test student concession assignment
- ✅ Verify fee calculations are working
- ✅ Check approval workflow settings

## 🔄 Rollback (If Needed)

If you need to rollback the migration:

```sql
-- Remove new columns from ConcessionType
ALTER TABLE "ConcessionType" DROP COLUMN "appliedFeeHeads";
ALTER TABLE "ConcessionType" DROP COLUMN "appliedFeeTerms";
ALTER TABLE "ConcessionType" DROP COLUMN "feeTermAmounts";

-- Add back columns to StudentConcession
ALTER TABLE "StudentConcession" ADD COLUMN "appliedFeeHeads" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "StudentConcession" ADD COLUMN "appliedFeeTerms" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Drop new table (optional - contains approval settings)
-- DROP TABLE "ConcessionApprovalSettings";
```

## 📞 Support

If you encounter any issues:

1. **Check the logs** from the migration script
2. **Verify database permissions** for your user
3. **Ensure Prisma schema** is in sync with database
4. **Run type check** with `npx tsc --noEmit --skipLibCheck`

---

**🎉 Once migration is complete, your Enhanced Concession System will be ready to use!**