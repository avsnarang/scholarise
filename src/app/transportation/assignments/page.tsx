"use client";

import React, { useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  Route,
  MapPin,
  UserCheck,
  AlertTriangle,
  Calendar,
  Search,
  Filter,
  Download,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  UserX,
} from "lucide-react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useToast } from "@/components/ui/use-toast";

interface AssignmentFormData {
  studentId: string;
  routeId?: string;
  stopId?: string;
  feeStructureId?: string;
  assignmentType: "ROUTE_ONLY" | "STOP_ONLY" | "ROUTE_STOP";
  startDate?: Date;
  endDate?: Date;
  notes?: string;
}

interface BulkAssignmentData {
  studentIds: string[];
  routeId?: string;
  stopId?: string;
  feeStructureId?: string;
  assignmentType: "ROUTE_ONLY" | "STOP_ONLY" | "ROUTE_STOP";
  startDate?: Date;
  endDate?: Date;
  notes?: string;
}

function StudentAssignmentForm({ 
  assignment, 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  assignment?: any; 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: AssignmentFormData) => void; 
}) {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  
  const [formData, setFormData] = useState<AssignmentFormData>({
    studentId: assignment?.studentId || "",
    routeId: assignment?.routeId || "",
    stopId: assignment?.stopId || "",
    feeStructureId: assignment?.feeStructureId || "",
    assignmentType: assignment?.assignmentType || "ROUTE_STOP",
    startDate: assignment?.startDate ? new Date(assignment.startDate) : new Date(),
    endDate: assignment?.endDate ? new Date(assignment.endDate) : undefined,
    notes: assignment?.notes || "",
  });

  // Fetch data for dropdowns
  const { data: students } = api.student.getAll.useQuery(
    { branchId: currentBranchId || undefined },
    { enabled: !!currentBranchId }
  );

  const { data: routes } = api.transportation.getRoutes.useQuery(
    { branchId: currentBranchId || undefined },
    { enabled: !!currentBranchId }
  );

  const { data: stops } = api.transportation.getStops.useQuery(
    { routeId: formData.routeId },
    { enabled: !!formData.routeId }
  );

  const { data: feeStructures } = api.transportation.getFeeStructures.useQuery(
    { branchId: currentBranchId || undefined, sessionId: currentSessionId || undefined },
    { enabled: !!currentBranchId && !!currentSessionId }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof AssignmentFormData, value: any) => {
    setFormData(prev => ({ 
      ...prev, 
      [field]: value,
      // Clear stop selection when route changes
      ...(field === "routeId" && { stopId: "" })
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl">{assignment ? "Edit Assignment" : "Create New Assignment"}</DialogTitle>
          <DialogDescription>
            {assignment ? "Update student transportation assignment" : "Assign a student to transportation"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Tabs defaultValue="student" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="student" className="cursor-pointer">Student</TabsTrigger>
              <TabsTrigger value="transport" className="cursor-pointer">Transport</TabsTrigger>
              <TabsTrigger value="details" className="cursor-pointer">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="student" className="space-y-6 mt-6">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Student Selection</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="studentId" className="text-sm font-medium">Select Student *</Label>
                      <Select value={formData.studentId} onValueChange={(value) => handleInputChange("studentId", value)}>
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder="Choose a student" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {students?.items?.map((student: any) => (
                            <SelectItem key={student.id} value={student.id} className="cursor-pointer">
                              {student.firstName} {student.lastName} ({student.admissionNumber})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Search and select the student to assign transportation</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assignmentType" className="text-sm font-medium">Assignment Type *</Label>
                      <Select value={formData.assignmentType} onValueChange={(value) => handleInputChange("assignmentType", value)}>
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder="Select assignment type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ROUTE_ONLY" className="cursor-pointer">Route Only</SelectItem>
                          <SelectItem value="STOP_ONLY" className="cursor-pointer">Stop Only</SelectItem>
                          <SelectItem value="ROUTE_STOP" className="cursor-pointer">Route + Stop</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Choose whether to assign route, stop, or both</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="transport" className="space-y-6 mt-6">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Transportation Details</h4>
                  <div className="space-y-6">
                    {(formData.assignmentType === "ROUTE_ONLY" || formData.assignmentType === "ROUTE_STOP") && (
                      <div className="space-y-2">
                        <Label htmlFor="routeId" className="text-sm font-medium">Select Route *</Label>
                        <Select value={formData.routeId} onValueChange={(value) => handleInputChange("routeId", value)}>
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder="Choose a route" />
                          </SelectTrigger>
                          <SelectContent>
                            {routes?.map((route) => (
                              <SelectItem key={route.id} value={route.id} className="cursor-pointer">
                                {route.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Select the transportation route</p>
                      </div>
                    )}

                    {(formData.assignmentType === "STOP_ONLY" || formData.assignmentType === "ROUTE_STOP") && (
                      <div className="space-y-2">
                        <Label htmlFor="stopId" className="text-sm font-medium">Select Stop *</Label>
                        <Select value={formData.stopId} onValueChange={(value) => handleInputChange("stopId", value)}>
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder="Choose a stop" />
                          </SelectTrigger>
                          <SelectContent>
                            {stops?.map((stop) => (
                              <SelectItem key={stop.id} value={stop.id} className="cursor-pointer">
                                {stop.name} (Seq: {stop.sequence})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Select the pickup/drop stop</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="feeStructureId" className="text-sm font-medium">Fee Structure (Optional)</Label>
                      <Select value={formData.feeStructureId} onValueChange={(value) => handleInputChange("feeStructureId", value)}>
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder="Choose fee structure" />
                        </SelectTrigger>
                        <SelectContent>
                          {feeStructures?.map((fee) => (
                            <SelectItem key={fee.id} value={fee.id} className="cursor-pointer">
                              {fee.name} (₹{fee.amount})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Optional: Select applicable fee structure</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-6 mt-6">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Assignment Period</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="startDate" className="text-sm font-medium">Start Date</Label>
                      <DatePicker
                        value={formData.startDate}
                        onChange={(date) => handleInputChange("startDate", date)}
                        placeholder="Select start date"
                      />
                      <p className="text-xs text-muted-foreground">When the assignment becomes active</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate" className="text-sm font-medium">End Date (Optional)</Label>
                      <DatePicker
                        value={formData.endDate}
                        onChange={(date) => handleInputChange("endDate", date)}
                        placeholder="Select end date"
                      />
                      <p className="text-xs text-muted-foreground">Leave empty for ongoing assignment</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Any additional notes about this assignment"
                    rows={3}
                    className="cursor-text"
                  />
                  <p className="text-xs text-muted-foreground">Additional information or special instructions</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" className="cursor-pointer">
              {assignment ? "Update Assignment" : "Create Assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BulkAssignmentDialog({ 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: BulkAssignmentData) => void; 
}) {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [assignmentData, setAssignmentData] = useState<Omit<BulkAssignmentData, 'studentIds'>>({
    routeId: "",
    stopId: "",
    feeStructureId: "",
    assignmentType: "ROUTE_STOP",
    startDate: new Date(),
    endDate: undefined,
    notes: "",
  });

  // Fetch data
  const { data: students } = api.student.getAll.useQuery(
    { branchId: currentBranchId },
    { enabled: !!currentBranchId }
  );

  const { data: routes } = api.transportation.getRoutes.useQuery(
    { branchId: currentBranchId || undefined },
    { enabled: !!currentBranchId }
  );

  const { data: stops } = api.transportation.getStops.useQuery(
    { routeId: assignmentData.routeId },
    { enabled: !!assignmentData.routeId }
  );

  const { data: feeStructures } = api.transportation.getFeeStructures.useQuery(
    { branchId: currentBranchId || undefined, sessionId: currentSessionId || undefined },
    { enabled: !!currentBranchId && !!currentSessionId }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...assignmentData,
      studentIds: selectedStudents,
    });
  };

  const handleStudentSelection = (studentId: string, checked: boolean) => {
    setSelectedStudents(prev => 
      checked 
        ? [...prev, studentId]
        : prev.filter(id => id !== studentId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(students?.items?.map((s: any) => s.id) || []);
    } else {
      setSelectedStudents([]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Student Assignment</DialogTitle>
          <DialogDescription>
            Assign multiple students to transportation at once
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="students" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="students">Select Students</TabsTrigger>
              <TabsTrigger value="assignment">Assignment Details</TabsTrigger>
            </TabsList>

            <TabsContent value="students" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    checked={selectedStudents.length === students?.items?.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label>Select All ({students?.items?.length || 0} students)</Label>
                </div>
                <Badge variant="secondary">
                  {selectedStudents.length} selected
                </Badge>
              </div>

              <div className="border rounded-lg max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission No.</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Current Assignment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students?.items?.map((student: any) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedStudents.includes(student.id)}
                            onCheckedChange={(checked) => handleStudentSelection(student.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          {student.firstName} {student.lastName}
                        </TableCell>
                        <TableCell>{student.admissionNumber}</TableCell>
                        <TableCell>
                          {student.section?.class?.name}-{student.section?.name}
                        </TableCell>
                        <TableCell>
                          {/* Show existing assignment status */}
                          <Badge variant="outline">No assignment</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="assignment" className="space-y-4">
              <div>
                <Label>Assignment Type *</Label>
                <Select 
                  value={assignmentData.assignmentType} 
                  onValueChange={(value) => setAssignmentData(prev => ({ ...prev, assignmentType: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ROUTE_ONLY">Route Only</SelectItem>
                    <SelectItem value="STOP_ONLY">Stop Only</SelectItem>
                    <SelectItem value="ROUTE_STOP">Route + Stop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(assignmentData.assignmentType === "ROUTE_ONLY" || assignmentData.assignmentType === "ROUTE_STOP") && (
                <div>
                  <Label>Select Route *</Label>
                  <Select 
                    value={assignmentData.routeId} 
                    onValueChange={(value) => setAssignmentData(prev => ({ ...prev, routeId: value, stopId: "" }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a route" />
                    </SelectTrigger>
                    <SelectContent>
                      {routes?.map((route) => (
                        <SelectItem key={route.id} value={route.id}>
                          {route.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(assignmentData.assignmentType === "STOP_ONLY" || assignmentData.assignmentType === "ROUTE_STOP") && (
                <div>
                  <Label>Select Stop *</Label>
                  <Select 
                    value={assignmentData.stopId} 
                    onValueChange={(value) => setAssignmentData(prev => ({ ...prev, stopId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a stop" />
                    </SelectTrigger>
                    <SelectContent>
                      {stops?.map((stop) => (
                        <SelectItem key={stop.id} value={stop.id}>
                          {stop.name} (Seq: {stop.sequence})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Fee Structure (Optional)</Label>
                <Select 
                  value={assignmentData.feeStructureId} 
                  onValueChange={(value) => setAssignmentData(prev => ({ ...prev, feeStructureId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose fee structure" />
                  </SelectTrigger>
                  <SelectContent>
                    {feeStructures?.map((fee) => (
                      <SelectItem key={fee.id} value={fee.id}>
                        {fee.name} (₹{fee.amount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={assignmentData.startDate?.toISOString().split('T')[0]}
                    onChange={(e) => setAssignmentData(prev => ({ 
                      ...prev, 
                      startDate: e.target.value ? new Date(e.target.value) : undefined 
                    }))}
                  />
                </div>
                <div>
                  <Label>End Date (Optional)</Label>
                  <Input
                    type="date"
                    value={assignmentData.endDate?.toISOString().split('T')[0] || ""}
                    onChange={(e) => setAssignmentData(prev => ({ 
                      ...prev, 
                      endDate: e.target.value ? new Date(e.target.value) : undefined 
                    }))}
                  />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={assignmentData.notes}
                  onChange={(e) => setAssignmentData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes about these assignments"
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={selectedStudents.length === 0}>
              Assign {selectedStudents.length} Students
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function StudentAssignmentsPage() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRoute, setFilterRoute] = useState<string>("all");

  const { data: assignments, isLoading, refetch } = api.transportation.getAssignments.useQuery(
    {},
    { enabled: !!currentBranchId }
  );

  const { data: routes } = api.transportation.getRoutes.useQuery(
    { branchId: currentBranchId || undefined },
    { enabled: !!currentBranchId }
  );

  const createAssignmentMutation = api.transportation.createAssignment.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Student assigned successfully",
      });
      setIsFormOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAssignmentMutation = api.transportation.updateAssignment.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Assignment updated successfully",
      });
      setIsFormOpen(false);
      setSelectedAssignment(null);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAssignmentMutation = api.transportation.deleteAssignment.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Assignment removed successfully",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkAssignMutation = api.transportation.bulkAssignStudents.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      setIsBulkOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkUnassignMutation = api.transportation.bulkUnassignStudents.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddAssignment = () => {
    setSelectedAssignment(null);
    setIsFormOpen(true);
  };

  const handleEditAssignment = (assignment: any) => {
    setSelectedAssignment(assignment);
    setIsFormOpen(true);
  };

  const handleDeleteAssignment = (assignment: any) => {
    if (confirm(`Are you sure you want to remove ${assignment.student.firstName} ${assignment.student.lastName} from transportation?`)) {
      deleteAssignmentMutation.mutate({ id: assignment.id });
    }
  };

  const handleFormSubmit = (formData: AssignmentFormData) => {
    if (selectedAssignment) {
      updateAssignmentMutation.mutate({ id: selectedAssignment.id, data: formData });
    } else {
      createAssignmentMutation.mutate(formData);
    }
  };

  const handleBulkSubmit = (formData: BulkAssignmentData) => {
    bulkAssignMutation.mutate(formData);
  };

  // Filter assignments
  const filteredAssignments = assignments?.filter((assignment) => {
    const matchesSearch = 
      assignment.student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRoute = filterRoute === "all" || assignment.routeId === filterRoute;

    return matchesSearch && matchesRoute;
  });

  if (!currentBranchId || !currentSessionId) {
    return (
      <PageWrapper title="Student Assignments" subtitle="Manage student transportation assignments">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a branch and academic session to access assignment features.
          </AlertDescription>
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Student Assignments"
      subtitle="Manage student transportation assignments"
      action={
        <div className="flex gap-2">
          <Button onClick={() => setIsBulkOpen(true)} variant="outline" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Bulk Assign
          </Button>
          <Button onClick={handleAddAssignment} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Assign Student
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students by name or admission number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Select value={filterRoute} onValueChange={setFilterRoute}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by route" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Routes</SelectItem>
                {routes?.map((route) => (
                  <SelectItem key={route.id} value={route.id}>
                    {route.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Statistics Cards */}
        {assignments && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Assignments</p>
                    <p className="text-2xl font-bold">{assignments.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Active Assignments</p>
                    <p className="text-2xl font-bold">
                      {assignments.filter(a => a.isActive).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <Route className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Routes in Use</p>
                    <p className="text-2xl font-bold">
                      {new Set(assignments.filter(a => a.routeId).map(a => a.routeId)).size}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                    <XCircle className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Inactive Assignments</p>
                    <p className="text-2xl font-bold">
                      {assignments.filter(a => !a.isActive).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Assignments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Student Transportation Assignments</CardTitle>
            <CardDescription>
              View and manage all student transportation assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                    <div className="h-12 w-12 bg-gray-200 rounded"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-8 w-24 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : filteredAssignments && filteredAssignments.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Stop</TableHead>
                      <TableHead>Assignment Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {assignment.student.firstName} {assignment.student.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {assignment.student.admissionNumber}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {assignment.route ? (
                            <div className="flex items-center gap-1">
                              <Route className="h-3 w-3" />
                              <span className="text-sm">{assignment.route.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {assignment.stop ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="text-sm">{assignment.stop.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {assignment.assignmentType.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(assignment.startDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={assignment.isActive ? "default" : "secondary"}>
                            {assignment.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditAssignment(assignment)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Assignment
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteAssignment(assignment)}
                                className="text-red-600"
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Remove Assignment
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <Users className="h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {searchTerm || filterRoute !== "all" 
                      ? "No assignments match your search criteria." 
                      : "No student assignments added yet."}
                  </p>
                  {!searchTerm && filterRoute === "all" && (
                    <Button variant="outline" onClick={handleAddAssignment}>
                      <Plus className="h-4 w-4 mr-2" />
                      Assign First Student
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Forms and Dialogs */}
      <StudentAssignmentForm
        assignment={selectedAssignment}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedAssignment(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <BulkAssignmentDialog
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onSubmit={handleBulkSubmit}
      />
    </PageWrapper>
  );
} 