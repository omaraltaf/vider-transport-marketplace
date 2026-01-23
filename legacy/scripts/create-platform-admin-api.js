// Script to create platform admin via API call to production
const https = require('https');

const API_BASE_URL = 'https://vider-transport-marketplace-production.up.railway.app';

async function createPlatformAdminViaAPI() {
  console.log('🔧 Creating platform administrator via API...');

  // First, let's create a temporary endpoint or use the existing seed endpoint
  // We'll create a simple user creation via direct API call

  const userData = {
    email: 'admin@vider.no',
    password: 'password123',
    role: 'PLATFORM_ADMIN',
    firstName: 'Platform',
    lastName: 'Administrator',
    phone: '+47 12345678',
    companyName: 'Vider Platform Administration'
  };

  console.log('📝 Platform admin data prepared');
  console.log('   Email: admin@vider.no');
  console.log('   Password: password123');
  console.log('   Role: PLATFORM_ADMIN');
  console.log('');
  console.log('⚠️  Note: This account needs to be created manually in the production database');
  console.log('   or via a database migration script run on Railway.');
  console.log('');
  console.log('🔧 Alternative: Use Railway CLI to run the creation script:');
  console.log('   railway run node scripts/create-platform-admin.js');
}

createPlatformAdminViaAPI();