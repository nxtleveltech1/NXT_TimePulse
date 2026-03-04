// Quick test to check financials API data
// Run with: node test-financials.mjs

const BASE_URL = 'http://localhost:3000';

async function testFinancials() {
  console.log('Testing financials page...\n');
  
  // First try to get the page
  try {
    const pageResponse = await fetch(`${BASE_URL}/dashboard/financials`);
    console.log('✓ Page accessible');
    console.log(`  Status: ${pageResponse.status}`);
    console.log(`  URL: ${pageResponse.url}\n`);
    
    // Check if redirected to auth
    if (pageResponse.url.includes('sign-in') || pageResponse.url.includes('auth')) {
      console.log('⚠ Redirected to authentication page');
      console.log('  Please ensure you are logged in to the application first.\n');
      return;
    }
  } catch (error) {
    console.error('✗ Failed to access page:', error.message);
    return;
  }
  
  // Try to fetch API data (this will fail without auth cookies)
  try {
    const apiResponse = await fetch(`${BASE_URL}/api/financials/summary`);
    console.log('API Response:');
    console.log(`  Status: ${apiResponse.status}`);
    
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      console.log('\n📊 Financials Summary:');
      console.log(`  Billable Revenue: R ${data.billableRevenue.toFixed(2)}`);
      console.log(`  Labour Cost: R ${data.labourCost.toFixed(2)}`);
      console.log(`  Gross Margin: R ${data.grossMargin.toFixed(2)}`);
      console.log(`  Margin %: ${data.marginPct}%`);
      
      console.log('\n📈 Top Projects by Cost:');
      if (data.topProjectsByCost.length === 0) {
        console.log('  (No data)');
      } else {
        data.topProjectsByCost.forEach(p => {
          console.log(`  - ${p.project}: R ${p.cost.toFixed(2)}`);
        });
      }
      
      console.log('\n👷 Labour Cost by Worker:');
      if (data.labourByUser.length === 0) {
        console.log('  (No data)');
      } else {
        data.labourByUser.forEach(u => {
          console.log(`  - ${u.user}: R ${u.cost.toFixed(2)}`);
        });
      }
      
      // Verification checks
      console.log('\n✅ VERIFICATION:');
      console.log(`  Labour cost is NOT R 0: ${data.labourCost !== 0 ? '✓ PASS' : '✗ FAIL'}`);
      console.log(`  Top projects has data: ${data.topProjectsByCost.length > 0 ? '✓ PASS' : '✗ FAIL'}`);
      console.log(`  Labour by worker has data: ${data.labourByUser.length > 0 ? '✓ PASS' : '✗ FAIL'}`);
    } else if (apiResponse.status === 401 || apiResponse.status === 403) {
      console.log('  ⚠ Authentication required to access API data');
      console.log('  Please open http://localhost:3000/dashboard/financials in your browser');
      console.log('  and manually verify the following:');
      console.log('    1. Labour cost is NOT R 0');
      console.log('    2. Top projects by cost shows non-zero values');
      console.log('    3. Labour cost by worker shows non-zero values');
    } else {
      console.log(`  ✗ Unexpected status: ${apiResponse.status}`);
      const text = await apiResponse.text();
      console.log(`  Response: ${text.substring(0, 200)}`);
    }
  } catch (error) {
    console.error('\n✗ API Error:', error.message);
  }
}

testFinancials();
