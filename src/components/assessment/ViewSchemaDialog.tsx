'use client';

import React from 'react';
import { Eye, Users, Calendar, BookOpen, Hash, Target, Calculator, Code } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const getStatusBadge = (schema: any) => {
  if (schema.isPublished) {
    return <Badge variant="default">Published</Badge>;
  } else if (schema.isActive) {
    return <Badge variant="secondary">Draft</Badge>;
  } else {
    return <Badge variant="outline">Inactive</Badge>;
  }
};

export function ViewSchemaDialog({ schema, isOpen, onOpenChange }: { schema: any, isOpen: boolean, onOpenChange: (isOpen: boolean) => void }) {
  if (!isOpen || !schema) return null;

  const totalComponents = schema.components?.length || 0;
  const totalSubCriteria = schema.components?.reduce((acc: number, comp: any) => acc + (comp.subCriteria?.length || 0), 0) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={() => onOpenChange(false)}
      />
      
      {/* Modal Content */}
      <div className="relative bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden z-10 border">
        {/* Header */}
        <div className="border-b bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold">{schema.name}</h2>
                <p className="text-sm text-muted-foreground">Assessment Schema Details</p>
              </div>
            </div>
            <button 
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-6 space-y-6">
            
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <Target className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-semibold">{schema.totalMarks}</div>
                <div className="text-sm text-muted-foreground">Total Marks</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Calculator className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-semibold">{totalComponents}</div>
                <div className="text-sm text-muted-foreground">Components</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Hash className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-semibold">{totalSubCriteria}</div>
                <div className="text-sm text-muted-foreground">Sub-criteria</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="mx-auto mb-2 w-6 h-6 flex items-center justify-center">
                  {getStatusBadge(schema)}
                </div>
                <div className="text-sm text-muted-foreground">Status</div>
              </div>
            </div>

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="mt-1">{schema.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Term</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{schema.term}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Subject</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span>{schema.subject?.name || 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Total Marks</Label>
                    <p className="mt-1 font-mono">{schema.totalMarks}</p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Applied Classes & Sections</Label>
                  <div className="mt-2">
                    {schema.appliedClasses && Array.isArray(schema.appliedClasses) ? (
                      <div className="flex flex-wrap gap-2">
                        {schema.appliedClasses.map((item: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 px-3 py-1 border rounded">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{item.className}</span>
                            {item.sectionName && (
                              <span className="text-sm text-muted-foreground">• {item.sectionName}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1 border rounded w-fit">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{schema.class?.name || 'N/A'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assessment Components */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Assessment Components ({totalComponents})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {schema.components?.map((component: any, index: number) => (
                  <Card key={component.id} className="border-l-2 border-l-primary">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                          {index + 1}
                        </span>
                        {component.name}
                      </CardTitle>
                      {component.description && (
                        <p className="text-sm text-muted-foreground">{component.description}</p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Component Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Raw Max Score</Label>
                          <p className="text-lg font-semibold font-mono">{component.rawMaxScore}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Reduced Score</Label>
                          <p className="text-lg font-semibold font-mono">{component.reducedScore}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Weightage</Label>
                          <p className="text-lg font-semibold font-mono">{component.weightage}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Order</Label>
                          <p className="text-lg font-semibold font-mono">{component.order}</p>
                        </div>
                      </div>
                      
                      {/* Formula */}
                      {component.formula && (
                        <div>
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <Code className="h-3 w-3" />
                            Formula
                          </Label>
                          <code className="block mt-2 p-3 bg-muted rounded text-sm font-mono">
                            {component.formula}
                          </code>
                        </div>
                      )}

                      {/* Sub-criteria */}
                      {component.subCriteria && component.subCriteria.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium">Sub-criteria ({component.subCriteria.length})</Label>
                          <div className="mt-2 space-y-2">
                            {component.subCriteria.map((sub: any, subIndex: number) => (
                              <div key={sub.id} className="flex items-center justify-between p-2 border rounded">
                                <div className="flex items-center gap-2">
                                  <span className="bg-muted text-xs px-2 py-1 rounded">
                                    {subIndex + 1}
                                  </span>
                                  <span className="text-sm">{sub.name}</span>
                                </div>
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
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Created</Label>
                    <p className="mt-1 text-sm text-muted-foreground">{new Date(schema.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Last Updated</Label>
                    <p className="mt-1 text-sm text-muted-foreground">{new Date(schema.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 