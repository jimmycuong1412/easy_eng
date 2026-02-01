/**
 * Apply Database Migrations
 * 
 * Executes SQL migration files against the Supabase database
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

async function applyMigration(filename: string, sql: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service role for DDL

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey || '',
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (response.ok) {
      console.log(`✅ ${filename}`);
      return true;
    } else {
      const error = await response.text();
      console.log(`❌ ${filename}: ${response.status}`);
      console.log(`   Error: ${error.substring(0, 200)}`);
      return false;
    }
  } catch (err) {
    console.log(`❌ ${filename}: ${err}`);
    return false;
  }
}

async function applyMigrations() {
  console.log('🚀 Applying database migrations...\n');

  const migrationsDir = join(__dirname, '../../supabase/migrations');
  
  const migrations = [
    '001_users.sql',
    '002_profiles.sql',
    '003_rls_policies.sql',
    '004_classes.sql',
    '005_bookings.sql',
    '006_gem_transactions.sql',
    '007_booking_rls.sql',
  ];

  for (const migration of migrations) {
    const filePath = join(migrationsDir, migration);
    try {
      const sql = readFileSync(filePath, 'utf-8');
      await applyMigration(migration, sql);
    } catch (err) {
      console.log(`❌ ${migration}: Could not read file - ${err}`);
    }
  }

  console.log('\n✅ Migration application complete');
}

applyMigrations();
