"use client";

import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  Edit3, 
  Sparkles, 
  Database, 
  ArrowRight, 
  User, 
  Users, 
  DollarSign, 
  GraduationCap, 
  Settings,
  CheckCircle,
  AlertCircle,
  Wand2
} from "lucide-react";
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

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'student':
      return <User className="w-4 h-4" />;
    case 'parent':
      return <Users className="w-4 h-4" />;
    case 'financial':
      return <DollarSign className="w-4 h-4" />;
    case 'academic':
      return <GraduationCap className="w-4 h-4" />;
    default:
      return <Settings className="w-4 h-4" />;
  }
};

const getCategoryColors = (category: string) => {
  switch (category) {
    case 'student':
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/20',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-700 dark:text-blue-300',
        iconBg: 'bg-blue-100 dark:bg-blue-900/40',
        iconText: 'text-blue-600 dark:text-blue-400'
      };
    case 'parent':
      return {
        bg: 'bg-green-50 dark:bg-green-950/20',
        border: 'border-green-200 dark:border-green-800',
        text: 'text-green-700 dark:text-green-300',
        iconBg: 'bg-green-100 dark:bg-green-900/40',
        iconText: 'text-green-600 dark:text-green-400'
      };
    case 'financial':
      return {
        bg: 'bg-red-50 dark:bg-red-950/20',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-700 dark:text-red-300',
        iconBg: 'bg-red-100 dark:bg-red-900/40',
        iconText: 'text-red-600 dark:text-red-400'
      };
    case 'academic':
      return {
        bg: 'bg-purple-50 dark:bg-purple-950/20',
        border: 'border-purple-200 dark:border-purple-800',
        text: 'text-purple-700 dark:text-purple-300',
        iconBg: 'bg-purple-100 dark:bg-purple-900/40',
        iconText: 'text-purple-600 dark:text-purple-400'
      };
    default:
      return {
        bg: 'bg-gray-50 dark:bg-gray-800/20',
        border: 'border-gray-200 dark:border-gray-700',
        text: 'text-gray-700 dark:text-gray-300',
        iconBg: 'bg-gray-100 dark:bg-gray-800/40',
        iconText: 'text-gray-600 dark:text-gray-400'
      };
  }
};

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
  const isConfigured = selectedDataField && (isCustomValue ? fallbackValue : true);

  // Group fields by category for better organization
  const fieldsByCategory = AVAILABLE_DATA_FIELDS.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category]!.push(field);
    return acc;
  }, {} as Record<string, DataFieldOption[]>);

  const categoryColors = selectedField ? getCategoryColors(selectedField.category) : getCategoryColors('other');

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-xl border-2 bg-gradient-to-br transition-all duration-300 hover:shadow-lg",
      isConfigured 
        ? "from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 border-gray-200 dark:border-gray-700 shadow-sm hover:border-primary/30 dark:hover:border-primary/30"
        : "from-orange-50 via-white to-orange-50/50 dark:from-orange-950/20 dark:via-gray-900 dark:to-orange-950/10 border-orange-200 dark:border-orange-800 shadow-sm hover:border-orange-300 dark:hover:border-orange-700"
    )}>
      {/* Header Section */}
      <div className="flex items-center justify-between p-5 pb-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm transition-all duration-200",
            isConfigured 
              ? "bg-gradient-to-br from-primary/20 to-primary/10 text-primary border-2 border-primary/20"
              : "bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/40 dark:to-orange-950/20 text-orange-600 dark:text-orange-400 border-2 border-orange-200 dark:border-orange-700"
          )}>
            {variableIndex}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                {variableName}
              </h4>
              {isConfigured ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-orange-500" />
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure data source for this template variable
            </p>
          </div>
        </div>
        
        {selectedField && (
          <div className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition-all duration-200",
            categoryColors.bg,
            categoryColors.border,
            categoryColors.text,
            "border"
          )}>
            <div className={cn("p-1 rounded-full", categoryColors.iconBg)}>
              <div className={categoryColors.iconText}>
                {getCategoryIcon(selectedField.category)}
              </div>
            </div>
            {DATA_FIELD_CATEGORIES[selectedField.category].label}
          </div>
        )}
      </div>

      {/* Configuration Section */}
      <div className="px-5 pb-5 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Data Source Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                Data Source
              </Label>
              {selectedDataField !== 'custom_value' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-3 text-xs hover:bg-yellow-100 hover:text-yellow-700 dark:hover:bg-yellow-900/20 dark:hover:text-yellow-300 transition-colors"
                  onClick={() => handleDataFieldChange('custom_value')}
                >
                  <Wand2 className="w-3 h-3 mr-1" />
                  Custom
                </Button>
              )}
            </div>
            
            <Select
              value={selectedDataField}
              onValueChange={handleDataFieldChange}
            >
              <SelectTrigger className={cn(
                "h-12 bg-white dark:bg-gray-900 border-2 transition-all duration-200",
                selectedDataField 
                  ? "border-primary/30 focus:border-primary" 
                  : "border-gray-200 dark:border-gray-700 focus:border-orange-400"
              )}>
                <SelectValue placeholder="Select data field..." />
              </SelectTrigger>
              <SelectContent className="max-h-80 w-full">
                {Object.entries(fieldsByCategory).map(([category, fields]) => (
                  <div key={category}>
                    <div className={cn(
                      "sticky top-0 z-10 px-3 py-2 text-xs font-bold uppercase tracking-wider border-b mb-2",
                      "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    )}>
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1 rounded", getCategoryColors(category).iconBg)}>
                          <div className={getCategoryColors(category).iconText}>
                            {getCategoryIcon(category)}
                          </div>
                        </div>
                        {DATA_FIELD_CATEGORIES[category as keyof typeof DATA_FIELD_CATEGORIES].label}
                      </div>
                    </div>
                    {fields.map((field) => (
                      <SelectItem key={field.value} value={field.value} className="py-3">
                        <div className="flex items-center w-full gap-3">
                          <div className={cn("p-1.5 rounded-lg", getCategoryColors(field.category).iconBg)}>
                            <div className={getCategoryColors(field.category).iconText}>
                              {field.value === 'custom_value' ? (
                                <Sparkles className="w-4 h-4" />
                              ) : (
                                getCategoryIcon(field.category)
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-gray-100">{field.label}</span>
                              {field.value === 'custom_value' && (
                                <Sparkles className="w-3 h-3 text-yellow-500" />
                              )}
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{field.description}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                    {category !== 'other' && <Separator className="my-2" />}
                  </div>
                ))}
              </SelectContent>
            </Select>
            
            {selectedField && (
              <div className={cn(
                "p-3 rounded-lg border transition-all duration-200",
                categoryColors.bg,
                categoryColors.border
              )}>
                <p className={cn("text-xs", categoryColors.text)}>
                  💡 {selectedField.description}
                </p>
              </div>
            )}
          </div>

          {/* Fallback/Custom Value */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              {isCustomValue ? (
                <>
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  Custom Value
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 text-primary" />
                  Fallback Value
                </>
              )}
            </Label>
            
            <Input
              placeholder={
                isCustomValue 
                  ? "Enter the value to use for all recipients" 
                  : "Value to use when data is missing"
              }
              value={fallbackValue}
              onChange={(e) => handleFallbackChange(e.target.value)}
              className={cn(
                "h-12 bg-white dark:bg-gray-900 border-2 transition-all duration-200",
                isCustomValue && fallbackValue
                  ? "border-yellow-300 focus:border-yellow-400 bg-yellow-50 dark:bg-yellow-950/10 dark:border-yellow-700"
                  : selectedDataField && fallbackValue
                  ? "border-green-300 focus:border-green-400"
                  : "border-gray-200 dark:border-gray-700 focus:border-primary"
              )}
            />
            
            <div className={cn(
              "p-3 rounded-lg text-xs transition-all duration-200",
              isCustomValue 
                ? "bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800"
                : "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
            )}>
              {isCustomValue 
                ? "✨ This custom value will be sent to all recipients"
                : "🛡️ Used when the selected data field is empty or unavailable"
              }
            </div>
          </div>
        </div>

        {/* Enhanced Preview Section */}
        {selectedDataField && (
          <div className="space-y-3">
            <Separator />
            <div className={cn(
              "relative overflow-hidden rounded-xl border-2 transition-all duration-300",
              isCustomValue 
                ? "bg-gradient-to-br from-yellow-50 via-yellow-25 to-amber-50 dark:from-yellow-950/20 dark:via-yellow-950/10 dark:to-amber-950/20 border-yellow-200 dark:border-yellow-800"
                : "bg-gradient-to-br from-blue-50 via-blue-25 to-indigo-50 dark:from-blue-950/20 dark:via-blue-950/10 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800"
            )}>
              {/* Preview Header */}
              <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    isCustomValue 
                      ? "bg-yellow-200 dark:bg-yellow-900/40" 
                      : "bg-blue-200 dark:bg-blue-900/40"
                  )}>
                    <div className={cn(
                      isCustomValue 
                        ? "text-yellow-700 dark:text-yellow-300" 
                        : "text-blue-700 dark:text-blue-300"
                    )}>
                      {isCustomValue ? <Sparkles className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Preview Mapping
                  </span>
                </div>
              </div>
              
              {/* Preview Content */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Variable:
                  </span>
                  <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-gray-800 dark:text-gray-200">
                    {`{{${variableName}}}`}
                  </code>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Source:
                  </span>
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1 rounded", categoryColors.iconBg)}>
                      <div className={categoryColors.iconText}>
                        {selectedField && getCategoryIcon(selectedField.category)}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {selectedField?.label}
                    </span>
                  </div>
                </div>
                
                {(isCustomValue ? fallbackValue : selectedDataField) && (
                  <div className="flex items-start gap-3 pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      Output:
                    </span>
                    <div className={cn(
                      "px-3 py-2 rounded-lg font-medium text-sm flex-1",
                      isCustomValue && fallbackValue
                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700"
                        : "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700"
                    )}>
                      {isCustomValue && fallbackValue ? (
                        <span>"{fallbackValue}"</span>
                      ) : fallbackValue ? (
                        <span>Data from {selectedField?.label.toLowerCase()} (fallback: "{fallbackValue}")</span>
                      ) : (
                        <span>Data from {selectedField?.label.toLowerCase()}</span>
                      )}
                    </div>
                  </div>
                )}
                
                {isCustomValue && !fallbackValue && (
                  <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100/50 dark:bg-yellow-900/20 p-2 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    Enter your custom value above to see the preview
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Completion Indicator */}
      <div className={cn(
        "absolute top-0 right-0 w-1 h-full transition-all duration-300",
        isConfigured 
          ? "bg-gradient-to-b from-green-400 to-green-600" 
          : "bg-gradient-to-b from-orange-400 to-orange-600"
      )} />
    </div>
  );
} 