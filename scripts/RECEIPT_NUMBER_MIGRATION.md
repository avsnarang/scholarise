# Receipt Number Format Migration

This guide explains how to migrate from the old receipt number format to the new TSH format.

## New Format

**Old Format**: `RCP-202412-MAJ-0001`
**New Format**: `TSH{BranchCode}/FIN/{SessionName}/000001`

Example: `TSHMAJ/FIN/2024-25/000001`

## Migration Steps

### 1. Backup Database (IMPORTANT!)

Before running the migration, create a backup of your database:

```bash
# For PostgreSQL
pg_dump your_database_name > backup_before_receipt_migration.sql

# Or use your preferred backup method
```

### 2. Run the Migration Script

```bash
# Navigate to the project root
cd /path/to/your/project

# Run the migration script
npx tsx scripts/migrate-receipt-numbers.ts
```

### 3. Verify Migration

The script will automatically verify that all old format receipt numbers have been converted. You should see output like:

```
🚀 Starting receipt number migration...
📋 Found 150 fee collections with old format receipt numbers
📊 Processing 3 branch-session combinations

🏢 Processing 75 collections for MAJ/2024-25...
  ✓ RCP-202412-MAJ-0001 → TSHMAJ/FIN/2024-25/000001
  ✓ RCP-202412-MAJ-0002 → TSHMAJ/FIN/2024-25/000002
  ...

✅ Successfully updated 75 collections for MAJ/2024-25

🎉 Migration completed!
✅ Total updated: 150
❌ Errors: 0
✅ All receipt numbers successfully migrated to new format!
```

## What the Migration Does

1. **Finds all fee collections** with old format receipt numbers (starting with `RCP-`)
2. **Groups by branch and session** to maintain proper sequencing
3. **Converts each receipt number** to the new format while preserving the sequence
4. **Updates the database** in transactions to ensure data integrity
5. **Verifies completion** by checking no old format numbers remain

## New Receipt Number Generation

After migration, all new receipts will automatically use the new format:

- **Format**: `TSH{BranchCode}/FIN/{SessionName}/{6-digit-sequence}`
- **Sequence**: Starts from 000001 for each branch-session combination
- **Uniqueness**: Maintained per branch and session

## Files Updated

The following files have been updated to use the new format:

1. `src/server/api/routers/finance.ts` - Fee collection creation
2. `src/app/api/webhooks/easebuzz/route.ts` - Gateway payments
3. `scripts/import-fee-collections.ts` - Bulk imports
4. `src/utils/receipt-number-generator.ts` - Utility functions (new file)

## Rollback (If Needed)

If you need to rollback the changes:

1. Restore from the backup created in step 1
2. Revert the code changes in the files listed above

## Testing

After migration, test the following:

1. **Create new fee collection** - Verify new format is used
2. **View payment history** - Check all receipt numbers display correctly
3. **Print receipts** - Ensure receipt numbers appear properly on printed receipts
4. **Gateway payments** - Test online payment flow generates correct receipt numbers

## Support

If you encounter any issues during migration:

1. Check the console output for specific error messages
2. Verify database connectivity
3. Ensure you have proper permissions to update the `FeeCollection` table
4. Contact the development team if problems persist