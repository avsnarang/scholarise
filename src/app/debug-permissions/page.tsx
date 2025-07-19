"use client";

import { PermissionDebugger } from '@/components/debug/permission-debugger';

export default function DebugPermissionsPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Permission Debug Tool</h1>
      <PermissionDebugger />
    </div>
  );
} 