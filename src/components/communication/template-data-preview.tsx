"use client";

import React from "react";
import { extractRecipientData } from "@/utils/template-data-mapper";

interface TemplateDataPreviewProps {
  dataMappings: Record<string, { dataField: string; fallbackValue: string }>;
  recipients: any[];
}

export function TemplateDataPreview({ dataMappings, recipients }: TemplateDataPreviewProps) {
  if (!recipients.length || !Object.keys(dataMappings).length) {
    return null;
  }

  const firstRecipient = recipients[0];

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg dark:bg-gray-800">
      <h5 className="text-sm font-medium mb-2">Data Preview (First Recipient)</h5>
      <div className="space-y-1 text-xs">
        {Object.entries(dataMappings).map(([variable, mapping]) => {
          const previewValue = extractRecipientData(firstRecipient, mapping.dataField, mapping.fallbackValue);
          return (
            <div key={variable} className="flex justify-between">
              <span className="font-medium">{variable}:</span>
              <span className="text-gray-600 dark:text-gray-400">{previewValue || '(empty)'}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500">
          Preview shows data for: {firstRecipient.name} ({firstRecipient.phone})
        </p>
      </div>
    </div>
  );
} 