# Class & Section Selection Enhancement

## Overview

Updated the student form to show class and section in a single dropdown field instead of separate fields, providing a better user experience.

## Changes Made

### 1. Enhanced Student Form Component
**File**: `src/components/students/enhanced-student-form.tsx`

**Before**:
- Used `api.class.getAll.useQuery()` to fetch classes
- Passed `classes` array to `StudentInfoTab`

**After**:
- Uses `api.section.getSectionsForImport.useQuery()` to fetch sections with class information
- Passes `sections` array to `StudentInfoTab`
- Includes proper session and branch filtering

```typescript
const { data: sections } = api.section.getSectionsForImport.useQuery(
  { 
    branchId: branch?.id,
    sessionId: currentSessionId || undefined,
  },
  { enabled: !!branch?.id && !!currentSessionId }
);
```

### 2. Updated Student Info Tab Component
**File**: `src/components/students/form-tabs/student-info-tab.tsx`

**Changes**:
- Changed interface from `classes: any[]` to `sections: any[]`
- Updated dropdown to display "Class Name - Section Name" format
- Enhanced age validation to work with section structure

**Dropdown Enhancement**:
```typescript
<Combobox
  options={sections.map((section) => ({
    value: section.id,
    label: section.displayName || `${section.className} - ${section.name}`
  }))}
  value={field.value}
  onChange={field.onChange}
  placeholder="Select Class & Section"
  emptyMessage="No sections found."
/>
```

### 3. UI Improvements

**Label**: Changed from "Enrollment Class" to "Class & Section"
**Placeholder**: Updated to "Select Class & Section"
**Empty Message**: Changed to "No sections found."

## Data Structure

The new implementation uses the `getSectionsForImport` API endpoint which returns:

```typescript
{
  id: string,
  name: string,          // Section name (A, B, C, etc.)
  capacity: number,
  studentCount: number,
  className: string,     // Class name (Class 1, Class 2, etc.)
  displayName: string,   // "Class 1 - Section A"
  availableSpots: number
}
```

## Benefits

1. **Better UX**: Single dropdown instead of multiple selections
2. **Clear Information**: Shows both class and section information together
3. **Proper Filtering**: Only shows sections for the selected branch and session
4. **Accurate Data**: Uses the actual section ID that students are assigned to
5. **Capacity Awareness**: Shows available spots for each section

## Backend Integration

The form continues to use `sectionId` in the database, which is the correct relationship:
- Student belongs to Section
- Section belongs to Class
- This maintains proper database normalization

## Compatibility

This change is fully backward compatible:
- Existing students remain unaffected
- All existing API endpoints continue to work
- Form validation continues to work properly 