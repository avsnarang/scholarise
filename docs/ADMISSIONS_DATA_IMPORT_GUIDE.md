# Admissions Data Import Guide

This guide explains how to import admission inquiry data from CSV and automatically assign existing fee heads to new admission students using the existing Finance Module structure.

## Overview

The admission data import process uses a single script that:

1. **`import-admissions-data.ts`** - Imports admission inquiry data and automatically assigns appropriate fee heads to confirmed admissions

## Features

### Data Import Features
- ✅ **Class Conversion**: Automatically converts numerical classes (CLASS 1, CLASS 2) to Roman numerals (I, II)
- ✅ **Age Verification**: Verifies student age matches the class and suggests appropriate class if needed
- ✅ **Student Matching**: Links admission inquiries to existing students in the database
- ✅ **Status Mapping**: Maps CSV status values to database enum values
- ✅ **Duplicate Prevention**: Prevents duplicate admission inquiries
- ✅ **Comprehensive Data Mapping**: Maps all relevant CSV fields to database schema

### Smart Fee Management
- ✅ **Works with Existing Fee Heads**: Uses your existing fee heads marked for "NEW_ADMISSION" or "BOTH"
- ✅ **Automatic Student Identification**: Identifies students with admission numbers as confirmed admissions
- ✅ **🆕 Session-Based Classification**: Sets firstJoinedSessionId for foolproof student type identification
- ✅ **Targeted Fee Assignment**: Only assigns new admission fees to students who have been admitted
- ✅ **Class-wise Fee Setup**: Automatically creates class-wise fee assignments for new admission students
- ✅ **Preserves Existing Structure**: Works with your current Finance Module setup
- ✅ **🆕 Finance Dashboard Integration**: Updated amounts reflect accurate new admission vs old student breakdown

## Prerequisites

Before running the script, ensure you have:

1. **CSV File**: Place your `admissionsData.csv` file in the `AI/` directory
2. **Database Connection**: Ensure your database is running and accessible
3. **Configuration**: Update the BRANCH_ID and SESSION_ID in the script
4. **Fee Heads Setup**: Ensure your fee heads are properly marked with `studentType` in the Finance Module
5. **Dependencies**: All necessary npm packages installed

## Configuration

### 1. Update Configuration Values

In `import-admissions-data.ts`, update:

```typescript
const BRANCH_ID = 'your-branch-id-here'; // Update with your branch ID
const SESSION_ID = 'your-session-id-here'; // Update with current session ID
```

### 2. Verify Fee Head Setup

Ensure your fee heads in the Finance Module are properly categorized:
- **NEW_ADMISSION**: Fee heads that apply only to newly admitted students
- **OLD_STUDENT**: Fee heads that apply only to existing students
- **BOTH**: Fee heads that apply to all students

You can check this in your Finance Module under Fee Head management.

### 3. Verify CSV Structure

Ensure your CSV has these key columns:
- `Admission Number` (important - indicates confirmed admissions)
- `Student Name` (required)
- `Last Name` (optional)
- `Father Name` / `Mother Name` (at least one required)
- `Father Mobile` / `Mother Mobile` (at least one required)
- `Date Of Birth` (recommended for age verification)
- `Admission Opted For` (class information)
- `Enquiry Status` (admission status)

## Usage Instructions

### Step 1: Get Configuration IDs

First, find your branch and session IDs:

```bash
# Get your BRANCH_ID and SESSION_ID
npx tsx src/scripts/get-config-ids.ts
```

Update the script with the correct IDs.

### Step 2: Run the Import

```bash
# Run the complete admission data import and fee assignment
npx tsx src/scripts/import-admissions-data.ts
```

This single script will:
1. Read the CSV file from `AI/admissionsData.csv`
2. Process and validate the data
3. Convert classes from numerical to Roman numerals
4. Verify age vs class appropriateness
5. Map CSV status to database enums
6. Link to existing students where possible
7. Create admission inquiry records
8. **Identify students with admission numbers (confirmed admissions)**
9. **Automatically assign appropriate fee heads to these students**
10. **Set up class-wise fee assignments**

### Step 3: Complete Fee Setup

After the import, you'll need to:

1. **Set Fee Amounts**: Go to Finance > Class-wise Fee Assignment to set the actual amounts for the assigned fee heads
2. **Generate Fee Collections**: Create fee collections for the new admission students
3. **Review Assignments**: Verify that the correct fee heads were assigned

## How the System Identifies New Admission Students

The script identifies students as "new admissions" if they have:

1. **Admission Number**: A valid admission number in the CSV (not empty, not "0", not containing "test")
2. **Confirmed Status**: Status marked as "ADMISSION CONFIRMED" in the CSV
3. **Existing Student Match**: Successfully linked to an existing student in the database

## Class Conversion Mapping

The script automatically converts these class formats:

| CSV Format | Database Format |
|------------|----------------|
| NURSERY | Nursery |
| PLAY GROUP | Play Group |
| LKG | LKG |
| UKG | UKG |
| CLASS 1 | I |
| CLASS 2 | II |
| CLASS 3 | III |
| ... | ... |
| CLASS 12 | XII |

## Age Verification

The script uses this age-to-class mapping for verification:

| Age | Appropriate Classes |
|-----|-------------------|
| 3 | Nursery, Play Group |
| 4 | Nursery, Play Group, LKG |
| 5 | LKG, UKG |
| 6 | UKG, I |
| 7 | I, II |
| ... | ... |
| 18 | XII |

If a student's age doesn't match their requested class, the script will suggest the most appropriate class.

## Status Mapping

CSV status values are mapped to database enums:

| CSV Status | Database Status |
|------------|----------------|
| NEW | NEW |
| ORIENTATION COMPLETE | CONTACTED |
| ORIENTATION SCHEDULED | VISIT_SCHEDULED |
| SCHOOL VISIT | VISITED |
| APPLICATION FORM | FORM_SUBMITTED |
| CONFIRM ADMISSION FORM | FORM_SUBMITTED |
| ADMISSION CONFIRMED | ADMITTED |
| REJECTED BY SCHOOL | REJECTED |
| NOT INTERESTED | REJECTED |
| CLOSED | CLOSED |
| (empty) | NEW |

## Sample Output

```
🚀 Starting admissions data import...
📁 CSV File: /path/to/AI/admissionsData.csv
🏢 Branch ID: cm4x8wkjl0001t9i5ldvmstgq
📅 Session ID: cm5kcfh4700002gkhjp5odfvr

📖 Reading CSV file...
Found 230 rows in CSV

⚙️ Processing CSV rows...
Age mismatch: Student age 15 doesn't match class XII. Suggesting: X
Processed 225 valid inquiries
Found 45 students with admission numbers or confirmed admissions

💾 Creating admission inquiries...
Processing batch 1/5...
🎓 New admission student linked: John Doe (Admission: TSHPS/2025-26/0247)
🔗 Linked inquiry to existing student: Jane Smith
⚠️  Warning: Admission number found but no matching student: Unknown Student (TSHPS/2025-26/0999)

Import Summary:
✅ Successful: 220
❌ Errors: 5
🔗 Linked to existing students: 180
🎓 New admission students identified: 42

💰 Assigning new admission fees to 42 students...
Found 4 fee heads for new admissions:
  - Admission Fee (NEW_ADMISSION)
  - Registration Fee (NEW_ADMISSION)
  - Security Deposit (BOTH)
  - Activity Fee (BOTH)

Using fee term: Term 1

📚 Students to process:
  - John Doe (Class I)
  - Mary Johnson (Class V)
  ...

🎯 Processing class: Class I
  ✅ Assigned Admission Fee to class
  ✅ Assigned Registration Fee to class
  ✅ Assigned Security Deposit to class
  ✅ Assigned Activity Fee to class

✅ Fee assignment completed for 42 students!

📋 Next Steps:
1. Go to Finance > Class-wise Fee Assignment to set amounts
2. Create fee collections for these students
3. Review and adjust fee amounts as needed

✅ Admissions data import completed successfully!
```

## Troubleshooting

### Common Issues

1. **CSV File Not Found**
   ```
   Error: CSV file not found: /path/to/AI/admissionsData.csv
   ```
   **Solution**: Ensure the CSV file is placed in the `AI/` directory

2. **No Fee Heads Found**
   ```
   Found 0 fee heads for new admissions
   ```
   **Solution**: Check that your fee heads are properly marked with `studentType` as "NEW_ADMISSION" or "BOTH"

3. **Database Connection Issues**
   ```
   Error: Connection failed
   ```
   **Solution**: Verify database is running and connection string is correct

4. **Invalid Branch/Session IDs**
   ```
   Error: Invalid branch or session
   ```
   **Solution**: Use the `get-config-ids.ts` script to get correct IDs

### Configuration Validation

You can validate your configuration with:

```bash
# Validate your BRANCH_ID and SESSION_ID
npx tsx src/scripts/get-config-ids.ts validate YOUR_BRANCH_ID YOUR_SESSION_ID
```

## Data Validation

The script performs extensive validation:

### Import Script Validation
- ✅ Checks for required fields (student name, parent info)
- ✅ Validates date formats
- ✅ Verifies age vs class appropriateness
- ✅ Prevents duplicate imports
- ✅ Links to existing students safely
- ✅ Identifies admission numbers correctly
- ✅ Validates fee head assignments
- ✅ Prevents duplicate fee assignments

## Best Practices

1. **Backup Database**: Always backup your database before running import scripts
2. **Test with Sample Data**: Test with a small subset of data first
3. **Verify Configuration**: Use the config helper script to get correct IDs
4. **Check Fee Head Setup**: Ensure fee heads are properly categorized before import
5. **Monitor Logs**: Watch the console output for any errors or warnings
6. **Validate Results**: Check the database after import to ensure data integrity
7. **Set Fee Amounts**: Remember to set actual amounts in Class-wise Fee Assignment
8. **Clean Data**: Ensure CSV data is as clean as possible before import

## Post-Import Tasks

After running the import script:

### 1. Set Fee Amounts
- Go to **Finance > Class-wise Fee Assignment**
- Set appropriate amounts for each fee head and class combination
- The script creates assignments with amount = 0, you need to set the actual amounts

### 2. Generate Fee Collections
- Go to **Finance > Fee Collection**
- Generate collections for the new admission students
- Or use the bulk collection generation features

### 3. Review and Verify
- Check that students were linked correctly
- Verify fee assignments are appropriate
- Review any warnings or errors from the import

## Working with Existing Fee Heads

This system is designed to work with your existing fee structure. The script will:

1. **Find Existing Fee Heads**: Look for fee heads marked as "NEW_ADMISSION" or "BOTH"
2. **Respect Current Setup**: Not create duplicate fee heads
3. **Use Current Terms**: Work with your existing fee terms
4. **Maintain Structure**: Keep your current class and section structure

If you need to modify which fee heads apply to new admissions, update the `studentType` field in your Finance Module.

## Support

If you encounter issues:

1. Check the console logs for detailed error messages
2. Verify your CSV data format matches the expected structure
3. Ensure database connectivity and permissions
4. Check that BRANCH_ID and SESSION_ID are valid using the helper script
5. Verify fee heads are properly set up in the Finance Module
6. Review this documentation for troubleshooting steps

---

This streamlined system works seamlessly with your existing Finance Module to ensure that new admission students receive the appropriate fee assignments while protecting existing students from unwanted charges. 