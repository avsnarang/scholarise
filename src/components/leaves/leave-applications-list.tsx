"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface LeaveApplicationsListProps {
  teacherId?: string;
  employeeId?: string;
  isAdmin?: boolean;
}

export function LeaveApplicationsList({
  teacherId,
  employeeId,
  isAdmin = false,
}: LeaveApplicationsListProps) {
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // For admin users, don't require teacherId or employeeId
  const shouldFetchAll = isAdmin && !teacherId && !employeeId;
  
  // Only fetch if we have a teacherId/employeeId OR we're an admin
  const { data: applications, isLoading, error } = api.leave.getApplications.useQuery(
    {
      teacherId,
      employeeId,
    },
    { 
      enabled: !!(teacherId || employeeId || shouldFetchAll)
    }
  );

  const utils = api.useContext();

  const updateStatus = api.leave.updateApplicationStatus.useMutation({
    onSuccess: () => {
      void utils.leave.getApplications.invalidate();
      toast({
        title: "Status updated",
        description: "The leave application status has been updated.",
      });
      setIsDialogOpen(false);
      setSelectedApplication(null);
      setComments("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">
            <span className="flex items-center">
              <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pending
            </span>
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="success" className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50">
            <span className="flex items-center">
              <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Approved
            </span>
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">
            <span className="flex items-center">
              <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Rejected
            </span>
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading applications...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-destructive">Error: {error.message}</p>
        <p className="text-muted-foreground mt-2">
          Please try refreshing the page or contact support.
        </p>
      </div>
    );
  }

  if (!applications?.length) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">No leave applications found.</p>
        {(teacherId || employeeId) && (
          <p className="mt-2">
            Submit a new application using the form above.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              {isAdmin && <TableHead className="font-medium">Staff Name</TableHead>}
              <TableHead className="font-medium">Leave Type</TableHead>
              <TableHead className="font-medium">Start Date</TableHead>
              <TableHead className="font-medium">End Date</TableHead>
              <TableHead className="font-medium">Duration</TableHead>
              <TableHead className="font-medium">Status</TableHead>
              <TableHead className="font-medium">Reason</TableHead>
              {isAdmin && <TableHead className="font-medium text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((application) => (
              <TableRow key={application.id} className="hover:bg-slate-50">
                {isAdmin && (
                  <TableCell className="font-medium">
                    {application.teacher ? 
                      `${application.teacher.firstName || ''} ${application.teacher.lastName || ''}`.trim() : 
                      application.employee ? 
                      `${application.employee.firstName || ''} ${application.employee.lastName || ''}`.trim() : 
                      `Unknown (ID: ${application.teacherId || application.employeeId || 'None'})`}
                    <div className="text-xs text-muted-foreground">
                      {application.teacher?.employeeCode || application.employee?.designation || ""}
                    </div>
                  </TableCell>
                )}
                <TableCell>{application.policy.name}</TableCell>
                <TableCell>{new Date(application.startDate).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(application.endDate).toLocaleDateString()}</TableCell>
                <TableCell>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    {Math.ceil(
                      (new Date(application.endDate).getTime() -
                        new Date(application.startDate).getTime()) /
                        (1000 * 60 * 60 * 24)
                    ) + 1}{" "}
                    days
                  </span>
                </TableCell>
                <TableCell>{getStatusBadge(application.status)}</TableCell>
                <TableCell>
                  <span className="line-clamp-2 max-w-[200px] text-sm">{application.reason}</span>
                </TableCell>
                {isAdmin && application.status === "PENDING" && (
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedApplication(application);
                        setIsDialogOpen(true);
                      }}
                      className="text-[#00501B] border-[#00501B] hover:bg-[#00501B]/5"
                    >
                      Review
                    </Button>
                  </TableCell>
                )}
                {isAdmin && application.status !== "PENDING" && (
                  <TableCell className="text-right">
                    <span className="text-sm text-muted-foreground">
                      {application.status.toLowerCase()}
                    </span>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#00501B]">Review Leave Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2">
            {/* Staff Information */}
            {isAdmin && selectedApplication && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <h4 className="font-semibold text-slate-700 mb-2 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Staff Information
                </h4>
                <p className="text-sm mb-1">
                  <span className="font-medium">Name:</span> {selectedApplication.teacher ? 
                    `${selectedApplication.teacher.firstName || ''} ${selectedApplication.teacher.lastName || ''}`.trim() : 
                    selectedApplication.employee ? 
                    `${selectedApplication.employee.firstName || ''} ${selectedApplication.employee.lastName || ''}`.trim() : 
                    `Unknown (ID: ${selectedApplication.teacherId || selectedApplication.employeeId || 'None'})`}
                </p>
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Position:</span> {selectedApplication.teacher?.employeeCode || selectedApplication.employee?.designation || "N/A"}
                </p>
              </div>
            )}

            {/* Leave Details */}
            <div className="border-t border-b border-slate-200 py-4">
              <h4 className="font-semibold text-slate-700 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Leave Details
              </h4>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500 font-medium">Type</p>
                  <p>{selectedApplication?.policy.name}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Duration</p>
                  <p>{selectedApplication && Math.ceil(
                    (new Date(selectedApplication.endDate).getTime() -
                      new Date(selectedApplication.startDate).getTime()) /
                      (1000 * 60 * 60 * 24)
                  ) + 1} days</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Start Date</p>
                  <p>{selectedApplication && new Date(selectedApplication.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">End Date</p>
                  <p>{selectedApplication && new Date(selectedApplication.endDate).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="mt-3">
                <p className="text-slate-500 font-medium">Reason</p>
                <p className="text-sm mt-1 bg-slate-50 p-2 rounded">{selectedApplication?.reason}</p>
              </div>
            </div>
            
            {/* Comments Section */}
            <div>
              <h4 className="font-semibold text-slate-700 mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Comments
              </h4>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add your comments here..."
                className="min-h-[80px]"
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setSelectedApplication(null);
                  setComments("");
                }}
                className="text-slate-600"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setIsSubmitting(true);
                  updateStatus.mutate({
                    id: selectedApplication.id,
                    status: "REJECTED",
                    comments,
                  });
                }}
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isSubmitting && updateStatus.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reject
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setIsSubmitting(true);
                  updateStatus.mutate({
                    id: selectedApplication.id,
                    status: "APPROVED",
                    comments,
                  });
                }}
                disabled={isSubmitting}
                className="bg-[#00501B] hover:bg-[#004016]"
              >
                {isSubmitting && updateStatus.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Approve
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 