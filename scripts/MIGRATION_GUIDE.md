# Fee Collection Multi-Term Migration Guide

This guide walks you through migrating from single-term fee collections to multi-term fee collections, where one receipt can span multiple fee terms.

## 🚨 IMPORTANT: Data Backup

**Before starting, ensure you have a complete database backup!**

```bash
# Create backup (adjust connection string as needed)
pg_dump "postgresql://username:password@host:port/database" > fee_collections_backup_$(date +%Y%m%d_%H%M%S).sql
```

## 📋 Migration Steps

### Step 1: Clean Finance Data

**Option A: Using TypeScript Script (Recommended)**
```bash
cd /path/to/scholarise
npx tsx scripts/cleanup-finance-data.ts
```

**Option B: Using SQL Script**
```bash
# If you prefer SQL directly
psql "your_database_url" -f scripts/cleanup-finance-data.sql
```

### Step 2: Apply Schema Changes

**Option A: Using Prisma Migration**
```bash
npx prisma migrate dev --name restructure_fee_collections_for_multi_term
```

**Option B: Using SQL Script (if migration fails)**
```bash
psql "your_database_url" -f scripts/restructure-schema-clean.sql
npx prisma generate
```

### Step 3: Import New Data

*(This step will be done after you provide the CSV file)*

```bash
# Script will be created based on your CSV structure
npx tsx scripts/import-fee-collections-from-csv.ts your_data.csv
```

## 🔄 Schema Changes Summary

### Before (Single Term per Collection)
```
FeeCollection {
  id: string
  receiptNumber: string
  feeTermId: string        ← Single term only
  // ... other fields
}

FeeCollectionItem {
  feeCollectionId: string
  feeHeadId: string
  amount: number
  // No term info here
}
```

### After (Multi-Term per Collection)
```
FeeCollection {
  id: string
  receiptNumber: string
  // No feeTermId here anymore
  // ... other fields
}

FeeCollectionItem {
  feeCollectionId: string
  feeHeadId: string
  feeTermId: string        ← Term moved here
  amount: number
}
```

## 🎯 Benefits of New Structure

1. **Single Receipt for Multiple Terms**: Parent pays for whole year → gets one receipt
2. **Better Data Organization**: Each fee item knows its specific term
3. **Flexible Payments**: Can mix fee heads from different terms in one payment
4. **Simplified UI**: No more multiple API calls for multi-term payments

## 🔍 Verification

After migration, verify the changes:

```sql
-- Check schema structure
\d "FeeCollection"
\d "FeeCollectionItem" 

-- Verify no orphaned data
SELECT COUNT(*) FROM "FeeCollectionItem" WHERE "feeTermId" NOT IN (SELECT id FROM "FeeTerm");
```

## 🚑 Rollback Plan

If something goes wrong:

1. **Restore from backup**:
   ```bash
   psql "your_database_url" < fee_collections_backup_YYYYMMDD_HHMMSS.sql
   ```

2. **Revert schema changes** (if needed):
   ```bash
   # Revert to previous migration
   npx prisma migrate reset
   ```

## 📞 Support

If you encounter issues:
1. Check the error logs
2. Verify database connections
3. Ensure no active transactions are blocking the migration
4. Contact the development team with specific error messages

---

**Ready to start?** Run Step 1 when you're ready to clean the finance data!