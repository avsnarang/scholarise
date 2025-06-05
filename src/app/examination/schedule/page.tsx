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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Edit, Trash2, Calendar as CalendarIcon, Clock, MapPin, Users, Search } from "lucide-react";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ExamScheduleFormData {
  examConfigId: string;
  examTypeId: string;
  examDate: Date | undefined;
  startTime: string;
  endTime: string;
  room?: string;
  invigilator?: string;
  instructions?: string;
  isActive: boolean;
}

export default function ExamSchedulePage() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedExamType, setSelectedExamType] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const [formData, setFormData] = useState<ExamScheduleFormData>({
    examConfigId: "",
    examTypeId: "",
    examDate: undefined,
    startTime: "09:00",
    endTime: "12:00",
    room: "",
    invigilator: "",
    instructions: "",
    isActive: true,
  });

  // Fetch data
  const { data: examSchedules, refetch: refetchSchedules } = api.examination.getExamSchedules.useQuery({
    branchId: "1", // This should come from branch context
  });
  const { data: examConfigs } = api.examination.getExamConfigurations.useQuery({
    branchId: "1", // This should come from branch context
  });
  const { data: examTypes } = api.examination.getExamTypes.useQuery({
    branchId: "1", // This should come from branch context
  });
  const { data: classes } = api.class.getAll.useQuery();

  // Mutations
  const createSchedule = api.examination.createExamSchedule.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Exam schedule created successfully" });
      setIsCreateDialogOpen(false);
      resetForm();
      refetchSchedules();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateSchedule = api.examination.updateExamSchedule.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Exam schedule updated successfully" });
      setIsEditDialogOpen(false);
      setEditingSchedule(null);
      resetForm();
      refetchSchedules();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteSchedule = api.examination.deleteExamSchedule.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Exam schedule deleted successfully" });
      refetchSchedules();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      examConfigId: "",
      examTypeId: "",
      examDate: undefined,
      startTime: "09:00",
      endTime: "12:00",
      room: "",
      invigilator: "",
      instructions: "",
      isActive: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.examDate) {
      toast({ 
        title: "Error", 
        description: "Please select an exam date", 
        variant: "destructive" 
      });
      return;
    }

    if (formData.startTime >= formData.endTime) {
      toast({ 
        title: "Error", 
        description: "End time must be after start time", 
        variant: "destructive" 
      });
      return;
    }

    // Create Date objects for start and end times
    const startDateTime = new Date(formData.examDate);
    const [startHour = "09", startMinute = "00"] = formData.startTime.split(':');
    startDateTime.setHours(parseInt(startHour), parseInt(startMinute));

    const endDateTime = new Date(formData.examDate);
    const [endHour = "12", endMinute = "00"] = formData.endTime.split(':');
    endDateTime.setHours(parseInt(endHour), parseInt(endMinute));

    const scheduleData = {
      examConfigId: formData.examConfigId,
      examTypeId: formData.examTypeId,
      examDate: formData.examDate,
      startTime: startDateTime,
      endTime: endDateTime,
      room: formData.room || undefined,
      invigilator: formData.invigilator || undefined,
      instructions: formData.instructions || undefined,
      isActive: formData.isActive,
    };

    if (editingSchedule) {
      updateSchedule.mutate({
        id: editingSchedule.id,
        data: scheduleData,
      });
    } else {
      createSchedule.mutate({
        ...scheduleData,
        branchId: "1", // This should come from branch context
      });
    }
  };

  const handleEdit = (schedule: any) => {
    setEditingSchedule(schedule);
    setFormData({
      examConfigId: schedule.examConfigId,
      examTypeId: schedule.examTypeId,
      examDate: new Date(schedule.examDate),
      startTime: format(new Date(schedule.startTime), 'HH:mm'),
      endTime: format(new Date(schedule.endTime), 'HH:mm'),
      room: schedule.room || "",
      invigilator: schedule.invigilator || "",
      instructions: schedule.instructions || "",
      isActive: schedule.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this exam schedule?")) {
      deleteSchedule.mutate({ id });
    }
  };

  // Filter schedules
  const filteredSchedules = examSchedules?.filter((schedule: any) => {
    const matchesSearch = schedule.examConfig.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         schedule.examConfig.subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         schedule.examConfig.class.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (schedule.room && schedule.room.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesClass = !selectedClass || schedule.examConfig.classId === selectedClass;
    const matchesExamType = !selectedExamType || schedule.examTypeId === selectedExamType;
    const matchesDate = !selectedDate || 
                       format(new Date(schedule.examDate), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
    
    return matchesSearch && matchesClass && matchesExamType && matchesDate;
  });

  // Get available exam configs for the selected exam type
  const availableConfigs = examConfigs?.filter((config: any) => 
    !formData.examTypeId || config.examTypeId === formData.examTypeId
  );

  const ScheduleForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="examType">Exam Type</Label>
          <Select
            value={formData.examTypeId}
            onValueChange={(value) => {
              setFormData({ ...formData, examTypeId: value, examConfigId: "" });
            }}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select exam type" />
            </SelectTrigger>
            <SelectContent>
              {examTypes?.map((type: any) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="examConfig">Exam Configuration</Label>
          <Select
            value={formData.examConfigId}
            onValueChange={(value) => setFormData({ ...formData, examConfigId: value })}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select exam configuration" />
            </SelectTrigger>
            <SelectContent>
              {availableConfigs?.map((config: any) => (
                <SelectItem key={config.id} value={config.id}>
                  {config.name} - {config.class.name} {config.section?.name} - {config.subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Exam Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.examDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.examDate ? format(formData.examDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.examDate}
                onSelect={(date) => setFormData({ ...formData, examDate: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="room">Room/Hall</Label>
          <Input
            id="room"
            value={formData.room}
            onChange={(e) => setFormData({ ...formData, room: e.target.value })}
            placeholder="e.g., Room 101, Main Hall"
          />
        </div>
        <div>
          <Label htmlFor="invigilator">Invigilator</Label>
          <Input
            id="invigilator"
            value={formData.invigilator}
            onChange={(e) => setFormData({ ...formData, invigilator: e.target.value })}
            placeholder="Teacher name or ID"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="instructions">Instructions</Label>
        <Textarea
          id="instructions"
          value={formData.instructions}
          onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
          placeholder="Special instructions for the exam"
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
        />
        <Label htmlFor="isActive">Active</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            resetForm();
          }}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={createSchedule.isPending || updateSchedule.isPending}>
          {editingSchedule ? "Update" : "Create"} Schedule
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exam Schedule</h1>
          <p className="text-gray-600 mt-2">
            Create and manage exam date sheets with timing and venue details
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Exam Schedule</DialogTitle>
              <DialogDescription>
                Schedule an exam with date, time, and venue details
              </DialogDescription>
            </DialogHeader>
            <ScheduleForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search schedules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedClass || "ALL_CLASSES"} onValueChange={(value) => setSelectedClass(value === "ALL_CLASSES" ? "" : value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_CLASSES">All Classes</SelectItem>
                {classes?.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedExamType || "ALL_EXAM_TYPES"} onValueChange={(value) => setSelectedExamType(value === "ALL_EXAM_TYPES" ? "" : value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by exam type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_EXAM_TYPES">All Exam Types</SelectItem>
                {examTypes?.map((type: any) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-48">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Filter by date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
                <div className="p-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(undefined)}
                    className="w-full"
                  >
                    Clear Filter
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Schedules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Schedules</CardTitle>
          <CardDescription>
            Manage exam schedules with dates, times, and venue information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exam</TableHead>
                <TableHead>Class/Section</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Invigilator</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSchedules?.map((schedule: any) => (
                <TableRow key={schedule.id}>
                  <TableCell className="font-medium">
                    {schedule.examType.name}
                    <div className="text-xs text-gray-500">{schedule.examConfig.name}</div>
                  </TableCell>
                  <TableCell>
                    {schedule.examConfig.class.name}
                    {schedule.examConfig.section && ` - ${schedule.examConfig.section.name}`}
                  </TableCell>
                  <TableCell>{schedule.examConfig.subject.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />
                      {format(new Date(schedule.examDate), "MMM dd, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-gray-400" />
                      {format(new Date(schedule.startTime), "HH:mm")} - {format(new Date(schedule.endTime), "HH:mm")}
                    </div>
                  </TableCell>
                  <TableCell>
                    {schedule.room && (
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                        {schedule.room}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {schedule.invigilator && (
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-gray-400" />
                        {schedule.invigilator}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={schedule.isActive ? "default" : "secondary"}>
                      {schedule.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(schedule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(schedule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Exam Schedule</DialogTitle>
            <DialogDescription>
              Update the exam schedule details
            </DialogDescription>
          </DialogHeader>
          <ScheduleForm />
        </DialogContent>
      </Dialog>
    </div>
  );
} 