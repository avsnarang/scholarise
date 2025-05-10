import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  heading: string;
  description?: string;
  children?: React.ReactNode;
  backPath?: string;
}

export function PageHeader({
  heading,
  description,
  children,
  backPath,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        {backPath && (
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 h-7 -ml-2 text-muted-foreground"
            asChild
          >
            <Link href={backPath}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Link>
          </Button>
        )}
        <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
} 