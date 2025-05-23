"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ShieldAlert } from "lucide-react";

export default function ForceAdminSwitch() {
  const [forceAdmin, setForceAdmin] = useState(false);

  // Initialize from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedForceAdmin = localStorage.getItem('forceAdmin') === 'true';
      setForceAdmin(savedForceAdmin);
    }
  }, []);

  // Update localStorage when the switch changes
  const handleForceAdminToggle = (checked: boolean) => {
    setForceAdmin(checked);
    localStorage.setItem('forceAdmin', checked.toString());
    
    // Force page reload to apply the change
    window.location.reload();
  };

  // In a production environment, we might want to hide this component
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (!isDevelopment) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 p-4 bg-white dark:bg-gray-900 shadow-lg rounded-lg border flex items-center space-x-2">
      <ShieldAlert className="h-4 w-4 text-red-500" />
      <Label htmlFor="force-admin" className="cursor-pointer text-sm">Force Admin Mode</Label>
      <Switch
        id="force-admin"
        checked={forceAdmin}
        onCheckedChange={handleForceAdminToggle}
      />
    </div>
  );
} 