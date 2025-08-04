"use client";

import { useEffect, useState } from "react";
import { getAuthRequestStats } from "@/utils/auth-debug";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthMonitor() {
  const [stats, setStats] = useState({
    count: 0,
    timeSinceReset: 0,
    requestsPerSecond: 0
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getAuthRequestStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-64 z-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Auth Monitor</CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-1">
        <div>Requests: {stats.count}</div>
        <div>Rate: {stats.requestsPerSecond.toFixed(2)}/sec</div>
        <div>Time: {Math.floor(stats.timeSinceReset / 1000)}s</div>
      </CardContent>
    </Card>
  );
}