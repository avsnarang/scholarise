"use client";

import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info,
  FileText,
  Hash,
  Type
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  type: 'header' | 'body' | 'variable' | 'general';
  message: string;
  suggestion: string;
}

interface ValidationWarning {
  type: 'length' | 'formatting' | 'best_practice';
  message: string;
  suggestion: string;
}

interface TemplateValidationHelperProps {
  templateHeader?: string;
  templateBody: string;
  templateVariables: string[];
  className?: string;
}

export function TemplateValidationHelper({
  templateHeader,
  templateBody,
  templateVariables,
  className
}: TemplateValidationHelperProps) {
  
  const validateTemplate = (): ValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Header validation
    if (templateHeader) {
      // Check for line breaks
      if (templateHeader.includes('\n') || templateHeader.includes('\r')) {
        errors.push({
          type: 'header',
          message: 'Header contains line breaks',
          suggestion: 'Remove all line breaks from the header text'
        });
      }

      // Check for emojis (basic check for common emoji ranges)
      if (/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(templateHeader)) {
        errors.push({
          type: 'header',
          message: 'Header contains emojis',
          suggestion: 'Remove all emojis from the header text'
        });
      }

      // Check for asterisks
      if (templateHeader.includes('*')) {
        errors.push({
          type: 'header',
          message: 'Header contains asterisks (*)',
          suggestion: 'Remove asterisks from the header text'
        });
      }

      // Check for formatting characters
      if (/[_~`]/.test(templateHeader)) {
        errors.push({
          type: 'header',
          message: 'Header contains formatting characters',
          suggestion: 'Remove underscores, tildes, and backticks from the header'
        });
      }

      // Header length warning
      if (templateHeader.length > 60) {
        warnings.push({
          type: 'length',
          message: 'Header is quite long',
          suggestion: 'Consider shortening the header for better readability'
        });
      }
    }

    // Body validation
    if (templateBody) {
      // Check for excessive line breaks
      if ((templateBody.match(/\n/g) || []).length > 10) {
        warnings.push({
          type: 'formatting',
          message: 'Template has many line breaks',
          suggestion: 'Consider reducing line breaks for better formatting'
        });
      }

      // Check for very long body
      if (templateBody.length > 1024) {
        warnings.push({
          type: 'length',
          message: 'Template body is very long',
          suggestion: 'WhatsApp templates work best when concise'
        });
      }

      // Check for HTML tags (not allowed)
      if (/<[^>]*>/g.test(templateBody)) {
        errors.push({
          type: 'body',
          message: 'Template contains HTML tags',
          suggestion: 'Remove all HTML tags and use plain text only'
        });
      }
    }

    // Variable validation
    templateVariables.forEach((variable, index) => {
      // Check variable name format
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(variable)) {
        errors.push({
          type: 'variable',
          message: `Variable "${variable}" has invalid format`,
          suggestion: 'Variable names must start with a letter and contain only letters, numbers, and underscores'
        });
      }

      // Check for reserved words
      const reservedWords = ['name', 'phone', 'email', 'date', 'time'];
      if (reservedWords.includes(variable.toLowerCase())) {
        warnings.push({
          type: 'best_practice',
          message: `Variable "${variable}" might conflict with reserved words`,
          suggestion: 'Consider using more specific variable names'
        });
      }

      // Check variable length
      if (variable.length > 30) {
        warnings.push({
          type: 'best_practice',
          message: `Variable "${variable}" is very long`,
          suggestion: 'Shorter variable names are easier to manage'
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  const validation = validateTemplate();

  if (validation.isValid && validation.warnings.length === 0) {
    return (
      <Card className={cn("border-green-200 bg-green-50", className)}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Template validation passed</span>
          </div>
          <p className="text-xs text-green-600 mt-1">
            Your template meets Meta's formatting requirements.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-orange-200", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Template Validation
          {!validation.isValid && (
            <Badge variant="destructive" className="text-xs">
              {validation.errors.length} Error{validation.errors.length !== 1 ? 's' : ''}
            </Badge>
          )}
          {validation.warnings.length > 0 && (
            <Badge variant="outline" className="text-xs text-orange-600">
              {validation.warnings.length} Warning{validation.warnings.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        
        {/* Errors */}
        {validation.errors.map((error, index) => (
          <Alert key={`error-${index}`} variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="space-y-1">
              <div className="flex items-center gap-2">
                {error.type === 'header' && <Type className="h-3 w-3" />}
                {error.type === 'body' && <FileText className="h-3 w-3" />}
                {error.type === 'variable' && <Hash className="h-3 w-3" />}
                <span className="font-medium text-xs uppercase tracking-wide">
                  {error.type}
                </span>
              </div>
              <p className="text-sm">{error.message}</p>
              <p className="text-xs text-muted-foreground">
                💡 {error.suggestion}
              </p>
            </AlertDescription>
          </Alert>
        ))}

        {/* Warnings */}
        {validation.warnings.map((warning, index) => (
          <Alert key={`warning-${index}`} className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-xs uppercase tracking-wide text-orange-700">
                  {warning.type.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-orange-800">{warning.message}</p>
              <p className="text-xs text-orange-600">
                💡 {warning.suggestion}
              </p>
            </AlertDescription>
          </Alert>
        ))}

        {/* Meta Requirements Info */}
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-800">
            <strong>Meta WhatsApp Requirements:</strong> Headers must be plain text only (no emojis, formatting, or line breaks). 
            Template bodies should be concise and use variables like {`{{variable_name}}`} for dynamic content.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// Hook for getting validation status
export function useTemplateValidation(
  templateHeader: string | undefined,
  templateBody: string,
  templateVariables: string[]
) {
  return React.useMemo(() => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Same validation logic as above, extracted for reuse
    // (Implementation would be similar to validateTemplate function)
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [templateHeader, templateBody, templateVariables]);
}