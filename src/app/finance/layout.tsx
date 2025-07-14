"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { FinanceErrorBoundary } from "@/components/finance/finance-error-boundary";

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout title="Finance" description="Manage school fees, payments, and financial reports">
      <FinanceErrorBoundary
        onError={(error, errorInfo) => {
          // Log to monitoring service in production
          console.error('Finance Module Error:', {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
            module: 'finance',
          });
        }}
      >
        {children}
      </FinanceErrorBoundary>
    </AppLayout>
  );
} 