# Clerk to Supabase Migration Guide

## Overview

This guide will walk you through the complete process of migrating all user accounts from Clerk to Supabase. Based on the diagnostic analysis, you have:

- **1,363 students** with Clerk accounts (100%)
- **624 parents** with Clerk accounts
- Additional teachers, employees, and admission staff with Clerk accounts

## ⚠️ Important Warnings

1. **This migration is irreversible** - Make sure you have database backups
2. **All users will receive temporary passwords** and need to reset them
3. **Downtime may be required** during the migration process
4. **Test the migration in a staging environment first**

## Pre-Migration Checklist

### 1. Backup Your Database
```bash
# Create a backup before starting
npm run db:backup
```

### 2. Verify Supabase Configuration
Ensure these environment variables are properly set:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Run Pre-Migration Diagnostics
```bash
npm run diagnose:import
```

This will show you exactly how many accounts need to be migrated.

### 4. Test Supabase Connection
Create a test user to ensure Supabase is working:
```bash
# You can test creating a user in Supabase dashboard
```

## Migration Process

### Step 1: Run the Main Migration Script

```bash
npm run migrate:clerk-to-supabase
```

This script will:
- ✅ Fetch all users from database (students, parents, teachers, employees, admission staff)
- ✅ Create corresponding Supabase accounts for each user
- ✅ Set temporary password: `TempPass123!`
- ✅ Preserve all user metadata and roles
- ✅ Update database records to point to new Supabase user IDs
- ✅ Generate a detailed migration report

**Expected Output:**
```
🔍 Fetching all Clerk user data from database...
Found 1363 students with Clerk IDs
Found 624 parents with Clerk IDs
Found X teachers with Clerk IDs
Found X employees with Clerk IDs
📊 Total users found: XXXX

🚀 Starting migration of XXXX users in batches of 5...
✅ Created Supabase user for student@example.com
✅ Updated student record with Supabase ID
...
🎉 Migration completed!
```

### Step 2: Update RBAC Role Assignments

```bash
npm run migrate:update-rbac
```

This script will:
- ✅ Create default system roles (Student, Parent, Teacher, Employee, Admin, etc.)
- ✅ Assign appropriate roles to all migrated users
- ✅ Update Supabase user metadata with roles and permissions
- ✅ Ensure proper branch-level access control

**Expected Output:**
```
📋 Ensuring default roles exist...
✅ Created role: Student
✅ Created role: Parent
👨‍🎓 Updating student role assignments...
✅ Updated 1363 student role assignments
👨‍👩‍👧‍👦 Updating parent role assignments...
✅ Updated 624 parent role assignments
🎉 RBAC update completed successfully!
```

### Step 3: Verify Migration Success

Run the verification script:
```bash
npm run verify:migration
```

## Post-Migration Tasks

### 1. Update User Passwords

All users have been assigned the temporary password: `TempPass123!`

**Recommended approaches:**
- Send password reset emails to all users
- Implement forced password change on first login
- Provide clear instructions to users about the migration

### 2. Test Authentication

Test login for each user type:
- ✅ Students: `studentemail@domain.com` / `TempPass123!`
- ✅ Parents: `parentemail@domain.com` / `TempPass123!`
- ✅ Teachers: `teacher@tsh.edu.in` / `TempPass123!`
- ✅ Employees: `employee@tsh.edu.in` / `TempPass123!`

### 3. Verify Role-Based Access

- ✅ Students can only see their own data
- ✅ Parents can see their children's data
- ✅ Teachers can access classroom management features
- ✅ Employees have appropriate admin access
- ✅ Branch-specific access is working

### 4. Update Application Code

Remove any remaining Clerk dependencies:
```bash
# Search for any remaining Clerk references
grep -r "clerk" src/ --exclude-dir=node_modules
```

### 5. Monitor for Issues

- Check Supabase auth logs for any authentication failures
- Monitor user support requests for login issues
- Verify that all features work correctly with Supabase auth

## Email Templates for Users

### For Students
```
Subject: Important: Your School Account Has Been Updated

Dear [Student Name],

Your school account has been migrated to a new authentication system. 

Your login details:
- Email: [student_email]
- Temporary Password: TempPass123!

Please log in and change your password immediately.

Login URL: [your_domain]/sign-in
```

### For Parents
```
Subject: Important: Your Parent Portal Account Has Been Updated

Dear [Parent Name],

Your parent portal account has been migrated to a new system.

Your login details:
- Email: [parent_email]  
- Temporary Password: TempPass123!

Please log in and change your password immediately.

Login URL: [your_domain]/sign-in
```

### For Staff (Teachers/Employees)
```
Subject: Important: Staff Portal Migration Complete

Dear [Staff Name],

Your staff account has been successfully migrated to our new authentication system.

Your login details:
- Email: [staff_email]
- Temporary Password: TempPass123!

Please log in and change your password immediately.

Login URL: [your_domain]/sign-in
```

## Troubleshooting

### Common Issues

#### 1. "User already exists" errors
If you see duplicate email errors:
- Check if some users were already migrated
- The script will skip users that already have Supabase UUIDs

#### 2. Rate limiting from Supabase
The script includes automatic delays between batches to prevent rate limiting.

#### 3. Missing role assignments
Run the RBAC update script again:
```bash
npm run migrate:update-rbac
```

#### 4. Email delivery issues
- Configure Supabase email templates
- Set up SMTP configuration in Supabase
- Consider using a transactional email service

### Rollback Plan

If you need to rollback (not recommended after users start using new system):

1. Restore database from backup
2. Revert environment variables to Clerk
3. Redeploy application with Clerk authentication

## Migration Reports

Both scripts generate detailed reports saved to `migration-reports/`:
- `clerk-supabase-migration-[timestamp].txt`
- `rbac-update-[timestamp].txt`

These reports contain:
- Success/failure statistics
- Error details
- User counts by type
- Post-migration recommendations

## Security Considerations

### 1. Temporary Passwords
- All users get the same temporary password initially
- Implement forced password changes
- Consider password complexity requirements

### 2. Session Management
- All existing sessions will be invalidated
- Users need to log in again with new credentials

### 3. API Security
- Update any API authentication to use Supabase tokens
- Verify JWT verification is working correctly

### 4. Audit Trail
- Migration creates audit trail in user metadata
- Original Clerk IDs are preserved for reference

## Performance Considerations

### 1. Migration Speed
- Script processes users in batches of 5 to avoid rate limits
- Total migration time depends on user count
- Approximately 2-3 minutes per 100 users

### 2. Database Performance
- Multiple database updates during migration
- Consider running during low-traffic hours

### 3. Supabase Limits
- Monitor Supabase usage during migration
- Check rate limits and quotas

## Success Criteria

Migration is successful when:
- ✅ All Clerk user accounts are migrated to Supabase
- ✅ All users can log in with temporary passwords
- ✅ Role-based access control is working
- ✅ All application features work with Supabase auth
- ✅ No Clerk dependencies remain in the codebase
- ✅ Users can change their passwords
- ✅ Branch-specific access is enforced

## Support Plan

### Immediate Support (First 48 hours)
- Monitor login attempts and failures
- Respond quickly to user authentication issues
- Be prepared to assist users with password resets

### Ongoing Support
- Update documentation to reflect new authentication
- Train support staff on Supabase-related issues
- Monitor system performance and auth logs

## Next Steps After Migration

1. **Remove Clerk Billing**: Cancel Clerk subscription
2. **Code Cleanup**: Remove all Clerk-related code and dependencies
3. **Documentation**: Update all technical documentation
4. **User Training**: Provide user guides for the new system
5. **Monitoring**: Set up alerts for authentication issues

---

## Emergency Contacts

- **Technical Lead**: [Your contact info]
- **Database Admin**: [DBA contact info]
- **Supabase Support**: [Supabase support details]

---

*Last Updated: [Date]*
*Migration Version: 1.0* 