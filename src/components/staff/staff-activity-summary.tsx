"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import { CalendarDays, Clock, User, CheckCircle, XCircle } from "lucide-react";

interface ActivityItem {
  id: string;
  type: "attendance" | "leave" | "salary";
  name: string;
  status: "present" | "absent" | "pending" | "approved" | "rejected" | "processed";
  date: string;
  time?: string;
  staffType: "teacher" | "employee";
}

interface StaffActivitySummaryProps {
  recentActivities: ActivityItem[];
}

export function StaffActivitySummary({ recentActivities }: StaffActivitySummaryProps) {
  const [currentTab, setCurrentTab] = useState<string>("all");
  
  const filteredActivities = currentTab === "all" 
    ? recentActivities 
    : recentActivities.filter(activity => 
        currentTab === "teachers" 
          ? activity.staffType === "teacher" 
          : activity.staffType === "employee"
      );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Staff Activity</CardTitle>
        <CardDescription>Latest attendance, leaves and other staff activities</CardDescription>
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Staff</TabsTrigger>
            <TabsTrigger value="teachers">Teachers</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredActivities.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No recent activities found</p>
          ) : (
            filteredActivities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg border">
                <div className="bg-primary/10 p-2 rounded-full">
                  {activity.type === "attendance" ? (
                    <Clock className="h-4 w-4 text-primary" />
                  ) : activity.type === "leave" ? (
                    <CalendarDays className="h-4 w-4 text-primary" />
                  ) : (
                    <User className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.date} {activity.time && `• ${activity.time}`}
                    <span className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold capitalize">
                      {activity.staffType}
                    </span>
                  </p>
                </div>
                <div>
                  <StatusBadge status={activity.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "present":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          <span>Present</span>
        </Badge>
      );
    case "absent":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          <span>Absent</span>
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          Pending
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          Rejected
        </Badge>
      );
    case "processed":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Processed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
} 