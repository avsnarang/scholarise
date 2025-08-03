"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { 
  Clock, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Calendar,
  GraduationCap,
  MessageSquare,
  Phone
} from "lucide-react";

type ActionItem = {
  id: string;
  title: string;
  description: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "VERIFIED" | "REJECTED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: Date | null;
  completedAt: Date | null;
  verifiedAt: Date | null;
  completionNotes: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string | null;
    phone?: string | null;
    officialEmail?: string | null;
  };
  assignedBy: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string | null;
  };
  verifiedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string | null;
  } | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    rollNumber: number | null;
    section: {
      name: string;
      class: {
        name: string;
      };
    } | null;
    parent?: {
      id: string;
      fatherName: string | null;
      motherName: string | null;
      fatherMobile: string | null;
      motherMobile: string | null;
    } | null;
  };
  courtesyCallFeedback: {
    id: string;
    callDate: Date;
    purpose: string | null;
    feedback: string;
    followUp?: string | null;
    callerType: "TEACHER" | "HEAD";
  };
  branch: {
    id: string;
    name: string;
  };
};

interface ActionItemDetailsModalProps {
  actionItem: ActionItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
    case "REJECTED":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "CANCELLED":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "URGENT":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "HIGH":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case "MEDIUM":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "LOW":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "PENDING":
      return <Clock className="h-4 w-4" />;
    case "IN_PROGRESS":
      return <User className="h-4 w-4" />;
    case "COMPLETED":
      return <CheckCircle className="h-4 w-4" />;
    case "VERIFIED":
      return <CheckCircle className="h-4 w-4" />;
    case "REJECTED":
      return <XCircle className="h-4 w-4" />;
    case "CANCELLED":
      return <XCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

export function ActionItemDetailsModal({ 
  actionItem, 
  open, 
  onOpenChange 
}: ActionItemDetailsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Action Item Details</span>
            <div className="flex items-center gap-2">
              <Badge className={getPriorityColor(actionItem.priority)}>
                {actionItem.priority}
              </Badge>
              <Badge className={getStatusColor(actionItem.status)}>
                <span className="flex items-center gap-1">
                  {getStatusIcon(actionItem.status)}
                  {actionItem.status}
                </span>
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Action Item Information */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Action Item</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">{actionItem.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {actionItem.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Created:</span>
                    <p className="text-muted-foreground">
                      {format(new Date(actionItem.createdAt), "PPp")}
                    </p>
                  </div>
                  
                  {actionItem.dueDate && (
                    <div>
                      <span className="font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due Date:
                      </span>
                      <p className={`text-muted-foreground ${
                        new Date(actionItem.dueDate) < new Date() && 
                        !["COMPLETED", "VERIFIED", "CANCELLED"].includes(actionItem.status)
                          ? "text-red-600 font-medium" 
                          : ""
                      }`}>
                        {format(new Date(actionItem.dueDate), "PPp")}
                        {new Date(actionItem.dueDate) < new Date() && 
                         !["COMPLETED", "VERIFIED", "CANCELLED"].includes(actionItem.status) && (
                          <span className="ml-1 text-red-600">
                            <AlertTriangle className="h-3 w-3 inline" /> Overdue
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {actionItem.completedAt && (
                    <div>
                      <span className="font-medium">Completed:</span>
                      <p className="text-muted-foreground">
                        {format(new Date(actionItem.completedAt), "PPp")}
                      </p>
                    </div>
                  )}

                  {actionItem.verifiedAt && (
                    <div>
                      <span className="font-medium">Verified:</span>
                      <p className="text-muted-foreground">
                        {format(new Date(actionItem.verifiedAt), "PPp")}
                      </p>
                    </div>
                  )}
                </div>

                {actionItem.completionNotes && (
                  <div>
                    <span className="font-medium">Completion Notes:</span>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                      {actionItem.completionNotes}
                    </p>
                  </div>
                )}

                {actionItem.rejectionReason && (
                  <div>
                    <span className="font-medium text-red-600">Rejection Reason:</span>
                    <p className="text-sm text-red-600 leading-relaxed mt-1">
                      {actionItem.rejectionReason}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assignment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assignment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="font-medium">Assigned To:</span>
                  <div className="mt-1">
                    <p className="font-medium">
                      {actionItem.assignedTo.firstName} {actionItem.assignedTo.lastName}
                    </p>
                    {actionItem.assignedTo.employeeCode && (
                      <p className="text-xs text-muted-foreground">
                        Employee Code: {actionItem.assignedTo.employeeCode}
                      </p>
                    )}
                    {actionItem.assignedTo.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {actionItem.assignedTo.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <span className="font-medium">Assigned By:</span>
                  <div className="mt-1">
                    <p className="font-medium">
                      {actionItem.assignedBy.firstName} {actionItem.assignedBy.lastName}
                    </p>
                    {actionItem.assignedBy.employeeCode && (
                      <p className="text-xs text-muted-foreground">
                        Employee Code: {actionItem.assignedBy.employeeCode}
                      </p>
                    )}
                  </div>
                </div>

                {actionItem.verifiedBy && (
                  <div>
                    <span className="font-medium">Verified By:</span>
                    <div className="mt-1">
                      <p className="font-medium">
                        {actionItem.verifiedBy.firstName} {actionItem.verifiedBy.lastName}
                      </p>
                      {actionItem.verifiedBy.employeeCode && (
                        <p className="text-xs text-muted-foreground">
                          Employee Code: {actionItem.verifiedBy.employeeCode}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Student and Courtesy Call Information */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-semibold">
                    {actionItem.student.firstName} {actionItem.student.lastName}
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Admission No: {actionItem.student.admissionNumber}</p>
                    {actionItem.student.section && (
                      <p>
                        Class: {actionItem.student.section.class.name}-{actionItem.student.section.name}
                        {actionItem.student.rollNumber && ` • Roll No: ${actionItem.student.rollNumber}`}
                      </p>
                    )}
                  </div>
                </div>

                {actionItem.student.parent && (
                  <div>
                    <span className="font-medium">Parent Contact:</span>
                    <div className="text-sm text-muted-foreground space-y-1 mt-1">
                      {actionItem.student.parent.fatherName && (
                        <p className="flex items-center gap-1">
                          Father: {actionItem.student.parent.fatherName}
                          {actionItem.student.parent.fatherMobile && (
                            <span className="flex items-center gap-1 ml-2">
                              <Phone className="h-3 w-3" />
                              {actionItem.student.parent.fatherMobile}
                            </span>
                          )}
                        </p>
                      )}
                      {actionItem.student.parent.motherName && (
                        <p className="flex items-center gap-1">
                          Mother: {actionItem.student.parent.motherName}
                          {actionItem.student.parent.motherMobile && (
                            <span className="flex items-center gap-1 ml-2">
                              <Phone className="h-3 w-3" />
                              {actionItem.student.parent.motherMobile}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Related Courtesy Call
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Call Date:</span>
                    <p className="text-muted-foreground">
                      {format(new Date(actionItem.courtesyCallFeedback.callDate), "PPp")}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Caller Type:</span>
                    <p className="text-muted-foreground">
                      {actionItem.courtesyCallFeedback.callerType}
                    </p>
                  </div>
                </div>

                {actionItem.courtesyCallFeedback.purpose && (
                  <div>
                    <span className="font-medium">Purpose:</span>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                      {actionItem.courtesyCallFeedback.purpose}
                    </p>
                  </div>
                )}

                <div>
                  <span className="font-medium">Feedback:</span>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                    {actionItem.courtesyCallFeedback.feedback}
                  </p>
                </div>

                {actionItem.courtesyCallFeedback.followUp && (
                  <div>
                    <span className="font-medium">Follow-up Notes:</span>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                      {actionItem.courtesyCallFeedback.followUp}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}