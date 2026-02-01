/**
 * Apply migrations directly to Supabase using SQL queries
 * 
 * This script reads the consolidated migration file and applies it
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigrations() {
  console.log('📦 Reading migration file...');
  
  const migrationPath = path.join(__dirname, '../../supabase/APPLY_MIGRATIONS.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log('🚀 Applying migrations to Supabase...\n');
  console.log('⚠️  Note: This may take a moment as we create tables, functions, and policies.\n');
  
  try {
    // Use the Supabase REST API to execute SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Migration failed:', error.message);
      console.error('\n📝 Please apply migrations manually via Supabase Dashboard:');
      console.error('   1. Go to https://evrcwtsexlamacawofxo.supabase.co');
      console.error('   2. Navigate to SQL Editor');
      console.error('   3. Copy content from supabase/APPLY_MIGRATIONS.sql');
      console.error('   4. Paste and run in SQL Editor');
      process.exit(1);
    }
    
    console.log('✅ Migrations applied successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Run: npm run check:tables');
    console.log('   2. Start backend: npm run dev');
    console.log('   3. Start frontend: cd ../frontend && npm run dev');
    
  } catch (err: any) {
    console.error('❌ Unexpected error:', err.message);
    console.error('\n📝 Please apply migrations manually via Supabase Dashboard');
    process.exit(1);
  }
}

applyMigrations();
