"use client";

import React, { useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Settings, 
  Award, 
  Target,
  Edit,
  Trash2,
  Star,
  StarOff,
  BookOpen,
  BarChart3
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { RouteGuard } from "@/components/route-guard";
import { Permission } from "@/types/permissions";
import { CreateGradeScaleDialog } from "@/components/assessment/CreateGradeScaleDialog";
import { EditGradeScaleDialog } from "@/components/assessment/EditGradeScaleDialog";
import { GradeRangesTable } from "@/components/assessment/GradeRangesTable";

export default function GradeScalesPage() {
  return (
    <RouteGuard requiredPermissions={[Permission.VIEW_EXAMINATIONS]}>
      <PageWrapper>
        <GradeScalesContent />
      </PageWrapper>
    </RouteGuard>
  );
}

function GradeScalesContent() {
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingScale, setEditingScale] = useState<any>(null);
  const [selectedScaleId, setSelectedScaleId] = useState<string>("");

  // Fetch all grade scales (both active and inactive)
  const { data: allGradeScales = [], isLoading, refetch } = api.examination.getGradeScales.useQuery(
    { branchId: currentBranchId || undefined }, // Remove isActive filter to show all
    { enabled: !!currentBranchId }
  );

  // Separate active and inactive scales
  const gradeScales = allGradeScales.filter((scale: any) => scale.isActive);
  const inactiveGradeScales = allGradeScales.filter((scale: any) => !scale.isActive);

  // Mutations
  const updateGradeScale = api.examination.updateGradeScale.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Grade scale updated successfully",
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

  const deleteGradeScale = api.examination.deleteGradeScale.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Grade scale deleted successfully",
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

  // Filter grade scales based on search
  const filteredGradeScales = gradeScales.filter((scale: any) =>
    scale.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSetDefault = async (scaleId: string) => {
    try {
      await updateGradeScale.mutateAsync({
        id: scaleId,
        data: { isDefault: true },
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleToggleActive = async (scaleId: string, isActive: boolean) => {
    const scale = allGradeScales.find(s => s.id === scaleId);
    
    // Prevent deactivating the default scale
    if (!isActive && scale?.isDefault) {
      toast({
        title: "Cannot Deactivate Default Scale",
        description: "You cannot deactivate the default grade scale. Please set another scale as default first.",
        variant: "destructive",
      });
      return;
    }

    // Show warning when deactivating a scale
    if (!isActive) {
      const confirmed = confirm(
        `Are you sure you want to deactivate "${scale?.name}"?\n\n` +
        `This will:\n` +
        `• Hide it from the grade scales list\n` +
        `• Make it unavailable for new assessments\n` +
        `• Existing assessment results using this scale will still show correctly\n\n` +
        `You can reactivate it later from the "Inactive Scales" section.`
      );
      
      if (!confirmed) return;
    }

    try {
      await updateGradeScale.mutateAsync({
        id: scaleId,
        data: { isActive },
      });
      
      toast({
        title: "Success",
        description: `Grade scale ${isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (scaleId: string) => {
    if (confirm("Are you sure you want to delete this grade scale? This action cannot be undone.")) {
      try {
        await deleteGradeScale.mutateAsync({ id: scaleId });
      } catch (error) {
        // Error handled by mutation
      }
    }
  };

  if (!currentBranchId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#00501B]">Grade Configuration</h1>
          <p className="mt-2 text-gray-500">
            Configure grading scales and grade boundaries
          </p>
        </div>
        
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Please select a branch to manage grade scales.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#00501B]">Grade Configuration</h1>
          <p className="mt-2 text-gray-500">
            Configure grading scales and grade boundaries for student assessments
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-[#00501B] hover:bg-[#00501B]/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Grade Scale
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Grade Scales</CardTitle>
            <Award className="h-4 w-4 text-[#00501B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allGradeScales.length}</div>
            <p className="text-xs text-muted-foreground">
              {gradeScales.length} active, {inactiveGradeScales.length} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Default Scale</CardTitle>
            <Star className="h-4 w-4 text-[#A65A20]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {gradeScales.find((s: any) => s.isDefault)?.name || "None"}
            </div>
            <p className="text-xs text-muted-foreground">
              Current default grading scale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grade Ranges</CardTitle>
            <BarChart3 className="h-4 w-4 text-[#00501B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {gradeScales.reduce((total: number, scale: any) => total + (scale.gradeRanges?.length || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total configured ranges
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Grade Scales</CardTitle>
              <CardDescription>
                Manage your grading scales and their corresponding grade ranges
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search grade scales..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[300px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading grade scales...</div>
            </div>
          ) : filteredGradeScales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Target className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "No grade scales found matching your search." : "No grade scales configured yet."}
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Grade Scale
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGradeScales.map((scale: any) => (
                <Card key={scale.id} className="border-l-4 border-l-[#00501B]">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold">{scale.name}</h3>
                            {scale.isDefault && (
                              <Badge variant="default" className="bg-[#A65A20]">
                                <Star className="mr-1 h-3 w-3" />
                                Default
                              </Badge>
                            )}
                            {!scale.isActive && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {scale.gradeRanges?.length || 0} grade range(s) configured
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!scale.isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefault(scale.id)}
                            disabled={updateGradeScale.isPending}
                          >
                            <Star className="mr-1 h-3 w-3" />
                            Set as Default
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingScale(scale)}
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(scale.id)}
                          disabled={scale.isDefault || deleteGradeScale.isPending}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={scale.isActive}
                            onCheckedChange={(checked) => handleToggleActive(scale.id, checked)}
                            disabled={updateGradeScale.isPending}
                          />
                          <Label className="text-sm">Active</Label>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <GradeRangesTable 
                      gradeScale={scale}
                      onRefresh={refetch}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive Grade Scales Section */}
      {inactiveGradeScales.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-red-700">Inactive Grade Scales</CardTitle>
                <CardDescription>
                  These scales are hidden from active use but can be reactivated
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-red-700 border-red-300">
                {inactiveGradeScales.length} inactive
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inactiveGradeScales.map((scale: any) => (
                <Card key={scale.id} className="border-l-4 border-l-red-400 bg-red-50/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold text-red-800">{scale.name}</h3>
                            <Badge variant="outline" className="text-red-700 border-red-300">
                              Inactive
                            </Badge>
                          </div>
                          <p className="text-sm text-red-600">
                            {scale.gradeRanges?.length || 0} grade range(s) configured
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(scale.id, true)}
                          disabled={updateGradeScale.isPending}
                          className="border-green-300 text-green-700 hover:bg-green-50"
                        >
                          <Star className="mr-1 h-3 w-3" />
                          Reactivate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingScale(scale)}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(scale.id)}
                          disabled={deleteGradeScale.isPending}
                          className="border-red-400 text-red-800 hover:bg-red-100"
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Grade Scale Dialog */}
      <CreateGradeScaleDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          refetch();
        }}
        branchId={currentBranchId}
      />

      {/* Edit Grade Scale Dialog */}
      {editingScale && (
        <EditGradeScaleDialog
          open={!!editingScale}
          onOpenChange={(open: boolean) => !open && setEditingScale(null)}
          gradeScale={editingScale}
          onSuccess={() => {
            setEditingScale(null);
            refetch();
          }}
        />
      )}
    </div>
  );
} 