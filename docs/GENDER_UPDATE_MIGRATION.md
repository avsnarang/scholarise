# Gender Value Migration for Admission Inquiries

## Overview
This migration updates all gender values in the `AdmissionInquiry` table to use standardized format:
- `M` → `MALE`
- `F` → `FEMALE`

## Files Created
1. **SQL Migration**: `prisma/migrations/manual/update_admission_inquiry_gender_values.sql`
2. **TypeScript Script**: `src/scripts/update-inquiry-gender.ts`
3. **Documentation**: `docs/GENDER_UPDATE_MIGRATION.md` (this file)

## Running the Migration

### Option 1: Using TypeScript Script (Recommended)
```bash
# Navigate to project root
cd /path/to/scholarise

# Run the TypeScript migration script
npx tsx src/scripts/update-inquiry-gender.ts
```

### Option 2: Using Direct SQL
```bash
# Connect to your database and run the SQL file
psql -d your_database_name -f prisma/migrations/manual/update_admission_inquiry_gender_values.sql
```

## What the Migration Does

1. **Before Update Check**: Shows current gender distribution
2. **Update M → MALE**: Updates all records with gender 'M' to 'MALE'
3. **Update F → FEMALE**: Updates all records with gender 'F' to 'FEMALE'
4. **Verification**: Shows final gender distribution
5. **Transaction Safety**: All updates are wrapped in a transaction

## Actual Migration Results
**First Run (M/F conversion):**
```
📊 Found 220 inquiries with M/F gender values:
   - M: 117 records
   - F: 103 records
✅ Updated 117 records from M to MALE
✅ Updated 103 records from F to FEMALE
```

**Second Run (Case normalization):**
```
📊 Found 3 inquiries with non-standardized gender values:
   - Male: 3 records
✅ Updated 3 records from Male to MALE

📈 Final gender distribution:
   - MALE: 120 records
   - FEMALE: 104 records
```

**Total Records Updated: 223 inquiries**

## Safety Features
- ✅ Transaction-based updates (rollback on error)
- ✅ Detailed logging and verification
- ✅ No data loss - only converts existing values
- ✅ Idempotent - safe to run multiple times

## Rollback (if needed)
If you need to rollback this migration:
```sql
UPDATE "AdmissionInquiry" SET "gender" = 'M' WHERE "gender" = 'MALE';
UPDATE "AdmissionInquiry" SET "gender" = 'F' WHERE "gender" = 'FEMALE';
```

## Frontend Impact
After running this migration, ensure your frontend forms and display logic handle the new standardized values:
- Form dropdowns should use: `MALE`, `FEMALE`, `OTHER`
- Display logic should handle the full words instead of single letters 