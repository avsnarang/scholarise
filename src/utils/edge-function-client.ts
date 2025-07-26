interface MessageJobPayload {
  jobId: string
  messageId: string
  templateData?: {
    metaTemplateName: string
    metaTemplateLanguage: string
  }
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

export async function triggerMessageJob(payload: MessageJobPayload): Promise<void> {
  try {
    // Get Supabase configuration - use direct process.env since this runs in server context
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    // Call Supabase Edge Function
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-message`
    
    console.log('🔍 Edge function environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!supabaseServiceRoleKey,
      serviceRoleKeyLength: supabaseServiceRoleKey?.length || 0,
      serviceRoleKeyPrefix: supabaseServiceRoleKey?.substring(0, 20) + '...',
      url: edgeFunctionUrl
    });
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(`Supabase configuration missing - URL: ${!!supabaseUrl}, Key: ${!!supabaseServiceRoleKey}`)
    }

    // Validate WhatsApp configuration
    if (!payload.whatsappConfig.accessToken || !payload.whatsappConfig.phoneNumberId) {
      throw new Error('WhatsApp configuration missing in payload')
    }
    
    console.log('📤 Triggering edge function:', {
      url: edgeFunctionUrl,
      jobId: payload.jobId,
      messageId: payload.messageId,
      recipientCount: payload.recipients?.length || 0,
      hasWhatsAppConfig: !!payload.whatsappConfig.accessToken
    });
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Edge function failed: ${error}`)
    }

    const result = await response.json()
    console.log('✅ Edge function triggered successfully:', result)

  } catch (error) {
    console.error('❌ Failed to trigger edge function:', error)
    // For now, we'll throw the error but in production you might want to handle this gracefully
    throw error
  }
}

export async function getJobStatus(jobId: string) {
  // This would query the MessageJob table to get current status
  // Implementation depends on how you want to expose this (API route, tRPC, etc.)
  console.log('Getting job status for:', jobId)
} 