'use client';

import React, { useState } from 'react';
import { Plus, Eye, Edit, Trash2, Search, Filter, MoreVertical, FileText, Users, Calendar, BookOpen, Target, Calculator, Hash, AlertCircle, Loader2, Lock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AssessmentSchemaBuilder } from '@/components/assessment/AssessmentSchemaBuilder';
import { useAssessmentSchemas } from '@/hooks/useAssessmentSchemas';
import { api } from '@/utils/api';
import { useBranchContext } from '@/hooks/useBranchContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewSchemaDialog } from '@/components/assessment/ViewSchemaDialog';
import { EditSchemaDialog } from '@/components/assessment/EditSchemaDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';

export default function AssessmentSchemasPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedSchema, setSelectedSchema] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteSchemaId, setDeleteSchemaId] = useState<string | null>(null);
  
  const { currentBranchId } = useBranchContext();
  const { toast } = useToast();
  
  const { 
    schemas, 
    isLoading, 
    createSchema, 
    isCreating, 
    createError,
    updateSchema,
    isUpdating,
    updateError,
    deleteSchema,
    isDeleting,
    deleteError
  } = useAssessmentSchemas();
  
  // Fetch classes and subjects for the form
  const { data: classes = [] } = api.class.getAll.useQuery(
    { branchId: currentBranchId || undefined, includeSections: true },
    { enabled: !!currentBranchId }
  );
  
  const { data: subjects = [] } = api.subject.getAll.useQuery(
    {},
    { enabled: !!currentBranchId }
  );

  // Filter schemas based on search term
  const filteredSchemas = (schemas || []).filter((schema: any) =>
    schema.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schema.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schema.class?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schema.subject?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const totalSchemas = (schemas || []).length;
  const publishedSchemas = (schemas || []).filter((s: any) => s.isPublished).length;
  const draftSchemas = (schemas || []).filter((s: any) => s.isActive && !s.isPublished).length;
  const protectedSchemas = (schemas || []).filter((s: any) => hasStudentScores(s)).length;
  const totalComponents = (schemas || []).reduce((acc: number, schema: any) => acc + (schema.components?.length || 0), 0);

  const handleCreateSchema = async (data: any) => {
    try {
      await createSchema(data);
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Assessment schema created successfully",
      });
    } catch (error) {
      console.error('Failed to create schema:', error);
      toast({
        title: "Error",
        description: "Failed to create assessment schema",
        variant: "destructive",
      });
    }
  };

  const handleEditSchema = (schema: any) => {
    if (hasStudentScores(schema)) {
      toast({
        title: "Cannot Edit Schema",
        description: `This schema has ${schema._count.studentScores} student scores and cannot be edited.`,
        variant: "destructive",
      });
      return;
    }
    
    const schemaCopy = JSON.parse(JSON.stringify(schema));
    setSelectedSchema(schemaCopy);
    setIsEditDialogOpen(true);
  };

  const handleUpdateSchema = async (data: any) => {
    if (!selectedSchema) return;
    
    try {
      await updateSchema({ id: selectedSchema.id, data });
      setIsEditDialogOpen(false);
      setSelectedSchema(null);
      toast({
        title: "Success",
        description: "Assessment schema updated successfully",
      });
    } catch (error) {
      console.error('Failed to update schema:', error);
      toast({
        title: "Error",
        description: "Failed to update assessment schema",
        variant: "destructive",
      });
    }
  };

  const handleViewSchema = (schema: any) => {
    const schemaCopy = JSON.parse(JSON.stringify(schema));
    setSelectedSchema(schemaCopy);
    setIsViewDialogOpen(true);
  };

  const handleDeleteSchema = async (schemaId: string) => {
    try {
      await deleteSchema(schemaId);
      setDeleteSchemaId(null);
      toast({
        title: "Success",
        description: "Assessment schema deleted successfully",
      });
    } catch (error) {
      console.error('Failed to delete schema:', error);
      toast({
        title: "Error",
        description: "Failed to delete assessment schema",
        variant: "destructive",
      });
    }
  };



  const getStatusBadge = (schema: any) => {
    if (schema.isPublished) {
      return <Badge variant="default">Published</Badge>;
    } else if (schema.isActive) {
      return <Badge variant="secondary">Draft</Badge>;
    } else {
      return <Badge variant="outline">Inactive</Badge>;
    }
  };

  // Check if schema has student scores (is protected)
  const hasStudentScores = (schema: any) => {
    return schema?._count?.studentScores > 0;
  };

  // Get protection badge for schemas with scores
  const getProtectionBadge = (schema: any) => {
    if (hasStudentScores(schema)) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="destructive" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Protected
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Cannot edit or delete - has {schema._count.studentScores} student score(s)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Assessment Schemas</h1>
            <p className="text-muted-foreground">Create and manage assessment evaluation configurations</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Schema
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          <Card className="@container/card" data-slot="card">
            <CardHeader>
              <CardDescription>Total Schemas</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {totalSchemas.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-col items-start gap-1.5 text-sm pt-0">
              <div className="line-clamp-1 flex gap-2 font-medium">
                <FileText className="size-4 text-primary" />
                Assessment Schemas
              </div>
              <div className="text-muted-foreground">
                Total assessment configurations
              </div>
            </CardContent>
          </Card>
          
          <Card className="@container/card" data-slot="card">
            <CardHeader>
              <CardDescription>Published</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {publishedSchemas.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-col items-start gap-1.5 text-sm pt-0">
              <div className="line-clamp-1 flex gap-2 font-medium">
                <Target className="size-4 text-green-600" />
                Live Schemas
              </div>
              <div className="text-muted-foreground">
                {totalSchemas > 0
                  ? `${Math.round((publishedSchemas / totalSchemas) * 100)}% of total schemas`
                  : "No schemas found"}
              </div>
            </CardContent>
          </Card>
          
          <Card className="@container/card" data-slot="card">
            <CardHeader>
              <CardDescription>Protected Schemas</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {protectedSchemas.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-col items-start gap-1.5 text-sm pt-0">
              <div className="line-clamp-1 flex gap-2 font-medium">
                <Shield className="size-4 text-red-600" />
                With Student Scores
              </div>
              <div className="text-muted-foreground">
                {totalSchemas > 0
                  ? `${Math.round((protectedSchemas / totalSchemas) * 100)}% cannot be edited`
                  : "No protected schemas"}
              </div>
            </CardContent>
          </Card>
          
          <Card className="@container/card" data-slot="card">
            <CardHeader>
              <CardDescription>Total Components</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {totalComponents.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-col items-start gap-1.5 text-sm pt-0">
              <div className="line-clamp-1 flex gap-2 font-medium">
                <Calculator className="size-4 text-purple-600" />
                Assessment Parts
              </div>
              <div className="text-muted-foreground">
                {totalSchemas > 0
                  ? `Average ${Math.round(totalComponents / totalSchemas)} per schema`
                  : "No components found"}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Error Alerts */}
      {(createError || updateError || deleteError) && (
        <div className="space-y-2">
          {createError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Create Error: {createError.message}</AlertDescription>
            </Alert>
          )}
          {updateError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Update Error: {updateError.message}</AlertDescription>
            </Alert>
          )}
          {deleteError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Delete Error: {deleteError.message}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Search and Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Assessment Schemas
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredSchemas.length} of {totalSchemas} schemas
              </p>
            </div>
            
            {/* Search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search schemas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-3 w-[200px]" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ) : filteredSchemas.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? 'No matching schemas found' : 'No Assessment Schemas'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? 'Try adjusting your search terms or create a new schema.'
                    : 'Create your first assessment schema to get started.'
                  }
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Schema
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="border-t">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[300px]">Schema</TableHead>
                    <TableHead>Applied To</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead className="text-center">Components</TableHead>
                    <TableHead className="text-center">Total Marks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchemas.map((schema: any) => (
                    <TableRow key={schema.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{schema.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {schema.id.slice(0, 8)}...
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{schema.class?.name || 'N/A'}</span>
                          </div>
                          {schema.appliedClasses && Array.isArray(schema.appliedClasses) && schema.appliedClasses.length > 1 && (
                            <div className="text-xs text-muted-foreground">
                              +{schema.appliedClasses.length - 1} more classes
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{schema.subject?.name || 'N/A'}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{schema.term}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {schema.components?.length || 0}
                        </Badge>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <span className="font-mono text-sm font-medium">{schema.totalMarks}</span>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(schema)}
                          {getProtectionBadge(schema)}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {new Date(schema.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewSchema(schema)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {hasStudentScores(schema) ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <DropdownMenuItem disabled className="cursor-not-allowed">
                                        <Edit className="mr-2 h-4 w-4 opacity-50" />
                                        <span className="opacity-50">Edit</span>
                                        <Lock className="ml-2 h-3 w-3 opacity-50" />
                                      </DropdownMenuItem>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    <p>Cannot edit - schema has {schema._count.studentScores} student score(s)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => handleEditSchema(schema)}
                                disabled={isUpdating || isDeleting}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {hasStudentScores(schema) ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <DropdownMenuItem disabled className="cursor-not-allowed">
                                        <Trash2 className="mr-2 h-4 w-4 opacity-50" />
                                        <span className="opacity-50">Delete</span>
                                        <Lock className="ml-2 h-3 w-3 opacity-50" />
                                      </DropdownMenuItem>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    <p>Cannot delete - schema has {schema._count.studentScores} student score(s)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => setDeleteSchemaId(schema.id)}
                                className="text-destructive focus:text-destructive"
                                disabled={isUpdating || isDeleting}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setIsCreateDialogOpen(false)}
          />
          <div className="relative bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden z-10 border">
            <div className="border-b bg-background px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h2 className="text-lg font-semibold">Create Assessment Schema</h2>
                    <p className="text-sm text-muted-foreground">Set up a new assessment schema configuration</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
              <AssessmentSchemaBuilder
                classes={classes || []}
                subjects={Array.isArray(subjects) ? subjects : subjects?.items || []}
                onSave={handleCreateSchema}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* View Dialog */}
      <ViewSchemaDialog
        isOpen={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        schema={selectedSchema}
      />

      {/* Edit Dialog */}
      <EditSchemaDialog
        isOpen={isEditDialogOpen}
        onOpenChange={(open) => {
          if (!isUpdating) {
            setIsEditDialogOpen(open);
            if (!open) setSelectedSchema(null);
          }
        }}
        schema={selectedSchema}
        onUpdate={handleUpdateSchema}
        classes={classes || []}
        subjects={Array.isArray(subjects) ? subjects : subjects?.items || []}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSchemaId} onOpenChange={(open) => !open && setDeleteSchemaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment Schema</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete this assessment schema? This action cannot be undone.
              </p>
              {deleteSchemaId && (
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  <strong>Note:</strong> This schema will be permanently deleted along with all its components and configurations.
                  Student scores will remain in the system but will lose their schema reference.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteSchema(deleteSchemaId!)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Schema
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
