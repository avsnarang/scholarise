// Re-export the activity-aware provider as the default auth provider
// This maintains backward compatibility with existing imports
export { ActivityAwareAuthProvider as AuthProvider, useAuth } from './activity-aware-auth-provider';
export type { AuthContextType } from './activity-aware-auth-provider';