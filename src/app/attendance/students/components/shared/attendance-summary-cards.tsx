"use client";

import React, { useMemo } from "react";
import { AttendanceStatus } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UserCheck, UserX, Clock, CheckCheck } from "lucide-react";

interface AttendanceSummaryCardsProps {
  attendanceData: Record<string, AttendanceStatus>;
  students: Array<{ student: { id: string } }>;
}

interface SummaryCardProps {
  title: string;
  count: number;
  total: number;
  color: string;
  icon: React.ReactNode;
}

function SummaryCard({ title, count, total, color, icon }: SummaryCardProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold">
              {count} <span className="text-sm font-normal text-muted-foreground">/ {total}</span>
            </h3>
          </div>
          <div className={`p-2 rounded-full ${color}`}>
            {icon}
          </div>
        </div>
        <Progress 
          className="h-1 mt-3" 
          value={percentage}
        />
      </CardContent>
    </Card>
  );
}

export default function AttendanceSummaryCards({ attendanceData, students }: AttendanceSummaryCardsProps) {
  const summary = useMemo(() => {
    const total = students.length;
    const present = Object.values(attendanceData).filter(status => status === AttendanceStatus.PRESENT).length;
    const absent = Object.values(attendanceData).filter(status => status === AttendanceStatus.ABSENT).length;
    const leave = Object.values(attendanceData).filter(status => status === AttendanceStatus.LEAVE).length;
    
    return {
      total,
      present,
      absent,
      leave,
      presentPercentage: total > 0 ? (present / total) * 100 : 0
    };
  }, [attendanceData, students]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <SummaryCard
        title="Present"
        count={summary.present}
        total={summary.total}
        color="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
        icon={<UserCheck className="h-5 w-5" />}
      />
      <SummaryCard
        title="Absent"
        count={summary.absent}
        total={summary.total}
        color="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
        icon={<UserX className="h-5 w-5" />}
      />
      <SummaryCard
        title="Leave"
        count={summary.leave}
        total={summary.total}
        color="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
        icon={<Clock className="h-5 w-5" />}
      />
      <SummaryCard
        title="Total"
        count={summary.total}
        total={summary.total}
        color="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
        icon={<CheckCheck className="h-5 w-5" />}
      />
    </div>
  );
}