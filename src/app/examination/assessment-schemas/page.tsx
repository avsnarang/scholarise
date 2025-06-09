'use client';

import React, { useState } from 'react';
import { Plus, Settings, Loader2, Eye, Edit, Trash2, Search, Filter, MoreVertical, FileText, Users, Calendar, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AssessmentSchemaBuilder } from '@/components/assessment/AssessmentSchemaBuilder';
import { useAssessmentSchemas } from '@/hooks/useAssessmentSchemas';
import { api } from '@/utils/api';
import { useBranchContext } from '@/hooks/useBranchContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

export default function AssessmentSchemasPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedSchema, setSelectedSchema] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteSchemaId, setDeleteSchemaId] = useState<string | null>(null);
  
  const { currentBranchId } = useBranchContext();
  
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
  const filteredSchemas = schemas.filter((schema: any) =>
    schema.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schema.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schema.class?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schema.subject?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper function to format applied classes back to classIds format for editing
  const formatAppliedClassesToClassIds = (schema: any) => {
    if (schema.appliedClasses && Array.isArray(schema.appliedClasses)) {
      return schema.appliedClasses.map((applied: any) => 
        applied.sectionId 
          ? `${applied.classId}-${applied.sectionId}` 
          : applied.classId
      );
    }
    return [schema.classId];
  };

  const handleCreateSchema = async (data: any) => {
    try {
      await createSchema(data);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create schema:', error);
    }
  };

  const handleEditSchema = (schema: any) => {
    setSelectedSchema(schema);
    setIsEditDialogOpen(true);
  };

  const handleUpdateSchema = async (data: any) => {
    if (!selectedSchema) return;
    
    try {
      await updateSchema({ id: selectedSchema.id, data });
      setIsEditDialogOpen(false);
      setSelectedSchema(null);
    } catch (error) {
      console.error('Failed to update schema:', error);
    }
  };

  const handleViewSchema = (schema: any) => {
    setSelectedSchema(schema);
    setIsViewDialogOpen(true);
  };

  const handleDeleteSchema = async (schemaId: string) => {
    try {
      await deleteSchema(schemaId);
      setDeleteSchemaId(null);
    } catch (error) {
      console.error('Failed to delete schema:', error);
    }
  };

  const getStatusBadge = (schema: any) => {
    if (schema.isPublished) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Published</Badge>;
    } else if (schema.isActive) {
      return <Badge variant="secondary">Draft</Badge>;
    } else {
      return <Badge variant="outline">Inactive</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assessment Schemas</h1>
          <p className="text-muted-foreground">
            Create and manage customizable assessment evaluation schemas
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="w-fit">
          <Plus className="h-4 w-4 mr-2" />
          Create Schema
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search schemas by name, term, class, or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="w-fit">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Alerts */}
      {createError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Create Error: {createError.message}
          </AlertDescription>
        </Alert>
      )}
      
      {updateError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Update Error: {updateError.message}
          </AlertDescription>
        </Alert>
      )}
      
      {deleteError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Delete Error: {deleteError.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Assessment Schemas ({filteredSchemas.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredSchemas.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Schema</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Components</TableHead>
                    <TableHead>Total Marks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchemas.map((schema: any) => (
                    <TableRow key={schema.id}>
                      <TableCell className="font-medium">
                        <div className="space-y-1">
                          <div className="font-semibold">{schema.name}</div>
                          <div className="text-sm text-muted-foreground">
                            ID: {schema.id.slice(0, 8)}...
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {schema.class?.name || 'N/A'}
                          </div>
                          {schema.appliedClasses && Array.isArray(schema.appliedClasses) && schema.appliedClasses.length > 1 && (
                            <div className="text-xs text-muted-foreground">
                              +{schema.appliedClasses.length - 1} more
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          {schema.subject?.name || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {schema.term}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {schema.components?.length || 0} components
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {schema.totalMarks}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(schema)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(schema.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewSchema(schema)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                                        <DropdownMenuItem 
              onClick={() => handleEditSchema(schema)}
              disabled={isUpdating || isDeleting}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                                        <DropdownMenuItem 
              onClick={() => setDeleteSchemaId(schema.id)}
              className="text-destructive focus:text-destructive"
              disabled={isUpdating || isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
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
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto overscroll-contain">
          <DialogHeader>
            <DialogTitle>Create Assessment Schema</DialogTitle>
          </DialogHeader>
          <div className="pr-2">
            <AssessmentSchemaBuilder
                              classes={classes || []}
                subjects={Array.isArray(subjects) ? subjects : subjects?.items || []}
                onSave={handleCreateSchema}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Schema Details
            </DialogTitle>
          </DialogHeader>
          {selectedSchema && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                  <p className="font-semibold">{selectedSchema.name}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Term</Label>
                  <p>{selectedSchema.term}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Applied Classes & Sections</Label>
                  {selectedSchema.appliedClasses && Array.isArray(selectedSchema.appliedClasses) ? (
                    <div className="space-y-2">
                      {selectedSchema.appliedClasses.map((item: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{item.className}</span>
                          {item.sectionName && (
                            <>
                              <span className="text-muted-foreground">-</span>
                              <span className="text-sm">{item.sectionName}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>{selectedSchema.class?.name || 'N/A'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Subject</Label>
                  <p>{selectedSchema.subject?.name || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Total Marks</Label>
                  <p className="font-mono">{selectedSchema.totalMarks}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  {getStatusBadge(selectedSchema)}
                </div>
              </div>

              {/* Components */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Assessment Components</h3>
                <div className="space-y-4">
                  {selectedSchema.components?.map((component: any, index: number) => (
                    <Card key={component.id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{component.name}</CardTitle>
                        {component.description && (
                          <p className="text-sm text-muted-foreground">{component.description}</p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <Label className="text-xs text-muted-foreground">Raw Max Score</Label>
                            <p className="font-mono">{component.rawMaxScore}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Reduced Score</Label>
                            <p className="font-mono">{component.reducedScore}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Weightage</Label>
                            <p className="font-mono">{component.weightage}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Order</Label>
                            <p className="font-mono">{component.order}</p>
                          </div>
                        </div>
                        
                        {component.formula && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Formula</Label>
                            <code className="block mt-1 p-2 bg-muted rounded text-sm font-mono">
                              {component.formula}
                            </code>
                          </div>
                        )}

                        {component.subCriteria && component.subCriteria.length > 0 && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Sub-criteria</Label>
                            <div className="mt-2 space-y-2">
                              {component.subCriteria.map((sub: any) => (
                                <div key={sub.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                                  <span className="text-sm">{sub.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {sub.maxScore} marks
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Metadata */}
              <div className="pt-4 border-t space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <Label className="text-xs">Created</Label>
                    <p>{new Date(selectedSchema.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-xs">Last Updated</Label>
                    <p>{new Date(selectedSchema.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!isUpdating) {
          setIsEditDialogOpen(open);
          if (!open) setSelectedSchema(null);
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto overscroll-contain">
          <DialogHeader>
            <DialogTitle>
              Edit Assessment Schema
              {isUpdating && <span className="ml-2 text-sm text-muted-foreground">(Updating...)</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="pr-2">
            {selectedSchema && (
              <AssessmentSchemaBuilder
                initialData={{
                  name: selectedSchema.name,
                  term: selectedSchema.term,
                  classIds: formatAppliedClassesToClassIds(selectedSchema),
                  subjectId: selectedSchema.subjectId,
                  totalMarks: selectedSchema.totalMarks,
                  components: selectedSchema.components?.map((comp: any) => ({
                    name: comp.name,
                    description: comp.description || '',
                    rawMaxScore: comp.rawMaxScore,
                    reducedScore: comp.reducedScore,
                    weightage: comp.weightage,
                    formula: comp.formula || '',
                    order: comp.order,
                    subCriteria: comp.subCriteria?.map((sub: any) => ({
                      name: sub.name,
                      description: sub.description || '',
                      maxScore: sub.maxScore,
                      order: sub.order
                    })) || []
                  })) || []
                }}
                classes={classes || []}
                subjects={Array.isArray(subjects) ? subjects : subjects?.items || []}
                onSave={handleUpdateSchema}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSchemaId} onOpenChange={() => setDeleteSchemaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the assessment schema
              and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSchemaId && handleDeleteSchema(deleteSchemaId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
