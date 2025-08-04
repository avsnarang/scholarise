#!/bin/bash

# Migration script to switch to optimized auth
# Run this after implementing the fixes

echo "🔄 Migrating to optimized auth..."

# Backup current files
echo "📦 Creating backups..."
cp src/providers/auth-provider.tsx src/providers/auth-provider.backup.tsx
cp src/utils/api.ts src/utils/api.backup.ts

# Apply optimized versions
echo "✨ Applying optimized auth..."
cp src/providers/optimized-auth-provider.tsx src/providers/auth-provider.tsx
cp src/utils/api-optimized.ts src/utils/api.ts

echo "✅ Migration complete!"
echo ""
echo "Next steps:"
echo "1. Test authentication flow"
echo "2. Monitor auth requests in Supabase dashboard"
echo "3. Check for any errors in console"
echo ""
echo "To rollback:"
echo "cp src/providers/auth-provider.backup.tsx src/providers/auth-provider.tsx"
echo "cp src/utils/api.backup.ts src/utils/api.ts"