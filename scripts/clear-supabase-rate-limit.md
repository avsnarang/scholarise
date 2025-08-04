# Clearing Supabase Rate Limit

If you're experiencing rate limit issues with Supabase auth, here are the steps to resolve it:

## 1. Immediate Fix
The rate limit typically resets after 1 hour. You can:
- Wait for the rate limit to reset
- Contact Supabase support if urgent

## 2. Temporary Workaround
While waiting for the rate limit to reset, you can:
1. Use a different browser/incognito mode
2. Clear your browser cookies for the Supabase domain
3. Use a different IP address (VPN/mobile hotspot)

## 3. Prevent Future Issues
The code fixes applied will prevent this from happening again by:
- Removing redundant `getSession()` calls
- Fixing circular dependencies in React hooks
- Removing excessive retry logic

## 4. Monitor Auth Usage
You can monitor your auth usage in the Supabase dashboard:
1. Go to your Supabase project dashboard
2. Navigate to "Authentication" > "Usage"
3. Monitor the auth requests graph

## 5. Consider Upgrading
If you need higher rate limits:
- Supabase Free tier: 100 requests per hour per IP
- Supabase Pro tier: Much higher limits
- Contact Supabase for enterprise limits