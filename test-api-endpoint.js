// Test the actual tRPC endpoint that the frontend calls
async function testPaymentHistoryAPI() {
  const branchId = 'cmbdk8dd9000w7ip2rpxsd5rr';
  const sessionId = 'cmbdk90xz000x7ip2ido648y3';
  
  // Simulate the exact tRPC call that the frontend makes
  const url = `http://localhost:3000/api/trpc/paymentGateway.getPaymentHistory?batch=1&input=${encodeURIComponent(JSON.stringify({
    "0": {
      "json": {
        branchId: branchId,
        sessionId: sessionId,
        limit: 100
      }
    }
  }))}`;
  
  console.log('Testing API endpoint:', url);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add basic auth headers if needed
      }
    });
    
    if (!response.ok) {
      console.log('Response status:', response.status);
      console.log('Response statusText:', response.statusText);
      const text = await response.text();
      console.log('Response body:', text);
      return;
    }
    
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
    
    if (data[0]?.result?.data?.items) {
      const items = data[0].result.data.items;
      console.log(`\nFound ${items.length} total items:`);
      
      const gatewayItems = items.filter(/** @param {any} item */ (item) => item.type === 'gateway');
      const manualItems = items.filter(/** @param {any} item */ (item) => item.type === 'manual');
      
      console.log(`- Gateway items: ${gatewayItems.length}`);
      console.log(`- Manual items: ${manualItems.length}`);
      
      console.log('\nFirst 10 items:');
      items.slice(0, 10).forEach(/** @param {any} item @param {number} index */ (item, index) => {
        console.log(`${index + 1}. [${item.type?.toUpperCase() || 'UNKNOWN'}] ${item.transactionId || item.receiptNumber || 'No ID'}`);
        console.log(`   Amount: ₹${item.amount}`);
        console.log(`   Student: ${item.studentName || 'Unknown'} (${item.studentAdmissionNumber || 'No admission number'})`);
        console.log(`   Status: ${item.status}`);
        console.log('   ---');
      });
    } else {
      console.log('No items found in response');
    }
    
  } catch (error) {
    console.error('Error calling API:', error instanceof Error ? error.message : String(error));
  }
}

testPaymentHistoryAPI();