"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActionItemsStatsCards } from "@/components/action-items/action-items-stats-cards";
import { ActionItemsDataTable } from "@/components/action-items/action-items-data-table";
import { usePermissions } from "@/hooks/usePermissions";
import { Permission } from "@/types/permissions";
import { 
  Clock, 
  User, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  Plus,
  ListTodo
} from "lucide-react";
import { api } from "@/utils/api";
import { useAuth } from "@/hooks/useAuth";

export default function ActionItemsPage() {
  const { can } = usePermissions();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("my-tasks");

  // Check if user can view all action items (admin view) or just their own
  const canViewAll = can(Permission.VIEW_ALL_ACTION_ITEMS);
  const canViewOwn = can(Permission.VIEW_OWN_ACTION_ITEMS);
  const canCreate = can(Permission.CREATE_ACTION_ITEM);

  // Fetch my action items for the quick view
  const { data: myActionItems } = api.actionItems.getMyActionItems.useQuery(
    { limit: 5 },
    { enabled: canViewOwn }
  );

  if (!canViewOwn && !canViewAll) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Access Denied</h3>
              <p className="text-muted-foreground">
                You don't have permission to view action items.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-3 w-3" />;
      case "IN_PROGRESS":
        return <User className="h-3 w-3" />;
      case "COMPLETED":
        return <CheckCircle className="h-3 w-3" />;
      case "VERIFIED":
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "COMPLETED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "VERIFIED":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <ListTodo className="h-8 w-8" />
            Action Items
          </h1>
          <p className="text-muted-foreground">
            Track and manage action items from courtesy calls
          </p>
        </div>
        {/* Action Button */}
          {canCreate && (
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  // Navigate to courtesy calls to create action items
                  window.location.href = "/courtesy-calls";
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Action Item
                </Button>
              </div>
            )
          }
      </div>

      {/* Stats Cards */}
      <ActionItemsStatsCards />

      {/* Main Content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          {canViewOwn && <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>}
          {canViewAll && <TabsTrigger value="all-tasks">All Tasks</TabsTrigger>}
        </TabsList>

        {/* My Tasks Tab */}
        {canViewOwn && (
          <TabsContent value="my-tasks" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Quick Overview */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">My Recent Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {myActionItems && myActionItems.length > 0 ? (
                      <div className="space-y-3">
                        {myActionItems.map((item) => (
                          <div
                            key={item.id}
                            className="space-y-2 rounded-lg border p-3"
                          >
                            <div className="flex items-start justify-between">
                              <h4 className="text-sm leading-tight font-medium">
                                {item.title}
                              </h4>
                              <Badge className={getStatusColor(item.status)}>
                                <span className="flex items-center gap-1">
                                  {getStatusIcon(item.status)}
                                  {item.status}
                                </span>
                              </Badge>
                            </div>
                            <div className="text-muted-foreground text-xs">
                              Student: {item.student.firstName}{" "}
                              {item.student.lastName}
                              {item.student.section && (
                                <span>
                                  {" "}
                                  • {item.student.section.class.name}-
                                  {item.student.section.name}
                                </span>
                              )}
                            </div>
                            {item.dueDate && (
                              <div className="text-muted-foreground text-xs">
                                Due:{" "}
                                {new Date(item.dueDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full"
                        >
                          <Eye className="mr-2 h-3 w-3" />
                          View All My Tasks
                        </Button>
                      </div>
                    ) : (
                      <div className="py-6 text-center">
                        <Clock className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
                        <p className="text-muted-foreground text-sm">
                          No action items assigned to you yet
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Detailed View */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>My Action Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ActionItemsDataTable showTeacherView={true} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        )}

        {/* All Tasks Tab */}
        {canViewAll && (
          <TabsContent value="all-tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Action Items</CardTitle>
                <p className="text-muted-foreground text-sm">
                  View and manage all action items across the organization
                </p>
              </CardHeader>
              <CardContent>
                <ActionItemsDataTable showTeacherView={false} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}