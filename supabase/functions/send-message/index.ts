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
  batchInfo?: {
    batchIndex: number
    totalBatches: number
    parentJobId: string
    recipientRange: string
  }
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

    const { jobId, messageId, templateData, recipients, templateParameters, templateDataMappings, whatsappConfig, dryRun, batchInfo }: JobPayload = requestBody

    // Log batch information if present
    if (batchInfo) {
      console.log(`📦 Batch ${batchInfo.batchIndex}/${batchInfo.totalBatches} - Recipients ${batchInfo.recipientRange}`)
      console.log(`🔗 Parent Job ID: ${batchInfo.parentJobId}`)
    }
    
    console.log(`🚀 Starting message job ${jobId} for message ${messageId}`)
    console.log(`📊 Processing ${recipients.length} recipients`)
    console.log(`🔑 WhatsApp config: phoneNumberId=${whatsappConfig.phoneNumberId}, hasToken=${!!whatsappConfig.accessToken}`)
    console.log(`🧪 Dry run mode: ${dryRun ? 'ENABLED' : 'DISABLED'}`)

    // Check if job exists, create if it's a batch job
    const { data: existingJob } = await supabase
      .from('MessageJob')
      .select('id')
      .eq('id', jobId)
      .single()
    
    if (!existingJob) {
      // This is a batch job, create the job record
      console.log(`📝 Creating batch job record: ${jobId}`)
      
      const { error: createError } = await supabase
        .from('MessageJob')
        .insert({
          id: jobId,
          messageId: messageId,
          status: 'PROCESSING',
          startedAt: new Date().toISOString(),
          totalRecipients: recipients.length,
          processedRecipients: 0,
          successfulSent: 0,
          failed: 0,
          progress: 0,
          parentJobId: batchInfo?.parentJobId || null,
          batchIndex: batchInfo?.batchIndex || null,
          totalBatches: batchInfo?.totalBatches || null,
          recipientRange: batchInfo?.recipientRange || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      
      if (createError) {
        console.error('❌ Failed to create batch job record:', createError)
        // Continue anyway, the job will process but without proper tracking
      }
    } else {
      // Update existing job status to PROCESSING
      await supabase
        .from('MessageJob')
        .update({
          status: 'PROCESSING',
          startedAt: new Date().toISOString(),
          totalRecipients: recipients.length,
          progress: 0
        })
        .eq('id', jobId)
    }

        // Process recipients with parallel batch processing
    let successfulSent = 0
    let failed = 0
    const totalRecipients = recipients.length
    
    // WhatsApp rate limit: 20 messages per second
    // We'll process 10 in parallel, then wait to ensure we don't exceed rate limit
    const PARALLEL_BATCH_SIZE = 10 // Process 10 messages in parallel
    const WHATSAPP_RATE_LIMIT = 20 // Messages per second
    const MIN_DELAY_BETWEEN_BATCHES = (PARALLEL_BATCH_SIZE / WHATSAPP_RATE_LIMIT) * 1000 // 500ms for 10 messages
    
    const startTime = Date.now()
    let lastBatchTime = Date.now()

    console.log(`🚀 Starting parallel processing with batch size: ${PARALLEL_BATCH_SIZE}`)
    console.log(`⚠️ WhatsApp rate limit: ${WHATSAPP_RATE_LIMIT} messages/second`)
    console.log(`⏱️ Minimum delay between batches: ${MIN_DELAY_BETWEEN_BATCHES}ms`)
    console.log(`⏱️ Maximum time available: 150 seconds`)

    // Process recipients in parallel batches
    for (let batchStart = 0; batchStart < recipients.length; batchStart += PARALLEL_BATCH_SIZE) {
      // Check if we're approaching the timeout (leave 10 seconds buffer)
      const elapsedTime = (Date.now() - startTime) / 1000
      if (elapsedTime > 140) {
        console.error(`⚠️ Approaching edge function timeout (${elapsedTime}s elapsed). Stopping processing.`)
        break
      }

      const batchEnd = Math.min(batchStart + PARALLEL_BATCH_SIZE, recipients.length)
      const batch = recipients.slice(batchStart, batchEnd)
      const batchNumber = Math.floor(batchStart / PARALLEL_BATCH_SIZE) + 1
      const totalBatches = Math.ceil(recipients.length / PARALLEL_BATCH_SIZE)
      
      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (recipients ${batchStart + 1}-${batchEnd})`)
      
      // Track batch start time for rate limiting
      lastBatchTime = Date.now()

      // Process all recipients in this batch in parallel
      const batchPromises = batch.map(async (recipient, indexInBatch) => {
        const recipientIndex = batchStart + indexInBatch
        
        if (!recipient) {
          console.error(`❌ Recipient at index ${recipientIndex} is undefined`)
          return { success: false, error: 'Recipient undefined' }
        }

        try {
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
            await new Promise(resolve => setTimeout(resolve, 50))
          } else {
            // Ensure phone number is properly formatted
            let formattedPhone = recipient.phone
            // Remove any non-numeric characters
            formattedPhone = formattedPhone.replace(/\D/g, '')
            // Ensure it doesn't start with a plus
            if (formattedPhone.startsWith('+')) {
              formattedPhone = formattedPhone.substring(1)
            }
            
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
          }

          // Update recipient status in database
          if (messageResult.success) {
            const { error: updateError } = await supabase
              .from('MessageRecipient')
              .update({
                status: 'SENT',
                sentAt: new Date().toISOString(),
                metaMessageId: messageResult.messageId
              })
              .eq('id', recipient.messageRecipientId)

            if (updateError) {
              console.error(`❌ Failed to update recipient ${recipient.messageRecipientId}:`, updateError)
            }
          } else {
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

          return messageResult

        } catch (error) {
          console.error(`❌ Error processing recipient ${recipient?.phone || 'unknown'}:`, error)
          
          // Try to update recipient status even if error occurred
          await supabase
            .from('MessageRecipient')
            .update({
              status: 'FAILED',
              errorMessage: error instanceof Error ? error.message : String(error)
            })
            .eq('id', recipient?.messageRecipientId || '')
            .catch(console.error)

          return { 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
          }
        }
      })

      // Wait for all messages in this batch to complete
      const batchResults = await Promise.all(batchPromises)
      
      // Count successes and failures in this batch
      const batchSuccesses = batchResults.filter(r => r.success).length
      const batchFailures = batchResults.filter(r => !r.success).length
      
      successfulSent += batchSuccesses
      failed += batchFailures
      
      // Calculate overall progress
      const processedSoFar = Math.min(batchEnd, recipients.length)
      const progress = Math.round((processedSoFar / totalRecipients) * 100)
      
      console.log(`✅ Batch ${batchNumber} complete: ${batchSuccesses} sent, ${batchFailures} failed`)
      console.log(`📊 Overall progress: ${progress}% (${successfulSent}/${processedSoFar} sent)`)
      
      // Update job progress after each batch
      await supabase
        .from('MessageJob')
        .update({
          progress,
          processedRecipients: processedSoFar,
          successfulSent,
          failed,
          updatedAt: new Date().toISOString()
        })
        .eq('id', jobId)

      // Calculate and apply rate limiting delay
      // WhatsApp allows 20 messages/second, we sent PARALLEL_BATCH_SIZE messages
      // We need to ensure we don't exceed the rate limit
      if (batchEnd < recipients.length) {
        const batchProcessingTime = Date.now() - lastBatchTime
        const requiredDelay = MIN_DELAY_BETWEEN_BATCHES - batchProcessingTime
        
        if (requiredDelay > 0) {
          console.log(`⏸️ Rate limiting: waiting ${requiredDelay}ms before next batch`)
          await new Promise(resolve => setTimeout(resolve, requiredDelay))
        }
        
        lastBatchTime = Date.now()
      }
    }

    // Check if job was fully or partially completed
    const processedCount = successfulSent + failed
    const isPartiallyCompleted = processedCount < totalRecipients
    const jobStatus = isPartiallyCompleted ? 'PARTIALLY_COMPLETED' : 'COMPLETED'
    const finalProgress = Math.round((processedCount / totalRecipients) * 100)
    
    console.log(`📊 Marking job ${jobId} as ${jobStatus} with ${successfulSent} sent, ${failed} failed`)
    
    if (isPartiallyCompleted) {
      const elapsedTime = (Date.now() - startTime) / 1000
      console.warn(`⚠️ Job partially completed due to timeout. Processed ${processedCount}/${totalRecipients} recipients in ${elapsedTime}s`)
    }
    
    const { error: jobUpdateError } = await supabase
      .from('MessageJob')
      .update({
        status: jobStatus,
        completedAt: new Date().toISOString(),
        progress: finalProgress,
        processedRecipients: processedCount,
        successfulSent,
        failed,
        updatedAt: new Date().toISOString()
      })
      .eq('id', jobId)

    if (jobUpdateError) {
      console.error('❌ Failed to update job status:', jobUpdateError)
    }

    // If this is a batch job, update parent job statistics
    if (batchInfo?.parentJobId) {
      console.log(`📊 Updating parent job ${batchInfo.parentJobId} statistics`)
      
      // Get current parent job stats
      const { data: parentJob } = await supabase
        .from('MessageJob')
        .select('totalBatchesCompleted, totalBatchRecipients, totalBatchSuccessful, totalBatchFailed')
        .eq('id', batchInfo.parentJobId)
        .single()
      
      if (parentJob) {
        const newBatchesCompleted = (parentJob.totalBatchesCompleted || 0) + 1
        const newTotalRecipients = (parentJob.totalBatchRecipients || 0) + processedCount
        const newTotalSuccessful = (parentJob.totalBatchSuccessful || 0) + successfulSent
        const newTotalFailed = (parentJob.totalBatchFailed || 0) + failed
        
        // Update parent job with aggregate statistics
        const { error: parentUpdateError } = await supabase
          .from('MessageJob')
          .update({
            totalBatchesCompleted: newBatchesCompleted,
            totalBatchRecipients: newTotalRecipients,
            totalBatchSuccessful: newTotalSuccessful,
            totalBatchFailed: newTotalFailed,
            // Update parent status if all batches are complete
            status: newBatchesCompleted === batchInfo.totalBatches ? 'COMPLETED' : 'PROCESSING',
            completedAt: newBatchesCompleted === batchInfo.totalBatches ? new Date().toISOString() : null,
            updatedAt: new Date().toISOString()
          })
          .eq('id', batchInfo.parentJobId)
        
        if (parentUpdateError) {
          console.error('❌ Failed to update parent job:', parentUpdateError)
        } else {
          console.log(`✅ Updated parent job: ${newBatchesCompleted}/${batchInfo.totalBatches} batches complete`)
        }
      }
    }

    // Update main message status
    console.log(`📊 Updating main message ${messageId} status`)
    
    // For batch jobs, only update message when all batches are complete
    if (batchInfo?.parentJobId) {
      // Check if all batches are complete
      const { data: parentJobFinal } = await supabase
        .from('MessageJob')
        .select('totalBatchesCompleted, totalBatches, totalBatchSuccessful, totalBatchFailed, totalBatchRecipients')
        .eq('id', batchInfo.parentJobId)
        .single()
      
      if (parentJobFinal && parentJobFinal.totalBatchesCompleted === parentJobFinal.totalBatches) {
        // All batches complete, update message with aggregate stats
        const totalSuccessful = parentJobFinal.totalBatchSuccessful || 0
        const totalFailed = parentJobFinal.totalBatchFailed || 0
        const totalProcessed = parentJobFinal.totalBatchRecipients || 0
        const messageStatus = totalFailed === 0 ? 'SENT' : (totalSuccessful === 0 ? 'FAILED' : 'SENT')
        
        const { error: messageUpdateError } = await supabase
          .from('CommunicationMessage')
          .update({
            status: messageStatus,
            sentAt: totalSuccessful > 0 ? new Date().toISOString() : null,
            successfulSent: totalSuccessful,
            failed: totalFailed,
            totalRecipients: totalProcessed,
            updatedAt: new Date().toISOString()
          })
          .eq('id', messageId)
        
        if (messageUpdateError) {
          console.error('❌ Failed to update message status:', messageUpdateError)
        } else {
          console.log(`✅ All batches complete! Updated message ${messageId} with totals: ${totalSuccessful} sent, ${totalFailed} failed`)
        }
      } else {
        console.log(`⏳ Batch ${batchInfo.batchIndex}/${batchInfo.totalBatches} complete, waiting for other batches...`)
      }
    } else {
      // Single job (no batches), update message directly
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
    headerFilename?: string
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
      
      // Handle document headers according to WhatsApp Cloud API spec
      if (templateData.headerType === "DOCUMENT") {
        components.push({
          type: 'header',
          parameters: [{
            type: 'document',
            document: {
              link: templateData.headerMediaUrl,
              filename: templateData.headerFilename || templateData.headerContent || 'document.pdf'
            }
          }]
        })
      } else {
        // Handle image and video headers
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