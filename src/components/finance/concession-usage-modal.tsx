"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Users, 
  GraduationCap, 
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  User,
  FileText,
  IndianRupee,
  Percent
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatIndianCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface ConcessionUsageStudent {
  id: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    rollNumber?: string | number | null;
    section?: {
      id: string;
      name: string;
      class: {
        id: string;
        name: string;
      };
    } | null;
  };
  customValue?: number;
  reason?: string | null;
  status: string;
  validFrom: string;
  validUntil?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

interface ConcessionType {
  id: string;
  name: string;
  description?: string | null;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  feeTermAmounts?: Record<string, number>;
}

interface ConcessionUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  concessionType: ConcessionType | null;
  students: ConcessionUsageStudent[];
  isLoading: boolean;
}

export function ConcessionUsageModal({
  isOpen,
  onClose,
  concessionType,
  students,
  isLoading
}: ConcessionUsageModalProps) {

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge variant="default" className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="h-3 w-3" />
            Approved
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="outline" className="gap-1 border-yellow-300 text-yellow-700 dark:text-yellow-400">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      case 'SUSPENDED':
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Suspended
          </Badge>
        );
      case 'EXPIRED':
        return (
          <Badge variant="outline" className="gap-1 text-gray-500">
            <Calendar className="h-3 w-3" />
            Expired
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const getConcessionValue = (student: ConcessionUsageStudent) => {
    if (!concessionType) return "N/A";
    
    if (student.customValue !== null && student.customValue !== undefined) {
      return concessionType.type === 'PERCENTAGE' 
        ? `${student.customValue}%` 
        : formatIndianCurrency(student.customValue);
    }
    
    if (concessionType.type === 'PERCENTAGE') {
      return `${concessionType.value}%`;
    } else {
      // For FIXED type, show if it's fee term wise
      if (concessionType.feeTermAmounts && Object.keys(concessionType.feeTermAmounts).length > 0) {
        return "Fee Term Wise";
      }
      return formatIndianCurrency(concessionType.value);
    }
  };

  const approvedStudents = students.filter(s => s.status === 'APPROVED');
  const pendingStudents = students.filter(s => s.status === 'PENDING');
  const otherStudents = students.filter(s => !['APPROVED', 'PENDING'].includes(s.status));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg text-white">
              <Users className="h-5 w-5" />
            </div>
            Concession Usage: {concessionType?.name}
          </DialogTitle>
          <DialogDescription className="text-base">
            Students who have this concession type applied or requested
          </DialogDescription>
        </DialogHeader>

        {concessionType && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    {concessionType.type === 'PERCENTAGE' ? (
                      <Percent className="h-3 w-3" />
                    ) : (
                      <IndianRupee className="h-3 w-3" />
                    )}
                    {concessionType.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}
                  </Badge>
                  <span className="font-mono text-sm font-semibold">
                    {concessionType.type === 'PERCENTAGE' 
                      ? `${concessionType.value}%`
                      : concessionType.feeTermAmounts && Object.keys(concessionType.feeTermAmounts).length > 0
                        ? "Fee Term Wise"
                        : formatIndianCurrency(concessionType.value)
                    }
                  </span>
                </div>
                {concessionType.description && (
                  <p className="text-sm text-muted-foreground">
                    {concessionType.description}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {students.length}
                </div>
                <div className="text-xs text-muted-foreground">Total Students</div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Approved</p>
                <p className="text-xl font-bold text-green-900 dark:text-green-100">{approvedStudents.length}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
          </div>
          
          <div className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Pending</p>
                <p className="text-xl font-bold text-yellow-900 dark:text-yellow-100">{pendingStudents.length}</p>
              </div>
              <Clock className="h-6 w-6 text-yellow-500" />
            </div>
          </div>
          
          <div className="p-3 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950 dark:to-slate-950 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Others</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{otherStudents.length}</p>
              </div>
              <AlertCircle className="h-6 w-6 text-gray-500" />
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-4 w-[200px]" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-muted-foreground">
                No Students Found
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                This concession type has not been applied to any students yet.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class & Section</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Concession Value</TableHead>
                  <TableHead>Valid Period</TableHead>
                  <TableHead>Applied Date</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((studentConcession) => (
                  <TableRow key={studentConcession.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                          <User className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {studentConcession.student.firstName} {studentConcession.student.lastName}
                          </div>
                          {studentConcession.student.rollNumber && (
                            <div className="text-xs text-muted-foreground">
                              Roll: {studentConcession.student.rollNumber}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <GraduationCap className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {studentConcession.student.section?.class.name || 'No Class'}
                          {studentConcession.student.section && ` - ${studentConcession.student.section.name}`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(studentConcession.status)}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {getConcessionValue(studentConcession)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div>From: {format(new Date(studentConcession.validFrom), "MMM dd, yyyy")}</div>
                        {studentConcession.validUntil && (
                          <div>Until: {format(new Date(studentConcession.validUntil), "MMM dd, yyyy")}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(studentConcession.createdAt), "MMM dd, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      {studentConcession.reason ? (
                        <div className="text-xs max-w-32 truncate" title={studentConcession.reason}>
                          {studentConcession.reason}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}