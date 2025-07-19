"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  FileText,
  TrendingUp,
  BarChart3,
  Settings,
  GraduationCap,
  Target,
  Award,
  Clock,
  PenTool,
  Database,
  LineChart,
  Layers,
} from "lucide-react";

const navigationItems = [
  {
    title: "Dashboard",
    href: "/examination",
    icon: GraduationCap,
    description: "Overview & analytics",
    colorVariant: "primary" as const,
    count: null,
  },
  {
    title: "Assessment Schemas",
    href: "/examination/assessment-schemas",
    icon: Layers,
    description: "Create & manage schemas",
    colorVariant: "primary" as const,
    count: null,
  },
  {
    title: "Score Entry",
    href: "/examination/score-entry",
    icon: PenTool,
    description: "Enter student scores",
    colorVariant: "secondary" as const,
    count: null,
  },
  {
    title: "Results Dashboard",
    href: "/examination/results-dashboard",
    icon: LineChart,
    description: "View analytics",
    colorVariant: "primary" as const,
    count: null,
  },
  {
    title: "Grade Configuration",
    href: "/examination/grade-scales",
    icon: Target,
    description: "Configure grading",
    colorVariant: "secondary" as const,
    count: null,
  },
  {
    title: "Report Cards",
    href: "/examination/report-cards",
    icon: FileText,
    description: "Generate PDF reports",
    colorVariant: "primary" as const,
    count: null,
  },
  {
    title: "Reports",
    href: "/examination/reports",
    icon: BarChart3,
    description: "Analytics & reports",
    colorVariant: "secondary" as const,
    count: null,
  },
];

interface ExaminationNavProps {
  className?: string;
}

export function ExaminationNav({ className }: ExaminationNavProps) {
  const pathname = usePathname();

  const getColorClasses = (variant: "primary" | "secondary") => {
    if (variant === "primary") {
      return {
        bg: "bg-[#00501B]",
        bgLight: "bg-[#00501B]/10",
        bgHover: "hover:bg-[#00501B]/20",
        text: "text-[#00501B]",
        textHover: "group-hover:text-[#00501B]",
        border: "border-[#00501B]/20",
        gradient: "from-[#00501B] to-[#00501B]/80",
        gradientFull: "bg-gradient-to-br from-[#00501B] to-[#00501B]/80",
      };
    } else {
      return {
        bg: "bg-[#A65A20]",
        bgLight: "bg-[#A65A20]/10",
        bgHover: "hover:bg-[#A65A20]/20",
        text: "text-[#A65A20]",
        textHover: "group-hover:text-[#A65A20]",
        border: "border-[#A65A20]/20",
        gradient: "from-[#A65A20] to-[#A65A20]/80",
        gradientFull: "bg-gradient-to-br from-[#A65A20] to-[#A65A20]/80",
      };
    }
  };

  return (
    <Card className={cn("border-0 shadow-lg overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Quick Navigation</h3>
            <p className="text-sm text-muted-foreground">Access assessment & examination modules</p>
          </div>
          <Badge variant="secondary" className="bg-[#00501B]/10 text-[#00501B] border-[#00501B]/20">
            <Clock className="mr-1 h-3 w-3" />
            Live
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const colors = getColorClasses(item.colorVariant);
            const isActive = pathname === item.href || (item.href !== "/examination" && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex flex-col items-center gap-3 rounded-xl p-4 text-center transition-all duration-200 hover:shadow-lg",
                  isActive 
                    ? `${colors.bgLight} ${colors.text} shadow-md` 
                    : "hover:bg-muted/50"
                )}
              >
                {/* Background gradient on hover */}
                <div className={cn(
                  "absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200",
                  colors.gradientFull,
                  "group-hover:opacity-5",
                  isActive && "opacity-10"
                )} />
                
                {/* Icon with proper hover states */}
                <div className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200",
                  isActive 
                    ? `${colors.gradientFull} text-white shadow-lg` 
                    : `bg-muted ${colors.textHover} group-hover:scale-110 group-hover:${colors.gradientFull} group-hover:text-white`
                )}>
                  <Icon className="h-5 w-5" />
                  
                  {/* Count badge */}
                  {item.count !== null && (
                    <div className={cn(
                      "absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium text-white",
                      colors.bg
                    )}>
                      {item.count}
                    </div>
                  )}
                </div>
                
                {/* Title and description */}
                <div className="relative space-y-1">
                  <p className={cn(
                    "text-sm font-medium transition-colors",
                    isActive ? colors.text : "text-foreground group-hover:" + colors.text.replace("text-", "")
                  )}>
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
} 