/// <reference types="https://deno.land/x/types/react/index.d.ts" />

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
    messageRecipientId: string
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
    // Initialize Supabase client - use the same URL as the application
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    console.log('🔗 Database connection:', {
      url: supabaseUrl,
      hasKey: !!supabaseKey
    });
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
        console.log(`📤 Sending to recipient:`, {
          index: i + 1,
          total: totalRecipients,
          recipientId: recipient.id,
          recipientName: recipient.name,
          recipientPhone: recipient.phone,
          recipientType: recipient.type
        })

        // Build template parameters for this recipient
        let recipientVariables: Record<string, string> = { ...(templateParameters || {}) }
        
        if (templateDataMappings && Object.keys(templateDataMappings).length > 0) {
          // Apply template data mappings
          for (const [variableName, mapping] of Object.entries(templateDataMappings)) {
            const typedMapping = mapping as { dataField: string; fallbackValue: string }
            recipientVariables[variableName] = extractRecipientData(recipient, typedMapping.dataField, typedMapping.fallbackValue)
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
          // Ensure phone number is properly formatted
          let formattedPhone = recipient.phone
          // Remove any non-numeric characters
          formattedPhone = formattedPhone.replace(/\D/g, '')
          // Ensure it doesn't start with a plus
          if (formattedPhone.startsWith('+')) {
            formattedPhone = formattedPhone.substring(1)
          }
          
          console.log(`📱 Formatted phone number: ${recipient.phone} -> ${formattedPhone}`)
          
          // Send actual WhatsApp message using Meta API
          messageResult = await sendWhatsAppMessage(
            formattedPhone,
            templateData.metaTemplateName,
            templateData.metaTemplateLanguage || 'en',
            recipientVariables,
            whatsappConfig,
            {
              headerType: templateData.headerType,
              headerContent: templateData.headerContent,
              headerMediaUrl: templateData.headerMediaUrl,
              footerText: templateData.footerText,
              buttons: templateData.buttons
            }
          )
          
          console.log(`📬 WhatsApp API response:`, messageResult)
        }

        if (messageResult.success) {
          successfulSent++
          
          // Update recipient status with better error handling
          console.log(`📝 Updating recipient ${recipient.messageRecipientId} with metaMessageId: ${messageResult.messageId}`)
          
          const { data: updateData, error: updateError } = await supabase
            .from('MessageRecipient')
            .update({
              status: 'SENT',
              sentAt: new Date().toISOString(),
              metaMessageId: messageResult.messageId
            })
            .eq('id', recipient.messageRecipientId)
            .select()

          if (updateError) {
            console.error(`❌ Failed to update recipient ${recipient.messageRecipientId} with metaMessageId:`, updateError)
            console.error('Update params:', { messageRecipientId: recipient.messageRecipientId, metaMessageId: messageResult.messageId })
                      } else {
              console.log(`✅ Successfully updated recipient ${recipient.messageRecipientId} with metaMessageId:`, updateData)
            }

        } else {
          failed++
          
          // Update recipient with error
          const { error: updateError } = await supabase
            .from('MessageRecipient')
            .update({
              status: 'FAILED',
              errorMessage: messageResult.error
            })
            .eq('id', recipient.messageRecipientId)

          if (updateError) {
            console.error(`❌ Failed to update failed recipient ${recipient.messageRecipientId}:`, updateError)
          }
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
          .eq('id', recipient?.messageRecipientId || '')
      }
    }

    // Mark job as completed
    console.log(`📊 Marking job ${jobId} as completed with ${successfulSent} sent, ${failed} failed`)
    
    const { error: jobUpdateError } = await supabase
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

    if (jobUpdateError) {
      console.error('❌ Failed to update job status:', jobUpdateError)
    }

    // Update main message status
    console.log(`📊 Updating main message ${messageId} status`)
    
    const messageStatus = failed === 0 ? 'SENT' : (successfulSent === 0 ? 'FAILED' : 'SENT')
    
    const { error: messageUpdateError } = await supabase
      .from('CommunicationMessage')
      .update({
        status: messageStatus,
        sentAt: successfulSent > 0 ? new Date().toISOString() : null,
        successfulSent,
        failed,
        totalRecipients,
        updatedAt: new Date().toISOString()
      })
      .eq('id', messageId)

    if (messageUpdateError) {
      console.error('❌ Failed to update message status:', messageUpdateError)
    } else {
      console.log(`✅ Updated message ${messageId} status to ${messageStatus}`)
    }

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
  config: { accessToken: string; phoneNumberId: string; apiVersion?: string },
  templateData?: {
    headerType?: string
    headerContent?: string
    headerMediaUrl?: string
    footerText?: string
    buttons?: any[]
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const apiVersion = config.apiVersion || 'v21.0'
    const url = `https://graph.facebook.com/${apiVersion}/${config.phoneNumberId}/messages`

    // Prepare template payload
    const templatePayload: {
      messaging_product: string
      to: string
      type: string
      template: {
        name: string
        language: { code: string }
        components?: Array<{
          type: string
          parameters: Array<{ type: string; text: string }>
        }>
      }
    } = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language }
      }
    }

    // Build components array for rich template support
    const components: any[] = []
    
    // Add header component for media headers (images, videos, documents)
    if (templateData?.headerType && 
        templateData.headerType !== "TEXT" && 
        templateData.headerMediaUrl) {
      components.push({
        type: 'header',
        parameters: [{
          type: templateData.headerType.toLowerCase(),
          [templateData.headerType.toLowerCase()]: {
            link: templateData.headerMediaUrl
          }
        }]
      })
    }
    
    // Add body component with variables if present
    if (variables && Object.keys(variables).length > 0) {
      const sortedEntries = Object.entries(variables).sort(([a], [b]) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0
        const numB = parseInt(b.replace(/\D/g, '')) || 0
        return numA - numB
      })

      if (sortedEntries.length > 0) {
        components.push({
          type: 'body',
          parameters: sortedEntries.map(([_, value]) => ({
            type: 'text',
            text: String(value || '')
          }))
        })
      }
    }
    
    // Add components to template payload if any exist
    if (components.length > 0) {
      templatePayload.template.components = components
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