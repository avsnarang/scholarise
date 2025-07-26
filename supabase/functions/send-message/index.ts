/// <reference types="https://deno.land/x/types/react/index.d.ts" />

// Deno global types
declare global {
  const Deno: {
    env: {
      get(key: string): string | undefined;
    };
  };
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JobPayload {
  jobId: string
  messageId: string
  templateData?: any
  recipients: Array<{
    id: string
    name: string
    phone: string
    type: string
    additional?: any
  }>
  templateParameters?: Record<string, string>
  templateDataMappings?: Record<string, { dataField: string; fallbackValue: string }>
  whatsappConfig: {
    accessToken: string
    phoneNumberId: string
    apiVersion?: string
  }
  dryRun?: boolean
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parse request body
    const requestBody = await req.json()
    console.log('📥 Received request body:', JSON.stringify(requestBody, null, 2))
    
    // Handle test requests
    if (requestBody.test === true) {
      console.log('🧪 Test mode activated')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Edge function is working!',
          environment: {
            supabaseUrl: !!supabaseUrl,
            supabaseKey: !!supabaseKey,
            timestamp: new Date().toISOString()
          },
          receivedPayload: requestBody
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Validate required fields
    if (!requestBody.jobId) {
      throw new Error('Missing required field: jobId')
    }
    if (!requestBody.messageId) {
      throw new Error('Missing required field: messageId')
    }
    if (!requestBody.recipients || !Array.isArray(requestBody.recipients)) {
      throw new Error('Missing or invalid recipients array')
    }
    if (!requestBody.whatsappConfig) {
      throw new Error('Missing WhatsApp configuration')
    }
    if (!requestBody.whatsappConfig.accessToken || !requestBody.whatsappConfig.phoneNumberId) {
      throw new Error('Invalid WhatsApp configuration - missing accessToken or phoneNumberId')
    }

    const { jobId, messageId, templateData, recipients, templateParameters, templateDataMappings, whatsappConfig, dryRun }: JobPayload = requestBody

    console.log(`🚀 Starting message job ${jobId} for message ${messageId}`)
    console.log(`📊 Processing ${recipients.length} recipients`)
    console.log(`🔑 WhatsApp config: phoneNumberId=${whatsappConfig.phoneNumberId}, hasToken=${!!whatsappConfig.accessToken}`)
    console.log(`🧪 Dry run mode: ${dryRun ? 'ENABLED' : 'DISABLED'}`)

    // Update job status to PROCESSING
    await supabase
      .from('MessageJob')
      .update({
        status: 'PROCESSING',
        startedAt: new Date().toISOString(),
        totalRecipients: recipients.length,
        progress: 0
      })
      .eq('id', jobId)

    // Process each recipient with progress tracking
    let successfulSent = 0
    let failed = 0
    const totalRecipients = recipients.length

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i]
      if (!recipient) {
        console.error(`❌ Recipient at index ${i} is undefined`)
        failed++
        continue
      }
      
      const progress = Math.round(((i + 1) / totalRecipients) * 100)

      try {
        console.log(`📤 Sending to ${recipient.phone} (${i + 1}/${totalRecipients})`)

        // Build template parameters for this recipient
        let recipientVariables: Record<string, string> = { ...(templateParameters || {}) }
        
        if (templateDataMappings && Object.keys(templateDataMappings).length > 0) {
          // Apply template data mappings
          for (const [variableName, mapping] of Object.entries(templateDataMappings)) {
            recipientVariables[variableName] = extractRecipientData(recipient, mapping.dataField, mapping.fallbackValue)
          }
        }

        let messageResult: { success: boolean; messageId?: string; error?: string }

        if (dryRun) {
          // Simulate message sending in dry-run mode
          console.log(`🧪 DRY RUN: Would send to ${recipient.phone} with template ${templateData.metaTemplateName}`)
          
          // Simulate a 90% success rate for testing
          const simulateSuccess = Math.random() > 0.1
          
          if (simulateSuccess) {
            messageResult = {
              success: true,
              messageId: `dry_run_${Date.now()}_${Math.random().toString(36).substring(7)}`
            }
          } else {
            messageResult = {
              success: false,
              error: 'Simulated failure for testing'
            }
          }
          
          // Add a small delay to simulate processing time
          await new Promise(resolve => setTimeout(resolve, 100))
        } else {
          // Send actual WhatsApp message using Meta API
          messageResult = await sendWhatsAppMessage(
            recipient.phone,
            templateData.metaTemplateName,
            templateData.metaTemplateLanguage || 'en',
            recipientVariables,
            whatsappConfig
          )
        }

        if (messageResult.success) {
          successfulSent++
          
          // Update recipient status
          await supabase
            .from('MessageRecipient')
            .update({
              status: 'SENT',
              sentAt: new Date().toISOString(),
              metaMessageId: messageResult.messageId
            })
            .eq('messageId', messageId)
            .eq('recipientId', recipient.id)

        } else {
          failed++
          
          // Update recipient with error
          await supabase
            .from('MessageRecipient')
            .update({
              status: 'FAILED',
              errorMessage: messageResult.error
            })
            .eq('messageId', messageId)
            .eq('recipientId', recipient.id)
        }

        // Update job progress (real-time)
        await supabase
          .from('MessageJob')
          .update({
            progress,
            processedRecipients: i + 1,
            successfulSent,
            failed,
            updatedAt: new Date().toISOString()
          })
          .eq('id', jobId)

        console.log(`✅ Progress: ${progress}% (${successfulSent} sent, ${failed} failed)`)

        // Rate limiting - 50 messages per second as per Meta API limits
        await new Promise(resolve => setTimeout(resolve, 20))

      } catch (error) {
        console.error(`❌ Error sending to ${recipient?.phone || 'unknown'}:`, error)
        failed++

        // Update recipient with error
        await supabase
          .from('MessageRecipient')
          .update({
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : String(error)
          })
          .eq('messageId', messageId)
          .eq('recipientId', recipient?.id || '')
      }
    }

    // Mark job as completed
    await supabase
      .from('MessageJob')
      .update({
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        progress: 100,
        processedRecipients: totalRecipients,
        successfulSent,
        failed,
        updatedAt: new Date().toISOString()
      })
      .eq('id', jobId)

    // Update main message status
    await supabase
      .from('CommunicationMessage')
      .update({
        status: 'SENT',
        sentAt: new Date().toISOString(),
        successfulSent,
        failed,
        updatedAt: new Date().toISOString()
      })
      .eq('id', messageId)

    console.log(`🎉 Job ${jobId} completed: ${successfulSent} sent, ${failed} failed`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        jobId,
        totalRecipients,
        successfulSent,
        failed 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Edge function error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Helper function to extract recipient data (similar to frontend logic)
function extractRecipientData(recipient: any, dataField: string, fallbackValue?: string): string {
  switch (dataField) {
    // Student data
    case 'student_name':
      return recipient.additional?.student?.name || fallbackValue || '';
    case 'student_first_name':
      return recipient.additional?.student?.firstName || fallbackValue || '';
    case 'student_class':
    case 'class':
      return recipient.additional?.student?.class?.name || recipient.className || fallbackValue || '';
    case 'student_section':
    case 'section':
      return recipient.additional?.student?.section?.name || fallbackValue || '';
    case 'class_and_section':
      const className = recipient.additional?.student?.class?.name || recipient.className || '';
      const sectionName = recipient.additional?.student?.section?.name || '';
      if (className && sectionName) return `${className} - ${sectionName}`;
      return className || fallbackValue || '';
    
    // Contact person data
    case 'contact_person_name':
    case 'parent_name':
      return recipient.additional?.contactPersonName || recipient.name || fallbackValue || '';
    case 'father_name':
      return recipient.additional?.parent?.fatherName || fallbackValue || '';
    case 'mother_name':
      return recipient.additional?.parent?.motherName || fallbackValue || '';
    
    // Staff data
    case 'first_name':
      return recipient.additional?.firstName || fallbackValue || '';
    case 'last_name':
      return recipient.additional?.lastName || fallbackValue || '';
    case 'designation':
      return recipient.additional?.designation || fallbackValue || '';
    
    // Other fields
    case 'recipient_phone':
      return recipient.phone || fallbackValue || '';
    case 'current_date':
      return new Date().toLocaleDateString();
    case 'custom_value':
      return fallbackValue || '';
    
    default:
      return fallbackValue || '';
  }
}

// Helper function to send WhatsApp message via Meta API
async function sendWhatsAppMessage(
  phoneNumber: string,
  templateName: string,
  language: string,
  variables: Record<string, string>,
  config: { accessToken: string; phoneNumberId: string; apiVersion?: string }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const apiVersion = config.apiVersion || 'v21.0'
    const url = `https://graph.facebook.com/${apiVersion}/${config.phoneNumberId}/messages`

    // Prepare template payload
    const templatePayload: any = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language }
      }
    }

    // Add template variables if present
    if (variables && Object.keys(variables).length > 0) {
      const sortedEntries = Object.entries(variables).sort(([a], [b]) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0
        const numB = parseInt(b.replace(/\D/g, '')) || 0
        return numA - numB
      })

      if (sortedEntries.length > 0) {
        templatePayload.template.components = [{
          type: 'body',
          parameters: sortedEntries.map(([_, value]) => ({
            type: 'text',
            text: String(value || '')
          }))
        }]
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(templatePayload)
    })

    const result = await response.json()

    if (response.ok && result.messages?.[0]?.id) {
      return {
        success: true,
        messageId: result.messages[0].id
      }
    } else {
      return {
        success: false,
        error: result.error?.message || 'Unknown WhatsApp API error'
      }
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
} 