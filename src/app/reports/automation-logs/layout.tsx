import { AppLayout } from "@/components/layout/app-layout";

export default function AutomationLogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout 
      title="Automation Logs - ScholaRise ERP"
      description="View automated message logs and delivery status"
    >
      {children}
    </AppLayout>
  );
} 