"use client";

import React from 'react';
import { Users, ArrowUp, ArrowDown, GraduationCap, Briefcase, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatsCardProps {
  title: string;
  value: number | string;
  change?: number;
  icon: React.ReactNode;
  subtitle?: string;
}

interface StaffOverviewStatsProps {
  totalStaff: number;
  totalStaffChange?: number;
  totalTeachers: number;
  teachersActive: number;
  totalEmployees: number;
  employeesActive: number;
  departmentCount?: number;
  averageTenure?: number;
}

const StatsCard = ({ title, value, change, icon, subtitle }: StatsCardProps) => {
  const isPositiveChange = (change || 0) >= 0;
  
  return (
    <Card className="w-full md:w-56 lg:w-64">
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div className="p-2 rounded-lg bg-primary/10">{icon}</div>
          {change !== undefined && (
            <div className={`flex items-center ${isPositiveChange ? 'text-green-500' : 'text-red-500'}`}>
              {isPositiveChange ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
              <span className="text-xs">{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export function StaffOverviewStats({
  totalStaff,
  totalStaffChange,
  totalTeachers,
  teachersActive,
  totalEmployees,
  employeesActive,
  departmentCount = 0,
  averageTenure = 0,
}: StaffOverviewStatsProps) {
  const teacherActivePercent = Math.round((teachersActive / (totalTeachers || 1)) * 100);
  const employeeActivePercent = Math.round((employeesActive / (totalEmployees || 1)) * 100);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="Total Staff"
        value={totalStaff}
        change={totalStaffChange}
        icon={<Users className="text-primary h-5 w-5" />}
      />
      <StatsCard
        title="Teachers"
        value={totalTeachers}
        icon={<GraduationCap className="text-primary h-5 w-5" />}
        subtitle={`${teacherActivePercent}% active`}
      />
      <StatsCard
        title="Employees"
        value={totalEmployees}
        icon={<Briefcase className="text-primary h-5 w-5" />}
        subtitle={`${employeeActivePercent}% active`}
      />
      <StatsCard
        title="Average Tenure"
        value={`${averageTenure.toFixed(1)} years`}
        icon={<Clock className="text-primary h-5 w-5" />}
      />
    </div>
  );
} 