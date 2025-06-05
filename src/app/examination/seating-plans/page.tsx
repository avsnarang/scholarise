"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Settings, 
  Download,
  Search,
  Users,
  MapPin,
  Calendar,
  FileText,
  Grid3X3,
  AlertTriangle
} from "lucide-react";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";

interface SeatingPlanForm {
  examScheduleId: string;
  room: string;
  totalSeats: number;
  seatsPerRow: number;
}

const initialForm: SeatingPlanForm = {
  examScheduleId: "",
  room: "",
  totalSeats: 40,
  seatsPerRow: 10,
};

export default function SeatingPlansPage() {
  const { toast } = useToast();
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSeat, setEditingSeat] = useState<any>(null);
  const [form, setForm] = useState<SeatingPlanForm>(initialForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExamSchedule, setSelectedExamSchedule] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");

  // Fetch data with proper branch filtering
  const { data: seatingPlans, refetch: refetchSeatingPlans } = api.examination.getSeatingPlans.useQuery({
    branchId: "1", // This should come from branch context
    examScheduleId: selectedExamSchedule || undefined,
    room: selectedRoom || undefined,
  });

  const { data: examSchedules } = api.examination.getExamSchedules.useQuery({
    branchId: "1", // This should come from branch context
  });

  // Mutations
  const generateSeatingPlan = api.examination.generateSeatingPlan.useMutation();
  const createSeatingPlan = api.examination.createSeatingPlan.useMutation();
  const deleteSeatingPlan = api.examination.deleteSeatingPlan.useMutation();

  const handleGenerateSeatingPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await generateSeatingPlan.mutateAsync({
        ...form,
        branchId: "1", // This should come from branch context
      });
      
      toast({ 
        title: "Success", 
        description: `Generated seating plan for ${result.studentsCount} students in ${result.room}` 
      });
      
      setIsGenerateDialogOpen(false);
      setForm(initialForm);
      refetchSeatingPlans();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to generate seating plan",
        variant: "destructive" 
      });
    }
  };

  const handleDeleteSeatingPlan = async (id: string) => {
    if (confirm("Are you sure you want to delete this seating arrangement?")) {
      try {
        await deleteSeatingPlan.mutateAsync({ id });
        toast({ 
          title: "Success", 
          description: "Seating arrangement deleted successfully" 
        });
        refetchSeatingPlans();
      } catch (error) {
        toast({ 
          title: "Error", 
          description: "Failed to delete seating arrangement",
          variant: "destructive" 
        });
      }
    }
  };

  // Filter seating plans
  const filteredSeatingPlans = seatingPlans?.filter((plan: any) => {
    const matchesSearch = 
      plan.student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.seatNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.room.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Group seating plans by room and exam schedule
  const groupedSeatingPlans = filteredSeatingPlans?.reduce((acc: any, plan: any) => {
    const key = `${plan.examSchedule.id}-${plan.room}`;
    if (!acc[key]) {
      acc[key] = {
        examSchedule: plan.examSchedule,
        room: plan.room,
        plans: [],
      };
    }
    acc[key].plans.push(plan);
    return acc;
  }, {}) || {};

  // Get unique rooms
  const uniqueRooms = [...new Set(seatingPlans?.map((plan: any) => plan.room) || [])];

  // Statistics
  const totalStudents = seatingPlans?.length || 0;
  const totalRooms = uniqueRooms.length;
  const averageSeatsPerRoom = totalRooms > 0 ? Math.round(totalStudents / totalRooms) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Seating Plans</h1>
          <p className="text-gray-600 mt-2">
            Generate and manage exam seating arrangements for different rooms and schedules
          </p>
        </div>
        
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Settings className="h-4 w-4 mr-2" />
              Generate Seating Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleGenerateSeatingPlan}>
              <DialogHeader>
                <DialogTitle>Generate Seating Plan</DialogTitle>
                <DialogDescription>
                  Configure the room layout and generate automatic seating arrangements
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="examSchedule">Exam Schedule *</Label>
                  <Select
                    value={form.examScheduleId}
                    onValueChange={(value) => setForm({ ...form, examScheduleId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select exam schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      {examSchedules?.map((schedule: any) => (
                        <SelectItem key={schedule.id} value={schedule.id}>
                          {schedule.examConfig.name} - {schedule.examConfig.class.name} - {schedule.examConfig.subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="room">Room *</Label>
                  <Input
                    id="room"
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                    placeholder="e.g., Room 101, Hall A, Lab 1"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="totalSeats">Total Seats *</Label>
                    <Input
                      id="totalSeats"
                      type="number"
                      value={form.totalSeats}
                      onChange={(e) => setForm({ ...form, totalSeats: parseInt(e.target.value) || 0 })}
                      placeholder="40"
                      min="1"
                      required
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="seatsPerRow">Seats per Row *</Label>
                    <Input
                      id="seatsPerRow"
                      type="number"
                      value={form.seatsPerRow}
                      onChange={(e) => setForm({ ...form, seatsPerRow: parseInt(e.target.value) || 0 })}
                      placeholder="10"
                      min="1"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsGenerateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={generateSeatingPlan.isPending}
                >
                  {generateSeatingPlan.isPending ? "Generating..." : "Generate"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-3xl font-bold text-gray-900">{totalStudents}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rooms Used</p>
                <p className="text-3xl font-bold text-green-600">{totalRooms}</p>
              </div>
              <MapPin className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Seats/Room</p>
                <p className="text-3xl font-bold text-purple-600">{averageSeatsPerRoom}</p>
              </div>
              <Grid3X3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Exam Schedules</p>
                <p className="text-3xl font-bold text-orange-600">{examSchedules?.length || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search students, seat numbers, or rooms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedExamSchedule || "ALL_SCHEDULES"} onValueChange={(value) => setSelectedExamSchedule(value === "ALL_SCHEDULES" ? "" : value)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by exam schedule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_SCHEDULES">All Schedules</SelectItem>
                {examSchedules?.map((schedule: any) => (
                  <SelectItem key={schedule.id} value={schedule.id}>
                    {schedule.examConfig.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedRoom || "ALL_ROOMS"} onValueChange={(value) => setSelectedRoom(value === "ALL_ROOMS" ? "" : value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by room" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_ROOMS">All Rooms</SelectItem>
                {(uniqueRooms as string[]).map((room: string) => (
                  <SelectItem key={room} value={room}>
                    {room}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Seating Plans by Room */}
      {Object.keys(groupedSeatingPlans).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedSeatingPlans).map(([key, group]: [string, any]) => (
            <Card key={key}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      {group.room}
                    </CardTitle>
                    <CardDescription>
                      {group.examSchedule.examConfig.name} - {group.examSchedule.examConfig.class.name} - {group.examSchedule.examConfig.subject.name}
                      <br />
                      Date: {new Date(group.examSchedule.examDate).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {group.plans.length} students
                    </Badge>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seat Number</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Roll Number</TableHead>
                      <TableHead>Row</TableHead>
                      <TableHead>Column</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.plans
                      .sort((a: any, b: any) => {
                        if (a.row !== b.row) return a.row - b.row;
                        return a.column - b.column;
                      })
                      .map((plan: any) => (
                        <TableRow key={plan.id}>
                          <TableCell>
                            <Badge variant="outline">{plan.seatNumber}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {plan.student.firstName} {plan.student.lastName}
                          </TableCell>
                          <TableCell>{plan.student.rollNumber}</TableCell>
                          <TableCell>{plan.row}</TableCell>
                          <TableCell>{plan.column}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {plan.notes || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteSeatingPlan(plan.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Grid3X3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No seating plans found</h3>
            <p className="text-gray-600 mb-4">
              Generate your first seating plan by selecting an exam schedule and configuring the room layout.
            </p>
            <Button onClick={() => setIsGenerateDialogOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Generate Seating Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            How to Generate Seating Plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Steps:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Select an exam schedule from the dropdown</li>
                <li>Enter the room name/number</li>
                <li>Specify total seats available in the room</li>
                <li>Set number of seats per row for organization</li>
                <li>Click Generate to automatically assign seats</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium mb-2">Tips:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Students are automatically assigned based on roll numbers</li>
                <li>Seating is arranged row by row for easy supervision</li>
                <li>You can generate multiple rooms for the same exam</li>
                <li>Export functionality helps create printable seat charts</li>
              </ul>
            </div>
          </div>
          
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Make sure the total seats are sufficient for all students in the selected exam configuration.
              If there are more students than seats, the generation will fail.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
} 