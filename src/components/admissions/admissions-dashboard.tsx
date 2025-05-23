"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { PlusCircle, Users, FileText, CheckCircle } from "lucide-react"
import { AdmissionsList } from "./admissions-list"
import { ApplicationsList } from "./applications-list"
import { LeadsList } from "./leads-list"
import { api } from "@/utils/api"
import { useRouter } from "next/navigation"

export function AdmissionsDashboard() {
  const router = useRouter()
  const { data: stats, isLoading } = api.admission.getAdmissionStats.useQuery(
    {
      fromDate: new Date(new Date().setDate(new Date().getDate() - 30)),
      toDate: new Date(),
    }
  )

  const handleNewApplication = () => {
    router.push("/admissions/applications/new")
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats?.totalApplications}
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? "..."
                : `+${stats?.pendingApplications} pending applications`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats?.inProgressLeads}
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? "..."
                : `+${stats?.newLeads} new leads this month`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admitted Students</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats?.acceptedApplications}
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? "..."
                : `+${stats?.completedLeads} enrolled this month`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading
                ? "..."
                : stats?.totalLeads
                ? `${Math.round(
                    (stats.acceptedApplications / stats.totalLeads) * 100
                  )}%`
                : "0%"}
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "..." : "Overall conversion rate"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Admissions Overview</h3>
        <Button onClick={handleNewApplication}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Application
        </Button>
      </div>

      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="admitted">Admitted</TabsTrigger>
        </TabsList>
        <TabsContent value="applications" className="space-y-4">
          <ApplicationsList />
        </TabsContent>
        <TabsContent value="leads" className="space-y-4">
          <LeadsList />
        </TabsContent>
        <TabsContent value="admitted" className="space-y-4">
          <AdmissionsList />
        </TabsContent>
      </Tabs>
    </div>
  )
} 