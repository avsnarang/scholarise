import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export interface FeeHead {
  id: string;
  name: string;
  description: string | null;
  isSystemDefined: boolean;
  isActive: boolean;
  studentType: string;
  branchId: string;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FeeHeadFormProps {
  onSuccess: (feeHead: {
    name: string;
    description: string | null;
    isSystemDefined: boolean;
    studentType: string;
  }) => void;
  onCancel: () => void;
  feeHead?: FeeHead | null;
  isLoading?: boolean;
}

export function FeeHeadForm({
  onSuccess,
  onCancel,
  feeHead,
  isLoading = false,
}: FeeHeadFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isSystemDefined: false,
    studentType: 'BOTH',
  });

  const isEditing = !!feeHead;

  // Initialize form data when feeHead changes
  useEffect(() => {
    if (feeHead) {
      setFormData({
        name: feeHead.name,
        description: feeHead.description ?? '',
        isSystemDefined: feeHead.isSystemDefined,
        studentType: feeHead.studentType || 'BOTH',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        isSystemDefined: false,
        studentType: 'BOTH',
      });
    }
  }, [feeHead]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    onSuccess({
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      isSystemDefined: formData.isSystemDefined,
      studentType: formData.studentType,
    });
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Fee Head Name */}
      <div>
        <Label htmlFor="name">Fee Head Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="e.g., Tuition Fee, Library Fee"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          disabled={isLoading}
          className="mt-1"
          required
        />
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Brief description of this fee head"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          disabled={isLoading}
          className="mt-1"
          rows={3}
        />
      </div>

      {/* Student Type */}
      <div>
        <Label htmlFor="studentType">Student Type</Label>
        <select
          id="studentType"
          value={formData.studentType}
          onChange={(e) => handleInputChange('studentType', e.target.value)}
          disabled={isLoading}
          className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="BOTH">Both (New & Old Students)</option>
          <option value="NEW_ADMISSION">New Admission Only</option>
          <option value="OLD_STUDENT">Old Students Only</option>
        </select>
        <p className="text-sm text-muted-foreground mt-1">
          Choose which type of students this fee head applies to
        </p>
      </div>

      {/* System Defined Toggle */}
      <div className="flex items-center justify-between p-3 border rounded-md">
        <div className="space-y-0.5">
          <Label htmlFor="system-defined">System Defined</Label>
          <div className="text-sm text-muted-foreground">
            System-defined fee heads have limited editability
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            id="system-defined"
            type="checkbox"
            checked={formData.isSystemDefined}
            onChange={(e) => handleInputChange('isSystemDefined', e.target.checked)}
            disabled={isLoading || isEditing}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"></div>
        </label>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !formData.name.trim()}
          className="bg-[#00501B] hover:bg-[#00501B]/90 text-white"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Update Fee Head" : "Create Fee Head"}
        </Button>
      </div>
    </form>
  );
} 