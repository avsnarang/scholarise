# Activity-Aware Authentication System

## Overview

The activity-aware authentication system prevents excessive token refresh attempts when the application is idle, which helps avoid rate limiting on free Supabase tiers (429 errors).

## How It Works

### Activity Detection
- The system tracks user activity through various events:
  - Mouse movements and clicks
  - Keyboard input
  - Scrolling
  - Touch events
  - Page focus changes

### Idle Detection
- After 5 minutes of no activity, the app is marked as "idle"
- Token refresh is automatically paused when idle
- The app checks for idle state every 30 seconds

### Token Refresh Management
- **Active State**: Tokens are refreshed automatically before expiry
- **Idle State**: Token refresh is paused to prevent rate limiting
- **Resume**: Activity automatically resumes token refresh
- **Rate Limiting**: If rate limited, the system backs off with increasing delays

### Page Visibility
- When the tab/window is hidden, token refresh pauses
- When the tab/window becomes visible again, activity resumes

## Configuration

Edit `/src/config/auth-activity.config.ts` to adjust settings:

```typescript
export const AUTH_ACTIVITY_CONFIG = {
  IDLE_TIMEOUT: 5 * 60 * 1000,           // 5 minutes
  ACTIVITY_CHECK_INTERVAL: 30 * 1000,     // 30 seconds
  MIN_REFRESH_INTERVAL: 60 * 1000,        // 60 seconds
  MAX_BACKOFF_DELAY: 4 * 60 * 1000,      // 4 minutes
  DEBUG_MODE: false,                      // Enable debug logging
};
```

## Debug Page

Visit `/debug-auth-activity` to monitor:
- Current activity status (Active/Idle)
- Time since last activity
- Session expiry countdown
- Last refresh attempt
- Manual controls for testing

## Benefits

1. **Prevents Rate Limiting**: No more 429 errors on free tiers
2. **Reduces API Calls**: Saves bandwidth and server resources
3. **Battery Friendly**: Less background activity on mobile devices
4. **Automatic**: No user intervention required
5. **Resilient**: Handles rate limits gracefully with backoff

## Technical Details

### Components

1. **`/src/lib/supabase/activity-aware-client.ts`**
   - Custom Supabase client with activity tracking
   - Manages token refresh scheduling
   - Handles rate limiting and backoff

2. **`/src/providers/activity-aware-auth-provider.tsx`**
   - React context provider for authentication
   - Integrates activity-aware client
   - Manages auth state and session

3. **`/src/config/auth-activity.config.ts`**
   - Central configuration for timeouts and intervals
   - Easily adjustable settings

### Migration

The system is designed to be backward compatible:
- Existing imports of `AuthProvider` work without changes
- The original auth provider now re-exports the activity-aware version
- No changes required in components using `useAuth()`

## Troubleshooting

### App Not Refreshing Tokens
1. Check if the app has been idle for > 5 minutes
2. Move mouse or click to resume activity
3. Check `/debug-auth-activity` for status

### Still Getting 429 Errors
1. Increase `MIN_REFRESH_INTERVAL` in config
2. Increase `IDLE_TIMEOUT` for earlier idle detection
3. Check if multiple tabs are open (each counts as activity)

### Debug Mode
Enable debug logging by setting `DEBUG_MODE: true` in the config file to see detailed activity logs in the console.

## Best Practices

1. **Single Tab**: Use the app in a single tab when possible
2. **Close Unused Tabs**: Reduces unnecessary refresh attempts
3. **Monitor Usage**: Use the debug page to understand patterns
4. **Adjust Timeouts**: Customize based on your usage patterns