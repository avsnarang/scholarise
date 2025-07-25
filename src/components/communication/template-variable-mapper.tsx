"use client";

import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Edit3, Sparkles } from "lucide-react";
import { 
  AVAILABLE_DATA_FIELDS, 
  DATA_FIELD_CATEGORIES, 
  type DataFieldOption 
} from "@/utils/template-data-mapper";
import { cn } from "@/lib/utils";

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
    acc[field.category]!.push(field);
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
          <div className="flex items-center justify-between">
            <Label htmlFor={`dataField-${variableName}`} className="text-xs font-medium">
              Data Source
            </Label>
            {selectedDataField !== 'custom_value' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => handleDataFieldChange('custom_value')}
              >
                <Edit3 className="w-3 h-3 mr-1" />
                Custom
              </Button>
            )}
          </div>
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
                      <div className="flex items-center w-full">
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{field.label}</span>
                            {field.value === 'custom_value' && (
                              <Sparkles className="w-3 h-3 text-yellow-500" />
                            )}
                          </div>
                          <span className="text-xs text-gray-500">{field.description}</span>
                        </div>
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
        <div className={cn(
          "mt-3 p-3 rounded-md",
          isCustomValue 
            ? "bg-yellow-50 border border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800" 
            : "bg-gray-50 dark:bg-gray-800"
        )}>
          <div className="text-xs">
            <span className="font-medium">Preview: </span>
            <span className="text-gray-600 dark:text-gray-400">
              {variableName} → {selectedField?.label}
              {isCustomValue && fallbackValue && (
                <span className="text-yellow-700 dark:text-yellow-300 font-medium">
                  {` "${fallbackValue}"`}
                </span>
              )}
              {!isCustomValue && fallbackValue && ` (fallback: "${fallbackValue}")`}
            </span>
          </div>
          {isCustomValue && !fallbackValue && (
            <div className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
              Enter your custom value above to preview
            </div>
          )}
          {isCustomValue && fallbackValue && (
            <div className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
              ✨ This custom value will be sent to all recipients
            </div>
          )}
        </div>
      )}
    </div>
  );
} 