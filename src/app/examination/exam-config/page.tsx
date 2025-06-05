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
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Search, Filter } from "lucide-react";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";

interface ExamConfigFormData {
  name: string;
  examTypeId: string;
  classId: string;
  sectionId?: string;
  subjectId: string;
  maxMarks: number;
  passingMarks: number;
  weightage: number;
  isActive: boolean;
}

export default function ExamConfigurationPage() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedExamType, setSelectedExamType] = useState<string>("");

  const [formData, setFormData] = useState<ExamConfigFormData>({
    name: "",
    examTypeId: "",
    classId: "",
    sectionId: "",
    subjectId: "",
    maxMarks: 100,
    passingMarks: 35,
    weightage: 1,
    isActive: true,
  });

  // Fetch data
  const { data: examConfigs, refetch: refetchConfigs } = api.examination.getExamConfigurations.useQuery({
    branchId: "1", // This should come from branch context
  });
  const { data: examTypes } = api.examination.getExamTypes.useQuery({
    branchId: "1", // This should come from branch context
  });
  const { data: classes } = api.class.getAll.useQuery();
  const { data: sections } = api.section.getAll.useQuery();
  const { data: subjects } = api.subject.getAll.useQuery();

  // Mutations
  const createConfig = api.examination.createExamConfiguration.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Exam configuration created successfully" });
      setIsCreateDialogOpen(false);
      resetForm();
      refetchConfigs();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateConfig = api.examination.updateExamConfiguration.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Exam configuration updated successfully" });
      setIsEditDialogOpen(false);
      setEditingConfig(null);
      resetForm();
      refetchConfigs();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteConfig = api.examination.deleteExamConfiguration.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Exam configuration deleted successfully" });
      refetchConfigs();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      examTypeId: "",
      classId: "",
      sectionId: "",
      subjectId: "",
      maxMarks: 100,
      passingMarks: 35,
      weightage: 1,
      isActive: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingConfig) {
      updateConfig.mutate({
        id: editingConfig.id,
        data: formData,
      });
    } else {
      createConfig.mutate({
        ...formData,
        branchId: "1", // This should come from branch context
      });
    }
  };

  const handleEdit = (config: any) => {
    setFormData({
      name: config.name,
      examTypeId: config.examTypeId,
      classId: config.classId,
      sectionId: config.sectionId || "",
      subjectId: config.subjectId,
      maxMarks: config.maxMarks,
      passingMarks: config.passingMarks,
      weightage: config.weightage,
      isActive: config.isActive,
    });
    setEditingConfig(config);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this configuration?")) {
      deleteConfig.mutate({ id });
    }
  };

  // Filter configurations
  const filteredConfigs = examConfigs?.filter((config: any) => {
    const matchesSearch = config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         config.subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         config.class.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = !selectedClass || config.classId === selectedClass;
    const matchesExamType = !selectedExamType || config.examTypeId === selectedExamType;
    
    return matchesSearch && matchesClass && matchesExamType;
  });

  const ConfigForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Configuration Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Math Unit Test 1"
            required
          />
        </div>
        <div>
          <Label htmlFor="examType">Exam Type</Label>
          <Select
            value={formData.examTypeId}
            onValueChange={(value) => setFormData({ ...formData, examTypeId: value })}
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
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="class">Class</Label>
          <Select
            value={formData.classId}
            onValueChange={(value) => setFormData({ ...formData, classId: value })}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes?.map((cls: any) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="section">Section (Optional)</Label>
          <Select
            value={formData.sectionId || "ALL_SECTIONS"}
            onValueChange={(value) => setFormData({ ...formData, sectionId: value === "ALL_SECTIONS" ? "" : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL_SECTIONS">All Sections</SelectItem>
              {sections?.map((section: any) => (
                <SelectItem key={section.id} value={section.id}>
                  {section.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="subject">Subject</Label>
          <Select
            value={formData.subjectId}
            onValueChange={(value) => setFormData({ ...formData, subjectId: value })}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects?.items?.map((subject: any) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="maxMarks">Maximum Marks</Label>
          <Input
            id="maxMarks"
            type="number"
            min="1"
            value={formData.maxMarks}
            onChange={(e) => setFormData({ ...formData, maxMarks: parseInt(e.target.value) })}
            required
          />
        </div>
        <div>
          <Label htmlFor="passingMarks">Passing Marks</Label>
          <Input
            id="passingMarks"
            type="number"
            min="0"
            value={formData.passingMarks}
            onChange={(e) => setFormData({ ...formData, passingMarks: parseInt(e.target.value) })}
            required
          />
        </div>
        <div>
          <Label htmlFor="weightage">Weightage (0-1)</Label>
          <Input
            id="weightage"
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={formData.weightage}
            onChange={(e) => setFormData({ ...formData, weightage: parseFloat(e.target.value) })}
            required
          />
        </div>
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
        <Button type="submit" disabled={createConfig.isPending || updateConfig.isPending}>
          {editingConfig ? "Update" : "Create"} Configuration
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exam Configuration</h1>
          <p className="text-gray-600 mt-2">
            Configure exams for classes and subjects with marks settings
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Configuration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Exam Configuration</DialogTitle>
              <DialogDescription>
                Set up a new exam configuration for a class and subject
              </DialogDescription>
            </DialogHeader>
            <ConfigForm />
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
                  placeholder="Search configurations..."
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
                {classes?.map((cls: any) => (
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
          </div>
        </CardContent>
      </Card>

      {/* Configurations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Configurations</CardTitle>
          <CardDescription>
            Manage exam configurations for different classes and subjects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Exam Type</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Max Marks</TableHead>
                <TableHead>Passing Marks</TableHead>
                <TableHead>Weightage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConfigs?.map((config: any) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">{config.name}</TableCell>
                  <TableCell>{config.examType.name}</TableCell>
                  <TableCell>{config.class.name}</TableCell>
                  <TableCell>{config.section?.name || "All"}</TableCell>
                  <TableCell>{config.subject.name}</TableCell>
                  <TableCell>{config.maxMarks}</TableCell>
                  <TableCell>{config.passingMarks}</TableCell>
                  <TableCell>{config.weightage}</TableCell>
                  <TableCell>
                    <Badge variant={config.isActive ? "default" : "secondary"}>
                      {config.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(config)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(config.id)}
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
            <DialogTitle>Edit Exam Configuration</DialogTitle>
            <DialogDescription>
              Update the exam configuration settings
            </DialogDescription>
          </DialogHeader>
          <ConfigForm />
        </DialogContent>
      </Dialog>
    </div>
  );
} 