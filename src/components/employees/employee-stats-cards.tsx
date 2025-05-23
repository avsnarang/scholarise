"use client";

import React from 'react';
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { 
  Users, 
  UserCheck,
  Building,
  Clock 
} from 'lucide-react';
import { 
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";

interface EmployeeStatsCardsProps {
  totalEmployees: number;
  totalEmployeesChange?: number;
  activeEmployees: number;
  activeEmployeesChange?: number;
  departmentCount?: number;
  departmentChange?: number;
  averageTenure?: number;
  tenureChange?: number;
}

export function EmployeeStatsCards({
  totalEmployees,
  totalEmployeesChange = 0,
  activeEmployees,
  activeEmployeesChange = 0,
  departmentCount = 0,
  departmentChange = 0,
  averageTenure = 0,
  tenureChange = 0,
}: EmployeeStatsCardsProps) {
  return (
    <div className="*:data-[slot=card]:from-[#00501B]/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Employees</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalEmployees.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={totalEmployeesChange >= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
              {totalEmployeesChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {totalEmployeesChange >= 0 ? "+" : ""}{totalEmployeesChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <Users className="size-4 text-[#00501B]" /> 
            All Employees
          </div>
          <div className="text-muted-foreground">
            Across all departments
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Employees</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {activeEmployees.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={activeEmployeesChange >= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
              {activeEmployeesChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {activeEmployeesChange >= 0 ? "+" : ""}{activeEmployeesChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <UserCheck className="size-4 text-[#00501B]" /> 
            Currently Active
          </div>
          <div className="text-muted-foreground">
            {totalEmployees > 0
              ? `${Math.round((activeEmployees / totalEmployees) * 100)}% of total staff`
              : "No employees found"}
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Departments</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {departmentCount.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={departmentChange >= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
              {departmentChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {departmentChange >= 0 ? "+" : ""}{departmentChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <Building className="size-4 text-[#00501B]" /> 
            Active Departments
          </div>
          <div className="text-muted-foreground">
            Organizational structure
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Average Tenure</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {averageTenure.toFixed(1)} years
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={tenureChange >= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
              {tenureChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {tenureChange >= 0 ? "+" : ""}{tenureChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <Clock className="size-4 text-[#00501B]" /> 
            Staff Retention
          </div>
          <div className="text-muted-foreground">
            Average years of service
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 