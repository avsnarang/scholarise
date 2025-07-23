"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Settings, 
  Calendar, 
  BookOpen,
  AlertCircle,
  Clock,
  MessageSquare,
  Bell,
  FileText,
  BarChart3,
  User,
  Building
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

interface StatsCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
  color?: string;
}

function StatsCard({ title, value, description, icon, color = "text-[#00501B]" }: StatsCardProps) {
  return (
    <Card className="shadow-sm border border-[#00501B]/10 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className={`${color} opacity-80`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GenericDashboard() {
  const { user } = useAuth();
  const { isTeacher, isEmployee, isAdmin, isSuperAdmin } = useUserRole();
  const [activeTab, setActiveTab] = useState("overview");

  // Determine user's role for display
  const userRole = isTeacher ? "Teacher" : 
                   isEmployee ? "Employee" : 
                   isAdmin ? "Administrator" : 
                   isSuperAdmin ? "Super Administrator" : 
                   "User";

  const todayDate = new Date().toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });

  // Quick actions based on user permissions
  const quickActions = [
    {
      title: "Profile Settings",
      description: "Update your profile",
      icon: <User className="h-5 w-5" />,
      href: "/profile",
      show: true
    },
    {
      title: "Settings",
      description: "System configuration",
      icon: <Settings className="h-5 w-5" />,
      href: "/settings",
      show: isAdmin || isSuperAdmin
    },
    {
      title: "Students",
      description: "View students",
      icon: <Users className="h-5 w-5" />,
      href: "/students",
      show: true
    },
    {
      title: "Reports",
      description: "View reports",
      icon: <BarChart3 className="h-5 w-5" />,
      href: "/reports",
      show: true
    }
  ].filter(action => action.show);

  return (
    <div className="w-full p-6 bg-white min-h-screen">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-[#6B7280] to-[#6B7280]/80 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Welcome back!</h1>
              <p className="text-white/80 mt-1">
                {user?.name || user?.email?.split('@')[0] || 'User'} • {userRole}
              </p>
              <div className="flex items-center mt-3 space-x-4">
                <div className="flex items-center text-blue-200">
                  <Clock className="h-4 w-4 mr-1" />
                  <span className="text-sm">General Access Dashboard</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-sm">Today's Date</p>
              <p className="text-xl font-semibold">{todayDate}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Your Role"
            value={userRole}
            description="Current access level"
            icon={<User className="h-6 w-6" />}
            color="text-[#6B7280]"
          />
          <StatsCard
            title="System Access"
            value="Active"
            description="Account status"
            icon={<Building className="h-6 w-6" />}
            color="text-green-600"
          />
          <StatsCard
            title="Last Login"
            value="Today"
            description="Recent activity"
            icon={<Clock className="h-6 w-6" />}
            color="text-blue-600"
          />
          <StatsCard
            title="Notifications"
            value="0"
            description="Pending items"
            icon={<Bell className="h-6 w-6" />}
            color="text-orange-600"
          />
        </div>

        {/* Information Banner */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-900">General Access Dashboard</h3>
                <p className="text-blue-700 text-sm mt-1">
                  You're currently using the general access dashboard. If you have a specific role (Teacher, Employee, etc.), 
                  you may have access to a specialized dashboard with more features. Contact your administrator if you need 
                  additional access or if you believe you should have a role-specific dashboard.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-sm border border-[#6B7280]/10">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center">
              <Settings className="h-5 w-5 mr-2 text-[#6B7280]" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common tasks and navigation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <Link key={action.title} href={action.href}>
                  <Button 
                    variant="outline" 
                    className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-[#6B7280] hover:text-white transition-colors"
                  >
                    {action.icon}
                    <span className="text-sm">{action.title}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Access Information */}
          <Card className="shadow-sm border border-[#6B7280]/10">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Access Information</CardTitle>
              <CardDescription>Your current system access details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <h4 className="font-medium">Account Status</h4>
                    <p className="text-sm text-muted-foreground">Active and verified</p>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <h4 className="font-medium">Role Assignment</h4>
                    <p className="text-sm text-muted-foreground">{userRole}</p>
                  </div>
                  <User className="h-5 w-5 text-[#6B7280]" />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <h4 className="font-medium">Email</h4>
                    <p className="text-sm text-muted-foreground">{user?.email || "Not available"}</p>
                  </div>
                  <MessageSquare className="h-5 w-5 text-[#6B7280]" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Help & Support */}
          <Card className="shadow-sm border border-[#6B7280]/10">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Help & Support</CardTitle>
              <CardDescription>Get assistance and learn more</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <h4 className="font-medium">Contact Administrator</h4>
                    <p className="text-sm text-muted-foreground">Get help with access issues</p>
                  </div>
                  <MessageSquare className="h-5 w-5 text-[#6B7280]" />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <h4 className="font-medium">System Documentation</h4>
                    <p className="text-sm text-muted-foreground">Learn how to use the system</p>
                  </div>
                  <FileText className="h-5 w-5 text-[#6B7280]" />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <h4 className="font-medium">Report Issues</h4>
                    <p className="text-sm text-muted-foreground">Submit bug reports or feedback</p>
                  </div>
                  <AlertCircle className="h-5 w-5 text-[#6B7280]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 