import { config } from 'dotenv';
import { getWatiConfigFromEnv, WatiApiClient } from '../src/utils/wati-api';

// Load environment variables from .env file
config();

async function testWatiConnection() {
  try {
    console.log('🔍 Testing Wati API connection...');
    
    // Test environment configuration
    console.log('📋 Checking environment variables...');
    const config = getWatiConfigFromEnv();
    console.log('✅ Environment configuration loaded:', {
      baseUrl: config.baseUrl,
      hasToken: !!config.apiToken,
      tokenLength: config.apiToken?.length || 0
    });
    
    // Create Wati client
    const watiClient = new WatiApiClient(config);
    console.log('✅ Wati client created successfully');
    
    // Test connection with a simple API call
    console.log('🌐 Testing API connection...');
    const connectionTest = await watiClient.testConnection();
    
    if (connectionTest.success) {
      console.log('✅ Connection successful!');
      console.log('📊 Connection details:', connectionTest);
    } else {
      console.log('❌ Connection failed:', connectionTest.error);
    }
    
  } catch (error) {
    console.error('❌ Error testing Wati connection:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('WATI_API_TOKEN')) {
        console.log('💡 Solution: Make sure to add WATI_API_TOKEN to your .env file');
      } else if (error.message.includes('Wati API Error')) {
        console.log('💡 This could be due to:');
        console.log('   - Invalid API token');
        console.log('   - Expired token');
        console.log('   - Incorrect API URL');
        console.log('   - Network connectivity issues');
      }
    }
  }
}

// Run the test
testWatiConnection(); 