"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, BookOpen } from "lucide-react";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { useBranchContext } from "@/hooks/useBranchContext";

interface ExamTypeForm {
  name: string;
  code: string;
  description: string;
  order: number;
  isActive: boolean;
}

const initialForm: ExamTypeForm = {
  name: "",
  code: "",
  description: "",
  order: 0,
  isActive: true,
};

export default function ExamTypesPage() {
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExamTypeForm>(initialForm);

  // API calls with proper branch filtering
  const { data: examTypes, refetch } = api.examination.getExamTypes.useQuery({
    branchId: currentBranchId || undefined,
  });
  const createMutation = api.examination.createExamType.useMutation();
  const updateMutation = api.examination.updateExamType.useMutation();
  const deleteMutation = api.examination.deleteExamType.useMutation();

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
          description: "Exam type updated successfully" 
        });
      } else {
        await createMutation.mutateAsync({
          ...form,
          branchId: currentBranchId!,
        });
        toast({ 
          title: "Success", 
          description: "Exam type created successfully" 
        });
      }
      
      setIsDialogOpen(false);
      setEditingId(null);
      setForm(initialForm);
      refetch();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to save exam type",
        variant: "destructive" 
      });
    }
  };

  const handleEdit = (examType: any) => {
    setForm({
      name: examType.name,
      code: examType.code,
      description: examType.description || "",
      order: examType.order,
      isActive: examType.isActive,
    });
    setEditingId(examType.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this exam type?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast({ 
          title: "Success", 
          description: "Exam type deleted successfully" 
        });
        refetch();
      } catch (error) {
        toast({ 
          title: "Error", 
          description: "Failed to delete exam type",
          variant: "destructive" 
        });
      }
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Exam Types</h1>
          <p className="text-muted-foreground">
            Manage different types of examinations (Unit Test, Mid Term, Final, etc.)
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Exam Type
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Exam Type" : "Create Exam Type"}
                </DialogTitle>
                <DialogDescription>
                  {editingId 
                    ? "Update the exam type details below."
                    : "Add a new exam type to the system."
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
                    placeholder="e.g., Unit Test 1, Mid Term, Final Exam"
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., UT1, MT, FINAL"
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Optional description of the exam type"
                    rows={3}
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
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingId ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Exam Types</p>
                <p className="text-3xl font-bold text-gray-900">
                  {examTypes?.length || 0}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Types</p>
                <p className="text-3xl font-bold text-green-600">
                  {examTypes?.filter(et => et.isActive).length || 0}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-green-600 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive Types</p>
                <p className="text-3xl font-bold text-gray-600">
                  {examTypes?.filter(et => !et.isActive).length || 0}
                </p>
              </div>
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-gray-600 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exam Types Table */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Types</CardTitle>
          <CardDescription>
            Manage and configure different types of examinations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {examTypes && examTypes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examTypes
                  .sort((a, b) => a.order - b.order)
                  .map((examType) => (
                    <TableRow key={examType.id}>
                      <TableCell className="font-medium">{examType.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{examType.code}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {examType.description || "-"}
                      </TableCell>
                      <TableCell>{examType.order}</TableCell>
                      <TableCell>
                        <Badge variant={examType.isActive ? "default" : "secondary"}>
                          {examType.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(examType)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(examType.id)}
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
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No exam types found</h3>
              <p className="text-gray-600 mb-4">
                Get started by creating your first exam type.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Exam Type
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 