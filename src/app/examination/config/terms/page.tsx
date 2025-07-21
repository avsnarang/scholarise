"use client";

import React, { useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar, Plus, Edit, Trash2, MoreHorizontal, AlertCircle, CheckCircle2, Search, Filter } from "lucide-react";
import { useTerms, type Term, type CreateTermData, type UpdateTermData } from "@/hooks/useTerms";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { format } from "date-fns";

interface TermFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  term?: Term | null;
  sessionId: string;
  onSubmit: (data: CreateTermData | UpdateTermData) => Promise<void>;
  isSubmitting: boolean;
}

function TermFormDialog({ open, onOpenChange, term, sessionId, onSubmit, isSubmitting }: TermFormDialogProps) {
  const { currentBranchId } = useBranchContext();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    order: 0,
    isCurrentTerm: false,
  });

  React.useEffect(() => {
    if (term) {
      setFormData({
        name: term.name,
        description: term.description || '',
        startDate: format(new Date(term.startDate), 'yyyy-MM-dd'),
        endDate: format(new Date(term.endDate), 'yyyy-MM-dd'),
        order: term.order,
        isCurrentTerm: term.isCurrentTerm,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        order: 0,
        isCurrentTerm: false,
      });
    }
  }, [term, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBranchId || !sessionId) return;

    try {
      await onSubmit({
        name: formData.name,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        order: formData.order,
        isCurrentTerm: formData.isCurrentTerm,
        sessionId,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting term:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{term ? 'Edit Term' : 'Create New Term'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Term Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter term name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter term description (optional)"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="order">Display Order</Label>
            <Input
              id="order"
              type="number"
              value={formData.order}
              onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
              placeholder="0"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="isCurrentTerm"
              checked={formData.isCurrentTerm}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isCurrentTerm: checked }))}
            />
            <Label htmlFor="isCurrentTerm">Set as Current Term</Label>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : term ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TermConfigPage() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);
  const [deleteTermId, setDeleteTermId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const {
    terms,
    isLoading,
    createTerm,
    isCreating,
    createError,
    updateTerm,
    isUpdating,
    updateError,
    deleteTerm,
    isDeleting,
    deleteError,
  } = useTerms(currentSessionId ?? undefined);

  // Filter terms based on search
  const filteredTerms = terms.filter(term =>
    term.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    term.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateTerm = async (data: CreateTermData) => {
    try {
      await createTerm(data);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create term:', error);
    }
  };

  const handleUpdateTerm = async (data: UpdateTermData) => {
    if (!selectedTerm) return;
    
    try {
      await updateTerm({ id: selectedTerm.id, data });
      setIsEditDialogOpen(false);
      setSelectedTerm(null);
    } catch (error) {
      console.error('Failed to update term:', error);
    }
  };

  const handleDeleteTerm = async (termId: string) => {
    try {
      await deleteTerm(termId);
      setDeleteTermId(null);
    } catch (error) {
      console.error('Failed to delete term:', error);
    }
  };

  const handleEditTerm = (term: Term) => {
    setSelectedTerm(term);
    setIsEditDialogOpen(true);
  };

  const getStatusBadge = (term: Term) => {
    if (term.isCurrentTerm) {
      return <Badge className="bg-green-100 text-green-800">Current Term</Badge>;
    } else if (term.isActive) {
      return <Badge variant="secondary">Active</Badge>;
    } else {
      return <Badge variant="outline">Inactive</Badge>;
    }
  };

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#00501B]">Term Configuration</h1>
            <p className="mt-2 text-gray-500">
              Configure academic terms and evaluation periods
            </p>
          </div>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-[#00501B] hover:bg-[#00501B]/90"
            disabled={!currentSessionId}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Term
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Label htmlFor="search" className="text-sm font-medium">
                  Search Terms
                </Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Search by name or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
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

        {/* Terms Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Academic Terms ({filteredTerms.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!currentSessionId ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Academic Session Selected</h3>
                  <p className="text-muted-foreground mb-4">
                    Please select an academic session from the header to view and manage terms.
                  </p>
                </div>
              </div>
            ) : isLoading ? (
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
            ) : filteredTerms.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {searchTerm ? 'No matching terms found' : 'No Terms Configured'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm 
                      ? 'Try adjusting your search criteria or create a new term.'
                      : 'Start by creating your first academic term for this session.'
                    }
                  </p>
                  {!searchTerm && (
                    <Button 
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="bg-[#00501B] hover:bg-[#00501B]/90"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Term
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Term Name</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTerms.map((term) => (
                      <TableRow key={term.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{term.name}</div>
                            {term.description && (
                              <div className="text-sm text-muted-foreground">
                                {term.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{format(new Date(term.startDate), 'MMM dd, yyyy')}</div>
                            <div className="text-muted-foreground">
                              to {format(new Date(term.endDate), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{term.order}</Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(term)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(term.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditTerm(term)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setDeleteTermId(term.id)}
                                className="text-destructive"
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
      </div>

      {/* Create/Edit Dialog */}
      <TermFormDialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedTerm(null);
          }
        }}
        term={selectedTerm}
        sessionId={currentSessionId ?? ""}
        onSubmit={(data) => selectedTerm ? handleUpdateTerm(data as UpdateTermData) : handleCreateTerm(data as CreateTermData)}
        isSubmitting={isCreating || isUpdating}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTermId} onOpenChange={() => setDeleteTermId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will deactivate the term. This cannot be undone and may affect
              existing assessments and evaluations associated with this term.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTermId && handleDeleteTerm(deleteTermId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
} 