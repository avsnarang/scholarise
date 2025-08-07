/**
 * Enhanced Template Sync Processor
 * Handles comprehensive processing of WhatsApp templates including rich media components
 */

export interface ProcessedTemplateData {
  // Basic template data
  templateBody: string;
  templateVariables: string[];
  category: string;
  language: string;
  
  // Header components
  headerType?: string;
  headerContent?: string;
  headerMediaUrl?: string;
  headerFilename?: string;
  
  // Footer component
  footerText?: string;
  
  // Interactive components
  buttons?: any[];
  mediaAttachments?: any[];
  interactiveType?: string;
  interactiveContent?: any;
}

export interface TemplateComponent {
  type: string;
  text?: string;
  url?: string;
  filename?: string;
  buttons?: any[];
  [key: string]: any;
}

export interface MetaTemplate {
  id: string;
  name: string;
  category?: string;
  language?: string;
  status?: string;
  components?: TemplateComponent[];
}

/**
 * Process a Meta WhatsApp template and extract all component details
 */
export function processMetaTemplate(metaTemplate: MetaTemplate): ProcessedTemplateData {
  const components = metaTemplate.components || [];
  
  // Initialize processed data
  const processed: ProcessedTemplateData = {
    templateBody: '',
    templateVariables: [],
    category: metaTemplate.category || 'UTILITY',
    language: metaTemplate.language || 'en',
    buttons: [],
    mediaAttachments: []
  };

  // Process each component
  for (const component of components) {
    switch (component.type) {
      case 'HEADER':
        processed.headerType = component.format || 'TEXT';
        
        if (component.format === 'TEXT') {
          processed.headerContent = component.text || '';
        } else if (component.format === 'DOCUMENT') {
          processed.headerType = 'DOCUMENT';
          processed.headerMediaUrl = component.example?.header_handle?.[0] || '';
          processed.headerFilename = component.example?.header_text?.[0] || '';
          
          // Add to media attachments for better tracking
          if (processed.headerMediaUrl) {
            processed.mediaAttachments!.push({
              type: 'DOCUMENT',
              url: processed.headerMediaUrl,
              filename: processed.headerFilename,
              componentType: 'HEADER'
            });
          }
        } else if (component.format === 'IMAGE') {
          processed.headerType = 'IMAGE';
          processed.headerMediaUrl = component.example?.header_handle?.[0] || '';
          
          processed.mediaAttachments!.push({
            type: 'IMAGE',
            url: processed.headerMediaUrl,
            componentType: 'HEADER'
          });
        } else if (component.format === 'VIDEO') {
          processed.headerType = 'VIDEO';
          processed.headerMediaUrl = component.example?.header_handle?.[0] || '';
          
          processed.mediaAttachments!.push({
            type: 'VIDEO',
            url: processed.headerMediaUrl,
            componentType: 'HEADER'
          });
        }
        break;

      case 'BODY':
        processed.templateBody = component.text || '';
        
        // Extract variables from template body
        const variableMatches = processed.templateBody.match(/\{\{\d+\}\}/g) || [];
        processed.templateVariables = variableMatches.map((match: string, index: number) => 
          `variable_${index + 1}`
        );
        break;

      case 'FOOTER':
        processed.footerText = component.text || '';
        break;

      case 'BUTTONS':
        if (component.buttons && Array.isArray(component.buttons)) {
          processed.buttons = component.buttons.map((button: any, index: number) => ({
            type: button.type || 'QUICK_REPLY',
            text: button.text || '',
            url: button.url || null,
            phoneNumber: button.phone_number || null,
            payload: button.payload || null,
            order: index
          }));
          
          // Set interactive type based on button configuration
          if (processed.buttons.length > 0) {
            const hasCallToAction = processed.buttons.some(b => b.type === 'URL' || b.type === 'PHONE_NUMBER');
            processed.interactiveType = hasCallToAction ? 'CTA_URL' : 'BUTTON';
            processed.interactiveContent = {
              buttons: processed.buttons
            };
          }
        }
        break;

      default:
        console.warn(`Unknown component type: ${component.type}`);
    }
  }

  return processed;
}

/**
 * Validate processed template data for completeness and correctness
 */
export function validateProcessedTemplate(processed: ProcessedTemplateData): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  if (!processed.templateBody) {
    errors.push('Template body is required');
  }

  // Header validation
  if (processed.headerType === 'DOCUMENT') {
    if (!processed.headerMediaUrl) {
      errors.push('Document header requires a valid media URL');
    }
    if (!processed.headerFilename) {
      warnings.push('Document header should include a filename');
    }
  }

  // Media validation
  if (processed.headerType && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(processed.headerType)) {
    if (!processed.headerMediaUrl) {
      errors.push(`${processed.headerType} header requires a valid media URL`);
    }
  }

  // Button validation
  if (processed.buttons && processed.buttons.length > 0) {
    processed.buttons.forEach((button, index) => {
      if (!button.text) {
        errors.push(`Button ${index + 1} is missing text`);
      }
      if (button.type === 'URL' && !button.url) {
        errors.push(`URL button ${index + 1} is missing URL`);
      }
      if (button.type === 'PHONE_NUMBER' && !button.phoneNumber) {
        errors.push(`Phone button ${index + 1} is missing phone number`);
      }
    });

    if (processed.buttons.length > 3) {
      warnings.push('WhatsApp supports maximum 3 buttons per template');
    }
  }

  // Variable validation
  const variableCount = processed.templateVariables.length;
  const bodyVariableMatches = (processed.templateBody.match(/\{\{\d+\}\}/g) || []).length;
  
  if (variableCount !== bodyVariableMatches) {
    warnings.push(`Variable count mismatch: extracted ${variableCount} but found ${bodyVariableMatches} in body`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Enhanced logging for template sync operations
 */
export function logTemplateSyncDetails(
  templateName: string,
  processed: ProcessedTemplateData,
  validation: ReturnType<typeof validateProcessedTemplate>
): void {
  console.log(`📄 Processing template: ${templateName}`);
  console.log(`   📝 Body: ${processed.templateBody.substring(0, 50)}...`);
  console.log(`   🔤 Variables: ${processed.templateVariables.length} (${processed.templateVariables.join(', ')})`);
  
  if (processed.headerType) {
    console.log(`   📋 Header: ${processed.headerType}${processed.headerContent ? ` - ${processed.headerContent.substring(0, 30)}...` : ''}${processed.headerMediaUrl ? ` - ${processed.headerMediaUrl}` : ''}`);
  }
  
  if (processed.footerText) {
    console.log(`   🔻 Footer: ${processed.footerText.substring(0, 30)}...`);
  }
  
  if (processed.buttons && processed.buttons.length > 0) {
    console.log(`   🔘 Buttons: ${processed.buttons.length} (${processed.buttons.map(b => b.text).join(', ')})`);
  }
  
  if (processed.mediaAttachments && processed.mediaAttachments.length > 0) {
    console.log(`   📎 Media: ${processed.mediaAttachments.length} attachments`);
  }

  if (validation.errors.length > 0) {
    console.error(`   ❌ Errors: ${validation.errors.join(', ')}`);
  }
  
  if (validation.warnings.length > 0) {
    console.warn(`   ⚠️  Warnings: ${validation.warnings.join(', ')}`);
  }
}

/**
 * Create template data object for database operations
 */
export function createTemplateDataObject(
  metaTemplate: MetaTemplate,
  processed: ProcessedTemplateData,
  additionalData: {
    createdBy?: string;
    branchId?: string;
    isUpdate?: boolean;
  } = {}
): any {
  const baseData = {
    name: metaTemplate.name,
    templateBody: processed.templateBody,
    templateVariables: processed.templateVariables,
    category: processed.category,
    language: processed.language,
    metaTemplateId: metaTemplate.id,
    metaTemplateName: metaTemplate.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    metaTemplateLanguage: processed.language,
    metaTemplateStatus: metaTemplate.status || 'APPROVED',
    status: (metaTemplate.status === 'approved' || metaTemplate.status === 'APPROVED' || !metaTemplate.status) ? 'APPROVED' : 'PENDING',
    
    // Rich media fields
    headerType: processed.headerType,
    headerContent: processed.headerContent,
    headerMediaUrl: processed.headerMediaUrl,
    headerFilename: processed.headerFilename,
    footerText: processed.footerText,
    buttons: processed.buttons && processed.buttons.length > 0 ? processed.buttons : null,
    mediaAttachments: processed.mediaAttachments && processed.mediaAttachments.length > 0 ? processed.mediaAttachments : null,
    interactiveType: processed.interactiveType,
    interactiveContent: processed.interactiveContent,
    
    updatedAt: new Date(),
  };

  // Add create-specific fields
  if (!additionalData.isUpdate) {
    return {
      ...baseData,
      branchId: additionalData.branchId,
      createdBy: additionalData.createdBy,
    };
  }

  return baseData;
}

/**
 * Handle sync conflicts and data integrity issues
 */
export function detectSyncConflicts(
  existingTemplate: any,
  incomingTemplate: MetaTemplate,
  processedData: ProcessedTemplateData
): {
  hasConflicts: boolean;
  conflicts: string[];
  recommendations: string[];
} {
  const conflicts: string[] = [];
  const recommendations: string[] = [];

  // Check for template body changes
  if (existingTemplate.templateBody !== processedData.templateBody) {
    if (existingTemplate.metaTemplateStatus === 'APPROVED' && processedData.templateBody) {
      conflicts.push('Template body changed for approved template');
      recommendations.push('Review body changes and re-submit for approval if necessary');
    }
  }

  // Check for variable count changes
  if (existingTemplate.templateVariables?.length !== processedData.templateVariables.length) {
    conflicts.push('Template variable count changed');
    recommendations.push('Update any existing message configurations that use this template');
  }

  // Check for header type changes
  if (existingTemplate.headerType !== processedData.headerType) {
    conflicts.push(`Header type changed from ${existingTemplate.headerType || 'none'} to ${processedData.headerType || 'none'}`);
    recommendations.push('Test template rendering to ensure compatibility');
  }

  // Check for button changes
  const existingButtonCount = existingTemplate.templateButtons?.length || 0;
  const newButtonCount = processedData.buttons?.length || 0;
  
  if (existingButtonCount !== newButtonCount) {
    conflicts.push(`Button count changed from ${existingButtonCount} to ${newButtonCount}`);
    recommendations.push('Review interactive functionality that depends on buttons');
  }

  // Check for media changes
  const existingMediaCount = existingTemplate.templateMedia?.length || 0;
  const newMediaCount = processedData.mediaAttachments?.length || 0;
  
  if (existingMediaCount !== newMediaCount) {
    conflicts.push(`Media attachment count changed from ${existingMediaCount} to ${newMediaCount}`);
    recommendations.push('Verify media URLs are accessible and valid');
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    recommendations
  };
}

/**
 * Enhanced error recovery for template sync operations
 */
export function createSyncErrorReport(
  templateName: string,
  error: any,
  templateData: any
): {
  errorType: string;
  errorMessage: string;
  suggestedActions: string[];
  debugInfo: any;
} {
  let errorType = 'UNKNOWN_ERROR';
  let errorMessage = 'An unknown error occurred during template sync';
  const suggestedActions: string[] = [];

  if (error.code === 'P2002') {
    errorType = 'UNIQUE_CONSTRAINT_VIOLATION';
    errorMessage = 'Template with same name and language already exists';
    suggestedActions.push('Check for duplicate templates in Meta dashboard');
    suggestedActions.push('Verify template naming conventions');
  } else if (error.code === 'P2025') {
    errorType = 'RECORD_NOT_FOUND';
    errorMessage = 'Template not found for update operation';
    suggestedActions.push('Template may have been deleted from database');
    suggestedActions.push('Run full sync to recreate missing templates');
  } else if (error.message?.includes('validation')) {
    errorType = 'VALIDATION_ERROR';
    errorMessage = 'Template data failed validation checks';
    suggestedActions.push('Review template format in Meta dashboard');
    suggestedActions.push('Check for invalid characters or structure');
  } else if (error.message?.includes('timeout')) {
    errorType = 'TIMEOUT_ERROR';
    errorMessage = 'Database operation timed out';
    suggestedActions.push('Retry sync operation');
    suggestedActions.push('Check database connection and performance');
  }

  return {
    errorType,
    errorMessage,
    suggestedActions,
    debugInfo: {
      originalError: error.message,
      errorCode: error.code,
      templateName,
      timestamp: new Date().toISOString(),
      templateDataKeys: Object.keys(templateData || {})
    }
  };
}
