# Supabase Password Change Scripts

This document explains how to use the scripts for changing passwords for all Supabase users.

## Overview

We have created two scripts to help with password management:

1. **Preview Script** (`preview-password-changes.ts`) - Shows what users would be affected (DRY RUN)
2. **Change Script** (`change-supabase-passwords.ts`) - Actually changes the passwords

## Target Configuration

- **New Password**: `TSH@630111`
- **Excluded User**: `avsnarang@tsh.edu.in` (will NOT be changed)
- **Status**: ✅ **COMPLETED** - Successfully updated 1,989 users on December 2024

## Prerequisites

Make sure you have the following environment variables set in your `.env` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Usage Instructions

### Step 1: Preview Changes (RECOMMENDED)

Before making any changes, run the preview script to see exactly which users will be affected:

```bash
npm run preview:password-changes
```

This will show you:
- Total number of users
- Which user will be excluded
- Breakdown by user roles
- Important considerations

### Step 2: Execute Password Changes

⚠️ **WARNING**: This will change passwords for ALL users except the excluded one!

```bash
npm run change:supabase-passwords
```

## Safety Features

### Built-in Safety Measures
- ✅ Excludes the specified user (`avsnarang@tsh.edu.in`)
- ✅ Shows progress for each user
- ✅ Handles errors gracefully
- ✅ Provides detailed summary
- ✅ Rate limiting to avoid API limits

### Recommended Safety Steps
1. **Test Connection**: Run `npm run test:supabase` first
2. **Preview First**: Always run the preview script before changes
3. **Backup**: Ensure you have backups
4. **Team Coordination**: Inform your team before running
5. **User Communication**: Notify users about the password change

## Script Output

The scripts provide detailed output including:
- 📊 User statistics
- 🚫 Excluded users
- ✅ Successful updates
- ❌ Failed updates with reasons
- 📱 Summary statistics

## Troubleshooting

If you encounter errors:

1. **Check Environment Variables**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is correct
2. **Verify Permissions**: Make sure you have admin access to Supabase
3. **Network Issues**: Check internet connection and Supabase status
4. **Rate Limits**: The script includes delays, but you may need to retry if rate limited

## After Running the Script

1. **Notify Users**: Inform all users about the new password: `TSH@630111`
2. **Test Login**: Verify a few users can log in with the new password
3. **Monitor**: Check for any login issues
4. **Consider Security**: You may want to require password changes on next login

## Files Created

- `scripts/change-supabase-passwords.ts` - Main password change script
- `scripts/preview-password-changes.ts` - Preview/dry-run script
- Added npm scripts in `package.json`:
  - `preview:password-changes`
  - `change:supabase-passwords`

## Security Notes

- The new password `TSH@12345` is temporary and should be communicated securely
- Consider implementing a "force password change on next login" policy
- Monitor for any unauthorized access attempts
- Keep audit logs of who ran these scripts and when 