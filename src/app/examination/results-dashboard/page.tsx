"use client";

import React from 'react';
import { ResultsDashboard } from '@/components/assessment/ResultsDashboard';
import { useAssessmentSchemas } from '@/hooks/useAssessmentSchemas';

export default function ResultsDashboardPage() {
  const { schemas, isLoading } = useAssessmentSchemas();
  
  // For now, use the first schema and mock data
  const selectedSchema = schemas[0];
  const mockStudents = [
    { id: '1', name: 'John Doe', rollNumber: '001' },
    { id: '2', name: 'Jane Smith', rollNumber: '002' },
  ];
  const mockScores: any[] = [];

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!selectedSchema) {
    return <div className="p-8">No assessment schemas found. Create one first.</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Results & Analytics</h2>
        <div className="flex items-center space-x-2">
          {/* Add any action buttons here if needed */}
        </div>
      </div>
      
      <ResultsDashboard 
        schema={selectedSchema}
        studentScores={mockScores}
        students={mockStudents}
      />
    </div>
  );
} 