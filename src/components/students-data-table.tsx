import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AvatarFallback, AvatarImage, Avatar } from "@/components/ui/avatar"
import { User, BarChart } from "lucide-react"

// Define the structure of student data
interface Student {
  id: string;
  header: string;
  type: string;
  status: string;
  target: string;
  limit: string;
  reviewer: string;
}

export function StudentsDataTable({ data }: { data: Student[] }) {
  // Extract first name initial and last name initial for the avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    
    if (parts.length >= 2) {
      const first = parts[0]?.charAt(0) || '';
      const last = parts[1]?.charAt(0) || '';
      return (first + last).toUpperCase();
    }
    
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="border rounded-md overflow-hidden dark:border-[#303030]">
      <Table>
        <TableHeader className="bg-[#00501B]/5 dark:bg-[#7aad8c]/10">
          <TableRow>
            <TableHead className="w-[300px] dark:text-[#e6e6e6]">Student</TableHead>
            <TableHead className="dark:text-[#e6e6e6]">Class</TableHead>
            <TableHead className="dark:text-[#e6e6e6]">Status</TableHead>
            <TableHead className="text-right dark:text-[#e6e6e6]">Performance</TableHead>
            <TableHead className="text-right dark:text-[#e6e6e6]">Attendance</TableHead>
            <TableHead className="dark:text-[#e6e6e6]">Class Teacher</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-6 text-gray-500 dark:text-[#c0c0c0]">
                No student data available
              </TableCell>
            </TableRow>
          ) : (
            data.map((student) => (
              <TableRow 
                key={student.id}
                className="group hover:bg-[#00501B]/5 dark:hover:bg-[#7aad8c]/10 transition-colors dark:border-[#303030]"
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 bg-[#A65A20]/10 text-[#A65A20] dark:bg-[#e2bd8c]/20 dark:text-[#e2bd8c]">
                      <AvatarFallback>
                        {getInitials(student.header)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-[#00501B] group-hover:text-[#00501B] dark:text-[#7aad8c] dark:group-hover:text-[#7aad8c]">
                        {student.header}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="dark:text-[#e6e6e6]">{student.type}</TableCell>
                <TableCell>
                  <Badge 
                    variant={student.status === "Active" ? "outline" : "secondary"}
                    className={student.status === "Active" 
                      ? "border-green-200 bg-green-50 text-green-700 dark:border-[#7aad8c]/30 dark:bg-[#7aad8c]/10 dark:text-[#7aad8c]" 
                      : "border-gray-200 bg-gray-100 text-gray-700 dark:border-[#303030] dark:bg-[#272727] dark:text-[#c0c0c0]"
                    }
                  >
                    {student.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <BarChart className="h-4 w-4 text-[#00501B] dark:text-[#7aad8c]" />
                    <span className="dark:text-[#e6e6e6]">{student.target}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  <span className={parseInt(student.limit) > 92 
                    ? "text-[#00501B] dark:text-[#7aad8c]" 
                    : "text-[#A65A20] dark:text-[#e2bd8c]"
                  }>
                    {student.limit}
                  </span>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400 dark:text-[#c0c0c0]" />
                    <span className="text-sm dark:text-[#e6e6e6]">{student.reviewer}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
} 