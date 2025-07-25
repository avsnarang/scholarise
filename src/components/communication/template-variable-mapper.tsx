"use client";

import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  AVAILABLE_DATA_FIELDS, 
  DATA_FIELD_CATEGORIES, 
  type DataFieldOption 
} from "@/utils/template-data-mapper";

interface TemplateVariableMapperProps {
  variableName: string;
  variableIndex: number;
  mapping?: { dataField: string; fallbackValue: string };
  onMappingChange: (dataField: string, fallbackValue: string) => void;
}

export function TemplateVariableMapper({
  variableName,
  variableIndex,
  mapping,
  onMappingChange
}: TemplateVariableMapperProps) {
  const [selectedDataField, setSelectedDataField] = useState(mapping?.dataField || "");
  const [fallbackValue, setFallbackValue] = useState(mapping?.fallbackValue || "");

  const handleDataFieldChange = (dataField: string) => {
    setSelectedDataField(dataField);
    onMappingChange(dataField, fallbackValue);
  };

  const handleFallbackChange = (value: string) => {
    setFallbackValue(value);
    onMappingChange(selectedDataField, value);
  };

  const selectedField = AVAILABLE_DATA_FIELDS.find(field => field.value === selectedDataField);
  const isCustomValue = selectedDataField === 'custom_value';

  // Group fields by category for better organization
  const fieldsByCategory = AVAILABLE_DATA_FIELDS.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, DataFieldOption[]>);

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">
            Variable {variableIndex}: {variableName}
          </Label>
          <p className="text-xs text-gray-500 mt-1">
            Choose what data to populate for this template variable
          </p>
        </div>
        {selectedField && (
          <Badge 
            variant="outline" 
            className={`text-xs ${
              selectedField.category === 'student' ? 'border-blue-200 text-blue-700' :
              selectedField.category === 'parent' ? 'border-green-200 text-green-700' :
              selectedField.category === 'financial' ? 'border-red-200 text-red-700' :
              selectedField.category === 'academic' ? 'border-purple-200 text-purple-700' :
              'border-gray-200 text-gray-700'
            }`}
          >
            {DATA_FIELD_CATEGORIES[selectedField.category].label}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Data Field Selector */}
        <div className="space-y-2">
          <Label htmlFor={`dataField-${variableName}`} className="text-xs font-medium">
            Data Source
          </Label>
          <Select
            value={selectedDataField}
            onValueChange={handleDataFieldChange}
          >
            <SelectTrigger id={`dataField-${variableName}`}>
              <SelectValue placeholder="Select data field..." />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {Object.entries(fieldsByCategory).map(([category, fields]) => (
                <div key={category}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {DATA_FIELD_CATEGORIES[category as keyof typeof DATA_FIELD_CATEGORIES].label}
                  </div>
                  {fields.map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{field.label}</span>
                        <span className="text-xs text-gray-500">{field.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                  <Separator className="my-1" />
                </div>
              ))}
            </SelectContent>
          </Select>
          {selectedField && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {selectedField.description}
            </p>
          )}
        </div>

        {/* Fallback Value */}
        <div className="space-y-2">
          <Label htmlFor={`fallback-${variableName}`} className="text-xs font-medium">
            {isCustomValue ? 'Custom Value' : 'Fallback Value'}
          </Label>
          <Input
            id={`fallback-${variableName}`}
            placeholder={
              isCustomValue 
                ? "Enter the value to use" 
                : "Value to use if data is missing"
            }
            value={fallbackValue}
            onChange={(e) => handleFallbackChange(e.target.value)}
            className="text-sm"
          />
          <p className="text-xs text-gray-500">
            {isCustomValue 
              ? "This value will be used for all recipients"
              : "Used when the selected data field is empty or unavailable"
            }
          </p>
        </div>
      </div>

      {/* Preview what this would look like */}
      {selectedDataField && (
        <div className="mt-3 p-3 bg-gray-50 rounded-md dark:bg-gray-800">
          <div className="text-xs">
            <span className="font-medium">Preview: </span>
            <span className="text-gray-600 dark:text-gray-400">
              {variableName} → {selectedField?.label}
              {fallbackValue && ` (fallback: "${fallbackValue}")`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 