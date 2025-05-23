import { Breadcrumbs } from "@/components/breadcrumbs";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ children, className = "" }: PageWrapperProps) {
  return (
    <div className={`w-full space-y-8 px-4 py-6 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
} 