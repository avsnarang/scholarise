import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatIndianNumber } from "@/lib/utils";

export interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  loading?: boolean;
  trend?: number | {
    value: number;
    isPositive: boolean;
  };
  color?: string;
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsCard({ 
  title, 
  value, 
  description, 
  icon, 
  loading = false, 
  trend, 
  color = "text-[#00501B]" 
}: StatsCardProps) {
  if (loading) {
    return (
      <Card className="shadow-sm border border-[#00501B]/10">
        <CardContent className="pt-6">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-[#00501B]/10 hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="text-2xl font-bold mt-1">
              {typeof value === 'number' ? formatIndianNumber(value) : value}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {trend !== undefined && (
              <div className="flex items-center mt-2">
                {typeof trend === 'number' ? (
                  // Handle simple number trend
                  trend > 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-xs text-green-500">+{trend}%</span>
                    </>
                  ) : trend < 0 ? (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                      <span className="text-xs text-red-500">{trend}%</span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500">No change</span>
                  )
                ) : (
                  // Handle object trend with isPositive property
                  trend.isPositive ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-xs text-green-500">{Math.abs(trend.value)}%</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                      <span className="text-xs text-red-500">{Math.abs(trend.value)}%</span>
                    </>
                  )
                )}
              </div>
            )}
          </div>
          <div className={`${color} bg-gray-50 p-3 rounded-lg`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}