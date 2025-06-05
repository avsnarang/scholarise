"use client";

import React, { useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Target,
  Award,
  Info,
  BookOpen
} from "lucide-react";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";

interface AssessmentCategoryForm {
  name: string;
  code: string;
  description: string;
  maxMarks: number;
  order: number;
  isActive: boolean;
}

const initialForm: AssessmentCategoryForm = {
  name: "",
  code: "",
  description: "",
  maxMarks: 100,
  order: 0,
  isActive: true,
};

// Example assessment categories
const ASSESSMENT_EXAMPLES = [
  {
    name: "Subject Enrichment",
    code: "SUB_ENR",
    description: "Activities to enrich subject understanding",
    maxMarks: 5,
    order: 1,
  },
  {
    name: "Project Work",
    code: "PROJ",
    description: "Individual or group project assignments",
    maxMarks: 10,
    order: 2,
  },
  {
    name: "Debate Competition",
    code: "DEBATE",
    description: "Oral presentation and argumentation skills",
    maxMarks: 5,
    order: 3,
  },
  {
    name: "Lesson Ending Test",
    code: "LET",
    description: "Quick assessment at the end of each lesson",
    maxMarks: 2,
    order: 4,
  },
  {
    name: "Portfolio Assessment",
    code: "PORT",
    description: "Collection of student's best work",
    maxMarks: 10,
    order: 5,
  },
  {
    name: "Practical Work",
    code: "PRAC",
    description: "Hands-on laboratory or field work",
    maxMarks: 15,
    order: 6,
  },
];

export default function AssessmentCategoriesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssessmentCategoryForm>(initialForm);
  const [searchTerm, setSearchTerm] = useState("");

  // API calls with proper branch filtering
  const { data: categories, refetch } = api.examination.getAssessmentCategories.useQuery({
    branchId: "1", // This should come from branch context in a real app
  });

  const createMutation = api.examination.createAssessmentCategory.useMutation();
  const updateMutation = api.examination.updateAssessmentCategory.useMutation();
  const deleteMutation = api.examination.deleteAssessmentCategory.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          data: form,
        });
        toast({ 
          title: "Success", 
          description: "Assessment category updated successfully" 
        });
      } else {
        await createMutation.mutateAsync({
          ...form,
          branchId: "1", // This should come from branch context
        });
        toast({ 
          title: "Success", 
          description: "Assessment category created successfully" 
        });
      }
      
      setIsDialogOpen(false);
      setEditingId(null);
      setForm(initialForm);
      refetch();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to save assessment category",
        variant: "destructive" 
      });
    }
  };

  const handleEdit = (category: any) => {
    setForm({
      name: category.name,
      code: category.code,
      description: category.description || "",
      maxMarks: category.maxMarks,
      order: category.order,
      isActive: category.isActive,
    });
    setEditingId(category.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this assessment category?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast({ 
          title: "Success", 
          description: "Assessment category deleted successfully" 
        });
        refetch();
      } catch (error) {
        toast({ 
          title: "Error", 
          description: "Failed to delete assessment category",
          variant: "destructive" 
        });
      }
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleCreateExample = async (example: typeof ASSESSMENT_EXAMPLES[0]) => {
    try {
      await createMutation.mutateAsync({
        ...example,
        branchId: "1", // This should come from branch context
        isActive: true,
      });
      toast({ 
        title: "Success", 
        description: `${example.name} category created successfully` 
      });
      refetch();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: `Failed to create ${example.name} category`,
        variant: "destructive" 
      });
    }
  };

  // Filter categories based on search
  const filteredCategories = categories?.filter((category: any) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assessment Categories</h1>
          <p className="text-gray-600 mt-2">
            Manage different types of non-academic assessments and their configurations
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Assessment Category" : "Create Assessment Category"}
                </DialogTitle>
                <DialogDescription>
                  {editingId 
                    ? "Update the assessment category details below."
                    : "Add a new assessment category to the system."
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Subject Enrichment, Project Work"
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., SUB_ENR, PROJ"
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Optional description of the assessment category"
                    rows={3}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="maxMarks">Maximum Marks *</Label>
                  <Input
                    id="maxMarks"
                    type="number"
                    value={form.maxMarks}
                    onChange={(e) => setForm({ ...form, maxMarks: parseInt(e.target.value) || 0 })}
                    placeholder="100"
                    min="1"
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="order">Display Order</Label>
                  <Input
                    id="order"
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    min="0"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={form.isActive}
                    onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingId ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Categories</p>
                <p className="text-3xl font-bold text-gray-900">
                  {categories?.length || 0}
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Categories</p>
                <p className="text-3xl font-bold text-green-600">
                  {categories?.filter((cat: any) => cat.isActive).length || 0}
                </p>
              </div>
              <Award className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Configurations</p>
                <p className="text-3xl font-bold text-purple-600">
                  {categories?.reduce((sum: number, cat: any) => sum + (cat._count?.assessmentConfigs || 0), 0) || 0}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Categories</CardTitle>
          <CardDescription>
            Manage and configure different types of assessments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCategories && filteredCategories.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Max Marks</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Configurations</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((category: any) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{category.code}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {category.description || "-"}
                      </TableCell>
                      <TableCell>{category.maxMarks}</TableCell>
                      <TableCell>{category.order}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {category._count?.assessmentConfigs || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={category.isActive ? "default" : "secondary"}>
                          {category.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(category.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No assessment categories found</h3>
              <p className="text-gray-600 mb-4">
                Get started by creating your first assessment category or use our examples below.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Assessment Category
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Examples Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Common Assessment Categories
          </CardTitle>
          <CardDescription>
            Quick setup with commonly used assessment categories. Click to add any of these to your system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ASSESSMENT_EXAMPLES.map((example, index) => (
              <Card key={index} className="border-dashed border-2 hover:border-blue-300 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{example.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{example.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Code: {example.code}</span>
                        <span>Max: {example.maxMarks}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCreateExample(example)}
                      disabled={categories?.some((cat: any) => cat.code === example.code)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              These are example assessment categories commonly used in schools. You can create them with one click and then modify them as needed.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
} 