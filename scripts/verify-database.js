#!/usr/bin/env node

/**
 * Database Verification Script
 *
 * Connects to Supabase and verifies which tables exist
 * Usage: node scripts/verify-database.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
const envPath = path.join(__dirname, '../frontend/.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parse env vars
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      env[key] = value;
    }
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Expected tables based on migrations
const CRITICAL_TABLES = [
  'profiles',
  'classes',
  'bookings',
  'gem_transactions',
  'class_sessions',
  'session_participants',
  'payments'
];

const SUPPORTING_TABLES = [
  'activity_rules',
  'activity_tracking',
  'attendance_streaks',
  'referral_codes',
  'reviews',
  'teacher_availability',
  'teacher_earnings',
  'payout_requests',
  'notifications',
  'notification_preferences',
  'quizzes',
  'quiz_questions',
  'quiz_attempts',
  'cancellation_policies',
  'cancellations',
  'system_settings',
  'session_events'
];

const EXPECTED_VIEWS = [
  'user_analytics_view',
  'booking_analytics_view',
  'gem_analytics_view',
  'revenue_analytics_view',
  'earnings_summary_view'
];

async function checkTables() {
  console.log('\n🔍 DATABASE VERIFICATION');
  console.log('═'.repeat(60));
  console.log(`📍 Project: ${SUPABASE_URL}`);
  console.log('═'.repeat(60));

  try {
    // Query to get all tables
    const { data: tables, error } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .order('tablename');

    if (error) {
      // Fallback: Try direct RPC call
      const query = `
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
      `;

      const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', {
        sql: query
      });

      if (rpcError) {
        console.error('❌ Cannot query database tables');
        console.error('Error:', rpcError.message);
        console.log('\n💡 Alternative: Run the SQL script in Supabase Dashboard:');
        console.log('   https://supabase.com/dashboard/project/evrcwtsexlamacawofxo/sql/new');
        console.log('   Then copy/paste: docs/verify-database.sql');
        return;
      }
    }

    const tableNames = tables ? tables.map(t => t.tablename) : [];

    console.log(`\n✅ Found ${tableNames.length} tables in public schema\n`);

    // Check critical tables
    console.log('🎯 CRITICAL TABLES (MVP)');
    console.log('─'.repeat(60));

    let criticalMissing = 0;
    CRITICAL_TABLES.forEach(table => {
      if (tableNames.includes(table)) {
        console.log(`  ✅ ${table.padEnd(30)} EXISTS`);
      } else {
        console.log(`  ❌ ${table.padEnd(30)} MISSING 🚨`);
        criticalMissing++;
      }
    });

    // Check supporting tables
    console.log('\n📋 SUPPORTING TABLES');
    console.log('─'.repeat(60));

    let supportingMissing = 0;
    SUPPORTING_TABLES.forEach(table => {
      if (tableNames.includes(table)) {
        console.log(`  ✅ ${table.padEnd(30)} EXISTS`);
      } else {
        console.log(`  ⚠️  ${table.padEnd(30)} MISSING`);
        supportingMissing++;
      }
    });

    // Check views
    console.log('\n📊 DATABASE VIEWS');
    console.log('─'.repeat(60));

    const viewNames = tableNames.filter(t => EXPECTED_VIEWS.includes(t));
    EXPECTED_VIEWS.forEach(view => {
      if (viewNames.includes(view)) {
        console.log(`  ✅ ${view.padEnd(30)} EXISTS`);
      } else {
        console.log(`  ⚠️  ${view.padEnd(30)} MISSING`);
      }
    });

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Total tables found: ${tableNames.length}`);
    console.log(`Critical tables: ${CRITICAL_TABLES.length - criticalMissing}/${CRITICAL_TABLES.length} ${criticalMissing === 0 ? '✅' : '❌'}`);
    console.log(`Supporting tables: ${SUPPORTING_TABLES.length - supportingMissing}/${SUPPORTING_TABLES.length} ${supportingMissing === 0 ? '✅' : '⚠️'}`);
    console.log(`Views: ${viewNames.length}/${EXPECTED_VIEWS.length}`);

    // Recommendations
    console.log('\n' + '═'.repeat(60));
    console.log('🎯 NEXT STEPS');
    console.log('═'.repeat(60));

    if (criticalMissing > 0) {
      console.log('\n🚨 CRITICAL: Missing essential tables!');
      console.log('   Run: npx supabase db push');
      console.log('   This will apply all migrations to your database.');
    } else if (supportingMissing > 0) {
      console.log('\n⚠️  Some supporting tables are missing.');
      console.log('   Run: npx supabase db push');
      console.log('   This will apply all migrations to your database.');
    } else {
      console.log('\n✅ All tables exist! Database is properly configured.');
      console.log('   Next: Configure CometChat webhook URL');
      console.log('   See: docs/cometchat-quick-start.md');
    }

    // List all tables for reference
    if (tableNames.length > 0) {
      console.log('\n' + '═'.repeat(60));
      console.log('📋 ALL TABLES IN DATABASE');
      console.log('═'.repeat(60));
      tableNames.forEach((table, i) => {
        console.log(`  ${(i + 1).toString().padStart(2)}. ${table}`);
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('═'.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Error during verification:', error.message);
    console.log('\n💡 Alternative verification methods:');
    console.log('   1. Run SQL script in Supabase Dashboard:');
    console.log('      https://supabase.com/dashboard/project/evrcwtsexlamacawofxo/sql/new');
    console.log('      Copy/paste: docs/verify-database.sql');
    console.log('   2. Apply migrations: npx supabase db push');
    console.log('   3. Check logs: npx supabase db --debug\n');
  }
}

// Run verification
checkTables().catch(console.error);
