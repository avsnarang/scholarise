import { type NextRequest, NextResponse } from "next/server";
import { getDefaultWhatsAppClient } from "@/utils/whatsapp-api";
import { getWhatsAppRateLimiter } from "@/utils/rate-limiter";
import { validateTemplateForSubmission, generateTemplateName } from "@/utils/template-validator";
import { env } from "@/env.js";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const testType = url.searchParams.get('type') || 'connection';
    
    switch (testType) {
      case 'connection':
        return await testConnection();
      case 'environment':
        return await testEnvironment();
      case 'templates':
        return await testTemplates();
      case 'ratelimiter':
        return await testRateLimiter();
      case 'validator':
        return await testValidator();
      default:
        return NextResponse.json({
          error: 'Invalid test type',
          availableTests: ['connection', 'environment', 'templates', 'ratelimiter', 'validator']
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('WhatsApp test endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...params } = body;
    
    switch (action) {
      case 'send_test_message':
        return await sendTestMessage(params);
      case 'submit_test_template':
        return await submitTestTemplate(params);
      case 'webhook_simulation':
        return await simulateWebhook(params);
      case 'bulk_test':
        return await bulkMessageTest(params);
      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: ['send_test_message', 'submit_test_template', 'webhook_simulation', 'bulk_test']
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('WhatsApp test POST error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

async function testConnection() {
  console.log('🧪 Testing WhatsApp API connection...');
  
  try {
    const client = getDefaultWhatsAppClient();
    const result = await client.testConnection();
    
    return NextResponse.json({
      success: result.result,
      connection: result,
      timestamp: new Date().toISOString(),
      phoneNumberId: env.META_WHATSAPP_PHONE_NUMBER_ID
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

async function testEnvironment() {
  console.log('🧪 Testing environment configuration...');
  
  const envCheck = {
    META_WHATSAPP_ACCESS_TOKEN: {
      present: !!env.META_WHATSAPP_ACCESS_TOKEN,
      length: env.META_WHATSAPP_ACCESS_TOKEN?.length || 0,
      preview: env.META_WHATSAPP_ACCESS_TOKEN ? 
        `${env.META_WHATSAPP_ACCESS_TOKEN.substring(0, 8)}...` : 'missing'
    },
    META_WHATSAPP_PHONE_NUMBER_ID: {
      present: !!env.META_WHATSAPP_PHONE_NUMBER_ID,
      value: env.META_WHATSAPP_PHONE_NUMBER_ID || 'missing',
      valid: /^\d+$/.exec(env.META_WHATSAPP_PHONE_NUMBER_ID)
    },
    META_WHATSAPP_BUSINESS_ACCOUNT_ID: {
      present: !!env.META_WHATSAPP_BUSINESS_ACCOUNT_ID,
      value: env.META_WHATSAPP_BUSINESS_ACCOUNT_ID || 'missing'
    },
    META_WHATSAPP_WEBHOOK_VERIFY_TOKEN: {
      present: !!env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN,
      length: env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN?.length || 0
    },
    META_WHATSAPP_APP_SECRET: {
      present: !!env.META_WHATSAPP_APP_SECRET,
      length: env.META_WHATSAPP_APP_SECRET?.length || 0
    },
    META_WHATSAPP_API_VERSION: {
      value: env.META_WHATSAPP_API_VERSION || 'v21.0 (default)'
    }
  };
  
  // Check for common issues
  const issues = [];
  const recommendations = [];
  
  if (!envCheck.META_WHATSAPP_ACCESS_TOKEN.present) {
    issues.push('Missing access token');
    recommendations.push('Set META_WHATSAPP_ACCESS_TOKEN with your Meta WhatsApp access token');
  } else if (envCheck.META_WHATSAPP_ACCESS_TOKEN.length < 50) {
    issues.push('Access token seems too short');
    recommendations.push('Verify your access token is correct and complete');
  }
  
  if (!envCheck.META_WHATSAPP_PHONE_NUMBER_ID.present) {
    issues.push('Missing phone number ID');
    recommendations.push('Set META_WHATSAPP_PHONE_NUMBER_ID with your WhatsApp phone number ID');
  } else if (!envCheck.META_WHATSAPP_PHONE_NUMBER_ID.valid) {
    issues.push('Phone number ID should be numeric');
    recommendations.push('Ensure META_WHATSAPP_PHONE_NUMBER_ID contains only digits');
  }
  
  if (!envCheck.META_WHATSAPP_BUSINESS_ACCOUNT_ID.present) {
    issues.push('Missing business account ID');
    recommendations.push('Set META_WHATSAPP_BUSINESS_ACCOUNT_ID for template management');
  }
  
  if (!envCheck.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN.present) {
    issues.push('Missing webhook verify token');
    recommendations.push('Set META_WHATSAPP_WEBHOOK_VERIFY_TOKEN for webhook verification');
  }
  
  if (!envCheck.META_WHATSAPP_APP_SECRET.present) {
    issues.push('Missing app secret');
    recommendations.push('Set META_WHATSAPP_APP_SECRET for webhook signature validation');
  }
  
  return NextResponse.json({
    success: issues.length === 0,
    environment: envCheck,
    issues,
    recommendations,
    readyForProduction: issues.length === 0,
    timestamp: new Date().toISOString()
  });
}

async function testTemplates() {
  console.log('🧪 Testing template API...');
  
  try {
    const client = getDefaultWhatsAppClient();
    const templatesResult = await client.getTemplates();
    
    const result: any = {
      success: templatesResult.result,
      templateCount: templatesResult.data?.length || 0,
      templates: templatesResult.data?.map(t => ({
        id: t.id,
        name: t.name,
        language: t.language,
        status: t.status,
        category: t.category,
        componentCount: t.components?.length || 0
      })) || [],
      error: templatesResult.error,
      timestamp: new Date().toISOString()
    };
    
    // Additional analysis
    if (result.templates.length > 0) {
      const statusCounts = result.templates.reduce((acc: any, template: any) => {
        acc[template.status] = (acc[template.status] || 0) + 1;
        return acc;
      }, {});
      
      result.analysis = {
        statusBreakdown: statusCounts,
        approvedTemplates: result.templates.filter((t: any) => t.status === 'APPROVED').length,
        pendingTemplates: result.templates.filter((t: any) => t.status === 'PENDING').length,
        rejectedTemplates: result.templates.filter((t: any) => t.status === 'REJECTED').length
      };
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

async function testRateLimiter() {
  console.log('🧪 Testing rate limiter...');
  
  const rateLimiter = getWhatsAppRateLimiter();
  const phoneNumberId = env.META_WHATSAPP_PHONE_NUMBER_ID || 'test';
  
  // Test message rate limiting
  const messageTests = [];
  for (let i = 0; i < 5; i++) {
    const result = await rateLimiter.checkMessageLimit(phoneNumberId);
    messageTests.push({
      attempt: i + 1,
      allowed: result.allowed,
      delay: result.delay,
      remainingRequests: result.remainingRequests
    });
  }
  
  // Test request rate limiting
  const requestTests = [];
  for (let i = 0; i < 5; i++) {
    const result = await rateLimiter.checkRequestLimit();
    requestTests.push({
      attempt: i + 1,
      allowed: result.allowed,
      delay: result.delay,
      remainingRequests: result.remainingRequests
    });
  }
  
  const status = rateLimiter.getStatus();
  
  return NextResponse.json({
    success: true,
    messageTests,
    requestTests,
    currentStatus: status,
    timestamp: new Date().toISOString()
  });
}

async function testValidator() {
  console.log('🧪 Testing template validator...');
  
  const testTemplates = [
    {
      name: 'test_utility_template',
      category: 'UTILITY',
      language: 'en',
      templateBody: 'Hello {{student_name}}, your fee payment of {{amount}} is due on {{due_date}}.',
      templateVariables: ['student_name', 'amount', 'due_date']
    },
    {
      name: 'InvalidName!',
      category: 'MARKETING',
      language: 'en',
      templateBody: 'URGENT!!! BUY NOW AND SAVE MONEY!!!',
      templateVariables: []
    },
    {
      name: 'auth_otp_template',
      category: 'AUTHENTICATION',
      language: 'en',
      templateBody: 'Your OTP code is {{otp_code}}. Valid for 5 minutes.',
      templateVariables: ['otp_code']
    }
  ];
  
  const results = testTemplates.map(template => {
    const validation = validateTemplateForSubmission(template);
    const suggestedName = generateTemplateName(template.templateBody, template.category);
    
    return {
      originalTemplate: template,
      validation: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        suggestedChanges: validation.suggestedChanges
      },
      suggestedName,
      metaComponents: validation.metaComponents
    };
  });
  
  return NextResponse.json({
    success: true,
    testResults: results,
    summary: {
      totalTests: testTemplates.length,
      validTemplates: results.filter(r => r.validation.isValid).length,
      invalidTemplates: results.filter(r => !r.validation.isValid).length
    },
    timestamp: new Date().toISOString()
  });
}

async function sendTestMessage(params: any) {
  const { to, templateName, variables, messageType = 'template' } = params;
  
  if (!to) {
    return NextResponse.json({
      success: false,
      error: 'Phone number (to) is required'
    }, { status: 400 });
  }
  
  try {
    const client = getDefaultWhatsAppClient();
    let result;
    
    if (messageType === 'text') {
      const message = params.message || 'This is a test message from Scholarise WhatsApp integration.';
      result = await client.sendTextMessage(to, message);
    } else {
      if (!templateName) {
        return NextResponse.json({
          success: false,
          error: 'Template name is required for template messages'
        }, { status: 400 });
      }
      
      result = await client.sendTemplateMessage({
        to,
        templateName,
        templateLanguage: params.language || 'en',
        templateVariables: variables || {}
      });
    }
    
    return NextResponse.json({
      success: result.result,
      messageId: result.data?.messages?.[0]?.id,
      response: result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

async function submitTestTemplate(params: any) {
  const {
    name = 'test_template_' + Date.now(),
    category = 'UTILITY',
    language = 'en',
    templateBody = 'Hello {{name}}, this is a test template.',
    templateVariables = ['name']
  } = params;
  
  try {
    // First validate the template
    const validation = validateTemplateForSubmission({
      name,
      category,
      language,
      templateBody,
      templateVariables
    });
    
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Template validation failed',
        validation,
        timestamp: new Date().toISOString()
      });
    }
    
    // Submit to Meta
    const client = getDefaultWhatsAppClient();
    const result = await client.submitTemplateForApproval({
      name,
      category: category,
      language,
      components: validation.metaComponents,
      allowCategoryChange: true
    });
    
    return NextResponse.json({
      success: result.result,
      templateId: result.data?.id,
      validation,
      submission: result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

async function simulateWebhook(params: any) {
  const { type = 'message', phoneNumber = '+1234567890' } = params;
  
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/meta-whatsapp`;
  
  let payload;
  
  if (type === 'message') {
    payload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: '123456789',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: phoneNumber,
              phone_number_id: env.META_WHATSAPP_PHONE_NUMBER_ID
            },
            messages: [{
              from: phoneNumber.replace(/\D/g, ''),
              id: 'test_' + Date.now(),
              timestamp: Math.floor(Date.now() / 1000).toString(),
              text: {
                body: params.message || 'This is a test webhook message'
              },
              type: 'text'
            }]
          },
          field: 'messages'
        }]
      }]
    };
  } else if (type === 'template_status') {
    payload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: '123456789',
        changes: [{
          value: {
            event: params.status || 'APPROVED',
            message_template_id: params.templateId || 'test_template_id',
            message_template_name: params.templateName || 'test_template',
            message_template_language: 'en',
            reason: params.reason || null
          },
          field: 'message_template_status_update'
        }]
      }]
    };
  }
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-simulated-webhook': 'true'
      },
      body: JSON.stringify(payload)
    });
    
    const responseData = await response.text();
    
    return NextResponse.json({
      success: response.ok,
      webhookUrl,
      payload,
      response: {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      webhookUrl,
      payload,
      timestamp: new Date().toISOString()
    });
  }
}

async function bulkMessageTest(params: any) {
  const {
    recipients = ['9876543210', '8765432109'], // Test numbers without country code
    templateName,
    batchSize = 2,
    variables = {},
    normalizePhoneNumbers = true
  } = params;
  
  if (!templateName) {
    return NextResponse.json({
      success: false,
      error: 'Template name is required for bulk test'
    }, { status: 400 });
  }
  
  try {
    const client = getDefaultWhatsAppClient();
    
    // Convert phone numbers to recipient objects
    const recipientObjects = recipients.map((phone: string, index: number) => ({
      phone,
      name: `Test User ${index + 1}`,
      variables: { ...variables, name: `Test User ${index + 1}` }
    }));
    
    const startTime = Date.now();
    const result = await client.sendBulkTemplateMessage(
      recipientObjects,
      templateName,
      variables,
      'en',
      normalizePhoneNumbers
    );
    const endTime = Date.now();
    
    return NextResponse.json({
      success: result.result,
      duration: endTime - startTime,
      batchSize,
      results: result.data,
      phoneNormalization: {
        applied: result.data?.phoneNormalizationApplied,
        normalizedCount: result.data?.results.filter(r => r.normalized).length || 0,
        examples: result.data?.results.filter(r => r.normalized && r.originalPhone).map(r => ({
          original: r.originalPhone,
          normalized: r.phone
        })).slice(0, 3) || []
      },
      performance: {
        totalRecipients: recipients.length,
        messagesPerSecond: (recipients.length / ((endTime - startTime) / 1000)).toFixed(2),
        successRate: result.data ? (result.data.successful / recipients.length * 100).toFixed(1) : 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 