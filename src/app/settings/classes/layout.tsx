import { SessionLoadingWrapper } from "@/components/layout/session-loading-wrapper";

export default function ClassesSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionLoadingWrapper>{children}</SessionLoadingWrapper>;
} 