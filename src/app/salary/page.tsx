"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SalaryManagementPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Salary Management</h1>
      </div>

      <Tabs defaultValue="structures">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="structures">Salary Structures</TabsTrigger>
          <TabsTrigger value="teachers">Teacher Salaries</TabsTrigger>
          <TabsTrigger value="employees">Employee Salaries</TabsTrigger>
        </TabsList>
        
        <TabsContent value="structures" className="mt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Create Salary Structure</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Define salary templates with Basic Salary, DA, PF and ESI percentages</p>
                <Button 
                  onClick={() => router.push("/salary/structures/new")}
                >
                  Create New Structure
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Manage Salary Structures</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">View and modify existing salary structures</p>
                <Button 
                  onClick={() => router.push("/salary/structures")}
                >
                  View All Structures
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="teachers" className="mt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Assign Teacher Salaries</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Assign salary structures to teachers</p>
                <Button 
                  onClick={() => router.push("/salary/teachers/assign")}
                >
                  Assign Salary
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Process Monthly Salaries</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Process teacher salaries for each month</p>
                <Button 
                  onClick={() => router.push("/salary/payments")}
                >
                  Process Salaries
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Apply Salary Increments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Apply annual or merit-based salary increments</p>
                <Button 
                  onClick={() => router.push("/salary/increments")}
                >
                  Manage Increments
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>View Salary Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">View and export teacher salary reports</p>
                <Button 
                  onClick={() => router.push("/salary/teachers/reports")}
                >
                  View Reports
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="employees" className="mt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Assign Employee Salaries</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Assign salary structures to employees</p>
                <Button 
                  onClick={() => router.push("/salary/employees/assign")}
                >
                  Assign Salary
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Process Monthly Salaries</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Process employee salaries for each month</p>
                <Button 
                  onClick={() => router.push("/salary/employees/process")}
                >
                  Process Salaries
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>View Salary Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">View and export employee salary reports</p>
                <Button 
                  onClick={() => router.push("/salary/employees/reports")}
                >
                  View Reports
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 