interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date';
  required?: boolean;
  defaultValue?: string;
}

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: string;
  text?: string;
  parameters?: TemplateVariable[];
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  metaTemplateName: string;
  metaTemplateLanguage?: string;
  templateVariables?: any;
  templateBody?: string;
  components?: TemplateComponent[];
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestedParameters?: Record<string, string>;
}

export class TemplateValidator {
  /**
   * Validate template parameters against template structure
   */
  static validateTemplateParameters(
    template: WhatsAppTemplate,
    parameters: Record<string, string>
  ): TemplateValidationResult {
    const result: TemplateValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestedParameters: {}
    };

    // If template has no variables defined, check if parameters are provided
    if (!template.templateVariables || template.templateVariables.length === 0) {
      if (Object.keys(parameters).length > 0) {
        result.warnings.push(`Template "${template.name}" doesn't expect any variables, but ${Object.keys(parameters).length} were provided`);
      }
      return result;
    }

    const templateVars = Array.isArray(template.templateVariables) 
      ? template.templateVariables 
      : [];

    // Check for missing required variables
    for (let i = 0; i < templateVars.length; i++) {
      const expectedVar = `var${i + 1}`;
      const varName = templateVars[i];
      
      if (!parameters[expectedVar] && !parameters[varName]) {
        result.errors.push(`Missing required variable: ${expectedVar} (${varName})`);
        result.suggestedParameters![expectedVar] = `[${varName}]`;
        result.isValid = false;
      }
    }

    // Check for extra variables
    const expectedVarCount = templateVars.length;
    const providedVarCount = Object.keys(parameters).length;
    
    if (providedVarCount > expectedVarCount) {
      result.warnings.push(`Template expects ${expectedVarCount} variables but ${providedVarCount} were provided`);
    }

    // Validate variable format and content
    Object.entries(parameters).forEach(([key, value]) => {
      if (!value || value.trim() === '') {
        result.warnings.push(`Variable ${key} is empty`);
      }
      
      if (typeof value !== 'string') {
        result.warnings.push(`Variable ${key} should be a string, got ${typeof value}`);
      }
    });

    return result;
  }

  /**
   * Generate standard template parameters from template variables
   */
  static generateStandardParameters(
    templateVariables: string[],
    values: Record<string, string>
  ): Record<string, string> {
    const standardParams: Record<string, string> = {};
    
    templateVariables.forEach((varName, index) => {
      const standardKey = `var${index + 1}`;
      
      // Try different possible keys for this variable
      const possibleKeys = [
        standardKey,
        varName,
        varName.toLowerCase(),
        varName.replace(/[^a-zA-Z0-9]/g, '_')
      ];
      
      for (const key of possibleKeys) {
        if (values[key]) {
          standardParams[standardKey] = values[key];
          break;
        }
      }
      
      // If still not found, use empty string or default
      if (!standardParams[standardKey]) {
        standardParams[standardKey] = values[varName] || '';
      }
    });
    
    return standardParams;
  }

  /**
   * Analyze template body to extract variable placeholders
   */
  static extractVariablesFromBody(templateBody: string): string[] {
    const variables: string[] = [];
    
    // Match {{variable}} patterns
    const matches = templateBody.match(/\{\{([^}]+)\}\}/g);
    
    if (matches) {
      matches.forEach(match => {
        const varName = match.replace(/\{\{|\}\}/g, '').trim();
        if (!variables.includes(varName)) {
          variables.push(varName);
        }
      });
    }
    
    return variables;
  }

  /**
   * Get template validation suggestions
   */
  static getValidationSuggestions(template: WhatsAppTemplate): string[] {
    const suggestions: string[] = [];
    
    if (!template.metaTemplateName) {
      suggestions.push('Template is missing Meta template name - sync with Meta first');
    }
    
    if (!template.templateVariables || template.templateVariables.length === 0) {
      if (template.templateBody) {
        const extractedVars = this.extractVariablesFromBody(template.templateBody);
        if (extractedVars.length > 0) {
          suggestions.push(`Template body contains variables but none are defined: ${extractedVars.join(', ')}`);
        }
      }
    }
    
    return suggestions;
  }
}

/**
 * Helper function to validate and prepare template parameters for sending
 */
export function prepareTemplateParameters(
  template: WhatsAppTemplate,
  inputParameters: Record<string, string>
): {
  parameters: Record<string, string>;
  validation: TemplateValidationResult;
} {
  const validation = TemplateValidator.validateTemplateParameters(template, inputParameters);
  
  let parameters = { ...inputParameters };
  
  // If template has defined variables, standardize the parameter keys
  if (template.templateVariables && Array.isArray(template.templateVariables)) {
    parameters = TemplateValidator.generateStandardParameters(
      template.templateVariables,
      inputParameters
    );
  }
  
  return { parameters, validation };
} 