# Bulk Concession Assignment Feature

## Overview
The bulk concession assignment feature allows administrators to assign the same concession to multiple students at once, significantly reducing the time needed for mass concession assignments.

## Location
- **Page**: `/finance/student-concessions`
- **Component**: `BulkConcessionAssignmentModal`
- **API Endpoint**: `finance.bulkAssignConcession`

## How to Use

### 1. Access the Feature
1. Navigate to **Finance > Student Concessions**
2. Click the **"Bulk Assign"** button in the top-right corner

### 2. Select Students
- **Search**: Use the search bar to find specific students by name or admission number
- **Filter by Class**: Use the class dropdown to filter students by their class
- **Select Individual Students**: Check the boxes next to student names
- **Select All Filtered**: Click "Select All Filtered" to select all visible students
- **Clear All**: Click "Clear All" to deselect all students

### 3. Configure Concession Details
- **Concession Type**: Choose from available concession types
- **Custom Value** (Optional): Override the default concession value if needed
- **Reason**: Provide a mandatory reason for the concession assignment
- **Valid From**: Set the start date for the concession (defaults to today)
- **Valid Until** (Optional): Set an end date for the concession
- **Notes** (Optional): Add any additional notes

### 4. Review and Submit
- Review the selected students in the summary section
- Check the form completion progress bar
- Click **"Assign to X Students"** to submit

## Features

### Smart Validation
- **Duplicate Prevention**: Checks for existing active concessions of the same type
- **Student Validation**: Ensures all selected students belong to the current branch and session
- **Value Validation**: Validates custom values based on concession type constraints
- **Date Validation**: Ensures valid date ranges

### User Experience
- **Real-time Progress**: Form completion progress bar
- **Responsive Design**: Works on all device sizes
- **Batch Processing**: Efficient database operations using transactions
- **Error Handling**: Clear error messages for validation failures

### Performance
- **Batch Operations**: All concessions are created in a single database transaction
- **Optimized Queries**: Efficient validation queries to minimize database load
- **Progress Feedback**: Real-time feedback during the assignment process

## API Details

### Endpoint: `finance.bulkAssignConcession`

**Input Schema:**
```typescript
{
  studentIds: string[],           // Array of student IDs (minimum 1)
  concessionTypeId: string,       // Selected concession type
  customValue?: number,           // Optional custom value
  reason: string,                 // Required reason
  validFrom?: Date,               // Optional start date
  validUntil?: Date,              // Optional end date
  notes?: string,                 // Optional notes
  branchId: string,               // Current branch
  sessionId: string,              // Current session
  createdBy?: string              // Optional creator ID
}
```

**Response:**
```typescript
{
  success: boolean,
  assignedCount: number,          // Number of concessions created
  concessionType: string,         // Name of the concession type
  status: string,                 // "APPROVED" or "PENDING"
  concessionIds: string[]         // Array of created concession IDs
}
```

## Error Handling

### Common Errors
1. **No Students Selected**: At least one student must be selected
2. **Duplicate Concessions**: Student already has an active concession of the same type
3. **Invalid Students**: Some students don't belong to the current branch/session
4. **Value Constraints**: Custom value exceeds maximum allowed or percentage exceeds 100%
5. **Date Issues**: Invalid date ranges (end date before start date)

### Error Display
- Field-level validation errors appear below input fields
- General errors are displayed in alert components
- Specific conflicting students are listed by name and admission number

## Security & Permissions
- Protected endpoint requiring authentication
- Validates branch and session permissions
- Maintains audit trail through concession history records
- Respects existing concession approval workflows

## Related Components
- `StudentConcessionFormModal`: Single student concession assignment
- `ConcessionStatsCards`: Statistics dashboard
- `DataTable`: Main concessions list with filtering
- `ConcessionApprovalSettings`: Approval workflow configuration