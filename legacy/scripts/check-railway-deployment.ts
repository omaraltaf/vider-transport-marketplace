#!/usr/bin/env tsx

/**
 * Railway Deployment Status Checker
 * 
 * This script checks if the Railway deployment is working properly
 * by testing various endpoints and functionality.
 */

import { execSync } from 'child_process';

const RAILWAY_URL = 'https://vider-transport-marketplace-production.up.railway.app';

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  responseTime?: number;
}

async function testEndpoint(url: string, options: RequestInit = {}): Promise<{ success: boolean; data?: any; error?: string; responseTime: number }> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      timeout: 10000, // 10 second timeout
      ...options
    });
    
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        responseTime
      };
    }
    
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    return {
      success: true,
      data,
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime
    };
  }
}

async function runTests(): Promise<TestResult[]> {
  const tests: TestResult[] = [];
  
  console.log('🔍 Testing Railway deployment status...\n');
  
  // Test 1: Health endpoint
  console.log('1. Testing health endpoint...');
  const healthResult = await testEndpoint(`${RAILWAY_URL}/health`);
  tests.push({
    name: 'Health Endpoint',
    success: healthResult.success,
    message: healthResult.success 
      ? `✅ Health check passed (${healthResult.responseTime}ms)`
      : `❌ Health check failed: ${healthResult.error}`,
    responseTime: healthResult.responseTime
  });
  
  // Test 2: API root
  console.log('2. Testing API root...');
  const apiResult = await testEndpoint(`${RAILWAY_URL}/api`);
  tests.push({
    name: 'API Root',
    success: apiResult.success,
    message: apiResult.success 
      ? `✅ API accessible (${apiResult.responseTime}ms)`
      : `❌ API not accessible: ${apiResult.error}`,
    responseTime: apiResult.responseTime
  });
  
  // Test 3: Database connection (via listings endpoint)
  console.log('3. Testing database connection...');
  const dbResult = await testEndpoint(`${RAILWAY_URL}/api/listings/search`);
  tests.push({
    name: 'Database Connection',
    success: dbResult.success,
    message: dbResult.success 
      ? `✅ Database connected (${dbResult.responseTime}ms)`
      : `❌ Database connection failed: ${dbResult.error}`,
    responseTime: dbResult.responseTime
  });
  
  // Test 4: Authentication endpoint
  console.log('4. Testing authentication...');
  const authResult = await testEndpoint(`${RAILWAY_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'wrongpassword'
    })
  });
  
  // We expect this to fail with 401, which means auth is working
  const authWorking = authResult.success === false && authResult.error?.includes('401');
  tests.push({
    name: 'Authentication Endpoint',
    success: authWorking,
    message: authWorking 
      ? `✅ Auth endpoint working (${authResult.responseTime}ms)`
      : `❌ Auth endpoint issue: ${authResult.error}`,
    responseTime: authResult.responseTime
  });
  
  return tests;
}

async function checkGitStatus(): Promise<void> {
  console.log('📋 Checking Git status...\n');
  
  try {
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    console.log(`Current branch: ${currentBranch}`);
    
    const lastCommit = execSync('git log -1 --oneline', { encoding: 'utf8' }).trim();
    console.log(`Last commit: ${lastCommit}`);
    
    const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    if (status) {
      console.log('⚠️  Uncommitted changes detected:');
      console.log(status);
    } else {
      console.log('✅ Working directory clean');
    }
    
    console.log('');
  } catch (error) {
    console.log('❌ Error checking Git status:', error);
  }
}

async function main(): Promise<void> {
  console.log('🚀 Railway Deployment Status Check\n');
  console.log('=' .repeat(50));
  
  await checkGitStatus();
  
  const results = await runTests();
  
  console.log('\n📊 Test Results Summary:');
  console.log('=' .repeat(50));
  
  let passedTests = 0;
  let totalTests = results.length;
  
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.name}: ${result.message}`);
    if (result.success) passedTests++;
  });
  
  console.log('\n' + '=' .repeat(50));
  console.log(`Overall Status: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 Deployment appears to be working correctly!');
  } else if (passedTests === 0) {
    console.log('🚨 Deployment appears to be completely down!');
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check Railway dashboard for build/deployment logs');
    console.log('2. Verify environment variables are set correctly');
    console.log('3. Check if database is connected and accessible');
    console.log('4. Review recent commits for any breaking changes');
  } else {
    console.log('⚠️  Deployment has some issues but is partially working');
    console.log('\n🔧 Check the failed tests above and Railway logs for details');
  }
  
  console.log('\n📱 Quick Actions:');
  console.log(`- Railway Dashboard: https://railway.app`);
  console.log(`- Application URL: ${RAILWAY_URL}`);
  console.log(`- Health Check: ${RAILWAY_URL}/health`);
}

// Run the tests
main().catch(console.error);