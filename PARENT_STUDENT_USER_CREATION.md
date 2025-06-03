# Parent-Student User Creation System

## Overview

This system ensures that when a parent user is created in Clerk, the associated student's user ID is also created. The implementation provides multiple robust approaches to handle parent-student user creation.

## Key Features

### 1. Automatic Credential Generation
- If no username/password is provided, the system automatically generates them based on branch codes
- Student usernames: `{admissionNumber}@{domain}` (e.g., `1000001@ps.tsh.edu.in`)
- Parent usernames: `P{admissionNumber}` (e.g., `P1000001`)
- Default passwords based on branch: `TSH{BRANCH}@12345`

### 2. Domain Mapping by Branch
```typescript
const emailDomain = branch.code === 'PS' ? 'ps.tsh.edu.in' :
                   branch.code === 'JUN' ? 'jun.tsh.edu.in' :
                   branch.code === 'MAJ' ? 'majra.tsh.edu.in' : 'tsh.edu.in';
```

### 3. Multiple Creation Endpoints

#### A. Student Creation (Recommended)
**Endpoint**: `student.create`
- **Purpose**: Primary method for creating students with parents
- **Features**: 
  - Creates both parent and student database records
  - Creates both parent and student Clerk users
  - Auto-generates credentials if not provided
  - Creates academic records
  - Handles parent-student relationships

```typescript
// Example usage in frontend
const result = await createStudent.mutateAsync({
  // Student info
  admissionNumber: "1000001",
  firstName: "John",
  lastName: "Doe",
  dateOfBirth: new Date("2010-01-01"),
  gender: "Male",
  branchId: "branch-id",
  sectionId: "section-id",
  
  // Optional credentials (will auto-generate if not provided)
  username: "john.doe@ps.tsh.edu.in",
  password: "TSHPS@12345",
  parentUsername: "P1000001",
  parentPassword: "TSHPS@12345",
  
  // Parent info
  fatherName: "Father Name",
  fatherEmail: "father@example.com",
  motherName: "Mother Name",
  // ... other parent fields
});
```

#### B. Parent Creation (Enhanced)
**Endpoint**: `parent.create`
- **Purpose**: Standalone parent creation with optional student creation
- **Features**:
  - Creates parent Clerk user if credentials provided
  - Can optionally create student as well
  - Supports all parent information fields

```typescript
// Example: Create parent only
const parentResult = await createParent.mutateAsync({
  fatherName: "Father Name",
  fatherEmail: "father@example.com",
  branchId: "branch-id",
  parentUsername: "P1000001",
  parentPassword: "TSHPS@12345",
});

// Example: Create parent with student
const result = await createParent.mutateAsync({
  // Parent info
  fatherName: "Father Name",
  fatherEmail: "father@example.com",
  branchId: "branch-id",
  parentUsername: "P1000001",
  parentPassword: "TSHPS@12345",
  
  // Student creation flag and info
  createStudentUser: true,
  studentFirstName: "John",
  studentLastName: "Doe",
  studentAdmissionNumber: "1000001",
  studentDateOfBirth: new Date("2010-01-01"),
  studentGender: "Male",
  studentSectionId: "section-id",
  studentUsername: "john.doe@ps.tsh.edu.in",
  studentPassword: "TSHPS@12345",
});
```

#### C. Parent-Student Pair Creation (New)
**Endpoint**: `parent.createWithStudent`
- **Purpose**: Guaranteed creation of both parent and student with Clerk users
- **Features**:
  - Always creates both parent and student
  - Ensures both Clerk users are created
  - Auto-generates credentials if not provided
  - Atomic operation with rollback on failure

```typescript
const result = await createWithStudent.mutateAsync({
  // Student info (required)
  studentFirstName: "John",
  studentLastName: "Doe",
  studentAdmissionNumber: "1000001",
  studentDateOfBirth: new Date("2010-01-01"),
  studentGender: "Male",
  studentSectionId: "section-id",
  branchId: "branch-id",
  
  // Parent info
  fatherName: "Father Name",
  fatherEmail: "father@example.com",
  
  // Optional credentials (will auto-generate if not provided)
  parentUsername: "P1000001",
  parentPassword: "TSHPS@12345",
  studentUsername: "john.doe@ps.tsh.edu.in",
  studentPassword: "TSHPS@12345",
});

// Returns both created records and generated credentials
const { parent, student, credentials } = result;
```

## Error Handling

### Automatic Cleanup
- If parent user creation fails, student Clerk user is automatically deleted
- Database transactions ensure data consistency
- Detailed error logging for troubleshooting

### Fallback Behavior
- If Clerk user creation fails, database records are still created
- Users can be created in Clerk later if needed
- System continues to function without authentication initially

## Branch-Specific Configurations

| Branch Code | Domain | Default Password |
|-------------|--------|------------------|
| PS | ps.tsh.edu.in | TSHPS@12345 |
| JUN | jun.tsh.edu.in | TSHJ@12345 |
| MAJ | majra.tsh.edu.in | TSHM@12345 |
| Default | tsh.edu.in | TSH@12345 |

## Database Schema

### Parent Table
```sql
model Parent {
  id        String    @id @default(cuid())
  clerkId   String?   -- Clerk user ID
  -- ... other parent fields
  students  Student[]
}
```

### Student Table
```sql
model Student {
  id        String  @id @default(cuid())
  clerkId   String? -- Clerk user ID
  parentId  String?
  parent    Parent? @relation(fields: [parentId], references: [id])
  -- ... other student fields
}
```

## Usage Recommendations

1. **For new student admissions**: Use `student.create` endpoint
2. **For existing parent adding new student**: Use `parent.createWithStudent`
3. **For standalone parent creation**: Use enhanced `parent.create`

## Migration Notes

Existing forms using `api.parent.create.useMutation()` will continue to work but won't create Clerk users unless updated to include authentication fields.

## Security Notes

- All passwords are handled securely by Clerk
- Auto-generated credentials follow secure patterns
- Email validation ensures proper format
- Branch-based access control through Clerk metadata 