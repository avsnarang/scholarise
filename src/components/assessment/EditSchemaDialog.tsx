'use client';

import React from 'react';
import { Edit } from 'lucide-react';
import { AssessmentSchemaBuilder } from '@/components/assessment/AssessmentSchemaBuilder';

interface EditSchemaDialogProps {
  schema: any;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdate: (data: any) => Promise<void>;
  classes: any[];
  subjects: any[];
  terms: any[];
}

export function EditSchemaDialog({ 
  schema, 
  isOpen, 
  onOpenChange,
  onUpdate,
  classes,
  subjects,
  terms,
}: EditSchemaDialogProps) {
  const initialDataForEdit = React.useMemo(() => {
    if (!schema) return null;

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
    
    return {
      ...schema,
      classIds: formatAppliedClassesToClassIds(schema),
      components: schema.components || [],
    };
  }, [schema]);

  if (!isOpen || !initialDataForEdit) return null;

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
              <Edit className="h-5 w-5 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold">Edit Assessment Schema</h2>
                <p className="text-sm text-muted-foreground">Update the assessment schema configuration</p>
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
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
          <AssessmentSchemaBuilder
            initialData={initialDataForEdit}
            classes={classes}
            subjects={subjects}
            terms={terms}
            onSave={onUpdate}
          />
        </div>
      </div>
    </div>
  );
} 