// Re-export the activity-aware provider for backward compatibility
// All auth functionality now uses the activity-aware implementation
export { ActivityAwareAuthProvider as AuthProvider, useAuth } from './activity-aware-auth-provider';