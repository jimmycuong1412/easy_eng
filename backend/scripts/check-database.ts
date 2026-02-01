/**
 * Database Migration Checker
 * 
 * Checks which tables exist in the Supabase database
 */

import dotenv from 'dotenv';
dotenv.config();

import { supabase } from '../src/lib/supabase';

async function checkDatabase() {
  console.log('🔍 Checking Supabase database connection...\n');

  try {
    // Check connection
    const { data: healthCheck, error: healthError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (healthError) {
      console.error('❌ Connection error:', healthError.message);
      return;
    }

    console.log('✅ Connected to Supabase successfully\n');

    // Check for our tables
    const tables = [
      'users',
      'profiles', 
      'classes',
      'bookings',
      'gem_transactions',
    ];

    console.log('📊 Checking tables:\n');

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1);

        if (error) {
          console.log(`  ❌ ${table}: Not found or not accessible`);
          console.log(`     Error: ${error.message}`);
        } else {
          console.log(`  ✅ ${table}: Exists`);
        }
      } catch (err) {
        console.log(`  ❌ ${table}: Error - ${err}`);
      }
    }

    console.log('\n🔍 Checking views:\n');

    // Check views
    const { data: balanceView, error: viewError } = await supabase
      .from('user_gems_balances')
      .select('*')
      .limit(1);

    if (viewError) {
      console.log('  ❌ user_gems_balances: Not found');
      console.log(`     Error: ${viewError.message}`);
    } else {
      console.log('  ✅ user_gems_balances: Exists');
    }

    console.log('\n🔍 Checking functions:\n');

    // Check RPC functions
    const { data: balanceFunc, error: funcError } = await supabase
      .rpc('get_gems_balance', { p_user_id: '00000000-0000-0000-0000-000000000000' });

    if (funcError) {
      console.log('  ❌ get_gems_balance(): Not found');
      console.log(`     Error: ${funcError.message}`);
    } else {
      console.log('  ✅ get_gems_balance(): Exists');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkDatabase()
  .then(() => {
    console.log('\n✅ Database check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });
