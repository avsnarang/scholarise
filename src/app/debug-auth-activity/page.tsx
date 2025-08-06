'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/providers/auth-provider';
import { activityControls } from '@/lib/supabase/activity-aware-client';
import { RefreshCw, Pause, Play, Activity, Clock, Info } from 'lucide-react';

export default function AuthActivityDebugPage() {
  const { session, refreshSession } = useAuth();
  const [status, setStatus] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update status every second
  useEffect(() => {
    const updateStatus = () => {
      setStatus(activityControls.getStatus());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      activityControls.forceRefresh();
      await refreshSession();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePause = () => {
    activityControls.pauseRefresh();
  };

  const handleResume = () => {
    activityControls.resumeRefresh();
  };

  const getSessionExpiry = () => {
    if (!session?.expires_at) return 'N/A';
    const expiresAt = new Date(session.expires_at * 1000);
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    
    if (diff < 0) return 'Expired';
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
    
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Auth Activity Monitor
          </CardTitle>
          <CardDescription>
            Monitor authentication activity and token refresh behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Activity Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">App Status</div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={status?.isActive ? 'default' : 'secondary'}
                  className={status?.isActive ? 'bg-green-500' : ''}
                >
                  {status?.isActive ? 'Active' : 'Idle'}
                </Badge>
                {status?.isActive ? (
                  <span className="text-xs text-muted-foreground">Token refresh enabled</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Token refresh paused</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Time Since Activity</div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono">{status?.timeSinceActivity || 0}s</span>
              </div>
            </div>
          </div>

          {/* Session Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Session Status</div>
              <div className="flex items-center gap-2">
                <Badge variant={session ? 'default' : 'destructive'}>
                  {session ? 'Valid' : 'No Session'}
                </Badge>
                {session && (
                  <span className="text-xs text-muted-foreground">
                    Expires in: {getSessionExpiry()}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Last Refresh Attempt</div>
              <div className="font-mono text-sm">
                {status?.lastRefreshAttempt || 'Never'}
              </div>
            </div>
          </div>

          {/* Activity Details */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Last Activity</div>
            <div className="font-mono text-sm">
              {status?.lastActivity || 'Unknown'}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleForceRefresh}
              disabled={isRefreshing}
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Force Refresh
            </Button>
            
            <Button
              onClick={handlePause}
              disabled={!status?.isActive}
              variant="secondary"
              size="sm"
              className="gap-2"
            >
              <Pause className="h-4 w-4" />
              Pause Refresh
            </Button>
            
            <Button
              onClick={handleResume}
              disabled={status?.isActive}
              variant="secondary"
              size="sm"
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Resume Refresh
            </Button>
          </div>

          {/* Info Box */}
          <div className="rounded-lg bg-muted p-4">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  The app automatically pauses token refresh after 5 minutes of inactivity to prevent rate limiting on free Supabase tiers.
                </p>
                <p>
                  Activity is detected through mouse movements, clicks, keyboard input, and page visibility changes.
                </p>
                <p>
                  Token refresh automatically resumes when you interact with the app.
                </p>
              </div>
            </div>
          </div>

          {/* Configuration Info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Idle Timeout</div>
              <div className="font-mono">5 minutes</div>
            </div>
            <div>
              <div className="text-muted-foreground">Activity Check</div>
              <div className="font-mono">Every 30s</div>
            </div>
            <div>
              <div className="text-muted-foreground">Min Refresh Interval</div>
              <div className="font-mono">60s</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}