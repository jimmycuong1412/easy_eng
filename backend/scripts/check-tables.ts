/**
 * Simple Database Table Checker
 */

import dotenv from 'dotenv';
dotenv.config();

async function checkTables() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  console.log('🔍 Checking database tables...\n');
  console.log('URL:', supabaseUrl);
  console.log('Key:', supabaseKey ? 'Set (length: ' + supabaseKey.length + ')' : 'Not set');
  console.log('');

  const tables = ['profiles', 'classes', 'bookings', 'gem_transactions'];

  for (const table of tables) {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/${table}?select=count&limit=1`,
        {
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );

      if (response.ok) {
        console.log(`✅ ${table}: Exists (${response.status})`);
      } else {
        const error = await response.text();
        console.log(`❌ ${table}: Not found (${response.status})`);
        console.log(`   Error: ${error.substring(0, 100)}`);
      }
    } catch (err) {
      console.log(`❌ ${table}: Fetch error - ${err}`);
    }
  }
}

checkTables();
