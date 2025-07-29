# Quick Start: Admission Data Import

## Prerequisites
1. Place your `admissionsData.csv` file in the `AI/` directory
2. Make sure your fee heads in Finance Module are properly marked with `studentType` ("NEW_ADMISSION", "OLD_STUDENT", or "BOTH")

## Step 1: Get Configuration IDs
```bash
npx tsx src/scripts/get-config-ids.ts
```
Copy the BRANCH_ID and SESSION_ID from the output.

## Step 2: Update Configuration
Edit `src/scripts/import-admissions-data.ts` and update:
```typescript
const BRANCH_ID = 'your-branch-id-here';
const SESSION_ID = 'your-session-id-here';
```

## Step 3: Preview Changes (Recommended)
```bash
# First, run in dry-run mode to see what would happen
npx tsx src/scripts/import-admissions-data.ts --dry-run
```

## Step 4: Run Import (After reviewing preview)
```bash
# Only run this after reviewing the dry-run output
npx tsx src/scripts/import-admissions-data.ts
```

## What It Does
✅ Imports admission inquiries from CSV  
✅ Converts class names (CLASS 1 → I, CLASS 2 → II, etc.)  
✅ Links students with admission numbers to existing students  
✅ **🆕 Sets firstJoinedSessionId for session-based classification**  
✅ Automatically assigns fee heads marked for "NEW_ADMISSION" to confirmed admissions  
✅ Creates class-wise fee assignments  
✅ **🆕 Integrates with updated Finance Dashboard for accurate reporting**  

## After Import
1. Go to **Finance > Class-wise Fee Assignment** and set fee amounts
2. Generate fee collections for new admission students
3. Review the assignment results

## Important Notes
- Students with admission numbers in CSV are treated as confirmed admissions
- Only fee heads marked as "NEW_ADMISSION" or "BOTH" will be assigned
- The script creates fee assignments with amount = 0, you need to set actual amounts
- Existing students without admission numbers won't get new admission fees

For detailed documentation, see: `docs/ADMISSIONS_DATA_IMPORT_GUIDE.md` 