"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function SalaryIncrementHistoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  // Generate available years (current year and 5 years before)
  const availableYears = Array.from({ length: 6 }, (_, i) => year - i);

  // Fetch all teachers
  const { data: teachers, isLoading: isLoadingTeachers } = api.teacher.getAll.useQuery({
    limit: 100,
  });

  // TODO: Implement this API endpoint in salary.ts
  // Fetch teacher salary increments
  // const { data: increments, isLoading: isLoadingIncrements } = 
  //   api.salary.getTeacherSalaryIncrements.useQuery(
  //     { 
  //       teacherId: selectedTeacher as string,
  //       year,
  //     },
  //     { enabled: !!selectedTeacher }
  //   );

  // Mocked increments data until API is implemented
  const increments = selectedTeacher ? [
    {
      id: "1",
      teacherId: selectedTeacher,
      incrementAmount: 5000,
      incrementPercentage: null,
      oldBasicSalary: 50000,
      newBasicSalary: 55000,
      effectiveDate: new Date("2023-04-01"),
      remarks: "Annual increment",
      createdAt: new Date("2023-03-15"),
    },
    {
      id: "2",
      teacherId: selectedTeacher,
      incrementAmount: null,
      incrementPercentage: 10,
      oldBasicSalary: 55000,
      newBasicSalary: 60500,
      effectiveDate: new Date("2023-10-01"),
      remarks: "Performance bonus",
      createdAt: new Date("2023-09-20"),
    }
  ] : [];
  const isLoadingIncrements = false;

  if (isLoadingTeachers) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Salary Increment History</h1>
        <Button 
          onClick={() => router.push("/salary/increments")}
        >
          Apply New Increment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Salary Increment Records</CardTitle>
          <CardDescription>
            View historical records of salary increments for teachers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Teacher</label>
              <Select
                onValueChange={(value) => setSelectedTeacher(value)}
                value={selectedTeacher || undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers?.items?.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.firstName} {teacher.lastName}
                      {teacher.employeeCode && ` (${teacher.employeeCode})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Year</label>
              <Select
                onValueChange={(value) => setYear(parseInt(value))}
                value={year.toString()}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((yr) => (
                    <SelectItem key={yr} value={yr.toString()}>
                      {yr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedTeacher ? (
            isLoadingIncrements ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : increments && increments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Increment</TableHead>
                    <TableHead>Old Salary</TableHead>
                    <TableHead>New Salary</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {increments.map((increment) => (
                    <TableRow key={increment.id}>
                      <TableCell>{format(new Date(increment.createdAt), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        {increment.incrementAmount !== null && increment.incrementAmount !== undefined
                          ? "Fixed Amount"
                          : "Percentage"}
                      </TableCell>
                      <TableCell>
                        {increment.incrementAmount !== null && increment.incrementAmount !== undefined
                          ? `₹${increment.incrementAmount.toLocaleString()}`
                          : `${increment.incrementPercentage}%`}
                      </TableCell>
                      <TableCell>₹{increment.oldBasicSalary.toLocaleString()}</TableCell>
                      <TableCell>₹{increment.newBasicSalary.toLocaleString()}</TableCell>
                      <TableCell>{format(new Date(increment.effectiveDate), "dd MMM yyyy")}</TableCell>
                      <TableCell>{increment.remarks}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-muted-foreground">No salary increments found for this teacher in {year}</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground">Select a teacher to view increment history</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 