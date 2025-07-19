import { config } from 'dotenv';
import { getWatiConfigFromEnv, WatiApiClient } from '../src/utils/wati-api';

// Load environment variables from .env file
config();

async function debugWatiTemplates() {
  try {
    console.log('🔍 Debugging Wati Templates API...');
    
    // Test environment configuration
    console.log('📋 Checking environment variables...');
    const watiConfig = getWatiConfigFromEnv();
    console.log('✅ Environment configuration loaded:', {
      baseUrl: watiConfig.baseUrl,
      hasToken: !!watiConfig.apiToken,
      tokenLength: watiConfig.apiToken?.length || 0
    });
    
    // Create Wati client
    const watiClient = new WatiApiClient(watiConfig);
    console.log('✅ Wati client created successfully');
    
    // Test connection first
    console.log('🌐 Testing API connection...');
    const connectionTest = await watiClient.testConnection();
    console.log('Connection test result:', connectionTest);
    
    if (!connectionTest.success) {
      console.log('❌ Connection failed, cannot proceed with template fetch');
      return;
    }
    
    // Now let's make a direct API call to see the raw response
    console.log('📋 Making direct API call to getMessageTemplates...');
    const url = `${watiConfig.baseUrl}/api/v1/getMessageTemplates`;
    
    const authHeader = watiConfig.apiToken.startsWith('Bearer ') 
      ? watiConfig.apiToken 
      : `Bearer ${watiConfig.apiToken}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });
    
    console.log('📊 Raw response details:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ API Error:', errorText);
      return;
    }
    
    const rawData = await response.text();
    console.log('📄 Raw response text:', rawData);
    
    try {
      const jsonData = JSON.parse(rawData);
      console.log('📋 Parsed JSON structure:', {
        type: typeof jsonData,
        isArray: Array.isArray(jsonData),
        keys: typeof jsonData === 'object' && jsonData !== null ? Object.keys(jsonData) : 'N/A',
        length: Array.isArray(jsonData) ? jsonData.length : 'N/A'
      });
      console.log('📊 Full parsed data:', jsonData);
    } catch (parseError) {
      console.log('❌ Failed to parse as JSON:', parseError);
    }
    
    // Now test our getTemplates method
    console.log('\n🔧 Testing our getTemplates method...');
    try {
      const templates = await watiClient.getTemplates();
      console.log('Templates from our method:', {
        type: typeof templates,
        isArray: Array.isArray(templates),
        length: Array.isArray(templates) ? templates.length : 'N/A',
        data: templates
      });
    } catch (templateError) {
      console.log('❌ Error from getTemplates method:', templateError);
    }
    
  } catch (error) {
    console.error('❌ Error debugging Wati templates:', error);
    
    if (error instanceof Error) {
      console.log('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
  }
}

// Run the debug function
debugWatiTemplates().catch(console.error); 