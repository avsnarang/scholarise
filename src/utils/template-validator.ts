import { z } from "zod";

// Meta WhatsApp template validation schemas and utilities
export const MetaTemplateSchema = z.object({
  name: z.string()
    .min(1, "Template name is required")
    .max(512, "Template name cannot exceed 512 characters")
    .regex(/^[a-z0-9_]+$/, "Template name can only contain lowercase letters, numbers, and underscores")
    .refine(name => !name.startsWith('_'), "Template name cannot start with underscore")
    .refine(name => !name.endsWith('_'), "Template name cannot end with underscore")
    .refine(name => !name.includes('__'), "Template name cannot contain consecutive underscores"),
  
  category: z.enum(['AUTHENTICATION', 'MARKETING', 'UTILITY'], {
    errorMap: () => ({ message: "Category must be AUTHENTICATION, MARKETING, or UTILITY" })
  }),
  
  language: z.string()
    .regex(/^[a-z]{2}(_[A-Z]{2})?$/, "Language must be in format 'en' or 'en_US'")
    .default("en"),
    
  templateBody: z.string()
    .min(1, "Template body is required")
    .max(1024, "Template body cannot exceed 1024 characters"),
    
  templateVariables: z.array(z.string()).default([])
});

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestedParameters: Record<string, string>;
  metaCompliant: boolean;
}

export interface MetaTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO';
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
  };
}

/**
 * Validates template content according to Meta WhatsApp policies
 */
export function validateTemplateContent(content: string, category: string): {
  isValid: boolean;
  violations: string[];
  suggestions: string[];
} {
  const violations: string[] = [];
  const suggestions: string[] = [];
  
  // Meta policy validations
  const lowerContent = content.toLowerCase();
  
  // Marketing restrictions for non-marketing templates
  if (category !== 'MARKETING') {
    const marketingTerms = [
      'sale', 'discount', 'offer', 'promotion', 'buy now', 'limited time',
      'special deal', 'save money', 'free shipping', 'coupon', 'voucher'
    ];
    
    marketingTerms.forEach(term => {
      if (lowerContent.includes(term)) {
        violations.push(`Marketing term "${term}" not allowed in ${category} templates`);
        suggestions.push(`Remove marketing language or change category to MARKETING`);
      }
    });
  }
  
  // Authentication template specific rules
  if (category === 'AUTHENTICATION') {
    if (!lowerContent.includes('otp') && !lowerContent.includes('code') && !lowerContent.includes('password')) {
      violations.push('Authentication templates should contain verification elements like OTP, code, or password');
    }
  }
  
  // General content policy violations
  const prohibitedTerms = [
    'click here', 'urgent', 'act now', 'congratulations you won',
    'you have been selected', 'claim your prize'
  ];
  
  prohibitedTerms.forEach(term => {
    if (lowerContent.includes(term)) {
      violations.push(`Prohibited phrase "${term}" detected`);
      suggestions.push(`Replace with more professional language`);
    }
  });
  
  // Check for excessive capitalization
  const upperCaseRatio = (content.match(/[A-Z]/g)?.length || 0) / content.length;
  if (upperCaseRatio > 0.3) {
    violations.push('Excessive use of capital letters detected');
    suggestions.push('Use normal sentence case for better approval chances');
  }
  
  // Check for excessive punctuation
  const punctuationRatio = (content.match(/[!?]{2,}/g)?.length || 0);
  if (punctuationRatio > 0) {
    violations.push('Excessive punctuation marks detected');
    suggestions.push('Use single exclamation marks or question marks');
  }
  
  return {
    isValid: violations.length === 0,
    violations,
    suggestions
  };
}

/**
 * Validates template name according to Meta's naming requirements
 */
export function validateTemplateName(name: string): {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  // Meta naming requirements
  if (!name.match(/^[a-z0-9_]+$/)) {
    errors.push('Template name can only contain lowercase letters, numbers, and underscores');
    suggestions.push('Convert to lowercase and replace spaces/special characters with underscores');
  }
  
  if (name.length < 1) {
    errors.push('Template name cannot be empty');
  }
  
  if (name.length > 512) {
    errors.push('Template name cannot exceed 512 characters');
  }
  
  if (name.startsWith('_')) {
    errors.push('Template name cannot start with underscore');
  }
  
  if (name.endsWith('_')) {
    errors.push('Template name cannot end with underscore');
  }
  
  if (name.includes('__')) {
    errors.push('Template name cannot contain consecutive underscores');
  }
  
  // Suggestions for better naming
  if (name.length < 3) {
    suggestions.push('Use descriptive names (at least 3 characters) for better organization');
  }
  
  const reservedKeywords = ['test', 'sample', 'demo', 'temp'];
  if (reservedKeywords.some(keyword => name.includes(keyword))) {
    suggestions.push('Avoid generic names like "test", "sample", "demo" for production templates');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    suggestions
  };
}

/**
 * Converts template body to Meta API format with numbered placeholders
 */
export function convertToMetaFormat(templateBody: string, variables: string[]): {
  metaBody: string;
  variableMap: Record<string, number>;
  components: MetaTemplateComponent[];
} {
  let metaBody = templateBody;
  const variableMap: Record<string, number> = {};
  
  // Replace variable placeholders with numbered format
  variables.forEach((variable, index) => {
    const variablePattern = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
    const placeholderNumber = index + 1;
    metaBody = metaBody.replace(variablePattern, `{{${placeholderNumber}}}`);
    variableMap[variable] = placeholderNumber;
  });
  
  // Create Meta API components
  const components: MetaTemplateComponent[] = [];
  
  // Add body component
  const bodyComponent: MetaTemplateComponent = {
    type: 'BODY',
    text: metaBody,
  };
  
  // Add examples if variables exist
  if (variables.length > 0) {
    bodyComponent.example = {
      body_text: [variables.map((variable, index) => {
        // Generate meaningful examples based on variable names
        const lowerVar = variable.toLowerCase();
        if (lowerVar.includes('name')) return 'John Doe';
        if (lowerVar.includes('amount') || lowerVar.includes('price')) return '$100';
        if (lowerVar.includes('date')) return '2024-12-31';
        if (lowerVar.includes('time')) return '3:00 PM';
        if (lowerVar.includes('code') || lowerVar.includes('otp')) return '123456';
        if (lowerVar.includes('phone')) return '+1234567890';
        if (lowerVar.includes('email')) return 'user@example.com';
        return `Example ${index + 1}`;
      })]
    };
  }
  
  components.push(bodyComponent);
  
  return {
    metaBody,
    variableMap,
    components
  };
}

/**
 * Validates and prepares template parameters for sending
 */
export function prepareTemplateParameters(
  template: {
    id: string;
    name: string;
    metaTemplateName: string;
    metaTemplateLanguage: string;
    templateVariables: string[];
    templateBody: string;
  },
  inputParameters: Record<string, string>
): {
  parameters: Record<string, string>;
  validation: TemplateValidationResult;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestedParameters: Record<string, string> = {};
  
  // Validate required variables
  const requiredVariables = template.templateVariables || [];
  const providedVariables = Object.keys(inputParameters);
  
  // Check for missing required variables
  requiredVariables.forEach(variable => {
    if (!inputParameters[variable] || inputParameters[variable].trim() === '') {
      errors.push(`Missing required parameter: ${variable}`);
      suggestedParameters[variable] = `[${variable}]`;
    }
  });
  
  // Check for extra variables
  providedVariables.forEach(variable => {
    if (!requiredVariables.includes(variable)) {
      warnings.push(`Extra parameter provided: ${variable} (will be ignored)`);
    }
  });
  
  // Validate parameter values
  Object.entries(inputParameters).forEach(([key, value]) => {
    if (value && value.length > 200) {
      warnings.push(`Parameter ${key} is very long (${value.length} chars). Consider shortening for better delivery.`);
    }
    
    // Check for potentially problematic content
    if (value && /[<>{}]/.test(value)) {
      warnings.push(`Parameter ${key} contains special characters that might cause issues`);
    }
  });
  
  // Prepare final parameters (only include valid template variables)
  const parameters: Record<string, string> = {};
  requiredVariables.forEach(variable => {
    if (inputParameters[variable]) {
      parameters[variable] = inputParameters[variable].trim();
    }
  });
  
  return {
    parameters,
    validation: {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestedParameters,
      metaCompliant: errors.length === 0 && warnings.length === 0
    }
  };
}

/**
 * Comprehensive template validation before submission to Meta
 */
export function validateTemplateForSubmission(template: {
  name: string;
  category: string;
  language: string;
  templateBody: string;
  templateVariables: string[];
}): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metaComponents: MetaTemplateComponent[];
  suggestedChanges: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestedChanges: string[] = [];
  
  // Validate name
  const nameValidation = validateTemplateName(template.name);
  errors.push(...nameValidation.errors);
  suggestedChanges.push(...nameValidation.suggestions);
  
  // Validate content
  const contentValidation = validateTemplateContent(template.templateBody, template.category);
  errors.push(...contentValidation.violations);
  suggestedChanges.push(...contentValidation.suggestions);
  
  // Validate variable placeholders
  const variablePattern = /\{\{(\w+)\}\}/g;
  const foundVariables = [];
  let match;
  
  while ((match = variablePattern.exec(template.templateBody)) !== null) {
    if (match[1]) foundVariables.push(match[1]);
  }
  
  // Check if declared variables match used variables
  const declaredVars = new Set(template.templateVariables);
  const usedVars = new Set(foundVariables);
  
  usedVars.forEach(variable => {
    if (!declaredVars.has(variable)) {
      errors.push(`Variable {{${variable}}} used in template but not declared`);
    }
  });
  
  declaredVars.forEach(variable => {
    if (!usedVars.has(variable)) {
      warnings.push(`Variable ${variable} declared but not used in template`);
    }
  });
  
  // Generate Meta components
  const { components } = convertToMetaFormat(template.templateBody, template.templateVariables);
  
  // Additional Meta-specific validations
  if (template.templateBody.length > 1024) {
    errors.push('Template body exceeds Meta\'s 1024 character limit');
  }
  
  if (template.templateVariables.length > 10) {
    warnings.push('Templates with more than 10 variables may face approval delays');
  }
  
  // Category-specific validations
  if (template.category === 'AUTHENTICATION' && template.templateVariables.length === 0) {
    warnings.push('Authentication templates typically include variables for OTP/codes');
  }
  
  if (template.category === 'UTILITY' && template.templateBody.length < 20) {
    warnings.push('Utility templates should provide meaningful information to users');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metaComponents: components,
    suggestedChanges
  };
}

/**
 * Generate suggested template name from content
 */
export function generateTemplateName(content: string, category: string): string {
  // Extract key words from content
  const words = content
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .slice(0, 3);
  
  // Add category prefix
  const categoryPrefix = category.toLowerCase();
  
  // Combine and clean
  const suggested = [categoryPrefix, ...words]
    .join('_')
    .substring(0, 50); // Keep it reasonable length
  
  return suggested;
} 