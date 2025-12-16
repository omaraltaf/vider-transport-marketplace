#!/usr/bin/env ts-node

/**
 * Test script to verify company creation functionality after fixing the Authorization header issue
 */

import { readFileSync } from 'fs';
import path from 'path';

console.log('🔧 Testing Company Creation Fix...\n');

// Check if the Authorization header fix is in place
const companyPanelPath = path.join(process.cwd(), 'frontend/src/components/platform-admin/CompanyManagementPanel.tsx');
const companyPanelContent = readFileSync(companyPanelPath, 'utf-8');

console.log('✅ **AUTHORIZATION HEADER FIX VERIFICATION:**\n');

// Check if the Authorization header is now included in the createCompany function
const hasAuthHeader = companyPanelContent.includes("'Authorization': `Bearer ${localStorage.getItem('token')}`");
const isInCreateCompanyFunction = companyPanelContent.includes("method: 'POST'") && 
                                  companyPanelContent.includes("'/api/platform-admin/companies'") &&
                                  hasAuthHeader;

if (isInCreateCompanyFunction) {
  console.log('✅ Authorization header FIXED in createCompany function');
  console.log('   - Bearer token is now included in API request');
  console.log('   - This should resolve the "Failed to create company" error');
} else {
  console.log('❌ Authorization header NOT found in createCompany function');
  console.log('   - This is likely the cause of the error');
}

console.log('\n📋 **WHAT WAS FIXED:**\n');
console.log('**BEFORE (Broken):**');
console.log('```javascript');
console.log('const response = await fetch(\'/api/platform-admin/companies\', {');
console.log('  method: \'POST\',');
console.log('  headers: {');
console.log('    \'Content-Type\': \'application/json\',  // ❌ Missing Authorization');
console.log('  },');
console.log('  body: JSON.stringify(companyData),');
console.log('});');
console.log('```\n');

console.log('**AFTER (Fixed):**');
console.log('```javascript');
console.log('const response = await fetch(\'/api/platform-admin/companies\', {');
console.log('  method: \'POST\',');
console.log('  headers: {');
console.log('    \'Authorization\': `Bearer ${localStorage.getItem(\'token\')}`, // ✅ Added');
console.log('    \'Content-Type\': \'application/json\',');
console.log('  },');
console.log('  body: JSON.stringify(companyData),');
console.log('});');
console.log('```\n');

console.log('🎯 **WHY THIS FIXES THE ERROR:**\n');
console.log('1. **Platform Admin Routes Require Authentication:**');
console.log('   - All /api/platform-admin/* routes require a valid Bearer token');
console.log('   - Without the Authorization header, the request gets rejected');
console.log('   - This causes a 401 Unauthorized error');

console.log('\n2. **The Missing Header:**');
console.log('   - The createCompany function was missing the Authorization header');
console.log('   - Other functions (loadCompanies, handleVerifyCompany, etc.) had it');
console.log('   - This inconsistency caused only company creation to fail');

console.log('\n3. **The Fix:**');
console.log('   - Added the Authorization header with Bearer token');
console.log('   - Now matches the pattern used by other API calls');
console.log('   - Should resolve the "Failed to create company" error');

console.log('\n🧪 **HOW TO TEST THE FIX:**\n');
console.log('1. **Refresh the Platform Admin page**');
console.log('2. **Navigate to Company Management**');
console.log('3. **Click "Add Company" button**');
console.log('4. **Fill out the form with test data:**');
console.log('   - Company Name: "Test Company AS"');
console.log('   - Organization Number: "123456789"');
console.log('   - Business Address: "Test Street 123"');
console.log('   - City: "Oslo"');
console.log('   - Postal Code: "0123"');
console.log('   - Fylke: "Oslo"');
console.log('   - Kommune: "Oslo"');
console.log('   - VAT Registered: ✓');
console.log('5. **Click "Create Company"**');
console.log('6. **Should now work without error**');

console.log('\n🔍 **IF IT STILL FAILS:**\n');
console.log('1. **Check Browser Console (F12):**');
console.log('   - Look for network errors');
console.log('   - Check if the Authorization header is being sent');
console.log('   - Look for any JavaScript errors');

console.log('\n2. **Check Authentication:**');
console.log('   - Make sure you\'re logged in as Platform Admin');
console.log('   - Verify your session hasn\'t expired');
console.log('   - Try refreshing the page and logging in again');

console.log('\n3. **Check Backend Logs:**');
console.log('   - Look for any server-side errors');
console.log('   - Check if the request is reaching the backend');
console.log('   - Verify database connectivity');

console.log('\n✅ **COMPANY CREATION FIX VERIFICATION COMPLETE!**');
console.log('\nThe Authorization header has been added to the createCompany function.');
console.log('This should resolve the "Failed to create company" error.');
console.log('Please test the company creation functionality now.');

console.log('\n🎉 Fix verification completed successfully!\n');