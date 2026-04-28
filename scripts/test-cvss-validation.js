/**
 * CVSS Validation Engine Test Script
 * Run with: node scripts/test-cvss-validation.js
 */

const BASE_URL = 'http://localhost:3000';

// Test data
const testCVSSMetrics = {
    attackVector: 'N',
    attackComplexity: 'L',
    privilegesRequired: 'N',
    userInteraction: 'N',
    scope: 'U',
    confidentiality: 'H',
    integrity: 'H',
    availability: 'H'
};

async function testCVSSCalculation() {
    console.log('\n🧪 Test 1: CVSS Score Calculation');
    console.log('=====================================');

    try {
        const response = await fetch(`${BASE_URL}/api/analysis/cvss-calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metrics: testCVSSMetrics })
        });

        const data = await response.json();

        if (data.success) {
            console.log('✅ PASS: CVSS calculation successful');
            console.log(`   Base Score: ${data.baseScore}`);
            console.log(`   Severity: ${data.baseSeverity}`);
            console.log(`   Vector: ${data.vectorString}`);
        } else {
            console.log('❌ FAIL: CVSS calculation failed');
            console.log(`   Error: ${data.error}`);
        }
    } catch (error) {
        console.log('❌ FAIL: Request error');
        console.log(`   ${error.message}`);
    }
}

async function testVectorParsing() {
    console.log('\n🧪 Test 2: CVSS Vector String Parsing');
    console.log('=====================================');

    try {
        const vectorString = 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H';
        const response = await fetch(`${BASE_URL}/api/analysis/cvss-calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vectorString })
        });

        const data = await response.json();

        if (data.success) {
            console.log('✅ PASS: Vector parsing successful');
            console.log(`   Parsed Score: ${data.baseScore}`);
            console.log(`   Severity: ${data.baseSeverity}`);
        } else {
            console.log('❌ FAIL: Vector parsing failed');
            console.log(`   Error: ${data.error}`);
        }
    } catch (error) {
        console.log('❌ FAIL: Request error');
        console.log(`   ${error.message}`);
    }
}

async function testValidationComplete() {
    console.log('\n🧪 Test 3: Validation - Complete Analysis');
    console.log('=====================================');
    console.log('⚠️  Note: This requires an existing analysis ID');
    console.log('   Update the analysisId in the script to test');
}

async function testValidationIncomplete() {
    console.log('\n🧪 Test 4: Validation - Incomplete Analysis');
    console.log('=====================================');
    console.log('⚠️  Note: This requires an existing analysis ID');
    console.log('   Update the analysisId in the script to test');
}

async function runAllTests() {
    console.log('\n🚀 Starting CVSS Validation Engine Tests');
    console.log('=========================================');
    console.log(`Target: ${BASE_URL}`);

    await testCVSSCalculation();
    await testVectorParsing();
    await testValidationComplete();
    await testValidationIncomplete();

    console.log('\n✨ Tests completed!');
    console.log('=====================================\n');
}

// Run tests
runAllTests().catch(console.error);
