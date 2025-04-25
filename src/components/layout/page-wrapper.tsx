import React from "react";

interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageWrapper({ 
  children, 
  title, 
  subtitle,
  action
}: PageWrapperProps) {
  return (
    <div className="px-4 lg:px-6">
      {/* Page header with title and optional action button */}
      {(title || action) && (
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            {title && <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{title}</h1>}
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      
      {/* Main content */}
      <div className="w-full">{children}</div>
    </div>
  );
} 