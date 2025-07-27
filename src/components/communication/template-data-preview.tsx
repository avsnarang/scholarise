"use client";

import React from "react";
import { extractRecipientData } from "@/utils/template-data-mapper";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Eye, 
  User, 
  Phone, 
  Code, 
  ArrowRight, 
  Sparkles,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TemplateDataPreviewProps {
  dataMappings: Record<string, { dataField: string; fallbackValue: string }>;
  recipients: any[];
}

export function TemplateDataPreview({ dataMappings, recipients }: TemplateDataPreviewProps) {
  if (!recipients.length || !Object.keys(dataMappings).length) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <Eye className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          No Preview Available
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Configure template variables to see preview data
        </p>
      </div>
    );
  }

  const firstRecipient = recipients[0];
  const mappingEntries = Object.entries(dataMappings);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
          <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Data Preview
          </h5>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            How variables will be populated for recipients
          </p>
        </div>
      </div>

      {/* Sample Recipient Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-blue-700 dark:text-blue-300" />
          </div>
          <div>
            <h6 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Sample Recipient
            </h6>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Preview based on first recipient data
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-800 dark:text-blue-200">
              {firstRecipient.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-800 dark:text-blue-200">
              {firstRecipient.phone}
            </span>
          </div>
          {firstRecipient.type && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300">
                {firstRecipient.type}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Variable Mappings */}
      <div className="space-y-3">
        <h6 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <Code className="w-3 h-3" />
          Variable Mappings ({mappingEntries.length})
        </h6>
        
        <div className="space-y-2">
          {mappingEntries.map(([variable, mapping], index) => {
            const previewValue = extractRecipientData(firstRecipient, mapping.dataField, mapping.fallbackValue);
            const isEmpty = !previewValue || previewValue.trim() === '';
            const isCustomValue = mapping.dataField === 'custom_value';
            
            return (
              <div 
                key={variable}
                className={cn(
                  "group relative p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-sm",
                  isEmpty 
                    ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
                    : isCustomValue
                    ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800"
                    : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Variable Index */}
                    <div className={cn(
                      "w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0",
                      isEmpty 
                        ? "bg-orange-200 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300"
                        : isCustomValue
                        ? "bg-yellow-200 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"
                        : "bg-green-200 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                    )}>
                      {index + 1}
                    </div>
                    
                    {/* Variable Name */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-800 dark:text-gray-200">
                          {`{{${variable}}}`}
                        </code>
                        {isCustomValue && (
                          <Sparkles className="w-3 h-3 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        Source: {mapping.dataField.replace(/_/g, ' ')}
                        {mapping.fallbackValue && ` (fallback: "${mapping.fallbackValue}")`}
                      </p>
                    </div>
                  </div>
                  
                  {/* Arrow */}
                  <ArrowRight className={cn(
                    "w-4 h-4 mx-3 flex-shrink-0",
                    isEmpty 
                      ? "text-orange-400 dark:text-orange-600"
                      : isCustomValue
                      ? "text-yellow-400 dark:text-yellow-600"
                      : "text-green-400 dark:text-green-600"
                  )} />
                  
                  {/* Preview Value */}
                  <div className="flex-1 min-w-0">
                    {isEmpty ? (
                      <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        <span className="text-xs font-medium">No data available</span>
                      </div>
                    ) : (
                      <div className={cn(
                        "px-3 py-2 rounded-md text-xs font-medium border max-w-full",
                        isCustomValue
                          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700"
                          : "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700"
                      )}>
                        <span className="truncate block" title={previewValue}>
                          "{previewValue}"
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Note */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="p-1 bg-blue-200 dark:bg-blue-900/40 rounded">
            <AlertCircle className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <span className="font-medium">Preview Note:</span> This shows how template variables will be replaced with actual recipient data. Empty values will use fallback text or show as missing data warnings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 